'use client'

import { useState, useCallback } from 'react'
import { useAppStore, useSelectedNote, useSelectedCategory, useSelectedProject } from '@/stores/appStore'
import { useClipboard } from '@/hooks/useClipboard'
import { RichNoteEditor, RichNotePreview } from '@/components/editor/RichNoteEditor'
import type { NoteType } from '@/types/vault.types'
import {
  NOTE_TYPE_LABELS, NOTE_TYPE_ICONS, NOTE_TYPE_COLORS,
  NOTE_TYPE_PLACEHOLDERS, NOTE_TYPE_LABEL_PLACEHOLDERS,
} from '@/types/vault.types'

// ─── NoteEditor ────────────────────────────────────────────────────────────────

const NOTE_TYPES: NoteType[] = ['api_key', 'password', 'env_var', 'dependency', 'url', 'note']

const SENSITIVE_TYPES: NoteType[] = ['api_key', 'password']

// ── Badge type ────────────────────────────────────────────────────────────────
function TypeBadge({ type, selected, onClick }: { type: NoteType; selected: boolean; onClick: () => void }) {
  const color = NOTE_TYPE_COLORS[type]
  return (
    <button
      type="button"
      onClick={onClick}
      className="note-type-badge transition-all"
      style={{
        color: selected ? color : '#5a6480',
        borderColor: selected ? color : 'transparent',
        border: '1px solid',
        backgroundColor: selected ? `${color}18` : 'transparent',
      }}
    >
      {NOTE_TYPE_ICONS[type]} {NOTE_TYPE_LABELS[type]}
    </button>
  )
}

// ── Champ valeur sensible (masqué par défaut) ──────────────────────────────────
function SensitiveField({ value, onChange, placeholder }: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [revealed, setRevealed] = useState(false)
  const { copy, isCopied } = useClipboard()

  return (
    <div className="relative">
      <input
        type={revealed ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input-terminal pr-20 font-mono selectable"
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => copy(value)}
          className="text-vault-text-dim/60 hover:text-vault-accent text-xs transition-colors"
          title="Copier (effacé après 30s)"
        >
          {isCopied ? '✓' : '⎘'}
        </button>
        <button
          type="button"
          onClick={() => setRevealed(r => !r)}
          className="text-vault-text-dim/60 hover:text-vault-accent text-xs transition-colors"
          title={revealed ? 'Masquer' : 'Révéler'}
        >
          {revealed ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  )
}

// ── Vue lecture d'une valeur sensible ─────────────────────────────────────────
function SensitiveValue({ value, label }: { value: string; label: string }) {
  const [revealed, setRevealed] = useState(false)
  const { copy, isCopied } = useClipboard()

  return (
    <div className="space-y-1">
      {label && (
        <div className="text-vault-text-dim text-xs font-mono">{label}</div>
      )}
      <div className="flex items-center gap-2 bg-vault-muted rounded px-3 py-2 border border-vault-border group">
        <code className={`flex-1 text-sm font-mono selectable transition-all ${!revealed ? 'masked-value' : 'text-vault-text-bright'}`}>
          {value || '(vide)'}
        </code>
        <button
          onClick={() => copy(value)}
          className="text-vault-text-dim hover:text-vault-accent text-xs transition-colors shrink-0"
          title="Copier (auto-effacé après 30s)"
        >
          {isCopied ? <span className="text-vault-accent">✓ copié</span> : '⎘'}
        </button>
        <button
          onClick={() => setRevealed(r => !r)}
          className="text-vault-text-dim hover:text-vault-accent text-xs transition-colors shrink-0"
        >
          {revealed ? '🙈' : '👁'}
        </button>
      </div>
      {isCopied && (
        <p className="text-vault-text-dim/60 text-xs">Presse-papiers effacé dans 30s</p>
      )}
    </div>
  )
}

// ── Formulaire création / édition ─────────────────────────────────────────────
interface NoteFormProps {
  projectId: string
  categoryId: string
  noteId?: string
  initial?: { title: string; content: string; label: string; notes: string; type: NoteType; tags: string[]; favorite: boolean }
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
}

function NoteForm({ projectId, categoryId, noteId, initial, onSave, onCancel, onDelete }: NoteFormProps){
  const { createNote, updateNote } = useAppStore()

  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [label, setLabel] = useState(initial?.label ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [type, setType] = useState<NoteType>(initial?.type ?? 'note')
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(', '))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = useCallback(async () => {
    if (!title.trim()) { setError('Le titre est requis'); return }
    setIsLoading(true)
    setError('')

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    const payload = { title: title.trim(), content, label, notes, type, tags, favorite: initial?.favorite ?? false }

    try {
      if (noteId) {
        await updateNote(projectId, categoryId, noteId, payload)
      } else {
        await createNote(projectId, categoryId, payload)
      }
      onSave()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    }
    setIsLoading(false)
  }, [title, content, label, notes, type, tagsInput, noteId, projectId, categoryId, createNote, updateNote, onSave, initial?.favorite])

  const isSensitive = SENSITIVE_TYPES.includes(type)
  const isNote = type === 'note'

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-vault-border shrink-0">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titre..."
          className="bg-transparent text-vault-text-bright text-base font-semibold focus:outline-none selectable flex-1"
          autoFocus={!noteId}
        />
        <div className="flex items-center gap-2 shrink-0">
          {onDelete && <button onClick={onDelete} className="btn-danger">supprimer</button>}
          <button onClick={onCancel} className="btn-terminal">annuler</button>
          <button onClick={handleSave} disabled={isLoading} className="btn-primary">
            {isLoading ? '...' : 'enregistrer'}
          </button>
        </div>
      </div>

      {/* Type selector */}
      <div className="flex items-center gap-1.5 px-5 py-2 border-b border-vault-border shrink-0 flex-wrap">
        {NOTE_TYPES.map(t => (
          <TypeBadge key={t} type={t} selected={type === t} onClick={() => setType(t)} />
        ))}
      </div>

      {isNote ? (
        /* ── Mode note riche : l'éditeur prend tout l'espace ── */
        <>
          <div className="flex-1 overflow-hidden">
            <RichNoteEditor
              initialContent={content}
              onChange={setContent}
              placeholder="Commencez à écrire votre note..."
            />
          </div>
          {/* Tags + erreur en bas */}
          <div className="px-5 py-2 border-t border-vault-border shrink-0 space-y-2">
            {error && (
              <div className="text-vault-danger text-xs py-1 px-3 bg-vault-danger/10 border border-vault-danger/30 rounded">
                ✗ {error}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-vault-text-dim text-xs shrink-0">Tags :</span>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                className="input-terminal py-1 text-xs selectable"
                placeholder="prod, api, important..."
              />
            </div>
          </div>
        </>
      ) : (
        /* ── Mode champs structurés (api_key, password, etc.) ── */
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Label */}
          <div>
            <label className="block text-vault-text-dim text-xs mb-1.5">
              {type === 'env_var' ? 'Nom de la variable' : type === 'dependency' ? 'Version' : 'Label / Identifiant'}
            </label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="input-terminal"
              placeholder={NOTE_TYPE_LABEL_PLACEHOLDERS[type]}
            />
          </div>

          {/* Valeur principale */}
          <div>
            <label className="block text-vault-text-dim text-xs mb-1.5">
              {type === 'env_var' ? 'Valeur' : type === 'url' ? 'URL' : 'Valeur principale'}
            </label>
            {isSensitive ? (
              <SensitiveField value={content} onChange={setContent} placeholder={NOTE_TYPE_PLACEHOLDERS[type]} />
            ) : (
              <input
                type="text"
                value={content}
                onChange={e => setContent(e.target.value)}
                className="input-terminal selectable"
                placeholder={NOTE_TYPE_PLACEHOLDERS[type]}
              />
            )}
          </div>

          {/* Notes libres */}
          <div>
            <label className="block text-vault-text-dim text-xs mb-1.5">Notes additionnelles</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input-terminal resize-none h-24 selectable"
              placeholder="Contexte, infos supplémentaires..."
              spellCheck={false}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-vault-text-dim text-xs mb-1.5">Tags</label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              className="input-terminal selectable"
              placeholder="prod, stripe, paiement (séparés par virgule)"
            />
          </div>

          {error && (
            <div className="text-vault-danger text-xs py-1.5 px-3 bg-vault-danger/10 border border-vault-danger/30 rounded">
              ✗ {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Liste des notes d'une catégorie ───────────────────────────────────────────
function NoteList(){
  const { selection, selectNote, setEditingNote } = useAppStore()
  const project = useSelectedProject()
  const category = useSelectedCategory()

  if (!category || !project) {
    return (
      <div className="flex-1 flex items-center justify-center text-vault-text-dim">
        <p className="text-sm">Sélectionnez un projet dans la sidebar</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 py-3 border-b border-vault-border flex items-center justify-between shrink-0">
        <div>
          <div className="text-vault-text-dim text-xs">{project.icon} {project.name}</div>
          <h2 className="text-vault-text-bright font-semibold text-sm">{category.icon} {category.name}</h2>
        </div>
        <button onClick={() => setEditingNote('new')} className="btn-primary">+ note</button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-vault-border">
        {category.notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-vault-text-dim text-sm">
            <p>Aucune note dans cette catégorie</p>
          </div>
        ) : (
          category.notes.map(note => {
            const color = NOTE_TYPE_COLORS[note.type]
            return (
              <div
                key={note.id}
                onClick={() => { selectNote(project.id, category.id, note.id); window.vault.pingActivity() }}
                className={`px-5 py-3 cursor-pointer hover:bg-vault-muted transition-colors ${selection.noteId === note.id ? 'bg-vault-muted' : ''}`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  {note.favorite && <span className="text-sm">⭐</span>}
                  <span className="text-vault-text-bright text-sm font-medium truncate flex-1">{note.title}</span>
                  <span
                    className="note-type-badge text-xs shrink-0"
                    style={{ color, border: `1px solid ${color}40`, backgroundColor: `${color}10` }}
                  >
                    {NOTE_TYPE_ICONS[note.type]} {NOTE_TYPE_LABELS[note.type]}
                  </span>
                </div>
                {note.type === 'note' && note.content ? (
                  <div className="text-vault-text-dim/60 text-xs truncate selectable">
                    <RichNotePreview content={note.content} maxChars={80} />
                  </div>
                ) : note.label ? (
                  <div className="text-vault-text-dim text-xs font-mono truncate">{note.label}</div>
                ) : null}
                {note.tags.length > 0 && (
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {note.tags.map(tag => (
                      <span key={tag} className="text-vault-accent/50 text-xs">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── NoteEditor (root) ─────────────────────────────────────────────────────────
export function NoteEditor(){
  const { selection, editingNoteId, setEditingNote, deleteNote, toggleFavorite } = useAppStore()
  const selectedNote = useSelectedNote()
  const project = useSelectedProject()
  const category = useSelectedCategory()
  const { copy, isCopied } = useClipboard()

  // Création d'une nouvelle note
  if (editingNoteId === 'new' && selection.projectId && selection.categoryId) {
    return (
      <NoteForm
        projectId={selection.projectId}
        categoryId={selection.categoryId}
        onSave={() => setEditingNote(null)}
        onCancel={() => setEditingNote(null)}
      />
    )
  }

  // Édition d'une note existante
  if (editingNoteId && selectedNote && selection.projectId && selection.categoryId) {
    return (
      <NoteForm
        projectId={selection.projectId}
        categoryId={selection.categoryId}
        noteId={selectedNote.id}
        initial={selectedNote}
        onSave={() => setEditingNote(null)}
        onCancel={() => setEditingNote(null)}
        onDelete={async () => {
          await deleteNote(selection.projectId!, selection.categoryId!, selectedNote.id)
        }}
      />
    )
  }

  // Vue lecture d'une note
  if (selectedNote && selection.projectId && selection.categoryId) {
    const color = NOTE_TYPE_COLORS[selectedNote.type]
    const isSensitive = SENSITIVE_TYPES.includes(selectedNote.type)

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header note */}
        <div className="px-5 py-3 border-b border-vault-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => toggleFavorite(selection.projectId!, selection.categoryId!, selectedNote.id)}
              className={`shrink-0 transition-colors ${selectedNote.favorite ? 'text-yellow-400' : 'text-vault-text-dim/30 hover:text-yellow-400/60'}`}
              title="Favori (⌘D)"
            >
              ⭐
            </button>
            <h1 className="text-vault-text-bright font-semibold truncate">{selectedNote.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span
              className="note-type-badge"
              style={{ color, border: `1px solid ${color}40`, backgroundColor: `${color}10` }}
            >
              {NOTE_TYPE_ICONS[selectedNote.type]} {NOTE_TYPE_LABELS[selectedNote.type]}
            </span>
            <button onClick={() => setEditingNote(selectedNote.id)} className="btn-terminal">
              éditer
            </button>
          </div>
        </div>

        {/* Contenu — note riche : l'éditeur en lecture seule prend tout l'espace */}
        {selectedNote.type === 'note' ? (
          <div className="flex-1 overflow-hidden">
            <RichNoteEditor
              initialContent={selectedNote.content}
              onChange={() => {}}
              readOnly
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Valeur principale */}
            {isSensitive ? (
              <SensitiveValue value={selectedNote.content} label={selectedNote.label} />
            ) : (
              <div>
                {selectedNote.label && (
                  <div className="text-vault-text-dim text-xs mb-1 font-mono">{selectedNote.label}</div>
                )}
                <div className="flex items-start gap-2">
                  <pre className="text-vault-text text-sm font-mono leading-relaxed whitespace-pre-wrap flex-1 selectable">
                    {selectedNote.content}
                  </pre>
                  <button
                    onClick={() => copy(selectedNote.content)}
                    className="text-vault-text-dim hover:text-vault-accent text-xs transition-colors shrink-0"
                    title="Copier"
                  >
                    {isCopied ? <span className="text-vault-accent">✓</span> : '⎘'}
                  </button>
                </div>
              </div>
            )}

            {/* Notes additionnelles */}
            {selectedNote.notes && (
              <div>
                <div className="text-vault-text-dim text-xs mb-1.5">Notes</div>
                <pre className="text-vault-text-dim text-sm font-mono leading-relaxed whitespace-pre-wrap selectable">
                  {selectedNote.notes}
                </pre>
              </div>
            )}

            {/* Tags */}
            {selectedNote.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {selectedNote.tags.map(tag => (
                  <span key={tag} className="text-vault-accent text-xs">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-2 border-t border-vault-border text-vault-text-dim/50 text-xs shrink-0">
          Modifié {new Date(selectedNote.updatedAt).toLocaleString('fr-FR')}
        </div>
      </div>
    )
  }

  // Liste des notes de la catégorie sélectionnée
  return <NoteList />
}
