"use client"

import React, { useState, useEffect } from 'react'
import { WangEditorWrapper } from '@/components/editor/wang-editor-wrapper'
import { setupEditorMonitoring, editorDebugger } from '@/lib/editor-debug-utils'
import { Button } from '@/components/ui/button'

export default function EditorTestPage() {
  const [content, setContent] = useState('<h2>测试标题</h2><p>这是一个测试段落。</p>')
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    setupEditorMonitoring()
  }, [])

  const handleContentChange = (newContent: string) => {
    console.log('Content changed:', newContent)
    setContent(newContent)
  }

  const showDebugInfo = () => {
    const info = {
      recentOperations: editorDebugger.getRecentOperations(),
      operationsSummary: editorDebugger.getOperationsSummary(),
      contentLength: content.length,
      timestamp: new Date().toISOString()
    }
    setDebugInfo(info)
    console.log('Debug Info:', info)
  }

  const testProblematicContent = () => {
    // Test with content similar to the error case
    const problematicContent = `
      <h2>初始化阿里云轻量环境</h2>
      <p></p><p></p><p></p><p></p><p></p><p></p><p></p>
      <pre><code>plainnet.ipv6.conf.all.disable_ipv6 = 0net.ipv6.conf.default.disable_ipv6 = 0net.ipv6.conf.lo.disable_ipv6 = 0net.ipv6.conf.eth0.disable_ipv6 = 0</code></pre>
      <p></p><p></p>
      <p><strong>[</strong><strong>示例：</strong><code>PROXY_URL=http://47.253.124.78:51422</code><strong>]</strong></p>
      <p>此时每次请求都是随机ipv6，即可绕过CF对IP的<strong>速率限制</strong>及<strong>5s盾</strong></p>
    `
    setContent(problematicContent)
  }

  const clearContent = () => {
    setContent('<p><br></p>')
  }

  const clearDebugHistory = () => {
    editorDebugger.clearOperations()
    setDebugInfo({})
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Editor Test Page</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h2 className="text-xl font-semibold mb-4">Editor</h2>
              <div className="border rounded-lg">
                <WangEditorWrapper
                  content={content}
                  onChange={handleContentChange}
                  placeholder="Start testing the editor..."
                />
              </div>
            </div>
          </div>

          {/* Controls and Debug Section */}
          <div className="space-y-4">
            {/* Controls */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-lg font-semibold mb-3">Test Controls</h3>
              <div className="space-y-2">
                <Button 
                  onClick={testProblematicContent}
                  variant="outline"
                  className="w-full"
                >
                  Load Problematic Content
                </Button>
                <Button 
                  onClick={clearContent}
                  variant="outline"
                  className="w-full"
                >
                  Clear Content
                </Button>
                <Button 
                  onClick={showDebugInfo}
                  variant="default"
                  className="w-full"
                >
                  Show Debug Info
                </Button>
                <Button 
                  onClick={clearDebugHistory}
                  variant="secondary"
                  className="w-full"
                >
                  Clear Debug History
                </Button>
              </div>
            </div>

            {/* Debug Information */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-lg font-semibold mb-3">Debug Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Content Length:</strong> {content.length}
                </div>
                <div>
                  <strong>Operations Count:</strong> {debugInfo.operationsSummary?.total || 0}
                </div>
                {debugInfo.operationsSummary?.types && (
                  <div>
                    <strong>Operation Types:</strong>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(debugInfo.operationsSummary.types, null, 2)}
                    </pre>
                  </div>
                )}
                {debugInfo.recentOperations && debugInfo.recentOperations.length > 0 && (
                  <div>
                    <strong>Recent Operations:</strong>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-40">
                      {JSON.stringify(debugInfo.recentOperations, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <h3 className="text-lg font-semibold mb-2 text-blue-800">Instructions</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Open browser console to see detailed logs</li>
                <li>• Click "Load Problematic Content" to test error handling</li>
                <li>• Use "Show Debug Info" to see operation history</li>
                <li>• Watch console for path-related error warnings</li>
                <li>• Test editing operations like adding/removing content</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Content Preview */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-lg font-semibold mb-3">Content Preview (HTML)</h3>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
            {content}
          </pre>
        </div>
      </div>
    </div>
  )
} 