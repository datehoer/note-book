import { StorageProvider } from '../storage-interface'
import { Workspace, Page, WebDAVConfig } from '../types'

interface WebDAVResponse {
  ok: boolean
  status: number
  data?: any
  error?: string
}

export class WebDAVStorage implements StorageProvider {
  private config: WebDAVConfig

  constructor(config: WebDAVConfig) {
    this.config = config
  }

  async isAvailable(): Promise<boolean> {
    return this.testConnection()
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/', {
        method: 'PROPFIND',
        headers: {
          Depth: '0',
        },
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  private async makeRequest(
    path: string,
    options: RequestInit = {}
  ): Promise<WebDAVResponse> {
    const url = `${this.config.url.replace(/\/$/, '')}${path}`
    const auth = btoa(`${this.config.username}:${this.config.password}`)

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      const data = response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : await response.text()

      return {
        ok: response.ok,
        status: response.status,
        data,
      }
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : 'Network error',
      }
    }
  }

  async saveWorkspace(workspace: Workspace): Promise<void> {
    const workspaceData = {
      id: workspace.id,
      name: workspace.name,
      pages: workspace.pages,
      currentPageId: workspace.currentPageId,
      lastSync: new Date().toISOString(),
    }

    const response = await this.makeRequest(`/workspace-${workspace.id}.json`, {
      method: 'PUT',
      body: JSON.stringify(workspaceData, null, 2),
    })

    if (!response.ok) {
      throw new Error(`Failed to save workspace: ${response.error || 'Unknown error'}`)
    }
  }

  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    const response = await this.makeRequest(`/workspace-${workspaceId}.json`, {
      method: 'GET',
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to get workspace: ${response.error || 'Unknown error'}`)
    }

    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
    return data
  }

  async savePage(page: Page): Promise<void> {
    // Find workspace that contains this page
    const workspaces = await this.getAllWorkspaces()
    const workspace = workspaces.find(w => w.pages.some(p => p.id === page.id))
    
    if (!workspace) {
      throw new Error(`Workspace not found for page ${page.id}`)
    }

    const pageData = {
      ...page,
      lastSync: new Date().toISOString(),
    }

    // Ensure pages directory exists
    await this.makeRequest(`/pages/workspace-${workspace.id}/`, {
      method: 'MKCOL',
    })

    const response = await this.makeRequest(`/pages/workspace-${workspace.id}/page-${page.id}.json`, {
      method: 'PUT',
      body: JSON.stringify(pageData, null, 2),
    })

    if (!response.ok) {
      throw new Error(`Failed to save page: ${response.error || 'Unknown error'}`)
    }
  }

  async getPage(pageId: string): Promise<Page | null> {
    // Find workspace that contains this page
    const workspaces = await this.getAllWorkspaces()
    
    for (const workspace of workspaces) {
      const response = await this.makeRequest(`/pages/workspace-${workspace.id}/page-${pageId}.json`, {
        method: 'GET',
      })

      if (response.ok) {
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
        return data
      }
    }

    return null
  }

  async deletePage(pageId: string): Promise<void> {
    // Find workspace that contains this page
    const workspaces = await this.getAllWorkspaces()
    
    for (const workspace of workspaces) {
      const response = await this.makeRequest(`/pages/workspace-${workspace.id}/page-${pageId}.json`, {
        method: 'DELETE',
      })

      if (response.ok) {
        return
      }
    }

    throw new Error(`Failed to delete page: Page not found`)
  }

  async getAllWorkspaces(): Promise<Workspace[]> {
    const response = await this.makeRequest('/', {
      method: 'PROPFIND',
      headers: {
        Depth: '1',
        'Content-Type': 'application/xml',
      },
      body: `<?xml version="1.0" encoding="utf-8" ?>
        <D:propfind xmlns:D="DAV:">
          <D:prop>
            <D:displayname/>
            <D:getlastmodified/>
            <D:getcontentlength/>
            <D:resourcetype/>
          </D:prop>
        </D:propfind>`,
    })

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.error || 'Unknown error'}`)
    }

    // Parse XML response to find workspace files
    const workspaces: Workspace[] = []
    
    // For simplicity, we'll fetch all workspace files by trying common workspace IDs
    // In a real implementation, you'd parse the XML response
    const commonWorkspaceIds = ['default', 'main', 'primary']
    
    for (const id of commonWorkspaceIds) {
      const workspace = await this.getWorkspace(id)
      if (workspace) {
        workspaces.push(workspace)
      }
    }

    return workspaces
  }

  async clearAll(): Promise<void> {
    // Get all workspaces and delete them
    const workspaces = await this.getAllWorkspaces()
    
    for (const workspace of workspaces) {
      // Delete workspace file
      await this.makeRequest(`/workspace-${workspace.id}.json`, {
        method: 'DELETE',
      })
      
      // Delete pages directory
      await this.makeRequest(`/pages/workspace-${workspace.id}/`, {
        method: 'DELETE',
      })
    }
  }

  async exportData(): Promise<string> {
    const workspaces = await this.getAllWorkspaces()
    const data: Record<string, any> = {}

    for (const workspace of workspaces) {
      data[`workspace_${workspace.id}`] = workspace
      
      // Export pages for this workspace
      for (const page of workspace.pages) {
        const pageData = await this.getPage(page.id)
        if (pageData) {
          data[`page_${page.id}`] = pageData
        }
      }
    }

    return JSON.stringify(data, null, 2)
  }

  async importData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData)
    
    // Clear existing data
    await this.clearAll()
    
    // Import workspaces first
    const workspaces: Workspace[] = []
    const pages: Page[] = []
    
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('workspace_')) {
        workspaces.push(value as Workspace)
      } else if (key.startsWith('page_')) {
        pages.push(value as Page)
      }
    }
    
    // Save workspaces
    for (const workspace of workspaces) {
      await this.saveWorkspace(workspace)
    }
    
    // Save pages
    for (const page of pages) {
      await this.savePage(page)
    }
  }
}