import { Workspace, Page } from './types'

export interface StorageProvider {
  // Core storage operations
  saveWorkspace(workspace: Workspace): Promise<void>
  getWorkspace(workspaceId: string): Promise<Workspace | null>
  savePage(page: Page): Promise<void>
  getPage(pageId: string): Promise<Page | null>
  deletePage(pageId: string): Promise<void>
  getAllWorkspaces(): Promise<Workspace[]>
  
  // Data management
  clearAll(): Promise<void>
  exportData(): Promise<string>
  importData(jsonData: string): Promise<void>
  
  // Connection and status
  testConnection(): Promise<boolean>
  isAvailable(): Promise<boolean>
}

export type StorageType = 'webdav' | 'browser' | 'local'

export interface StorageConfig {
  type: StorageType
  localPath?: string
  webdavConfig?: {
    url: string
    username: string
    password: string
    enabled: boolean
    lastSync?: Date
  }
}