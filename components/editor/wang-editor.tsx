"use client"

import '@wangeditor/editor/dist/css/style.css'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Editor, Toolbar } from '@wangeditor/editor-for-react'
import { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import { useNotesStore } from '@/lib/store'
import { 
  safeOperation, 
  validateEditorContent, 
  sanitizeContent,
  preprocessImportContent,
  editorDebugger 
} from '@/lib/editor-debug-utils'

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
  const isUpdatingRef = useRef(false)
  const lastContentRef = useRef(content)

  const toolbarConfig: Partial<IToolbarConfig> = {
    excludeKeys: [
      'group-video',
      'fullScreen'
    ]
  }
  
  const editorConfig: Partial<IEditorConfig> = {
    placeholder,
    readOnly: !editable,
    MENU_CONF: {},
    // Add configuration to prevent path errors
    autoFocus: false,
    scroll: true,
    // Ensure proper handling of operations
    maxLength: 100000,
    // Add custom validation
    customAlert: (info: string, type: string) => {
      console.warn('Editor alert:', type, info)
    },
    // Add onCreated callback for better error handling
    onCreated: (editor: IDomEditor) => {
      console.log('Editor created successfully')
    },
    // Add onChange callback for better error tracking
    onChange: (editor: IDomEditor) => {
      try {
        // Validate editor state before processing changes
        if (!editor || typeof editor.getHtml !== 'function') {
          console.warn('Invalid editor state in onChange')
          return
        }
        
        const html = editor.getHtml()
        if (typeof html !== 'string') {
          console.warn('Invalid HTML from editor in onChange')
          return
        }
        
        console.debug('Editor onChange successfully processed')
      } catch (error) {
        console.error('Error in editor onChange:', error)
      }
    }
  }

  // Safe content update with validation and preprocessing
  const safeUpdateContent = useCallback((newContent: string) => {
    if (isUpdatingRef.current) return
    
    return safeOperation(() => {
      isUpdatingRef.current = true
      
      try {
        // Preprocess content to handle any problematic structures
        let processedContent = newContent
        
        // Check if content might contain operations or complex structures
        if (typeof newContent === 'string' && newContent.includes('"operations"')) {
          console.warn('Detected content with operations, preprocessing...')
          try {
            const parsedContent = JSON.parse(newContent)
            processedContent = JSON.stringify(preprocessImportContent(parsedContent))
          } catch (e) {
            // If JSON parsing fails, treat as regular string
            processedContent = sanitizeContent(newContent)
          }
        }
        
        // Validate content before updating
        if (!validateEditorContent(processedContent)) {
          console.warn('Invalid content detected, using sanitized version')
          processedContent = sanitizeContent(processedContent || lastContentRef.current || '')
        }
        
        if (typeof processedContent !== 'string') {
          console.warn('Invalid content type, using fallback')
          processedContent = lastContentRef.current || '<p><br></p>'
        }
        
        if (viewMode === 'source') {
          setHtml(htmlToMarkdown(processedContent))
        } else {
          setHtml(processedContent)
        }
        
        lastContentRef.current = processedContent
      } catch (error) {
        console.error('Error in safeUpdateContent:', error)
        // Fallback to sanitized content
        const fallbackContent = sanitizeContent(lastContentRef.current || '<p><br></p>')
        setHtml(fallbackContent)
        lastContentRef.current = fallbackContent
      } finally {
        isUpdatingRef.current = false
      }
    }, 'safeUpdateContent', { content: newContent })
  }, [viewMode])

  // Convert content between HTML and markdown based on view mode
  useEffect(() => {
    if (content !== lastContentRef.current) {
      editorDebugger.logOperation({
        type: 'contentChange',
        node: { oldContent: lastContentRef.current, newContent: content }
      })
      safeUpdateContent(content)
    }
  }, [content, safeUpdateContent])

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
      isUpdatingRef.current = false
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
    if (isUpdatingRef.current) return
    
    return safeOperation(() => {
      const newHtml = editor.getHtml()
      
      // Validate the new HTML
      if (!validateEditorContent(newHtml)) {
        console.warn('Invalid HTML from editor, sanitizing')
        const sanitized = sanitizeContent(newHtml)
        setHtml(sanitized)
        
        if (viewMode === 'source') {
          onChange(markdownToHtml(sanitized))
        } else {
          onChange(sanitized)
        }
        
        lastContentRef.current = sanitized
        return
      }
      
      setHtml(newHtml)
      
      if (viewMode === 'source') {
        // Convert back from markdown to HTML
        onChange(markdownToHtml(newHtml))
      } else {
        onChange(newHtml)
      }
      
      lastContentRef.current = newHtml
    }, 'handleChange', { editor, html: editor.getHtml() })
  }, [viewMode, onChange])

  const handleCreated = useCallback((editor: IDomEditor) => {
    if (isCreatingRef.current || editorRef.current) {
      return
    }
    
    return safeOperation(() => {
      isCreatingRef.current = true
      editorRef.current = editor
      setEditor(editor)
      
      // Set initial content safely with preprocessing
      if (html && typeof html === 'string') {
        let contentToSet = html
        
        // Preprocess content before setting it in editor
        try {
          // Check if content might be JSON with operations
          if (html.includes('"operations"')) {
            const parsedContent = JSON.parse(html)
            const processedContent = preprocessImportContent(parsedContent)
            contentToSet = typeof processedContent === 'string' 
              ? processedContent 
              : JSON.stringify(processedContent)
          }
        } catch (e) {
          // If parsing fails, sanitize as string
          contentToSet = sanitizeContent(html)
        }
        
        const validatedContent = validateEditorContent(contentToSet) 
          ? contentToSet 
          : sanitizeContent(contentToSet)
          
        try {
          editor.setHtml(validatedContent)
        } catch (error) {
          console.warn('Error setting initial HTML:', error)
          // Try with minimal content as fallback
          try {
            editor.setHtml('<p><br></p>')
          } catch (fallbackError) {
            console.error('Failed to set fallback content:', fallbackError)
          }
        }
      }
      
      if (onEditorReady) {
        onEditorReady(editor)
      }
      
      isCreatingRef.current = false
    }, 'handleCreated', { editor, html })
  }, [html, onEditorReady])

  // Force re-render when content changes significantly
  const editorKey = useRef(0)
  useEffect(() => {
    if (content !== lastContentRef.current) {
      editorKey.current += 1
    }
  }, [content])

  if (viewMode === 'source') {
    return (
      <div className="w-full bg-white rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <div className="p-4" style={{ minHeight: 'calc(100vh - 300px)' }}>
          <textarea
            value={htmlToMarkdown(content)}
            onChange={(e) => {
              try {
                onChange(markdownToHtml(e.target.value))
              } catch (error) {
                console.error('Error converting markdown:', error)
              }
            }}
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
          key={`editor-${editorKey.current}`}
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

// Enhanced HTML to markdown conversion with error handling
function htmlToMarkdown(html: string): string {
  if (!html || typeof html !== 'string') return ''
  
  try {
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
  } catch (error) {
    console.error('Error converting HTML to markdown:', error)
    return html // Return original HTML as fallback
  }
}

// Enhanced markdown to HTML conversion with error handling
function markdownToHtml(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') return '<p><br></p>'
  
  try {
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
      .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
      
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h1-6]|<ul|<ol|<blockquote|<pre)(.+)$/gim, '<p>$1</p>')
      
      // Line breaks
      .replace(/\n/g, '<br>')

    // Ensure at least one paragraph
    if (!html.trim()) {
      html = '<p><br></p>'
    }

    return html
  } catch (error) {
    console.error('Error converting markdown to HTML:', error)
    return '<p><br></p>' // Return minimal valid HTML
  }
}

export type { WangEditorProps }