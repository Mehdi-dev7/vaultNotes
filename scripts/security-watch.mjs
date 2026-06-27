#!/usr/bin/env node
/**
 * security-watch.mjs — Surveillance de sécurité + alerte email
 * ------------------------------------------------------------
 * Conçu pour tourner dans GitHub Actions (cron quotidien).
 * Détecte automatiquement le gestionnaire de paquets (npm / pnpm / yarn)
 * selon le lockfile présent → réutilisable tel quel sur n'importe quelle app.
 *
 * Ce qu'il fait :
 *   1. Vérifie : vulnérabilités des deps, secrets exposés, libs sensibles en retard
 *   2. Classe chaque problème par gravité : URGENT / VIGILANCE / INFO
 *   3. Envoie UN SEUL email groupé au niveau le plus grave trouvé (sinon rien)
 *
 * Variables d'env attendues (GitHub Secrets) :
 *   RESEND_API_KEY    (obligatoire) clé API Resend
 *   ALERT_EMAIL       (obligatoire) destinataire — fallback ADMIN_EMAIL
 *   RESEND_FROM_EMAIL (optionnel)   expéditeur — SANS guillemets ! fallback resend.dev
 *   APP_NAME          (optionnel)   nom dans l'objet — fallback package.json#name
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

// ─── Config ──────────────────────────────────────────────────────────────────

const root = new URL("../", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("package.json", root)));
const APP_NAME = process.env.APP_NAME || pkg.name || "app";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERT_EMAIL = process.env.ALERT_EMAIL || process.env.ADMIN_EMAIL;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Alertes <onboarding@resend.dev>";

// Détection auto du gestionnaire de paquets selon le lockfile présent
const PM = existsSync(new URL("pnpm-lock.yaml", root)) ? "pnpm"
  : existsSync(new URL("yarn.lock", root)) ? "yarn"
  : "npm";

// Libs critiques : si une MAJ existe → on veut le savoir (sécurité/auth/paiement)
const SENSITIVE_LIBS = ["next", "react", "better-auth", "next-auth", "@prisma/client", "prisma", "stripe", "resend", "zod", "electron"];

// Les 3 niveaux, du plus grave au moins grave (sert à choisir le niveau du mail)
const LEVELS = ["URGENT", "VIGILANCE", "INFO"];
const ICONS = { URGENT: "🔴", VIGILANCE: "🟠", INFO: "🔵" };

// Collecte des problèmes : { level, title, detail }
const findings = [];
const add = (level, title, detail = "") => findings.push({ level, title, detail });

// ─── Helper : exécute une commande shell sans crasher si exit code ≠ 0 ─────────
// (audit/outdated renvoient un code non-nul quand ils trouvent qqch → normal)
function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (err) {
    return err.stdout?.toString() || "";
  }
}

// ─── Vérif 1 : vulnérabilités des dépendances (npm/pnpm audit) ─────────────────
function checkAudit() {
  const out = run(`${PM} audit --json`);
  if (!out) return;
  let data;
  try { data = JSON.parse(out); } catch { return; }

  // npm ET pnpm exposent le même format .metadata.vulnerabilities
  const v = data.metadata?.vulnerabilities || {};
  if (v.critical > 0) add("URGENT", `${v.critical} faille(s) CRITIQUE(S) dans les dépendances`, `Corrige immédiatement : \`${PM} audit fix\` ou MAJ manuelle.`);
  if (v.high > 0) add("VIGILANCE", `${v.high} faille(s) HIGH dans les dépendances`, `À traiter rapidement : \`${PM} audit fix\`.`);
  const minor = (v.moderate || 0) + (v.low || 0);
  if (minor > 0) add("INFO", `${minor} faille(s) moderate/low dans les dépendances`, `À planifier : \`${PM} audit\`.`);
}

// ─── Vérif 2 : secrets exposés (fichier .env suivi par git) ────────────────────
function checkSecrets() {
  const tracked = run("git ls-files")
    .split("\n")
    .filter((f) => /(^|\/)\.env/.test(f) && !/example|sample/i.test(f));
  if (tracked.length > 0) {
    add("URGENT", "Fichier(s) .env exposé(s) dans git", tracked.join(", ") + "\nRetire-les du repo ET fais tourner les clés concernées.");
  }
}

// ─── Vérif 3 : libs sensibles en retard de version ─────────────────────────────
function checkOutdated() {
  const out = run(`${PM} outdated --json`);
  if (!out) return;
  let data;
  try { data = JSON.parse(out); } catch { return; }

  for (const [name, info] of Object.entries(data)) {
    if (!SENSITIVE_LIBS.includes(name)) continue;
    const current = info.current || info.from;
    const latest = info.latest;
    if (!latest || current === latest) continue;
    add("VIGILANCE", `MAJ disponible pour une lib sensible : ${name}`, `${current} → ${latest}. Vérifie le changelog (faille corrigée ?).`);
  }
}

// ─── Construction + envoi de l'email ───────────────────────────────────────────
function buildHtml(level) {
  const sections = LEVELS.map((lvl) => {
    const items = findings.filter((f) => f.level === lvl);
    if (items.length === 0) return "";
    const rows = items
      .map((f) => `<li style="margin-bottom:10px"><strong>${f.title}</strong>${f.detail ? `<br><span style="color:#555;white-space:pre-line">${f.detail}</span>` : ""}</li>`)
      .join("");
    return `<h3 style="margin:18px 0 6px">${ICONS[lvl]} ${lvl}</h3><ul style="padding-left:18px;margin:0">${rows}</ul>`;
  }).join("");

  return `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:auto;color:#111">
    <h2>${ICONS[level]} Alerte sécurité — ${APP_NAME}</h2>
    <p style="color:#555">Rapport automatique du ${new Date().toLocaleString("fr-FR")} (${PM}).</p>
    ${sections}
    <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
    <p style="font-size:12px;color:#999">Envoyé par scripts/security-watch.mjs (GitHub Actions).</p>
  </div>`;
}

async function sendEmail(level) {
  if (!RESEND_API_KEY || !ALERT_EMAIL) {
    console.error("❌ RESEND_API_KEY ou ALERT_EMAIL manquant — email non envoyé.");
    process.exit(1);
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: ALERT_EMAIL,
      subject: `[${level}] ${APP_NAME}`,
      html: buildHtml(level),
    }),
  });
  if (!res.ok) {
    console.error(`❌ Échec envoi Resend (${res.status}):`, await res.text());
    process.exit(1);
  }
  console.log(`✅ Email [${level}] envoyé à ${ALERT_EMAIL} (${findings.length} problème(s)).`);
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🔎 Surveillance de ${APP_NAME} (gestionnaire détecté : ${PM})`);
  checkAudit();
  checkSecrets();
  checkOutdated();

  if (findings.length === 0) {
    console.log("✅ Aucun problème détecté — pas d'email envoyé.");
    return;
  }
  const level = LEVELS.find((lvl) => findings.some((f) => f.level === lvl));
  await sendEmail(level);
}

main().catch((err) => {
  console.error("Erreur security-watch:", err);
  process.exit(1);
});
