import { useState, useEffect } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Settings, Key, Globe, Brain, Save, TestTube } from 'lucide-react-taro'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import './index.css'

// LLM Provider类型
type LLMProvider = 'coze' | 'openai'

// LLM配置接口
interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  baseUrl?: string
  model?: string
}

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'coze',
  apiKey: '',
  baseUrl: '',
  model: 'gpt-4o'
}

export default function SettingsPage() {
  const [config, setConfig] = useState<LLMConfig>(DEFAULT_CONFIG)
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // 加载保存的配置
  useEffect(() => {
    const savedConfig = Taro.getStorageSync('llm_config')
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig))
    }
  }, [])

  // 保存配置
  const handleSave = async () => {
    setIsSaving(true)
    try {
      Taro.setStorageSync('llm_config', JSON.stringify(config))
      Taro.showToast({ title: '保存成功', icon: 'success' })
    } catch (err) {
      Taro.showToast({ title: '保存失败', icon: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  // 测试连接
  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      // 模拟测试 - 实际应该调用后端API测试
      await new Promise(resolve => setTimeout(resolve, 1500))

      if (config.apiKey) {
        setTestResult({ success: true, message: '连接成功！API Key配置正确。' })
      } else {
        setTestResult({ success: false, message: '请输入API Key' })
      }
    } catch (err) {
      setTestResult({ success: false, message: '连接失败，请检查配置' })
    } finally {
      setIsTesting(false)
    }
  }

  // 更新配置
  const updateConfig = (key: keyof LLMConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  return (
    <View className="min-h-screen bg-background pb-6">
      {/* 头部 */}
      <View className="px-4 py-4 bg-white sticky top-0 z-10">
        <View className="flex items-center gap-3">
          <View 
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
            onClick={() => Taro.navigateBack()}
          >
            <Text className="text-gray-600">←</Text>
          </View>
          <Text className="block text-lg font-semibold text-foreground">LLM配置</Text>
        </View>
      </View>

      <View className="px-4 py-4 space-y-4">
        {/* 说明卡片 */}
        <Card className="bg-primary bg-opacity-5 border border-primary border-opacity-20">
          <CardContent className="p-4">
            <View className="flex items-start gap-3">
              <Brain size={20} color="#F59E0B" />
              <View className="flex-1">
                <Text className="block text-sm font-medium text-foreground mb-1">大模型配置</Text>
                <Text className="block text-xs text-gray-600 leading-relaxed">
                  配置您的大模型API密钥，用于作业识别、错题分析、练习生成等功能。
                  支持Coze和OpenAI两种提供商。
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* 提供商选择 */}
        <Card className="bg-white">
          <CardContent className="p-4">
            <View className="flex items-center gap-2 mb-4">
              <Globe size={18} color="#6B7280" />
              <Text className="block text-sm font-medium text-foreground">选择提供商</Text>
            </View>
            <View className="flex gap-3">
              <View 
                className={`flex-1 p-3 rounded-xl border-2 text-center cursor-pointer ${
                  config.provider === 'coze' 
                    ? 'border-primary bg-primary bg-opacity-5' 
                    : 'border-gray-200'
                }`}
                onClick={() => updateConfig('provider', 'coze')}
              >
                <Text className={`block text-sm font-medium ${
                  config.provider === 'coze' ? 'text-primary' : 'text-gray-600'
                }`}>
                  Coze
                </Text>
                <Text className="block text-xs text-gray-400 mt-1">国内模型，推荐使用</Text>
              </View>
              <View 
                className={`flex-1 p-3 rounded-xl border-2 text-center cursor-pointer ${
                  config.provider === 'openai' 
                    ? 'border-primary bg-primary bg-opacity-5' 
                    : 'border-gray-200'
                }`}
                onClick={() => updateConfig('provider', 'openai')}
              >
                <Text className={`block text-sm font-medium ${
                  config.provider === 'openai' ? 'text-primary' : 'text-gray-600'
                }`}>
                  OpenAI
                </Text>
                <Text className="block text-xs text-gray-400 mt-1">GPT-4o模型</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* API Key输入 */}
        <Card className="bg-white">
          <CardContent className="p-4">
            <View className="flex items-center gap-2 mb-4">
              <Key size={18} color="#6B7280" />
              <Text className="block text-sm font-medium text-foreground">API密钥</Text>
            </View>
            <View className="bg-gray-50 rounded-xl px-4 py-3">
              <Input
                className="w-full text-sm"
                type="password"
                placeholder={config.provider === 'coze' ? '输入Coze API Key' : '输入OpenAI API Key'}
                value={config.apiKey}
                onInput={(e) => updateConfig('apiKey', e.detail.value)}
              />
            </View>
            <Text className="block text-xs text-gray-400 mt-2">
              {config.provider === 'coze' 
                ? '从 Coze 平台获取 API Key：https://www.coze.cn'
                : '从 OpenAI 平台获取 API Key：https://platform.openai.com'
              }
            </Text>
          </CardContent>
        </Card>

        {/* OpenAI额外配置 */}
        {config.provider === 'openai' && (
          <Card className="bg-white">
            <CardContent className="p-4">
              <View className="flex items-center gap-2 mb-4">
                <Settings size={18} color="#6B7280" />
                <Text className="block text-sm font-medium text-foreground">高级配置</Text>
              </View>
              
              <View className="mb-4">
                <Text className="block text-xs text-gray-500 mb-2">模型</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3">
                  <Input
                    className="w-full text-sm"
                    placeholder="gpt-4o"
                    value={config.model}
                    onInput={(e) => updateConfig('model', e.detail.value)}
                  />
                </View>
              </View>

              <View>
                <Text className="block text-xs text-gray-500 mb-2">API Endpoint（可选）</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3">
                  <Input
                    className="w-full text-sm"
                    placeholder="https://api.openai.com/v1"
                    value={config.baseUrl}
                    onInput={(e) => updateConfig('baseUrl', e.detail.value)}
                  />
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* 测试连接 */}
        <Card className="bg-white">
          <CardContent className="p-4">
            <Button
              variant="outline"
              className="w-full border-primary text-primary"
              disabled={isTesting || !config.apiKey}
              onClick={handleTest}
            >
              {isTesting ? (
                <>
                  <View className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin mr-2" />
                  测试中...
                </>
              ) : (
                <>
                  <TestTube size={16} color="#F59E0B" className="mr-2" />
                  测试连接
                </>
              )}
            </Button>
            
            {testResult && (
              <View className={`mt-3 p-3 rounded-xl ${
                testResult.success ? 'bg-success bg-opacity-10' : 'bg-error bg-opacity-10'
              }`}>
                <Text className={`block text-sm ${
                  testResult.success ? 'text-success' : 'text-error'
                }`}>
                  {testResult.message}
                </Text>
              </View>
            )}
          </CardContent>
        </Card>

        {/* 保存按钮 */}
        <Button
          className="w-full bg-primary text-white"
          disabled={isSaving}
          onClick={handleSave}
        >
          {isSaving ? (
            <>
              <View className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />
              保存中...
            </>
          ) : (
            <>
              <Save size={16} color="#FFFFFF" className="mr-2" />
              保存配置
            </>
          )}
        </Button>

        {/* 注意事项 */}
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <Text className="block text-sm font-medium text-foreground mb-2">注意事项</Text>
            <View className="space-y-2">
              <Text className="block text-xs text-gray-600">• API Key仅存储在本地，不会上传到服务器</Text>
              <Text className="block text-xs text-gray-600">• Coze API适合国内用户，响应速度快</Text>
              <Text className="block text-xs text-gray-600">• OpenAI API需要海外服务器或代理</Text>
              <Text className="block text-xs text-gray-600">• 未配置API Key时，系统使用模拟数据运行</Text>
            </View>
          </CardContent>
        </Card>
      </View>
    </View>
  )
}
