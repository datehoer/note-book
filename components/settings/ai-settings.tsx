"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, Bot } from "lucide-react"
import { useNotesStore } from "@/lib/store"
import { AIConfig } from "@/lib/types"

export function AISettings() {
  const { aiConfig, setAIConfig, testAIConnection } = useNotesStore()
  
  const [formData, setFormData] = React.useState<AIConfig>({
    url: aiConfig?.url || '',
    apiKey: aiConfig?.apiKey || '',
    model: aiConfig?.model || 'gpt-3.5-turbo',
    enabled: aiConfig?.enabled || false,
  })
  
  const [isTestingConnection, setIsTestingConnection] = React.useState(false)
  const [testResult, setTestResult] = React.useState<'success' | 'error' | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      setAIConfig(formData)
      setTestResult(null)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    if (!formData.url || !formData.apiKey) {
      setTestResult('error')
      return
    }
    
    setIsTestingConnection(true)
    setTestResult(null)
    
    // Set temporary config for testing
    setAIConfig(formData)
    
    try {
      const isConnected = await testAIConnection()
      setTestResult(isConnected ? 'success' : 'error')
    } catch (error) {
      setTestResult('error')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const getConnectionStatusBadge = () => {
    if (isTestingConnection) {
      return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />测试中</Badge>
    }
    switch (testResult) {
      case 'success':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />连接成功</Badge>
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />连接失败</Badge>
      default:
        return <Badge variant="outline">未测试</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Bot className="w-5 h-5" />
        <h3 className="text-lg font-semibold">AI 配置</h3>
      </div>
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">连接状态:</span>
            {getConnectionStatusBadge()}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Enable AI */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>启用 AI 对话</Label>
              <p className="text-sm text-muted-foreground">
                启用后可以使用 AI 对话功能
              </p>
            </div>
            <Switch
              id="ai-enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, enabled: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-url">API URL</Label>
            <Input
              id="ai-url"
              type="url"
              placeholder="https://api.openai.com/v1/chat/completions"
              value={formData.url}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, url: e.target.value }))
              }
              disabled={!formData.enabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-apikey">API Key</Label>
            <Input
              id="ai-apikey"
              type="password"
              placeholder="sk-..."
              value={formData.apiKey}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, apiKey: e.target.value }))
              }
              disabled={!formData.enabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-model">模型</Label>
            <Input
              id="ai-model"
              placeholder="gpt-3.5-turbo"
              value={formData.model}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, model: e.target.value }))
              }
              disabled={!formData.enabled}
            />
          </div>

          {/* Test Connection */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={!formData.enabled || isTestingConnection || !formData.url || !formData.apiKey}
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

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              type="submit" 
              disabled={!formData.enabled || isSaving}
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
        </form>
    </div>
  )
}