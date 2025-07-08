import { StorageProvider } from '../storage-interface'
import { Workspace, Page } from '../types'
import localforage from 'localforage'

export class BrowserStorage implements StorageProvider {
  private storage: LocalForage

  constructor() {
    this.storage = localforage.createInstance({
      name: 'note-taking-app',
      storeName: 'workspace_data',
      description: 'Note-taking app workspace data',
    })
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.storage.ready()
      return true
    } catch {
      return false
    }
  }

  async testConnection(): Promise<boolean> {
    return this.isAvailable()
  }

  async saveWorkspace(workspace: Workspace): Promise<void> {
    try {
      await this.storage.setItem(`workspace_${workspace.id}`, workspace)
    } catch (error) {
      throw new Error(`Failed to save workspace: ${error}`)
    }
  }

  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    try {
      const workspace = await this.storage.getItem<Workspace>(`workspace_${workspaceId}`)
      return workspace
    } catch (error) {
      console.error(`Failed to get workspace: ${error}`)
      return null
    }
  }

  async savePage(page: Page): Promise<void> {
    try {
      await this.storage.setItem(`page_${page.id}`, page)
    } catch (error) {
      throw new Error(`Failed to save page: ${error}`)
    }
  }

  async getPage(pageId: string): Promise<Page | null> {
    try {
      const page = await this.storage.getItem<Page>(`page_${pageId}`)
      return page
    } catch (error) {
      console.error(`Failed to get page: ${error}`)
      return null
    }
  }

  async deletePage(pageId: string): Promise<void> {
    try {
      await this.storage.removeItem(`page_${pageId}`)
    } catch (error) {
      throw new Error(`Failed to delete page: ${error}`)
    }
  }

  async getAllWorkspaces(): Promise<Workspace[]> {
    try {
      const keys = await this.storage.keys()
      const workspaceKeys = keys.filter(key => key.startsWith('workspace_'))
      const workspaces: Workspace[] = []
      
      for (const key of workspaceKeys) {
        const workspace = await this.storage.getItem<Workspace>(key)
        if (workspace) {
          workspaces.push(workspace)
        }
      }
      
      return workspaces
    } catch (error) {
      console.error(`Failed to get all workspaces: ${error}`)
      return []
    }
  }

  async clearAll(): Promise<void> {
    try {
      await this.storage.clear()
    } catch (error) {
      throw new Error(`Failed to clear storage: ${error}`)
    }
  }

  async exportData(): Promise<string> {
    try {
      const keys = await this.storage.keys()
      const data: Record<string, any> = {}
      
      for (const key of keys) {
        const item = await this.storage.getItem(key)
        data[key] = item
      }
      
      return JSON.stringify(data, null, 2)
    } catch (error) {
      throw new Error(`Failed to export data: ${error}`)
    }
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData)
      
      // Clear existing data
      await this.clearAll()
      
      // Import new data
      for (const [key, value] of Object.entries(data)) {
        await this.storage.setItem(key, value)
      }
    } catch (error) {
      throw new Error(`Failed to import data: ${error}`)
    }
  }
}