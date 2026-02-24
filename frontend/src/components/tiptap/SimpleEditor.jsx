import React, { useCallback, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Youtube from '@tiptap/extension-youtube'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Heading1, Heading2, List, ListOrdered, Quote, 
  Link as LinkIcon, Image as ImageIcon, Youtube as YoutubeIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo, Redo, X, Palette
} from 'lucide-react'
import classNames from 'classnames'

const Button = ({ onClick, isActive, disabled, children, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={classNames(
      "p-2 rounded sm:w-8 sm:h-8 h-10 w-10 flex items-center justify-center transition-colors",
      isActive 
        ? "bg-slate-900 text-white" 
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      disabled && "opacity-50 cursor-not-allowed"
    )}
  >
    {children}
  </button>
)

const Divider = () => <div className="w-px h-6 bg-slate-200 mx-1" />

const Toolbar = ({ editor, onImage, onVideo, onLink }) => {
  if (!editor) return null

  return (
    <div className="border-b border-slate-200 p-2 bg-white flex flex-wrap gap-1 items-center sticky top-0 z-10">
      <div className="flex flex-wrap gap-1">
        <Button 
          onClick={() => editor.chain().focus().toggleBold().run()} 
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold size={16} />
        </Button>
        <Button 
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic size={16} />
        </Button>
        <Button 
          onClick={() => editor.chain().focus().toggleUnderline().run()} 
          isActive={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon size={16} />
        </Button>
        <Button 
          onClick={() => editor.chain().focus().toggleStrike().run()} 
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </Button>
      </div>

      <Divider />

      <div className="flex flex-wrap gap-1 items-center">
         <div className="relative flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded cursor-pointer group" title="Text Color">
            <Palette size={16} />
            <input 
              type="color" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onInput={e => editor.chain().focus().setColor(e.target.value).run()}
              value={editor.getAttributes('textStyle').color || '#000000'}
            />
         </div>
      </div>

      <Divider />

      <div className="flex flex-wrap gap-1">
        <Button 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
        >
            <Heading1 size={16} />
        </Button>
        <Button 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
        >
            <Heading2 size={16} />
        </Button>
      </div>

      <Divider />

      <div className="flex flex-wrap gap-1">
        <Button 
            onClick={() => editor.chain().focus().toggleBulletList().run()} 
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
        >
            <List size={16} />
        </Button>
        <Button 
            onClick={() => editor.chain().focus().toggleOrderedList().run()} 
            isActive={editor.isActive('orderedList')}
            title="Ordered List"
        >
            <ListOrdered size={16} />
        </Button>
        <Button 
            onClick={() => editor.chain().focus().toggleBlockquote().run()} 
            isActive={editor.isActive('blockquote')}
            title="Quote"
        >
            <Quote size={16} />
        </Button>
      </div>

      <Divider />

      <div className="flex flex-wrap gap-1">
        <Button 
            onClick={() => editor.chain().focus().setTextAlign('left').run()} 
            isActive={editor.isActive({ textAlign: 'left' })}
            title="Align Left"
        >
            <AlignLeft size={16} />
        </Button>
        <Button 
            onClick={() => editor.chain().focus().setTextAlign('center').run()} 
            isActive={editor.isActive({ textAlign: 'center' })}
            title="Align Center"
        >
            <AlignCenter size={16} />
        </Button>
        <Button 
            onClick={() => editor.chain().focus().setTextAlign('right').run()} 
            isActive={editor.isActive({ textAlign: 'right' })}
            title="Align Right"
        >
            <AlignRight size={16} />
        </Button>
        <Button 
            onClick={() => editor.chain().focus().setTextAlign('justify').run()} 
            isActive={editor.isActive({ textAlign: 'justify' })}
            title="Justify"
        >
            <AlignJustify size={16} />
        </Button>
      </div>

      <Divider />

      <div className="flex flex-wrap gap-1">
        <Button 
            onClick={onLink} 
            isActive={editor.isActive('link')}
            title="Insert Link"
        >
            <LinkIcon size={16} />
        </Button>
        <Button onClick={onImage} title="Insert Image">
            <ImageIcon size={16} />
        </Button>
        <Button onClick={onVideo} title="Insert Video">
            <YoutubeIcon size={16} />
        </Button>
      </div>

      <div className="flex-grow" />

      <div className="flex flex-wrap gap-1">
        <Button 
            onClick={() => editor.chain().focus().undo().run()} 
            disabled={!editor.can().undo()}
            title="Undo"
        >
            <Undo size={16} />
        </Button>
        <Button 
            onClick={() => editor.chain().focus().redo().run()} 
            disabled={!editor.can().redo()}
            title="Redo"
        >
            <Redo size={16} />
        </Button>
      </div>
    </div>
  )
}

export const SimpleEditor = ({ content, onChange, placeholder = 'Start writing...' }) => {
  const [modal, setModal] = useState({ open: false, type: '', value: '' })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        history: { depth: 20 }, // Limit undo history to save memory
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-indigo-600 hover:text-indigo-800 underline' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-xl shadow-md border border-slate-200 my-6 max-w-full' },
      }),
      Youtube.configure({
        controls: false,
        height: 480,
        width: 640,
        HTMLAttributes: { 
          class: 'rounded-xl shadow-lg border border-slate-200 my-6 w-full aspect-video',
          loading: 'lazy'
        },
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-slate prose-lg max-w-none focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })
  
  // Handling external content updates if needed (e.g. data loaded later)
  // Note: This is a simple implementation. For full controlled component, use useEffect.
  React.useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
       // Only set content if it's significantly different to avoid cursor jumps
       // But for initial load this is important.
       // We can check if editor is empty.
       if (editor.isEmpty) {
           editor.commands.setContent(content)
       }
    }
  }, [content, editor])

  const openModal = (type) => setModal({ open: true, type, value: '' })
  const closeModal = () => setModal({ open: false, type: '', value: '' })

  const handleModalSubmit = () => {
    if (!editor) return

    const { type, value } = modal
    if (!value) {
        closeModal()
        return
    }

    switch(type) {
        case 'image':
            editor.chain().focus().setImage({ src: value }).run()
            break
        case 'video':
            // Support URL or iframe source
            let src = value
            if (value.includes('<iframe')) {
                const match = value.match(/src="([^"]+)"/)
                if (match && match[1]) src = match[1]
            }
            editor.chain().focus().setYoutubeVideo({ src }).run()
            break
        case 'link':
            editor.chain().focus().extendMarkRange('link').setLink({ href: value }).run()
            break
    }
    closeModal()
  }

  const getModalTitle = () => {
    switch(modal.type) {
        case 'image': return 'Insert Image'
        case 'video': return 'Insert Video'
        case 'link': return 'Insert Link'
        default: return ''
    }
  }

  const getModalPlaceholder = () => {
    switch(modal.type) {
        case 'image': return 'https://example.com/image.jpg'
        case 'video': return 'https://www.youtube.com/watch?v=...'
        case 'link': return 'https://example.com'
        default: return ''
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full relative">
      <Toolbar 
        editor={editor}
        onImage={() => openModal('image')}
        onVideo={() => openModal('video')}
        onLink={() => openModal('link')}
      />
      <div className="flex-1 overflow-y-auto bg-slate-50/30 custom-scrollbar" onClick={() => editor?.chain().focus().run()}>
        <EditorContent editor={editor} className="h-full" />
      </div>

      {modal.open && (
        <div className="absolute inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/10 backdrop-blur-sm pt-20">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-4 animate-scale-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800">{getModalTitle()}</h3>
                    <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                </div>
                <input
                    autoFocus
                    className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-4"
                    placeholder={getModalPlaceholder()}
                    value={modal.value}
                    onChange={e => setModal({ ...modal, value: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleModalSubmit()}
                />
                <div className="flex justify-end gap-2">
                    <button onClick={closeModal} className="px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                    <button onClick={handleModalSubmit} className="px-3 py-1 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-sm">Insert</button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
