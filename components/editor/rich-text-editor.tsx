"use client"

import { Editor } from 'draft-js'
import { EditorState, ContentState, RichUtils, getDefaultKeyBinding, KeyBindingUtil } from 'draft-js'
import { useCallback, useEffect, useState, useRef } from 'react'
import { useNotesStore } from '@/lib/store'
import { draftToMarkdown, markdownToDraft } from '@/lib/markdown-converter'
import 'draft-js/dist/Draft.css'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  editable?: boolean
  onEditorReady?: (editor: any) => void
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = "Start writing...",
  editable = true,
  onEditorReady
}: RichTextEditorProps) {
  const { viewMode } = useNotesStore()
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty())
  const editorRef = useRef<Editor>(null)
  const contentRef = useRef<string>(content)

  // Initialize editor with content only once
  useEffect(() => {
    if (content && content !== contentRef.current) {
      try {
        const contentState = ContentState.createFromText(content)
        const newEditorState = EditorState.createWithContent(contentState)
        setEditorState(newEditorState)
        contentRef.current = content
      } catch (error) {
        console.error('Error initializing editor content:', error)
      }
    }
  }, [content])

  const handleEditorStateChange = useCallback((newEditorState: EditorState) => {
    setEditorState(newEditorState)
    
    // Only call onChange if content actually changed
    const currentContent = newEditorState.getCurrentContent()
    const contentAsText = currentContent.getPlainText()
    
    if (contentAsText !== contentRef.current) {
      contentRef.current = contentAsText
      onChange(contentAsText)
    }
  }, [onChange])

  // Handle keyboard shortcuts
  const handleKeyCommand = useCallback((command: string, editorState: EditorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command)
    if (newState) {
      handleEditorStateChange(newState)
      return 'handled'
    }
    return 'not-handled'
  }, [handleEditorStateChange])

  // Map key bindings
  const mapKeyToEditorCommand = useCallback((e: React.KeyboardEvent) => {
    if (e.keyCode === 9 /* TAB */) {
      const newEditorState = RichUtils.onTab(e as any, editorState, 4)
      if (newEditorState !== editorState) {
        handleEditorStateChange(newEditorState)
      }
      return null
    }
    return getDefaultKeyBinding(e as any)
  }, [editorState, handleEditorStateChange])

  // Focus handler
  const focusEditor = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.focus()
    }
  }, [])

  // Editor commands that can be used by the toolbar
  const commands = useCallback(() => {
    return {
      toggleBold: () => {
        const newState = RichUtils.toggleInlineStyle(editorState, 'BOLD')
        handleEditorStateChange(newState)
        setTimeout(focusEditor, 0)
      },
      toggleItalic: () => {
        const newState = RichUtils.toggleInlineStyle(editorState, 'ITALIC')
        handleEditorStateChange(newState)
        setTimeout(focusEditor, 0)
      },
      toggleUnderline: () => {
        const newState = RichUtils.toggleInlineStyle(editorState, 'UNDERLINE')
        handleEditorStateChange(newState)
        setTimeout(focusEditor, 0)
      },
      toggleCode: () => {
        const newState = RichUtils.toggleInlineStyle(editorState, 'CODE')
        handleEditorStateChange(newState)
        setTimeout(focusEditor, 0)
      },
      toggleStrikethrough: () => {
        const newState = RichUtils.toggleInlineStyle(editorState, 'STRIKETHROUGH')
        handleEditorStateChange(newState)
        setTimeout(focusEditor, 0)
      },
      setBlockquote: () => {
        const newState = RichUtils.toggleBlockType(editorState, 'blockquote')
        handleEditorStateChange(newState)
        setTimeout(focusEditor, 0)
      },
      setCodeBlock: () => {
        const newState = RichUtils.toggleBlockType(editorState, 'code-block')
        handleEditorStateChange(newState)
        setTimeout(focusEditor, 0)
      },
      toggleBulletList: () => {
        const newState = RichUtils.toggleBlockType(editorState, 'unordered-list-item')
        handleEditorStateChange(newState)
        setTimeout(focusEditor, 0)
      },
      toggleOrderedList: () => {
        const newState = RichUtils.toggleBlockType(editorState, 'ordered-list-item')
        handleEditorStateChange(newState)
        setTimeout(focusEditor, 0)
      },
      setHeading: (level: 1 | 2 | 3) => {
        const blockType = level === 1 ? 'header-one' : level === 2 ? 'header-two' : 'header-three'
        const newState = RichUtils.toggleBlockType(editorState, blockType)
        handleEditorStateChange(newState)
        setTimeout(focusEditor, 0)
      },
      setParagraph: () => {
        const newState = RichUtils.toggleBlockType(editorState, 'unstyled')
        handleEditorStateChange(newState)
        setTimeout(focusEditor, 0)
      },
      focus: focusEditor,
      getSelection: () => editorState.getSelection(),
      isActive: (style: string) => {
        const currentInlineStyle = editorState.getCurrentInlineStyle()
        const blockType = RichUtils.getCurrentBlockType(editorState)
        
        if (style === 'bold') {
          return currentInlineStyle.has('BOLD')
        }
        if (style === 'italic') {
          return currentInlineStyle.has('ITALIC')
        }
        if (style === 'underline') {
          return currentInlineStyle.has('UNDERLINE')
        }
        if (style === 'code') {
          return currentInlineStyle.has('CODE')
        }
        if (style === 'strikethrough') {
          return currentInlineStyle.has('STRIKETHROUGH')
        }
        if (style === 'bullet-list') {
          return blockType === 'unordered-list-item'
        }
        if (style === 'ordered-list') {
          return blockType === 'ordered-list-item'
        }
        if (style === 'header-1') {
          return blockType === 'header-one'
        }
        if (style === 'header-2') {
          return blockType === 'header-two'
        }
        if (style === 'header-3') {
          return blockType === 'header-three'
        }
        if (style === 'paragraph') {
          return blockType === 'unstyled'
        }
        if (style === 'blockquote') {
          return blockType === 'blockquote'
        }
        if (style === 'code-block') {
          return blockType === 'code-block'
        }
        
        return false
      },
    }
  }, [editorState, handleEditorStateChange, focusEditor])

  // Expose commands to parent component
  useEffect(() => {
    const editorObject = {
      commands: {
        custom: commands()
      }
    }
    if (onEditorReady) {
      onEditorReady(editorObject)
    }
  }, [commands, onEditorReady])

  if (viewMode === 'source') {
    return (
      <div className="w-full bg-white rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <div className="min-h-[400px] p-4">
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            readOnly={!editable}
            className="w-full h-[400px] bg-transparent border-none outline-none resize-none font-mono text-sm leading-relaxed"
            spellCheck={false}
          />
        </div>
      </div>
    )
  }

  return (
    <div 
      className="w-full bg-white rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
      onClick={focusEditor}
    >
      <style jsx global>{`
        .public-DraftStyleDefault-block {
          margin: 1em 0;
        }
        .public-DraftStyleDefault-block[data-block="true"] {
          margin: 0.5em 0;
        }
        .public-DraftEditor-content h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.67em 0;
        }
        .public-DraftEditor-content h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.75em 0;
        }
        .public-DraftEditor-content h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin: 0.83em 0;
        }
        .public-DraftEditor-content blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1em;
          margin: 1em 0;
          color: #6b7280;
          font-style: italic;
        }
        .public-DraftEditor-content .public-DraftStyleDefault-pre {
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          padding: 1rem;
          font-family: 'Courier New', monospace;
          white-space: pre-wrap;
          overflow-x: auto;
        }
        .public-DraftEditor-content code {
          background-color: #f3f4f6;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: 'Courier New', monospace;
          font-size: 0.875em;
        }
        .public-DraftEditor-content [data-text="true"] span[style*="text-decoration: line-through"] {
          text-decoration: line-through;
        }
      `}</style>
      <div className="min-h-[400px] p-4 prose prose-lg prose-gray max-w-none">
        <Editor
          ref={editorRef}
          editorState={editorState}
          onChange={handleEditorStateChange}
          handleKeyCommand={handleKeyCommand}
          keyBindingFn={mapKeyToEditorCommand}
          placeholder={placeholder}
          readOnly={!editable}
          spellCheck={true}
          customStyleMap={{
            'STRIKETHROUGH': {
              textDecoration: 'line-through',
            },
          }}
        />
      </div>
    </div>
  )
}

export type { RichTextEditorProps }