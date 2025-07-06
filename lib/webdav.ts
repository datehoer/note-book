import { WebDAVConfig, Workspace, Page } from './types'

interface WebDAVResponse {
  ok: boolean
  status: number
  data?: any
  error?: string
}

export class WebDAVService {
  private config: WebDAVConfig | null = null

  setConfig(config: WebDAVConfig) {
    this.config = config
  }

  getConfig(): WebDAVConfig | null {
    return this.config
  }

  private async makeRequest(
    path: string,
    options: RequestInit = {}
  ): Promise<WebDAVResponse> {
    if (!this.config) {
      return { ok: false, status: 400, error: 'WebDAV not configured' }
    }

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

  async testConnection(): Promise<WebDAVResponse> {
    return this.makeRequest('/', {
      method: 'PROPFIND',
      headers: {
        Depth: '0',
      },
    })
  }

  async uploadWorkspace(workspace: Workspace): Promise<WebDAVResponse> {
    const workspaceData = {
      id: workspace.id,
      name: workspace.name,
      pages: workspace.pages,
      currentPageId: workspace.currentPageId,
      lastSync: new Date().toISOString(),
    }

    return this.makeRequest(`/workspace-${workspace.id}.json`, {
      method: 'PUT',
      body: JSON.stringify(workspaceData, null, 2),
    })
  }

  async downloadWorkspace(workspaceId: string): Promise<WebDAVResponse> {
    return this.makeRequest(`/workspace-${workspaceId}.json`, {
      method: 'GET',
    })
  }

  async uploadPage(page: Page, workspaceId: string): Promise<WebDAVResponse> {
    const pageData = {
      ...page,
      lastSync: new Date().toISOString(),
    }

    return this.makeRequest(`/pages/workspace-${workspaceId}/page-${page.id}.json`, {
      method: 'PUT',
      body: JSON.stringify(pageData, null, 2),
    })
  }

  async downloadPage(pageId: string, workspaceId: string): Promise<WebDAVResponse> {
    return this.makeRequest(`/pages/workspace-${workspaceId}/page-${pageId}.json`, {
      method: 'GET',
    })
  }

  async listFiles(path: string = '/'): Promise<WebDAVResponse> {
    return this.makeRequest(path, {
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
  }

  async createDirectory(path: string): Promise<WebDAVResponse> {
    return this.makeRequest(path, {
      method: 'MKCOL',
    })
  }

  async deleteFile(path: string): Promise<WebDAVResponse> {
    return this.makeRequest(path, {
      method: 'DELETE',
    })
  }
}

export const webdavService = new WebDAVService()