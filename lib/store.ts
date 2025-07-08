import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Page, Workspace, AppState, WebDAVConfig, AIConfig, StorageConfig } from './types'
import { storageService } from './storage-service'
import { webdavService } from './webdav'

interface NotesStore extends AppState {
  // View mode state
  viewMode: 'rendered' | 'source'
  
  // WebDAV config
  webdavConfig: WebDAVConfig | null
  
  // AI config
  aiConfig: AIConfig | null
  
  // Storage config
  storageConfig: StorageConfig
  
  // Actions
  setCurrentPage: (pageId: string) => void
  updatePageContent: (pageId: string, content: string) => void
  createPage: (title: string, parentId?: string) => void
  createFolder: (title: string, parentId?: string) => void
  deletePage: (pageId: string) => void
  renamePage: (pageId: string, title: string) => void
  toggleFolder: (pageId: string) => void
  reorderPages: (pages: Page[]) => void
  setSyncStatus: (status: AppState['syncStatus']) => void
  setUnsavedChanges: (hasChanges: boolean) => void
  saveToLocal: () => Promise<void>
  loadFromLocal: () => Promise<void>
  setViewMode: (mode: 'rendered' | 'source') => void
  
  // WebDAV actions
  setWebDAVConfig: (config: WebDAVConfig) => void
  testWebDAVConnection: () => Promise<boolean>
  syncToWebDAV: () => Promise<void>
  syncFromWebDAV: () => Promise<void>
  
  // AI actions
  setAIConfig: (config: AIConfig) => void
  testAIConnection: () => Promise<boolean>
  
  // Storage actions
  setStorageConfig: (config: StorageConfig) => Promise<void>
  testStorageConnection: () => Promise<boolean>
  migrateStorage: (config: StorageConfig) => Promise<void>
  isFirstTimeUse: () => boolean
  importMarkdownFiles: (files: { name: string; content: string }[]) => Promise<void>
  
  // Computed values
  getCurrentPage: () => Page | undefined
  getPageById: (pageId: string) => Page | undefined
  getAllPages: () => Page[]
}

// Default workspace data
const defaultWorkspace: Workspace = {
  id: 'default',
  name: 'My Workspace',
  pages: [],
  currentPageId: undefined,
}

export const useNotesStore = create<NotesStore>()(
  devtools(
    persist(
      (set, get) => ({
        workspace: defaultWorkspace,
        currentPageId: undefined,
        syncStatus: 'idle',
        unsavedChanges: false,
        lastSaved: undefined,
        viewMode: 'rendered',
        webdavConfig: null,
        aiConfig: null,
        storageConfig: { type: 'browser' },

        setCurrentPage: (pageId: string) => {
          set((state) => ({
            currentPageId: pageId,
            workspace: {
              ...state.workspace,
              currentPageId: pageId,
            },
          }))
        },

        updatePageContent: (pageId: string, content: string) => {
          set((state) => ({
            workspace: {
              ...state.workspace,
              pages: state.workspace.pages.map((page) =>
                page.id === pageId
                  ? { ...page, content, updatedAt: new Date() }
                  : page
              ),
            },
            unsavedChanges: true,
          }))
        },

        createPage: (title: string, parentId?: string) => {
          const newPage: Page = {
            id: `page-${Date.now()}`,
            title,
            content: `# ${title}\n\nStart writing here...`,
            isFolder: false,
            parentId,
            createdAt: new Date(),
            updatedAt: new Date(),
            indent: parentId ? 1 : 0,
          }

          set((state) => ({
            workspace: {
              ...state.workspace,
              pages: [...state.workspace.pages, newPage],
            },
            currentPageId: newPage.id,
            unsavedChanges: true,
          }))
        },

        createFolder: (title: string, parentId?: string) => {
          const newFolder: Page = {
            id: `folder-${Date.now()}`,
            title,
            content: '',
            isFolder: true,
            parentId,
            children: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            indent: parentId ? 1 : 0,
          }

          set((state) => ({
            workspace: {
              ...state.workspace,
              pages: [...state.workspace.pages, newFolder],
            },
            unsavedChanges: true,
          }))
        },

        deletePage: (pageId: string) => {
          set((state) => ({
            workspace: {
              ...state.workspace,
              pages: state.workspace.pages.filter((page) => page.id !== pageId),
            },
            currentPageId: state.currentPageId === pageId ? undefined : state.currentPageId,
            unsavedChanges: true,
          }))
        },

        renamePage: (pageId: string, title: string) => {
          set((state) => ({
            workspace: {
              ...state.workspace,
              pages: state.workspace.pages.map((page) =>
                page.id === pageId
                  ? { ...page, title, updatedAt: new Date() }
                  : page
              ),
            },
            unsavedChanges: true,
          }))
        },

        toggleFolder: (pageId: string) => {
          set((state) => ({
            workspace: {
              ...state.workspace,
              pages: state.workspace.pages.map((page) =>
                page.id === pageId
                  ? { ...page, isFolder: !page.isFolder, updatedAt: new Date() }
                  : page
              ),
            },
          }))
        },

        reorderPages: (pages: Page[]) => {
          set((state) => ({
            workspace: {
              ...state.workspace,
              pages,
            },
            unsavedChanges: true,
          }))
        },

        setSyncStatus: (status: AppState['syncStatus']) => {
          set({ syncStatus: status })
        },

        setUnsavedChanges: (hasChanges: boolean) => {
          set({ unsavedChanges: hasChanges })
        },

        setViewMode: (mode: 'rendered' | 'source') => {
          set({ viewMode: mode })
        },

        saveToLocal: async () => {
          const state = get()
          try {
            await storageService.saveWorkspace(state.workspace)
            set({ unsavedChanges: false, lastSaved: new Date() })
          } catch (error) {
            console.error('Failed to save to local storage:', error)
          }
        },

        loadFromLocal: async () => {
          try {
            const workspace = await storageService.getWorkspace('default')
            if (workspace) {
              set({
                workspace,
                currentPageId: workspace.currentPageId,
              })
            }
          } catch (error) {
            console.error('Failed to load from local storage:', error)
          }
        },

        getCurrentPage: () => {
          const state = get()
          return state.workspace.pages.find((page) => page.id === state.currentPageId)
        },

        getPageById: (pageId: string) => {
          const state = get()
          return state.workspace.pages.find((page) => page.id === pageId)
        },

        getAllPages: () => {
          const state = get()
          return state.workspace.pages
        },

        setWebDAVConfig: (config: WebDAVConfig) => {
          webdavService.setConfig(config)
          set({ webdavConfig: config })
        },

        testWebDAVConnection: async () => {
          const state = get()
          if (!state.webdavConfig) return false
          
          try {
            const response = await webdavService.testConnection()
            return response.ok
          } catch (error) {
            console.error('WebDAV connection test failed:', error)
            return false
          }
        },

        syncToWebDAV: async () => {
          const state = get()
          if (!state.webdavConfig?.enabled) return

          set({ syncStatus: 'syncing' })
          
          try {
            const response = await webdavService.uploadWorkspace(state.workspace)
            if (response.ok) {
              set({ 
                syncStatus: 'success',
                webdavConfig: state.webdavConfig ? { 
                  ...state.webdavConfig, 
                  lastSync: new Date() 
                } : null
              })
            } else {
              set({ syncStatus: 'error' })
            }
          } catch (error) {
            console.error('WebDAV sync failed:', error)
            set({ syncStatus: 'error' })
          }
        },

        syncFromWebDAV: async () => {
          const state = get()
          if (!state.webdavConfig?.enabled) return

          set({ syncStatus: 'syncing' })
          
          try {
            const response = await webdavService.downloadWorkspace(state.workspace.id)
            if (response.ok && response.data) {
              const remoteWorkspace = typeof response.data === 'string' 
                ? JSON.parse(response.data) 
                : response.data
              
              set({ 
                workspace: remoteWorkspace,
                currentPageId: remoteWorkspace.currentPageId,
                syncStatus: 'success',
                webdavConfig: state.webdavConfig ? { 
                  ...state.webdavConfig, 
                  lastSync: new Date() 
                } : null
              })
            } else {
              set({ syncStatus: 'error' })
            }
          } catch (error) {
            console.error('WebDAV sync failed:', error)
            set({ syncStatus: 'error' })
          }
        },

        setAIConfig: (config: AIConfig) => {
          set({ aiConfig: config })
        },

        testAIConnection: async () => {
          const state = get()
          if (!state.aiConfig) return false
          
          try {
            const response = await fetch(state.aiConfig.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.aiConfig.apiKey}`,
              },
              body: JSON.stringify({
                model: state.aiConfig.model,
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 5,
              }),
            })
            return response.ok
          } catch (error) {
            console.error('AI connection test failed:', error)
            return false
          }
        },

        setStorageConfig: async (config: StorageConfig) => {
          try {
            await storageService.configureStorage(config)
            set({ storageConfig: config })
          } catch (error) {
            console.error('Failed to set storage config:', error)
            throw error
          }
        },

        testStorageConnection: async () => {
          try {
            return await storageService.testConnection()
          } catch (error) {
            console.error('Storage connection test failed:', error)
            return false
          }
        },

        migrateStorage: async (config: StorageConfig) => {
          set({ syncStatus: 'syncing' })
          try {
            await storageService.configureStorage(config)
            set({ 
              storageConfig: config,
              syncStatus: 'success'
            })
          } catch (error) {
            console.error('Storage migration failed:', error)
            set({ syncStatus: 'error' })
            throw error
          }
        },

        isFirstTimeUse: () => {
          const state = get()
          // 检查是否是首次使用：没有页面数据且使用默认浏览器存储
          return state.workspace.pages.length === 0 && 
                 state.storageConfig.type === 'browser' && 
                 !state.lastSaved
        },

        importMarkdownFiles: async (files: { name: string; content: string }[]) => {
          set({ syncStatus: 'syncing' })
          
          try {
            const importedPages = await storageService.importMarkdownFiles(files)
            
            // 将导入的页面添加到当前工作区
            set((state) => ({
              workspace: {
                ...state.workspace,
                pages: [...state.workspace.pages, ...importedPages]
              },
              syncStatus: 'success',
              unsavedChanges: true
            }))
            
            // 自动保存到本地存储
            await get().saveToLocal()
            
          } catch (error) {
            console.error('Failed to import markdown files:', error)
            set({ syncStatus: 'error' })
            throw error
          }
        },
      }),
      {
        name: 'notes-store',
        skipHydration: true,
      }
    )
  )
)