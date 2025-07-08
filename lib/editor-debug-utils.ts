/**
 * Editor Debug Utilities
 * Helps monitor and prevent path-related errors in the wangeditor
 */

interface EditorOperation {
  type: string
  path?: number[]
  node?: any
  timestamp: number
}

interface NodeStructure {
  children: any[]
  type?: string
  operations?: EditorOperation[]
}

class EditorDebugger {
  private operations: EditorOperation[] = []
  private maxOperations = 100 // Keep last 100 operations for debugging

  /**
   * Log an editor operation
   */
  logOperation(operation: Omit<EditorOperation, 'timestamp'>) {
    const timestampedOperation: EditorOperation = {
      ...operation,
      timestamp: Date.now()
    }
    
    this.operations.push(timestampedOperation)
    
    // Keep only recent operations to prevent memory issues
    if (this.operations.length > this.maxOperations) {
      this.operations = this.operations.slice(-this.maxOperations)
    }
    
    console.debug('Editor operation:', timestampedOperation)
  }

  /**
   * Validate node structure and detect potential path issues
   */
  validateNodeStructure(node: NodeStructure): boolean {
    try {
      if (!node || typeof node !== 'object') {
        console.warn('Invalid node: not an object')
        return false
      }

      if (!Array.isArray(node.children)) {
        console.warn('Invalid node: children is not an array')
        return false
      }

      // Validate operations if present
      if (node.operations && Array.isArray(node.operations)) {
        for (const operation of node.operations) {
          if (!this.validateOperation(operation, node)) {
            return false
          }
        }
      }

      return true
    } catch (error) {
      console.error('Error validating node structure:', error)
      return false
    }
  }

  /**
   * Validate individual operation against node structure
   */
  private validateOperation(operation: any, node: NodeStructure): boolean {
    try {
      if (!operation || typeof operation !== 'object') {
        console.warn('Invalid operation: not an object')
        return false
      }

      // Check if operation has a path
      if (operation.path && Array.isArray(operation.path)) {
        const pathIndex = operation.path[0]
        
        // Validate path index against node children
        if (typeof pathIndex === 'number') {
          if (pathIndex < 0 || pathIndex >= node.children.length) {
            console.error(
              `Invalid path index: ${pathIndex}, node has ${node.children.length} children`,
              { operation, nodeChildren: node.children.length }
            )
            return false
          }
        }
      }

      return true
    } catch (error) {
      console.error('Error validating operation:', error)
      return false
    }
  }

  /**
   * Get recent operations for debugging
   */
  getRecentOperations(count = 10): EditorOperation[] {
    return this.operations.slice(-count)
  }

  /**
   * Clear operation history
   */
  clearOperations() {
    this.operations = []
  }

  /**
   * Get operations summary
   */
  getOperationsSummary() {
    const summary = {
      total: this.operations.length,
      types: {} as Record<string, number>,
      recentErrors: [] as string[]
    }

    this.operations.forEach(op => {
      summary.types[op.type] = (summary.types[op.type] || 0) + 1
    })

    return summary
  }

  /**
   * Safe operation sorter to prevent path conflicts
   */
  sortOperationsForSafeExecution(operations: any[]): any[] {
    if (!Array.isArray(operations)) return []

    // Separate operations by type
    const insertOps = operations.filter(op => op.type === 'insert_node')
    const removeOps = operations.filter(op => op.type === 'remove_node')
    const otherOps = operations.filter(op => !['insert_node', 'remove_node'].includes(op.type))

    // Sort remove operations by path descending (remove from end first)
    removeOps.sort((a, b) => {
      if (!a.path || !b.path) return 0
      return b.path[0] - a.path[0]
    })

    // Sort insert operations by path ascending (insert from beginning first)
    insertOps.sort((a, b) => {
      if (!a.path || !b.path) return 0
      return a.path[0] - b.path[0]
    })

    // Return in safe order: inserts first, then removes, then others
    return [...insertOps, ...removeOps, ...otherOps]
  }
}

// Create global debugger instance
export const editorDebugger = new EditorDebugger()

/**
 * Safe operation wrapper that validates operations before executing
 */
export function safeOperation<T>(
  operation: () => T,
  operationName: string,
  context?: any
): T | null {
  try {
    editorDebugger.logOperation({
      type: operationName,
      node: context
    })

    const result = operation()
    
    console.debug(`Safe operation '${operationName}' completed successfully`)
    return result
  } catch (error) {
    console.error(`Safe operation '${operationName}' failed:`, error)
    
    // Log additional context if available
    if (context) {
      console.error('Operation context:', context)
    }
    
    // Log recent operations for debugging
    if (error instanceof Error && error.message.includes('Cannot find a descendant at path')) {
      console.warn('🚨 Path error detected in safe operation')
      console.warn('Recent operations:', editorDebugger.getRecentOperations(5))
      console.warn('Operations summary:', editorDebugger.getOperationsSummary())
    }
    
    return null
  }
}

/**
 * Validate editor content before applying operations
 */
export function validateEditorContent(content: any): boolean {
  try {
    if (typeof content === 'string') {
      // Basic HTML validation
      if (content.length > 1000000) { // 1MB limit
        console.warn('Content too large, might cause performance issues')
        return false
      }
      return true
    }

    if (typeof content === 'object' && content !== null) {
      // Check for problematic operations array
      if (content.operations && Array.isArray(content.operations)) {
        if (content.operations.length > 100) {
          console.warn('Too many operations detected, might cause performance issues')
          return false
        }
        
        // Check for invalid paths in operations
        for (const op of content.operations) {
          if (op.path && Array.isArray(op.path)) {
            if (op.path.some((index: any) => typeof index !== 'number' || index < 0)) {
              console.warn('Invalid path detected in operations')
              return false
            }
          }
        }
      }
      
      return editorDebugger.validateNodeStructure(content)
    }

    console.warn('Invalid content type:', typeof content)
    return false
  } catch (error) {
    console.error('Error validating editor content:', error)
    return false
  }
}

/**
 * Monitor editor for path-related errors
 */
export function setupEditorMonitoring() {
  // Override console.error to catch path-related errors
  const originalError = console.error
  console.error = function(...args: any[]) {
    const message = args.join(' ')
    
    // Check for specific path-related errors
    if (message.includes('Cannot find a descendant at path')) {
      console.warn('🚨 Path error detected:', message)
      console.warn('Recent operations:', editorDebugger.getRecentOperations(5))
      console.warn('Operations summary:', editorDebugger.getOperationsSummary())
      
      // Try to recover by clearing editor state
      console.warn('Attempting automatic recovery...')
    }
    
    // Call original error function
    originalError.apply(console, args)
  }

  console.log('✅ Editor monitoring setup complete')
}

/**
 * Emergency content sanitizer for problematic content
 */
export function sanitizeContent(content: string): string {
  try {
    if (!content || typeof content !== 'string') {
      return '<p><br></p>'
    }

    // Remove potentially problematic patterns
    let sanitized = content
      // Remove empty elements that might cause path issues
      .replace(/<([^>]+)>\s*<\/\1>/g, '')
      // Ensure paragraph structure
      .replace(/^(?!<[ph1-6])/gm, '<p>$&</p>')
      // Clean up multiple line breaks
      .replace(/\n{3,}/g, '\n\n')

    // Ensure at least one valid element
    if (!sanitized.trim() || sanitized.trim() === '') {
      sanitized = '<p><br></p>'
    }

    return sanitized
  } catch (error) {
    console.error('Error sanitizing content:', error)
    return '<p><br></p>'
  }
}

/**
 * Preprocess content before import to prevent path errors
 */
export function preprocessImportContent(content: any): any {
  try {
    if (typeof content === 'string') {
      return sanitizeContent(content)
    }

    if (typeof content === 'object' && content !== null) {
      // Handle content with operations
      if (content.operations && Array.isArray(content.operations)) {
        console.warn('Detected content with operations, preprocessing...')
        
        // Sort operations to prevent path conflicts
        const sortedOps = editorDebugger.sortOperationsForSafeExecution(content.operations)
        
        // Limit operations to prevent performance issues
        const limitedOps = sortedOps.slice(0, 50)
        
        if (limitedOps.length < sortedOps.length) {
          console.warn(`Limited operations from ${sortedOps.length} to ${limitedOps.length}`)
        }

        // Create new content without operations to avoid conflicts
        const { operations, ...contentWithoutOps } = content
        
        // For import, we'll ignore operations and just use the content structure
        return contentWithoutOps
      }
      
      return content
    }

    return content
  } catch (error) {
    console.error('Error preprocessing import content:', error)
    return { children: [{ type: 'paragraph', children: [{ text: '' }] }] }
  }
}

export default {
  editorDebugger,
  safeOperation,
  validateEditorContent,
  setupEditorMonitoring,
  sanitizeContent,
  preprocessImportContent
} 