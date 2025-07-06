export interface Page {
  id: string
  title: string
  content: string
  isFolder: boolean
  parentId?: string
  children?: Page[]
  createdAt: Date
  updatedAt: Date
  isActive?: boolean
  indent?: number
}

export interface Workspace {
  id: string
  name: string
  pages: Page[]
  currentPageId?: string
}

export interface AppState {
  workspace: Workspace
  currentPageId: string | undefined
  syncStatus: 'idle' | 'syncing' | 'error' | 'success'
  unsavedChanges: boolean
  lastSaved?: Date
}

export interface WebDAVConfig {
  url: string
  username: string
  password: string
  enabled: boolean
  autoSync: boolean
  syncInterval: number
  lastSync?: Date
}

export interface SyncConfig extends WebDAVConfig {}

export interface EditorState {
  content: string
  selection?: {
    from: number
    to: number
  }
}

export interface AIConfig {
  url: string
  apiKey: string
  model: string
  enabled: boolean
}