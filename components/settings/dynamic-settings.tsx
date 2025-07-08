'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { useNotesStore } from '@/lib/store'
import { settingsConfig, SettingField, SettingSection } from '@/lib/settings-config'

interface DynamicSettingsProps {
  sectionId?: string
}

export function DynamicSettings({ sectionId }: DynamicSettingsProps) {
  const store = useNotesStore()
  const [localConfigs, setLocalConfigs] = useState<Record<string, any>>({})
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [statusStates, setStatusStates] = useState<Record<string, any>>({})

  // Filter sections based on sectionId prop
  const sectionsToRender = useMemo(() => {
    if (sectionId) {
      return settingsConfig.sections.filter(section => section.id === sectionId)
    }
    return settingsConfig.sections
  }, [sectionId])

  // Initialize local configs
  useEffect(() => {
    const initialConfigs: Record<string, any> = {}
    sectionsToRender.forEach(section => {
      switch (section.id) {
        case 'ai':
          initialConfigs[section.id] = {
            url: store.aiConfig?.url || '',
            apiKey: store.aiConfig?.apiKey || '',
            model: store.aiConfig?.model || 'gpt-3.5-turbo',
            enabled: store.aiConfig?.enabled || false,
          }
          break
        case 'webdav':
          initialConfigs[section.id] = {
            url: store.webdavConfig?.url || '',
            username: store.webdavConfig?.username || '',
            password: store.webdavConfig?.password || '',
            enabled: store.webdavConfig?.enabled || false,
            autoSync: store.webdavConfig?.autoSync || false,
            syncInterval: (store.webdavConfig?.syncInterval || 300000) / 60000,
          }
          break
        case 'storage':
          initialConfigs[section.id] = {
            type: store.storageConfig?.type || 'browser',
            localPath: store.storageConfig?.localPath || '',
          }
          break
      }
    })
    setLocalConfigs(initialConfigs)
  }, [sectionsToRender, store])

  // Update field value
  const updateFieldValue = (sectionId: string, fieldId: string, value: any) => {
    setLocalConfigs(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [fieldId]: value
      }
    }))
  }

  // Check if field should be disabled based on dependencies
  const isFieldDisabled = (section: SettingSection, field: SettingField) => {
    if (field.disabled) return true
    if (!field.dependsOn) return false
    
    const config = localConfigs[section.id]
    if (!config) return true
    
    return config[field.dependsOn] !== field.dependsOnValue
  }

  // Check if field should be visible based on dependencies
  const isFieldVisible = (section: SettingSection, field: SettingField) => {
    if (!field.dependsOn) return true
    
    const config = localConfigs[section.id]
    if (!config) return false
    
    return config[field.dependsOn] === field.dependsOnValue
  }

  // Render field based on type
  const renderField = (section: SettingSection, field: SettingField) => {
    const config = localConfigs[section.id] || {}
    const value = config[field.id]
    const disabled = isFieldDisabled(section, field)
    const visible = isFieldVisible(section, field)

    if (!visible) return null

    const fieldId = `${section.id}-${field.id}`

    switch (field.type) {
      case 'switch':
        return (
          <div key={fieldId} className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={fieldId}>{field.label}</Label>
              {field.description && (
                <p className="text-sm text-muted-foreground">{field.description}</p>
              )}
            </div>
            <Switch
              id={fieldId}
              checked={value || false}
              onCheckedChange={(checked) => updateFieldValue(section.id, field.id, checked)}
              disabled={disabled}
            />
          </div>
        )

      case 'radio':
        return (
          <div key={fieldId} className="space-y-4">
            <Label>{field.label}</Label>
            <RadioGroup
              value={value || ''}
              onValueChange={(newValue) => updateFieldValue(section.id, field.id, newValue)}
              disabled={disabled}
            >
              {field.options?.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${fieldId}-${option.value}`} />
                  <Label htmlFor={`${fieldId}-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      case 'select':
        return (
          <div key={fieldId} className="space-y-2">
            <Label htmlFor={fieldId}>{field.label}</Label>
            <Select
              value={value || ''}
              onValueChange={(newValue) => updateFieldValue(section.id, field.id, newValue)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
        )

      case 'number':
        return (
          <div key={fieldId} className="space-y-2">
            <Label htmlFor={fieldId}>{field.label}</Label>
            <Input
              id={fieldId}
              type="number"
              placeholder={field.placeholder}
              value={value || ''}
              onChange={(e) => updateFieldValue(section.id, field.id, parseInt(e.target.value) || 0)}
              disabled={disabled}
              min={field.validation?.min}
              max={field.validation?.max}
            />
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
        )

      default:
        return (
          <div key={fieldId} className="space-y-2">
            <Label htmlFor={fieldId}>{field.label}</Label>
            <Input
              id={fieldId}
              type={field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text'}
              placeholder={field.placeholder}
              value={value || ''}
              onChange={(e) => updateFieldValue(section.id, field.id, e.target.value)}
              disabled={disabled}
            />
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
        )
    }
  }

  // Render status badges
  const renderStatusBadge = (section: SettingSection, status: any) => {
    const statusValue = statusStates[`${section.id}-${status.id}`]
    
    if (!status.badges) return null

    const matchingBadge = status.badges.find(badge => {
      if (badge.condition === 'default') return true
      return statusValue === badge.condition
    })

    if (!matchingBadge) return null

    const Icon = matchingBadge.icon
    const isAnimated = matchingBadge.icon === Loader2

    return (
      <Badge variant={matchingBadge.variant}>
        {Icon && <Icon className={`w-3 h-3 mr-1 ${isAnimated ? 'animate-spin' : ''}`} />}
        {matchingBadge.text}
      </Badge>
    )
  }

  // Handle action clicks
  const handleActionClick = async (sectionId: string, actionId: string, handler: string) => {
    const config = localConfigs[sectionId]
    setLoadingStates(prev => ({ ...prev, [`${sectionId}-${actionId}`]: true }))

    try {
      switch (handler) {
        case 'handleTestAIConnection':
          setStatusStates(prev => ({ ...prev, [`${sectionId}-connection`]: 'testing' }))
          store.setAIConfig(config)
          const aiResult = await store.testAIConnection()
          setStatusStates(prev => ({ ...prev, [`${sectionId}-connection`]: aiResult ? 'success' : 'error' }))
          break

        case 'handleSaveAIConfig':
          store.setAIConfig(config)
          setStatusStates(prev => ({ ...prev, [`${sectionId}-connection`]: null }))
          break

        case 'handleTestWebDAVConnection':
          setStatusStates(prev => ({ ...prev, [`${sectionId}-connection`]: 'testing' }))
          store.setWebDAVConfig({
            ...config,
            syncInterval: config.syncInterval * 60000
          })
          const webdavResult = await store.testWebDAVConnection()
          setStatusStates(prev => ({ ...prev, [`${sectionId}-connection`]: webdavResult ? 'success' : 'error' }))
          break

        case 'handleSaveWebDAVConfig':
          store.setWebDAVConfig({
            ...config,
            syncInterval: config.syncInterval * 60000
          })
          break

        case 'handleSyncUp':
          setStatusStates(prev => ({ ...prev, [`${sectionId}-sync`]: 'syncing' }))
          await store.syncToWebDAV()
          setStatusStates(prev => ({ ...prev, [`${sectionId}-sync`]: store.syncStatus }))
          break

        case 'handleSyncDown':
          setStatusStates(prev => ({ ...prev, [`${sectionId}-sync`]: 'syncing' }))
          await store.syncFromWebDAV()
          setStatusStates(prev => ({ ...prev, [`${sectionId}-sync`]: store.syncStatus }))
          break

        case 'handleTestStorageConnection':
          const storageConfig = {
            type: config.type,
            localPath: config.localPath,
          }
          await store.setStorageConfig(storageConfig)
          await store.testStorageConnection()
          break

        case 'handleSaveAndMigrate':
          const migrationConfig = {
            type: config.type,
            localPath: config.localPath,
          }
          await store.migrateStorage(migrationConfig)
          break
      }
    } catch (error) {
      console.error('Action failed:', error)
      if (handler.includes('Test') || handler.includes('Connection')) {
        const statusKey = handler.includes('AI') ? 'connection' : 
                         handler.includes('WebDAV') ? 'connection' : 
                         handler.includes('Sync') ? 'sync' : 'connection'
        setStatusStates(prev => ({ ...prev, [`${sectionId}-${statusKey}`]: 'error' }))
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, [`${sectionId}-${actionId}`]: false }))
    }
  }

  return (
    <div className="space-y-6">
      {sectionsToRender.map(section => {
        const Icon = section.icon
        const config = localConfigs[section.id] || {}

        return (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {Icon && <Icon className="w-5 h-5" />}
                {section.title}
              </CardTitle>
              {section.description && (
                <CardDescription>{section.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Section */}
              {section.status && section.status.length > 0 && (
                <div className="flex items-center justify-between">
                  {section.status.map(status => (
                    <div key={status.id} className="flex items-center gap-2">
                      <span className="text-sm font-medium">{status.label}:</span>
                      {renderStatusBadge(section, status)}
                    </div>
                  ))}
                </div>
              )}

              {/* Fields */}
              <div className="space-y-6">
                {section.fields.map(field => renderField(section, field))}
              </div>

              {/* Actions */}
              {section.actions && section.actions.length > 0 && (
                <>
                  <Separator />
                  <div className="flex gap-2 flex-wrap">
                    {section.actions.map(action => {
                      const ActionIcon = action.icon
                      const isLoading = loadingStates[`${section.id}-${action.id}`]
                      
                      return (
                        <Button
                          key={action.id}
                          variant={action.variant || 'default'}
                          onClick={() => handleActionClick(section.id, action.id, action.handler)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : ActionIcon ? (
                            <ActionIcon className="w-4 h-4 mr-2" />
                          ) : null}
                          {isLoading ? '处理中...' : action.label}
                        </Button>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Special info sections */}
              {section.id === 'webdav' && store.webdavConfig?.lastSync && (
                <Alert>
                  <AlertDescription>
                    上次同步时间: {new Date(store.webdavConfig.lastSync).toLocaleString('zh-CN')}
                  </AlertDescription>
                </Alert>
              )}

              {section.id === 'storage' && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>注意：</strong> 更改存储类型时，现有数据将迁移到新位置。</p>
                  <p><strong>浏览器存储：</strong> 数据存储在浏览器的本地存储中。</p>
                  <p><strong>本地文件系统：</strong> 数据以 JSON 文件形式存储在指定目录中。</p>
                  <p><strong>云端同步：</strong> 如需云端同步，请使用"WebDAV 同步设置"功能。</p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}