'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useNotesStore } from '@/lib/store'
import { StorageConfig } from '@/lib/types'
import { FileText, Folder, Cloud, HardDrive, Monitor } from 'lucide-react'

interface InitialSetupProps {
  onComplete: () => void
}

export function InitialSetup({ onComplete }: InitialSetupProps) {
  const { toast } = useToast()
  const { setStorageConfig, testStorageConnection } = useNotesStore()
  
  const [storageType, setStorageType] = useState<'browser' | 'local' | 'webdav'>('browser')
  const [localPath, setLocalPath] = useState('')
  const [webdavConfig, setWebdavConfig] = useState({
    url: '',
    username: '',
    password: '',
    enabled: true
  })
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [isSettingUp, setIsSettingUp] = useState(false)

  const handleWebDAVConfigChange = (field: string, value: string | boolean) => {
    setWebdavConfig(prev => ({ ...prev, [field]: value }))
  }

  const handleTestConnection = async () => {
    setIsTestingConnection(true)
    try {
      const config: StorageConfig = {
        type: storageType,
        ...(storageType === 'local' && { localPath }),
        ...(storageType === 'webdav' && { webdavConfig })
      }
      
      await setStorageConfig(config)
      const isConnected = await testStorageConnection()
      
      if (isConnected) {
        toast({
          title: "连接成功",
          description: "存储连接测试通过",
        })
        return true
      } else {
        toast({
          title: "连接失败",
          description: "无法连接到存储",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      toast({
        title: "连接错误",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
      return false
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleSetup = async () => {
    // 验证配置
    if (storageType === 'local' && !localPath.trim()) {
      toast({
        title: "配置错误",
        description: "请输入本地目录路径",
        variant: "destructive",
      })
      return
    }

    if (storageType === 'webdav' && (!webdavConfig.url.trim() || !webdavConfig.username.trim())) {
      toast({
        title: "配置错误",
        description: "请填写WebDAV服务器URL和用户名",
        variant: "destructive",
      })
      return
    }

    setIsSettingUp(true)
    try {
      // 如果不是浏览器存储，先测试连接
      if (storageType !== 'browser') {
        const connectionSuccess = await handleTestConnection()
        if (!connectionSuccess) {
          setIsSettingUp(false)
          return
        }
      } else {
        // 设置浏览器存储
        const config: StorageConfig = { type: 'browser' }
        await setStorageConfig(config)
      }

      toast({
        title: "设置完成",
        description: "存储配置已成功设置",
      })
      
      onComplete()
    } catch (error) {
      toast({
        title: "设置失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsSettingUp(false)
    }
  }

  const storageOptions = [
    {
      value: 'browser' as const,
      label: '浏览器存储',
      description: '数据存储在浏览器本地，简单易用，无需额外配置',
      icon: Monitor,
      pros: ['无需配置', '立即可用', '快速访问'],
      cons: ['仅限当前浏览器', '清除数据时会丢失']
    },
    {
      value: 'local' as const,
      label: '本地文件系统',
      description: '数据存储为本地JSON文件，可以备份和版本控制',
      icon: HardDrive,
      pros: ['数据持久保存', '可以备份', '支持版本控制'],
      cons: ['需要配置路径', '仅限当前设备']
    },
    {
      value: 'webdav' as const,
      label: 'WebDAV服务器',
      description: '数据存储在WebDAV服务器上，支持多设备同步',
      icon: Cloud,
      pros: ['多设备同步', '云端备份', '随时随地访问'],
      cons: ['需要WebDAV服务器', '依赖网络连接']
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">笔记本</h1>
          </div>
          <CardTitle className="text-xl">欢迎使用笔记本应用</CardTitle>
          <CardDescription>
            首次使用需要选择数据存储方式。请根据您的需求选择合适的存储类型。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-medium">选择存储类型</Label>
            <RadioGroup
              value={storageType}
              onValueChange={(value) => setStorageType(value as 'browser' | 'local' | 'webdav')}
            >
              {storageOptions.map((option) => {
                const Icon = option.icon
                return (
                  <div key={option.value} className="space-y-2">
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-5 w-5 text-gray-600" />
                          <Label htmlFor={option.value} className="font-medium cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                        <p className="text-sm text-gray-600">{option.description}</p>
                        <div className="flex space-x-4 text-xs">
                          <div>
                            <span className="font-medium text-green-600">优点:</span>
                            <span className="text-gray-600 ml-1">{option.pros.join(', ')}</span>
                          </div>
                          <div>
                            <span className="font-medium text-orange-600">缺点:</span>
                            <span className="text-gray-600 ml-1">{option.cons.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </RadioGroup>
          </div>

          {storageType === 'local' && (
            <div className="space-y-4">
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="localPath">本地目录路径</Label>
                <Input
                  id="localPath"
                  placeholder="例如: /home/user/notes 或 C:\Users\user\notes"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                />
                <p className="text-sm text-gray-600">
                  指定存储笔记的本地目录，数据将以JSON文件形式保存
                </p>
              </div>
            </div>
          )}

          {storageType === 'webdav' && (
            <div className="space-y-4">
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webdavUrl">WebDAV服务器URL</Label>
                  <Input
                    id="webdavUrl"
                    placeholder="https://your-server.com/webdav"
                    value={webdavConfig.url}
                    onChange={(e) => handleWebDAVConfigChange('url', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webdavUsername">用户名</Label>
                  <Input
                    id="webdavUsername"
                    value={webdavConfig.username}
                    onChange={(e) => handleWebDAVConfigChange('username', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webdavPassword">密码</Label>
                  <Input
                    id="webdavPassword"
                    type="password"
                    value={webdavConfig.password}
                    onChange={(e) => handleWebDAVConfigChange('password', e.target.value)}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  支持Nextcloud、ownCloud等WebDAV兼容服务器
                </p>
              </div>
            </div>
          )}

          <Separator />
          
          <div className="flex space-x-3">
            {storageType !== 'browser' && (
              <Button 
                variant="outline" 
                onClick={handleTestConnection}
                disabled={isTestingConnection || isSettingUp}
              >
                {isTestingConnection ? "测试中..." : "测试连接"}
              </Button>
            )}
            <Button 
              onClick={handleSetup}
              disabled={isSettingUp || isTestingConnection}
              className="flex-1"
            >
              {isSettingUp ? "设置中..." : "开始使用"}
            </Button>
          </div>

          <div className="text-sm text-gray-500">
            <p><strong>提示:</strong> 您可以随时在设置中更改存储配置。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}