import { StorageManager } from './storage-manager'
import { Page, Workspace } from './types'
import { preprocessImportContent, sanitizeContent } from './editor-debug-utils'

class StorageService {
  private storageManager: StorageManager

  constructor() {
    // Default to browser storage for backward compatibility
    const defaultConfig = {
      type: 'browser' as const
    }
    
    this.storageManager = new StorageManager(defaultConfig)
  }

  async configureStorage(config: any): Promise<void> {
    await this.storageManager.updateConfig(config)
  }

  getStorageConfig() {
    return this.storageManager.getConfig()
  }

  async isAvailable(): Promise<boolean> {
    return this.storageManager.isAvailable()
  }

  async testConnection(): Promise<boolean> {
    return this.storageManager.testConnection()
  }

  async saveWorkspace(workspace: Workspace): Promise<void> {
    return this.storageManager.saveWorkspace(workspace)
  }

  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    return this.storageManager.getWorkspace(workspaceId)
  }

  async savePage(page: Page): Promise<void> {
    return this.storageManager.savePage(page)
  }

  async getPage(pageId: string): Promise<Page | null> {
    return this.storageManager.getPage(pageId)
  }

  async deletePage(pageId: string): Promise<void> {
    return this.storageManager.deletePage(pageId)
  }

  async getAllWorkspaces(): Promise<Workspace[]> {
    return this.storageManager.getAllWorkspaces()
  }

  async clearAll(): Promise<void> {
    return this.storageManager.clearAll()
  }

  async exportData(): Promise<string> {
    return this.storageManager.exportData()
  }

  async importData(jsonData: string): Promise<void> {
    return this.storageManager.importData(jsonData)
  }

  async migrateToLocal(localPath: string): Promise<void> {
    const config = {
      type: 'local' as const,
      localPath
    }
    await this.storageManager.migrateData(config)
  }

  async migrateToWebDAV(webdavConfig: any): Promise<void> {
    const config = {
      type: 'webdav' as const,
      webdavConfig
    }
    await this.storageManager.migrateData(config)
  }

  async migrateToBrowser(): Promise<void> {
    const config = {
      type: 'browser' as const
    }
    await this.storageManager.migrateData(config)
  }

  async syncBetweenProviders(): Promise<void> {
    return this.storageManager.syncBetweenProviders()
  }

  async importMarkdownFiles(files: { name: string; content: string }[]): Promise<Page[]> {
    const pages: Page[] = []
    
    for (const file of files) {
      try {
        const page = this.parseMarkdownToPage(file)
        pages.push(page)
        await this.savePage(page)
      } catch (error) {
        console.error(`Failed to import file ${file.name}:`, error)
        // Continue with other files even if one fails
      }
    }
    
    return pages
  }

  private parseMarkdownToPage(file: { name: string; content: string }): Page {
    const fileName = file.name.replace(/\.md$/, '')
    let content = file.content
    
    // Preprocess content to prevent editor issues
    try {
      // Check if content might be JSON with operations
      if (content.includes('"operations"') && content.includes('"children"')) {
        console.warn(`File ${file.name} appears to contain editor operations, preprocessing...`)
        try {
          const parsedContent = JSON.parse(content)
          const processedContent = preprocessImportContent(parsedContent)
          
          // Convert processed content back to a safe format
          if (typeof processedContent === 'object' && processedContent.children) {
            // Extract text content from processed structure
            content = this.extractTextFromEditorContent(processedContent)
          } else if (typeof processedContent === 'string') {
            content = processedContent
          }
        } catch (parseError) {
          console.warn(`Failed to parse content as JSON, treating as markdown:`, parseError)
          // Continue with original content as markdown
        }
      }
      
      // Sanitize the content
      content = sanitizeContent(content)
      
    } catch (error) {
      console.warn(`Error preprocessing content for ${file.name}:`, error)
      // Fallback to basic sanitization
      content = sanitizeContent(file.content || '')
    }
    
    // 提取标题（第一行的 # 标题或使用文件名）
    const lines = content.split('\n')
    let title = fileName
    let pageContent = content
    
    // 尝试从内容中提取标题
    const firstLine = lines[0]?.trim()
    if (firstLine && firstLine.startsWith('#')) {
      title = firstLine.replace(/^#+\s*/, '')
      // 如果第一行是标题，保留完整内容
    } else {
      // 如果没有标题，添加一个
      pageContent = `# ${title}\n\n${content}`
    }

    // 将 markdown 转换为 HTML 格式存储
    const htmlContent = this.markdownToHtml(pageContent)

    return {
      id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      content: htmlContent,
      source: pageContent,
      isFolder: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      indent: 0
    }
  }

  /**
   * Extract plain text from editor content structure
   */
  private extractTextFromEditorContent(content: any): string {
    try {
      if (typeof content === 'string') return content
      
      if (content && content.children && Array.isArray(content.children)) {
        return content.children
          .map((child: any) => this.extractTextFromNode(child))
          .join('\n')
          .trim()
      }
      
      return ''
    } catch (error) {
      console.error('Error extracting text from editor content:', error)
      return ''
    }
  }

  /**
   * Extract text from a single editor node
   */
  private extractTextFromNode(node: any): string {
    try {
      if (typeof node === 'string') return node
      
      if (node && typeof node === 'object') {
        // Handle text nodes
        if (node.text) return node.text
        
        // Handle nodes with children
        if (node.children && Array.isArray(node.children)) {
          const text = node.children
            .map((child: any) => this.extractTextFromNode(child))
            .join('')
          
          // Add formatting based on node type
          if (node.type === 'header1') return `# ${text}`
          if (node.type === 'header2') return `## ${text}`
          if (node.type === 'header3') return `### ${text}`
          if (node.type === 'paragraph') return text
          if (node.type === 'code') return `\`${text}\``
          if (node.type === 'pre') return `\`\`\`\n${text}\n\`\`\``
          
          return text
        }
      }
      
      return ''
    } catch (error) {
      console.error('Error extracting text from node:', error)
      return ''
    }
  }

  private markdownToHtml(markdown: string): string {
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
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      
      // Lists
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/^\+ (.*$)/gim, '<li>$1</li>')
      
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
      
      // Line breaks and paragraphs
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
    
    // Wrap in paragraphs and fix list formatting
    html = html
      .replace(/(<li>.*<\/li>)/g, (match) => {
        return match.replace(/<\/li><li>/g, '</li><li>')
      })
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
      
    // Wrap standalone text in paragraphs
    if (html && !html.match(/^<[h1-6]|<ul|<ol|<blockquote|<pre|<p/)) {
      html = '<p>' + html + '</p>'
    }
    
    return html
  }
}

export const storageService = new StorageService()