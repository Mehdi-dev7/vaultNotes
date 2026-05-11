'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useCallback } from 'react'

// ─── RichNoteEditor ────────────────────────────────────────────────────────────
// Éditeur de texte riche pour les notes de type "note".
// Tiptap avec StarterKit + Color + TextStyle.
//
// Format de stockage : JSON Tiptap (stringifié).
// Rétrocompat : si content est du texte brut, on le charge comme paragraphe.

interface RichNoteEditorProps {
  initialContent: string
  onChange: (json: string) => void
  readOnly?: boolean
  placeholder?: string
}

// ─── Couleurs disponibles ─────────────────────────────────────────────────────
const COLORS = [
  { label: 'Rouge',  value: '#ff4757', bg: '#ff475720', border: '#ff4757' },
  { label: 'Vert',   value: '#00ff88', bg: '#00ff8820', border: '#00ff88' },
  { label: 'Bleu',   value: '#74b9ff', bg: '#74b9ff20', border: '#74b9ff' },
  { label: 'Jaune',  value: '#ffd32a', bg: '#ffd32a20', border: '#ffd32a' },
]

// ─── Toolbar ──────────────────────────────────────────────────────────────────
function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null

  const btnBase = 'flex items-center justify-center px-2.5 py-1.5 rounded text-sm font-mono transition-all duration-100 cursor-pointer select-none'
  const btnActive = 'bg-vault-accent/15 text-vault-accent border border-vault-accent/40'
  const btnInactive = 'text-vault-text-dim hover:text-vault-text hover:bg-vault-muted border border-transparent'

  const isActive = (type: string, attrs?: Record<string, unknown>) =>
    editor.isActive(type, attrs) ? btnActive : btnInactive

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-vault-border bg-vault-surface shrink-0 flex-wrap">

      {/* Tailles de texte */}
      <div className="flex items-center gap-1 pr-2 mr-1 border-r border-vault-border">
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run() }}
          className={`${btnBase} ${isActive('heading', { level: 1 })} text-base font-bold`}
          title="Gros sous-titre (H1)"
        >
          H1
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run() }}
          className={`${btnBase} ${isActive('heading', { level: 2 })}`}
          title="Titre moyen — important (H2)"
        >
          H2
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().setParagraph().run() }}
          className={`${btnBase} ${isActive('paragraph')}`}
          title="Texte standard"
        >
          ¶
        </button>
      </div>

      {/* Formatage */}
      <div className="flex items-center gap-1 pr-2 mr-1 border-r border-vault-border">
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
          className={`${btnBase} ${isActive('bold')} font-bold`}
          title="Gras"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
          className={`${btnBase} ${isActive('italic')} italic`}
          title="Italique"
        >
          I
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleCode().run() }}
          className={`${btnBase} ${isActive('code')}`}
          title="Code inline"
        >
          {'</>'}
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }}
          className={`${btnBase} ${isActive('bulletList')}`}
          title="Liste à puces"
        >
          •—
        </button>
      </div>

      {/* Couleurs */}
      <div className="flex items-center gap-1.5">
        <span className="text-vault-text-dim/50 text-xs mr-0.5">couleur :</span>
        {COLORS.map(color => {
          const isColorActive = editor.isActive('textStyle', { color: color.value })
          return (
            <button
              key={color.value}
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                if (isColorActive) {
                  editor.chain().focus().unsetColor().run()
                } else {
                  editor.chain().focus().setColor(color.value).run()
                }
              }}
              className="w-5 h-5 rounded-full transition-all duration-100"
              style={{
                backgroundColor: color.value,
                boxShadow: isColorActive ? `0 0 0 2px #0a0b0d, 0 0 0 4px ${color.value}` : 'none',
                transform: isColorActive ? 'scale(1.2)' : 'scale(1)',
              }}
              title={`Couleur : ${color.label}`}
            />
          )
        })}
        {/* Effacer la couleur */}
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetColor().run() }}
          className={`${btnBase} ${btnInactive} text-xs`}
          title="Effacer la couleur"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ─── Charge le contenu initial ────────────────────────────────────────────────
function parseContent(raw: string): object | string {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    // Vérifie que c'est du JSON Tiptap (type: 'doc')
    if (parsed?.type === 'doc') return parsed
  } catch {
    // Texte brut → on le laisse tel quel (Tiptap le gère)
  }
  return raw
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function RichNoteEditor({ initialContent, onChange, readOnly = false, placeholder = 'Écrivez votre note...' }: RichNoteEditorProps) {
  const content = parseContent(initialContent)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Placeholder.configure({ placeholder }),
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()))
    },
    editorProps: {
      attributes: {
        class: 'selectable outline-none',
        spellcheck: 'false',
      },
    },
  })

  // Sync si le contenu change depuis l'extérieur (ex: chargement d'une autre note)
  useEffect(() => {
    if (!editor || readOnly) return
    const incoming = parseContent(initialContent)
    const current = JSON.stringify(editor.getJSON())
    if (JSON.stringify(incoming) !== current) {
      editor.commands.setContent(incoming || '')
    }
  }, [initialContent]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="tiptap-editor flex flex-col h-full overflow-hidden">
      {!readOnly && <Toolbar editor={editor} />}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  )
}

// ─── Rendu statique (lecture seule, pas d'instance Tiptap) ───────────────────
// Utilisé dans la liste des notes pour prévisualiser le contenu.
export function RichNotePreview({ content, maxChars = 120 }: { content: string; maxChars?: number }) {
  try {
    const doc = JSON.parse(content)
    if (doc?.type !== 'doc') throw new Error()
    // Extrait le texte brut des nœuds
    const text = doc.content
      ?.flatMap((node: { type: string; text?: string; content?: { text?: string }[] }) =>
        node.type === 'text' ? [node.text ?? ''] : (node.content?.map((c: { text?: string }) => c.text ?? '') ?? [])
      )
      .join(' ')
      .trim()
    return <>{text?.slice(0, maxChars)}{text?.length > maxChars ? '…' : ''}</>
  } catch {
    return <>{content.slice(0, maxChars)}{content.length > maxChars ? '…' : ''}</>
  }
}
