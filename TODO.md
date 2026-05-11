# VaultNotes — Todo & Idées d'amélioration

---

## 🌲 1. Sidebar — Meilleure visualisation en arbre

**Objectif :** Savoir immédiatement dans quel projet/catégorie on se trouve.

- [ ] Ligne verticale de connexion entre un projet et ses catégories (style VS Code / Finder)
- [ ] Petite encoche horizontale devant chaque catégorie (├─ / └─)
- [ ] Highlight actif plus fort sur la catégorie courante (fond coloré + barre gauche accentuée plus épaisse)
- [ ] Projet ouvert = icône chevron animé + nom en couleur accent du projet
- [ ] Breadcrumb dans le header de la zone note : `📁 Projet  /  📂 Catégorie`
      → toujours visible même quand la sidebar est scrollée

---

## ➕ 2. Flow de création — deux niveaux de popover

### 2a. Créer un projet (clic sur "+" en haut de sidebar)

Popover sous le "+" avec 4 templates :

| Option | Ce que ça crée automatiquement |
|--------|-------------------------------|
| 📁 **Projet libre** | Projet vierge, 0 catégorie |
| 📝 **Carnet de notes** | Projet + catégorie "Notes" (type note) |
| 👤 **Contacts** | Projet + catégories "Clients" / "Fournisseurs" (type contact) |
| 🔐 **Mots de passe** | Projet + catégories "Sites web" / "Applications" / "Réseaux sociaux" (type password) |

→ Après choix du template : formulaire inline pour saisir le nom du projet → Entrée → créé.

---

### 2b. Créer une catégorie (clic sur "+" au hover d'un projet)

**Objectif :** La catégorie choisit son type, plus besoin de le re-sélectionner à chaque note.

Popover avec les types disponibles — clic = catégorie créée avec nom + icône pré-remplis :

| Option | Nom auto | Icône | Type de notes par défaut |
|--------|----------|-------|--------------------------|
| 🔑 **API Keys** | "API Keys" | 🔑 | `api_key` |
| 🔒 **Mots de passe** | "Mots de passe" | 🔒 | `password` |
| 🔗 **URLs / Liens** | "Liens" | 🔗 | `url` |
| 📝 **Notes** | "Notes" | 📝 | `note` |
| 👤 **Contacts** | "Contacts" | 👤 | `contact` |
| ⚙️ **Variables d'env** | "Env Vars" | ⚙️ | `env_var` |
| 📦 **Dépendances** | "Dépendances" | 📦 | `dependency` |
| ✏️ **Personnalisée** | (formulaire libre) | — | — |

→ Quand on crée une note dans une catégorie typée, le type est pré-sélectionné automatiquement.

> **Impact sur le modèle de données :** ajouter un champ `defaultNoteType?: NoteType` sur `Category`.

---

## 👤 3. Nouveau type de note : Contact

**Objectif :** Un affichage adapté type "fiche contact" plutôt que des champs génériques.

Champs spécifiques au type `contact` :
- **Nom complet** → `title` (obligatoire)
- **Entreprise / Rôle** → `label`
- **Email** → champ dédié (avec bouton copy)
- **Téléphone** → champ dédié (avec bouton copy)
- **Site web / LinkedIn** → champ URL
- **Adresse** → champ texte libre
- **Notes** → texte libre (contexte, infos contractuelles…)

Vue lecture : rendu style "carte de visite" plutôt que liste de champs bruts.

---

## 🔐 4. Amélioration du type "password"

**Objectif :** Plus adapté aux mots de passe de sites/apps/réseaux sociaux.

- [ ] Champ **URL du site** en plus du mot de passe
- [ ] Champ **Nom d'utilisateur / email** séparé du mot de passe
- [ ] Favicon ou icône auto si URL fournie (optionnel, plus tard)
- [ ] Indicateur de force du mot de passe (faible / moyen / fort)

---

## 🔍 5. Recherche globale (Cmd+K)

- [ ] Modal de recherche full-text sur titres + tags + labels
- [ ] Navigation clavier (↑ ↓ Entrée)
- [ ] Résultats groupés par projet/catégorie
- [ ] Raccourci Cmd+K pour ouvrir

---

## ⚙️ 6. Paramètres

- [ ] Modale settings : changer le mot de passe maître
- [ ] Délai auto-lock configurable (1 / 5 / 15 / 30 min / jamais)
- [ ] **Export vault complet** → fichier `.vault` chiffré ChaCha20, mot de passe dédié
      Usage : backup ou migration vers un autre Mac uniquement
- [ ] **Import vault complet** → remplace le vault actuel (avec confirmation)
- [ ] Option : verrouiller si la fenêtre perd le focus

---

## 🎨 7. Polish UI (plus tard)

- [ ] Icône + couleur personnalisables à la création d'un projet (picker emoji + palette)
- [ ] Animation d'ouverture/fermeture des projets dans la sidebar
- [ ] Mode compact sidebar (icônes seules)
- [ ] Tri des notes (par date / alphabétique / favoris en premier)
