import { AIConfig } from './types'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatResponse {
  success: boolean
  message?: string
  error?: string
}

class AIService {
  private config: AIConfig | null = null

  setConfig(config: AIConfig) {
    this.config = config
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) {
      throw new Error('AI configuration not set')
    }

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5,
        }),
      })

      return response.ok
    } catch (error) {
      console.error('AI connection test failed:', error)
      return false
    }
  }

  async sendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
    if (!this.config) {
      return { success: false, error: 'AI configuration not set' }
    }

    if (!this.config.enabled) {
      return { success: false, error: 'AI service is disabled' }
    }

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          max_tokens: 1000,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return { 
          success: false, 
          error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}` 
        }
      }

      const data = await response.json()
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        return { success: false, error: 'Invalid response format from AI service' }
      }

      return {
        success: true,
        message: data.choices[0].message.content
      }
    } catch (error) {
      console.error('AI service error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  async generateSummary(content: string): Promise<ChatResponse> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一个智能助手，专门帮助用户总结和分析文本内容。请用中文回复。'
      },
      {
        role: 'user',
        content: `请为以下内容生成一个简洁的摘要：\n\n${content}`
      }
    ]

    return this.sendMessage(messages)
  }

  async improveText(content: string): Promise<ChatResponse> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一个智能写作助手，专门帮助用户改进文本的表达和结构。请用中文回复。'
      },
      {
        role: 'user',
        content: `请帮我改进以下文本的表达和结构：\n\n${content}`
      }
    ]

    return this.sendMessage(messages)
  }

  async translateText(content: string, targetLanguage: string = 'English'): Promise<ChatResponse> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一个专业的翻译助手，能够准确翻译各种语言之间的文本。'
      },
      {
        role: 'user',
        content: `请将以下内容翻译成${targetLanguage}：\n\n${content}`
      }
    ]

    return this.sendMessage(messages)
  }
}

export const aiService = new AIService()