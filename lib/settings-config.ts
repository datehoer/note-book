import { Bot, Settings, Database, CheckCircle, XCircle, Loader2, Upload, Download } from 'lucide-react'

export interface SettingField {
  id: string
  type: 'input' | 'password' | 'switch' | 'radio' | 'number' | 'url' | 'text' | 'select'
  label: string
  description?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
  options?: Array<{
    value: string
    label: string
  }>
  dependsOn?: string
  dependsOnValue?: any
}

export interface SettingSection {
  id: string
  title: string
  description?: string
  icon?: any
  fields: SettingField[]
  actions?: Array<{
    id: string
    label: string
    variant?: 'default' | 'outline' | 'destructive' | 'secondary'
    icon?: any
    disabled?: boolean
    handler: string
  }>
  status?: Array<{
    id: string
    label: string
    getter: string
    badges?: Array<{
      condition: string
      variant: 'default' | 'outline' | 'destructive' | 'secondary'
      icon?: any
      text: string
    }>
  }>
}

export interface SettingsConfig {
  sections: SettingSection[]
}

export const settingsConfig: SettingsConfig = {
  sections: [
    {
      id: 'ai',
      title: 'AI 配置',
      description: '配置 AI 对话功能，支持自定义 API 端点和模型设置',
      icon: Bot,
      status: [
        {
          id: 'connection',
          label: '连接状态',
          getter: 'getAIConnectionStatus',
          badges: [
            {
              condition: 'testing',
              variant: 'secondary',
              icon: Loader2,
              text: '测试中'
            },
            {
              condition: 'success',
              variant: 'default',
              icon: CheckCircle,
              text: '连接成功'
            },
            {
              condition: 'error',
              variant: 'destructive',
              icon: XCircle,
              text: '连接失败'
            },
            {
              condition: 'default',
              variant: 'outline',
              text: '未测试'
            }
          ]
        }
      ],
      fields: [
        {
          id: 'enabled',
          type: 'switch',
          label: '启用 AI 对话',
          description: '启用后可以使用 AI 对话功能'
        },
        {
          id: 'url',
          type: 'url',
          label: 'API URL',
          placeholder: 'https://api.openai.com/v1/chat/completions',
          dependsOn: 'enabled',
          dependsOnValue: true
        },
        {
          id: 'apiKey',
          type: 'password',
          label: 'API Key',
          placeholder: 'sk-...',
          dependsOn: 'enabled',
          dependsOnValue: true
        },
        {
          id: 'model',
          type: 'input',
          label: '模型',
          placeholder: 'gpt-3.5-turbo',
          dependsOn: 'enabled',
          dependsOnValue: true
        }
      ],
      actions: [
        {
          id: 'testConnection',
          label: '测试连接',
          variant: 'outline',
          handler: 'handleTestAIConnection',
          disabled: false
        },
        {
          id: 'save',
          label: '保存设置',
          variant: 'default',
          handler: 'handleSaveAIConfig'
        }
      ]
    },
    {
      id: 'webdav',
      title: 'WebDAV 同步设置',
      description: '配置 WebDAV 服务器连接，实现笔记数据的云端同步和备份',
      icon: Settings,
      status: [
        {
          id: 'connection',
          label: '连接状态',
          getter: 'getWebDAVConnectionStatus',
          badges: [
            {
              condition: 'success',
              variant: 'default',
              icon: CheckCircle,
              text: '连接成功'
            },
            {
              condition: 'error',
              variant: 'destructive',
              icon: XCircle,
              text: '连接失败'
            }
          ]
        },
        {
          id: 'sync',
          label: '同步状态',
          getter: 'getWebDAVSyncStatus',
          badges: [
            {
              condition: 'syncing',
              variant: 'secondary',
              icon: Loader2,
              text: '正在同步'
            },
            {
              condition: 'success',
              variant: 'default',
              icon: CheckCircle,
              text: '同步成功'
            },
            {
              condition: 'error',
              variant: 'destructive',
              icon: XCircle,
              text: '同步失败'
            },
            {
              condition: 'default',
              variant: 'outline',
              text: '未同步'
            }
          ]
        }
      ],
      fields: [
        {
          id: 'url',
          type: 'url',
          label: 'WebDAV 服务器地址',
          placeholder: 'https://example.com/remote.php/dav/files/username/'
        },
        {
          id: 'username',
          type: 'input',
          label: '用户名',
          placeholder: 'your_username'
        },
        {
          id: 'password',
          type: 'password',
          label: '密码',
          placeholder: 'your_password'
        },
        {
          id: 'enabled',
          type: 'switch',
          label: '启用 WebDAV 同步',
          description: '启用后可以将笔记同步到 WebDAV 服务器'
        },
        {
          id: 'autoSync',
          type: 'switch',
          label: '自动同步',
          description: '定期自动同步笔记到服务器',
          dependsOn: 'enabled',
          dependsOnValue: true
        },
        {
          id: 'syncInterval',
          type: 'number',
          label: '同步间隔（分钟）',
          validation: {
            min: 1,
            max: 1440
          },
          dependsOn: 'autoSync',
          dependsOnValue: true
        }
      ],
      actions: [
        {
          id: 'testConnection',
          label: '测试连接',
          variant: 'outline',
          handler: 'handleTestWebDAVConnection'
        },
        {
          id: 'syncUp',
          label: '上传到服务器',
          variant: 'outline',
          icon: Upload,
          handler: 'handleSyncUp'
        },
        {
          id: 'syncDown',
          label: '从服务器下载',
          variant: 'outline',
          icon: Download,
          handler: 'handleSyncDown'
        },
        {
          id: 'save',
          label: '保存设置',
          variant: 'default',
          handler: 'handleSaveWebDAVConfig'
        }
      ]
    },
    {
      id: 'storage',
      title: '存储配置',
      description: '配置笔记存储位置。可选择浏览器存储或本地文件系统。云端同步请使用 WebDAV 同步设置。',
      icon: Database,
      fields: [
        {
          id: 'type',
          type: 'radio',
          label: '存储类型',
          options: [
            { value: 'browser', label: '浏览器存储（默认）' },
            { value: 'local', label: '本地文件系统' }
          ]
        },
        {
          id: 'localPath',
          type: 'input',
          label: '本地目录路径',
          placeholder: '例如：/home/user/notes 或 C:\\Users\\user\\notes',
          description: '指定笔记存储为 JSON 文件的目录路径。',
          dependsOn: 'type',
          dependsOnValue: 'local'
        }
      ],
      actions: [
        {
          id: 'testConnection',
          label: '测试连接',
          variant: 'outline',
          handler: 'handleTestStorageConnection'
        },
        {
          id: 'saveAndMigrate',
          label: '保存并迁移数据',
          variant: 'default',
          handler: 'handleSaveAndMigrate'
        }
      ]
    }
  ]
}