'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, Settings, Upload, Download } from 'lucide-react'
import { useNotesStore } from '@/lib/store'
import { WebDAVConfig } from '@/lib/types'

export function WebDAVSettings() {
  const { 
    webdavConfig, 
    setWebDAVConfig, 
    testWebDAVConnection, 
    syncToWebDAV, 
    syncFromWebDAV,
    syncStatus 
  } = useNotesStore()

  const [config, setConfig] = useState<WebDAVConfig>({
    url: '',
    username: '',
    password: '',
    enabled: false,
    autoSync: false,
    syncInterval: 300000, // 5 minutes
  })

  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (webdavConfig) {
      setConfig({ ...webdavConfig })
    }
  }, [webdavConfig])

  const handleTestConnection = async () => {
    if (!config.url || !config.username || !config.password) {
      setConnectionStatus('error')
      return
    }

    setIsTestingConnection(true)
    setConnectionStatus('idle')

    // Temporarily set config for testing
    setWebDAVConfig(config)
    
    try {
      const success = await testWebDAVConnection()
      setConnectionStatus(success ? 'success' : 'error')
    } catch (error) {
      setConnectionStatus('error')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleSaveConfig = async () => {
    setIsSaving(true)
    try {
      setWebDAVConfig(config)
      // Test connection after saving if enabled
      if (config.enabled && config.url && config.username && config.password) {
        await handleTestConnection()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleSync = async (direction: 'up' | 'down') => {
    if (!webdavConfig?.enabled) return
    
    if (direction === 'up') {
      await syncToWebDAV()
    } else {
      await syncFromWebDAV()
    }
  }

  const getSyncStatusBadge = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />正在同步</Badge>
      case 'success':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />同步成功</Badge>
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />同步失败</Badge>
      default:
        return <Badge variant="outline">未同步</Badge>
    }
  }

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'success':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />连接成功</Badge>
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />连接失败</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Settings className="w-5 h-5" />
        <h3 className="text-lg font-semibold">WebDAV 同步设置</h3>
      </div>
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">连接状态:</span>
            {getConnectionStatusBadge()}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">同步状态:</span>
            {getSyncStatusBadge()}
          </div>
        </div>

        {/* WebDAV URL */}
        <div className="space-y-2">
          <Label htmlFor="webdav-url">WebDAV 服务器地址</Label>
          <Input
            id="webdav-url"
            type="url"
            placeholder="https://example.com/remote.php/dav/files/username/"
            value={config.url}
            onChange={(e) => setConfig({ ...config, url: e.target.value })}
          />
        </div>

        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username">用户名</Label>
          <Input
            id="username"
            type="text"
            placeholder="your_username"
            value={config.username}
            onChange={(e) => setConfig({ ...config, username: e.target.value })}
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            placeholder="your_password"
            value={config.password}
            onChange={(e) => setConfig({ ...config, password: e.target.value })}
          />
        </div>

        {/* Test Connection */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTestingConnection || !config.url || !config.username || !config.password}
          >
            {isTestingConnection ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                测试中...
              </>
            ) : (
              '测试连接'
            )}
          </Button>
        </div>

        {/* Enable WebDAV */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>启用 WebDAV 同步</Label>
            <p className="text-sm text-muted-foreground">
              启用后可以将笔记同步到 WebDAV 服务器
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
          />
        </div>

        {/* Auto Sync */}
        {config.enabled && (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>自动同步</Label>
              <p className="text-sm text-muted-foreground">
                定期自动同步笔记到服务器
              </p>
            </div>
            <Switch
              checked={config.autoSync}
              onCheckedChange={(autoSync) => setConfig({ ...config, autoSync })}
            />
          </div>
        )}

        {/* Sync Interval */}
        {config.enabled && config.autoSync && (
          <div className="space-y-2">
            <Label htmlFor="sync-interval">同步间隔（分钟）</Label>
            <Input
              id="sync-interval"
              type="number"
              min="1"
              max="1440"
              value={config.syncInterval / 60000}
              onChange={(e) => setConfig({ 
                ...config, 
                syncInterval: parseInt(e.target.value) * 60000 
              })}
            />
          </div>
        )}

        {/* Manual Sync Buttons */}
        {config.enabled && webdavConfig?.enabled && (
          <div className="space-y-4">
            <div className="border-t pt-4">
              <Label className="text-base font-medium">手动同步</Label>
              <p className="text-sm text-muted-foreground mb-3">
                立即执行同步操作
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSync('up')}
                  disabled={syncStatus === 'syncing'}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  上传到服务器
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSync('down')}
                  disabled={syncStatus === 'syncing'}
                >
                  <Download className="w-4 h-4 mr-2" />
                  从服务器下载
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Last Sync Info */}
        {webdavConfig?.lastSync && (
          <Alert>
            <AlertDescription>
              上次同步时间: {new Date(webdavConfig.lastSync).toLocaleString('zh-CN')}
            </AlertDescription>
          </Alert>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSaveConfig}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              '保存设置'
            )}
          </Button>
        </div>
    </div>
  )
}