'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useNotesStore } from '@/lib/store'
import { preprocessImportContent, sanitizeContent } from '@/lib/editor-debug-utils'

interface ImportedFile {
  name: string
  size: number
  content: string
  status: 'pending' | 'success' | 'error'
  error?: string
}

interface MarkdownImportProps {
  onComplete?: () => void
  onClose?: () => void
}

export function MarkdownImport({ onComplete, onClose }: MarkdownImportProps) {
  const [files, setFiles] = useState<ImportedFile[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { importMarkdownFiles } = useNotesStore()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    
    if (selectedFiles.length === 0) return

    const newFiles: ImportedFile[] = []
    
    selectedFiles.forEach(file => {
      if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          let content = e.target?.result as string
          
          // Preprocess content to prevent editor issues
          try {
            // Check if the content might contain editor operations or problematic structures
            if (content.includes('"operations"') || content.includes('"children"')) {
              console.warn(`File ${file.name} contains editor data, preprocessing...`)
              try {
                const parsedContent = JSON.parse(content)
                const processedContent = preprocessImportContent(parsedContent)
                
                // Convert back to markdown if it was editor data
                if (typeof processedContent === 'object' && processedContent.children) {
                  content = extractMarkdownFromEditorData(processedContent)
                } else if (typeof processedContent === 'string') {
                  content = processedContent
                }
              } catch (parseError) {
                // If JSON parsing fails, sanitize as string
                content = sanitizeContent(content)
              }
            } else {
              // Regular markdown content, just sanitize
              content = sanitizeContent(content)
            }
          } catch (error) {
            console.warn(`Error preprocessing ${file.name}:`, error)
            content = sanitizeContent(content || '')
          }
          
          newFiles.push({
            name: file.name,
            size: file.size,
            content,
            status: 'pending'
          })
          
          if (newFiles.length === selectedFiles.length) {
            setFiles(newFiles)
          }
        }
        reader.readAsText(file)
      }
    })
  }

  /**
   * Extract markdown text from editor data structure
   */
  const extractMarkdownFromEditorData = (data: any): string => {
    try {
      if (typeof data === 'string') return data
      
      if (data && data.children && Array.isArray(data.children)) {
        return data.children
          .map((child: any) => extractTextFromNode(child))
          .join('\n')
          .trim()
      }
      
      return ''
    } catch (error) {
      console.error('Error extracting markdown from editor data:', error)
      return ''
    }
  }

  /**
   * Extract text from editor node
   */
  const extractTextFromNode = (node: any): string => {
    try {
      if (typeof node === 'string') return node
      
      if (node && typeof node === 'object') {
        // Handle text nodes
        if (node.text) return node.text
        
        // Handle nodes with children
        if (node.children && Array.isArray(node.children)) {
          const text = node.children
            .map((child: any) => extractTextFromNode(child))
            .join('')
          
          // Add markdown formatting based on node type
          if (node.type === 'header1' || node.type === 'h1') return `# ${text}\n`
          if (node.type === 'header2' || node.type === 'h2') return `## ${text}\n`
          if (node.type === 'header3' || node.type === 'h3') return `### ${text}\n`
          if (node.type === 'paragraph' || node.type === 'p') return `${text}\n\n`
          if (node.type === 'code') return `\`${text}\``
          if (node.type === 'pre') return `\`\`\`\n${text}\n\`\`\`\n`
          if (node.type === 'blockquote') return `> ${text}\n`
          if (node.type === 'list-item' || node.type === 'li') return `- ${text}\n`
          
          return text
        }
      }
      
      return ''
    } catch (error) {
      console.error('Error extracting text from node:', error)
      return ''
    }
  }

  const handleImport = async () => {
    if (files.length === 0) return

    setImporting(true)
    setProgress(0)

    const updatedFiles = [...files]
    let successCount = 0
    let errorCount = 0

    try {
      // 准备要导入的文件数据，确保内容已经预处理
      const filesToImport = files.map(file => ({
        name: file.name,
        content: file.content // Content is already preprocessed in handleFileSelect
      }))

      // 使用store的批量导入方法
      await importMarkdownFiles(filesToImport)
      
      // 标记所有文件为成功
      for (let i = 0; i < updatedFiles.length; i++) {
        updatedFiles[i] = { ...updatedFiles[i], status: 'success' }
        successCount++
        setProgress(((i + 1) / updatedFiles.length) * 100)
        setFiles([...updatedFiles])
        
        // 添加小延迟以显示进度
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      onComplete?.()
    } catch (error) {
      console.error('Import failed:', error)
      // 如果批量导入失败，标记所有文件为错误
      for (let i = 0; i < updatedFiles.length; i++) {
        updatedFiles[i] = { 
          ...updatedFiles[i], 
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
        errorCount++
        setProgress(((i + 1) / updatedFiles.length) * 100)
        setFiles([...updatedFiles])
      }
    }

    setImporting(false)
  }

  const handleReset = () => {
    setFiles([])
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getStatusIcon = (status: ImportedFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: ImportedFile['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">成功</Badge>
      case 'error':
        return <Badge variant="destructive">失败</Badge>
      default:
        return <Badge variant="secondary">待导入</Badge>
    }
  }

  const successCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          批量导入 Markdown 文件
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 文件选择 */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="w-full"
            disabled={importing}
          >
            <Upload className="w-4 h-4 mr-2" />
            选择 Markdown 文件
          </Button>
          <p className="text-sm text-gray-600">
            支持选择多个 .md 或 .markdown 文件
          </p>
        </div>

        {/* 文件列表 */}
        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">已选择的文件 ({files.length})</h3>
              {!importing && (
                <Button onClick={handleReset} variant="ghost" size="sm">
                  重置
                </Button>
              )}
            </div>

            {/* 进度条 */}
            {importing && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-gray-600">
                  导入进度: {Math.round(progress)}%
                </p>
              </div>
            )}

            {/* 统计信息 */}
            {(successCount > 0 || errorCount > 0) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  导入完成: {successCount} 成功, {errorCount} 失败
                </AlertDescription>
              </Alert>
            )}

            {/* 文件列表 */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(file.status)}
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                      {file.error && (
                        <p className="text-xs text-red-500 mt-1">{file.error}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(file.status)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-2">
          {onClose && (
            <Button onClick={onClose} variant="outline">
              取消
            </Button>
          )}
          <Button
            onClick={handleImport}
            disabled={files.length === 0 || importing}
            className="flex items-center gap-2"
          >
            {importing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                导入中...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                开始导入
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}