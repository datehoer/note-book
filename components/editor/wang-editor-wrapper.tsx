"use client"

import dynamic from 'next/dynamic'
import React from 'react'
import { WangEditorProps } from './wang-editor'

const WangEditor = dynamic(() => import('./wang-editor').then(mod => ({ default: mod.WangEditor })), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-4">
      <div className="h-[400px] flex items-center justify-center text-gray-500">
        Loading editor...
      </div>
    </div>
  )
})

class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Editor Error Boundary caught an error:', error, errorInfo)
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full bg-white rounded-lg border border-red-200 p-4">
          <div className="h-[400px] flex flex-col items-center justify-center text-red-600">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-2">Editor Error</h3>
              <p className="text-sm text-gray-600 mb-2">
                The editor encountered an error and needs to be reloaded.
              </p>
              {this.state.error && (
                <details className="text-xs text-gray-500 max-w-md">
                  <summary className="cursor-pointer">Error details</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-left overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Reload Editor
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export function WangEditorWrapper(props: WangEditorProps) {
  const handleEditorError = React.useCallback((error: Error) => {
    // Log the error for debugging
    console.error('Editor wrapper caught error:', error)
    
    // You could also send error reports to a service here
    // Example: errorReportingService.captureException(error)
  }, [])

  return (
    <EditorErrorBoundary onError={handleEditorError}>
      <WangEditor {...props} />
    </EditorErrorBoundary>
  )
}

export type { WangEditorProps }