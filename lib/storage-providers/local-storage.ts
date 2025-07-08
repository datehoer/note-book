import { StorageProvider } from '../storage-interface'
import { Workspace, Page } from '../types'

export class LocalStorage implements StorageProvider {
  private directoryHandle: FileSystemDirectoryHandle | null = null
  private basePath: string

  constructor(basePath: string) {
    this.basePath = basePath
  }

  async isAvailable(): Promise<boolean> {
    // Check if File System Access API is available
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window
  }

  async testConnection(): Promise<boolean> {
    if (!await this.isAvailable()) {
      return false
    }

    try {
      // Try to get directory handle or prompt user to select one
      if (!this.directoryHandle) {
        this.directoryHandle = await window.showDirectoryPicker()
      }
      
      // Test if we can create a test file
      const testFileHandle = await this.directoryHandle.getFileHandle('test-connection.json', { create: true })
      await testFileHandle.remove()
      
      return true
    } catch (error) {
      console.error('Local storage test connection failed:', error)
      return false
    }
  }

  private async ensureDirectoryHandle(): Promise<FileSystemDirectoryHandle> {
    if (!this.directoryHandle) {
      this.directoryHandle = await window.showDirectoryPicker()
    }
    return this.directoryHandle
  }

  async saveWorkspace(workspace: Workspace): Promise<void> {
    const directoryHandle = await this.ensureDirectoryHandle()
    const fileName = `workspace-${workspace.id}.json`
    
    try {
      const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(JSON.stringify(workspace, null, 2))
      await writable.close()
    } catch (error) {
      throw new Error(`Failed to save workspace: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    const directoryHandle = await this.ensureDirectoryHandle()
    const fileName = `workspace-${workspaceId}.json`
    
    try {
      const fileHandle = await directoryHandle.getFileHandle(fileName)
      const file = await fileHandle.getFile()
      const text = await file.text()
      return JSON.parse(text)
    } catch (error) {
      if (error instanceof Error && error.name === 'NotFoundError') {
        return null
      }
      throw new Error(`Failed to get workspace: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async savePage(page: Page): Promise<void> {
    const directoryHandle = await this.ensureDirectoryHandle()
    const fileName = `page-${page.id}.json`
    
    try {
      const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(JSON.stringify(page, null, 2))
      await writable.close()
    } catch (error) {
      throw new Error(`Failed to save page: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getPage(pageId: string): Promise<Page | null> {
    const directoryHandle = await this.ensureDirectoryHandle()
    const fileName = `page-${pageId}.json`
    
    try {
      const fileHandle = await directoryHandle.getFileHandle(fileName)
      const file = await fileHandle.getFile()
      const text = await file.text()
      return JSON.parse(text)
    } catch (error) {
      if (error instanceof Error && error.name === 'NotFoundError') {
        return null
      }
      throw new Error(`Failed to get page: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deletePage(pageId: string): Promise<void> {
    const directoryHandle = await this.ensureDirectoryHandle()
    const fileName = `page-${pageId}.json`
    
    try {
      await directoryHandle.removeEntry(fileName)
    } catch (error) {
      if (error instanceof Error && error.name === 'NotFoundError') {
        return // Already deleted
      }
      throw new Error(`Failed to delete page: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getAllWorkspaces(): Promise<Workspace[]> {
    const directoryHandle = await this.ensureDirectoryHandle()
    const workspaces: Workspace[] = []
    
    try {
      for await (const [name, handle] of directoryHandle.entries()) {
        if (handle.kind === 'file' && name.startsWith('workspace-') && name.endsWith('.json')) {
          const file = await handle.getFile()
          const text = await file.text()
          const workspace = JSON.parse(text)
          workspaces.push(workspace)
        }
      }
    } catch (error) {
      throw new Error(`Failed to get workspaces: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    return workspaces
  }

  async clearAll(): Promise<void> {
    const directoryHandle = await this.ensureDirectoryHandle()
    
    try {
      for await (const [name, handle] of directoryHandle.entries()) {
        if (handle.kind === 'file' && (name.startsWith('workspace-') || name.startsWith('page-')) && name.endsWith('.json')) {
          await directoryHandle.removeEntry(name)
        }
      }
    } catch (error) {
      throw new Error(`Failed to clear all data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async exportData(): Promise<string> {
    const workspaces = await this.getAllWorkspaces()
    const allPages: Page[] = []
    
    const directoryHandle = await this.ensureDirectoryHandle()
    
    try {
      for await (const [name, handle] of directoryHandle.entries()) {
        if (handle.kind === 'file' && name.startsWith('page-') && name.endsWith('.json')) {
          const file = await handle.getFile()
          const text = await file.text()
          const page = JSON.parse(text)
          allPages.push(page)
        }
      }
    } catch (error) {
      throw new Error(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    return JSON.stringify({
      workspaces,
      pages: allPages,
      exportDate: new Date().toISOString()
    }, null, 2)
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData)
      
      if (data.workspaces) {
        for (const workspace of data.workspaces) {
          await this.saveWorkspace(workspace)
        }
      }
      
      if (data.pages) {
        for (const page of data.pages) {
          await this.savePage(page)
        }
      }
    } catch (error) {
      throw new Error(`Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}