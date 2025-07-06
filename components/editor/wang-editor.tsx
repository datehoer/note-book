"use client"

import '@wangeditor/editor/dist/css/style.css'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Editor, Toolbar } from '@wangeditor/editor-for-react'
import { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import { useNotesStore } from '@/lib/store'

interface WangEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  editable?: boolean
  onEditorReady?: (editor: IDomEditor) => void
}

export function WangEditor({ 
  content, 
  onChange, 
  placeholder = "Start writing...",
  editable = true,
  onEditorReady
}: WangEditorProps) {
  const { viewMode } = useNotesStore()
  const [editor, setEditor] = useState<IDomEditor | null>(null)
  const [html, setHtml] = useState(content)
  const editorRef = useRef<IDomEditor | null>(null)
  const isCreatingRef = useRef(false)

  const toolbarConfig: Partial<IToolbarConfig> = {
    excludeKeys: [
      'group-video',
      'fullScreen'
    ]
  }
  
  const editorConfig: Partial<IEditorConfig> = {
    placeholder,
    readOnly: !editable,
    MENU_CONF: {}
  }

  // Convert content between HTML and markdown based on view mode
  useEffect(() => {
    if (viewMode === 'source') {
      // Convert HTML to markdown for source view
      setHtml(htmlToMarkdown(content))
    } else {
      // Use HTML for rendered view
      setHtml(content)
    }
  }, [viewMode, content])

  // Cleanup effect when view mode changes
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        try {
          if (typeof editorRef.current.destroy === 'function') {
            editorRef.current.destroy()
          }
        } catch (error) {
          console.warn('Error destroying editor:', error)
        }
      }
      editorRef.current = null
      setEditor(null)
      isCreatingRef.current = false
    }
  }, [viewMode])

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        try {
          if (typeof editorRef.current.destroy === 'function') {
            editorRef.current.destroy()
          }
        } catch (error) {
          console.warn('Error destroying editor:', error)
        }
      }
    }
  }, [])

  const handleChange = useCallback((editor: IDomEditor) => {
    const newHtml = editor.getHtml()
    setHtml(newHtml)
    
    if (viewMode === 'source') {
      // Convert back from markdown to HTML
      onChange(markdownToHtml(newHtml))
    } else {
      onChange(newHtml)
    }
  }, [viewMode, onChange])

  const handleCreated = useCallback((editor: IDomEditor) => {
    if (isCreatingRef.current || editorRef.current) {
      return
    }
    
    isCreatingRef.current = true
    editorRef.current = editor
    setEditor(editor)
    
    if (onEditorReady) {
      onEditorReady(editor)
    }
    
    isCreatingRef.current = false
  }, [onEditorReady])

  if (viewMode === 'source') {
    return (
      <div className="w-full bg-white rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <div className="p-4" style={{ minHeight: 'calc(100vh - 300px)' }}>
          <textarea
            value={htmlToMarkdown(content)}
            onChange={(e) => onChange(markdownToHtml(e.target.value))}
            placeholder={placeholder}
            readOnly={!editable}
            className="w-full bg-transparent border-none outline-none resize-none font-mono text-sm leading-relaxed"
            style={{ height: 'calc(100vh - 300px)' }}
            spellCheck={false}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
      <div style={{ border: '1px solid #ccc', zIndex: 100 }}>
        <Toolbar
          editor={editor}
          defaultConfig={toolbarConfig}
          mode="default"
          style={{ borderBottom: '1px solid #ccc' }}
        />
        <Editor
          defaultConfig={editorConfig}
          value={html}
          onCreated={handleCreated}
          onChange={handleChange}
          mode="default"
          style={{ height: 'calc(100vh - 300px)', overflowY: 'hidden' }}
        />
      </div>
    </div>
  )
}

// Simple HTML to markdown conversion
function htmlToMarkdown(html: string): string {
  if (!html) return ''
  
  let markdown = html
    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n')
    
    // Bold and italic
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    
    // Code
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi, '```\n$1\n```')
    
    // Lists
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '')
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    
    // Blockquotes
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n')
    
    // Paragraphs
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    
    // Line breaks
    .replace(/<br[^>]*\/?>/gi, '\n')
    
    // Remove remaining HTML tags
    .replace(/<[^>]*>/g, '')
    
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return markdown
}

// Simple markdown to HTML conversion
function markdownToHtml(markdown: string): string {
  if (!markdown) return ''
  
  let html = markdown
    // Headers
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
    .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
    
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h1-6]|<ul|<ol|<blockquote|<pre)(.+)$/gim, '<p>$1</p>')
    
    // Line breaks
    .replace(/\n/g, '<br>')

  return html
}

export type { WangEditorProps }