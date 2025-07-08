import { StorageProvider, StorageType, StorageConfig } from './storage-interface'
import { BrowserStorage } from './storage-providers/browser-storage'
import { WebDAVStorage } from './storage-providers/webdav-storage'
import { LocalStorage } from './storage-providers/local-storage'
import { Workspace, Page } from './types'

export class StorageManager {
  private provider: StorageProvider
  private config: StorageConfig
  private fallbackProvider: StorageProvider

  constructor(config: StorageConfig) {
    this.config = config
    this.fallbackProvider = new BrowserStorage()
    this.provider = this.createProvider(config)
  }

  private createProvider(config: StorageConfig): StorageProvider {
    switch (config.type) {
      case 'webdav':
        if (!config.webdavConfig) {
          throw new Error('WebDAV config is required for WebDAV storage')
        }
        return new WebDAVStorage(config.webdavConfig)
      
      case 'browser':
        return new BrowserStorage()
      
      case 'local':
        if (!config.localPath) {
          throw new Error('Local path is required for local storage')
        }
        return new LocalStorage(config.localPath)
      
      default:
        throw new Error(`Unsupported storage type: ${config.type}`)
    }
  }

  async updateConfig(config: StorageConfig): Promise<void> {
    this.config = config
    this.provider = this.createProvider(config)
  }

  getConfig(): StorageConfig {
    return this.config
  }

  async isAvailable(): Promise<boolean> {
    return this.provider.isAvailable()
  }

  async testConnection(): Promise<boolean> {
    return this.provider.testConnection()
  }

  private async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      console.error(`Primary storage operation failed:`, error)
      
      if (fallbackOperation) {
        try {
          return await fallbackOperation()
        } catch (fallbackError) {
          console.error(`Fallback storage operation failed:`, fallbackError)
          throw fallbackError
        }
      }
      
      throw error
    }
  }

  async saveWorkspace(workspace: Workspace): Promise<void> {
    return this.executeWithFallback(
      () => this.provider.saveWorkspace(workspace),
      () => this.fallbackProvider.saveWorkspace(workspace)
    )
  }

  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    return this.executeWithFallback(
      () => this.provider.getWorkspace(workspaceId),
      () => this.fallbackProvider.getWorkspace(workspaceId)
    )
  }

  async savePage(page: Page): Promise<void> {
    return this.executeWithFallback(
      () => this.provider.savePage(page),
      () => this.fallbackProvider.savePage(page)
    )
  }

  async getPage(pageId: string): Promise<Page | null> {
    return this.executeWithFallback(
      () => this.provider.getPage(pageId),
      () => this.fallbackProvider.getPage(pageId)
    )
  }

  async deletePage(pageId: string): Promise<void> {
    return this.executeWithFallback(
      () => this.provider.deletePage(pageId),
      () => this.fallbackProvider.deletePage(pageId)
    )
  }

  async getAllWorkspaces(): Promise<Workspace[]> {
    return this.executeWithFallback(
      () => this.provider.getAllWorkspaces(),
      () => this.fallbackProvider.getAllWorkspaces()
    )
  }

  async clearAll(): Promise<void> {
    return this.executeWithFallback(
      () => this.provider.clearAll(),
      () => this.fallbackProvider.clearAll()
    )
  }

  async exportData(): Promise<string> {
    return this.executeWithFallback(
      () => this.provider.exportData(),
      () => this.fallbackProvider.exportData()
    )
  }

  async importData(jsonData: string): Promise<void> {
    return this.executeWithFallback(
      () => this.provider.importData(jsonData),
      () => this.fallbackProvider.importData(jsonData)
    )
  }

  async migrateData(targetConfig: StorageConfig): Promise<void> {
    // Export data from current provider
    const data = await this.exportData()
    
    // Create new provider
    const newProvider = this.createProvider(targetConfig)
    
    // Test new provider
    const isAvailable = await newProvider.isAvailable()
    if (!isAvailable) {
      throw new Error('Target storage provider is not available')
    }
    
    // Import data to new provider
    await newProvider.importData(data)
    
    // Update configuration
    this.config = targetConfig
    this.provider = newProvider
  }

  async syncBetweenProviders(): Promise<void> {
    if (this.config.type === 'browser') {
      return // No sync needed for browser storage
    }

    try {
      // Export from primary storage
      const primaryData = await this.provider.exportData()
      
      // Import to browser storage as backup
      await this.fallbackProvider.importData(primaryData)
      
      console.log('Data synced between providers')
    } catch (error) {
      console.error('Failed to sync between providers:', error)
    }
  }
}