import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Network } from '@/network'
import { cn } from '@/lib/utils'
import { BookOpen, Clock, TrendingUp, TestTube, Volume2, Info, Download, Calendar } from 'lucide-react-taro'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { setSoundEnabled, isSoundEnabled, playSound } from '@/lib/sound'
import { useAppStore } from '@/store/appStore'
import './index.css'

const APP_VERSION = '0.3.0'

export default function MyPage() {
  const { mistakes, reviewReminders, stats } = useAppStore()
  const [isExporting, setIsExporting] = useState(false)
  const [demoMode, setDemoMode] = useState(false)   // hydrate from storage; triggers re-render
  const [soundOn, setSoundOn] = useState(false)     // hydrate from storage; triggers re-render

  // hydrate Switch 状态（避免直接用 getStorageSync 不触发重渲染）
useEffect(() => {
    const initDemoMode = async () => {
      // 优先从后端获取真实状态（服务重启后 globalMockMode 重置为 false，
      // 本地存储可能还是旧的 true，两者不一致）
      try {
        const res = await Network.request({
          url: '/api/settings/mock-mode',
          method: 'GET',
        })
        if (res.data?.enabled !== undefined) {
          const backendEnabled = res.data.enabled === true
          setDemoMode(backendEnabled)
          Taro.setStorageSync('demo_mode', backendEnabled.toString())
          setSoundOn(isSoundEnabled())
          return
        }
      } catch {
        // 后端不可达时回退到本地存储
        console.warn('[settings] 无法获取后端 mock 状态，使用本地存储')
      }
      const stored = Taro.getStorageSync('demo_mode')
      // 默认为 false（演示模式关闭，直接用真实 LLM）
      setDemoMode(stored === 'true')
      setSoundOn(isSoundEnabled())
    }
    void initDemoMode()
  }, [])

  // 进入页面刷新数据
  useEffect(() => {
    void useAppStore.getState().fetchAll()
  }, [])

  // 导出 PDF 错题报告
  const handleExport = async () => {
    setIsExporting(true)
    Taro.showLoading({ title: '正在生成报告...' })
    try {
      const res = await Network.request({
        url: '/api/study/mistake/export',
        method: 'POST',
        data: { userId: 'user1' },
      })
      const payload = res.data?.data
      if (payload?.downloadUrl) {
        Taro.hideLoading()
        // 拼接完整 URL（相对路径 → 绝对路径）
        const fullUrl = payload.downloadUrl.startsWith('http')
          ? payload.downloadUrl
          : `${PROJECT_DOMAIN}${payload.downloadUrl}`
        // 平台检测：H5 新窗口预览，WeApp 下载后打开
        if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
          try {
            const downloadRes = await Network.downloadFile({ url: fullUrl })
            if (downloadRes.statusCode === 200) {
              await Taro.openDocument({ filePath: downloadRes.tempFilePath, fileType: 'pdf' })
            } else {
              throw new Error('下载失败')
            }
          } catch {
            Taro.showToast({ title: '报告已生成，请前往设置页面下载', icon: 'none' })
          }
        } else {
          window.open(fullUrl, '_blank')
          Taro.showToast({ title: '报告已在新窗口打开', icon: 'success' })
        }
      } else {
        throw new Error('导出失败')
      }
    } catch (err) {
      Taro.hideLoading()
      Taro.showToast({ title: '导出失败，请稍后重试', icon: 'error' })
    } finally {
      setIsExporting(false)
    }
  }

  // 待复习数
  const dueReviewCount = reviewReminders.filter(
    (r) => r.status === 'due' || r.status === 'pending',
  ).length

  return (
    <View className="min-h-screen bg-gray-50 pb-6">
      {/* 头部 */}
      <View className="px-4 py-6 bg-gradient-to-br from-orange-500 to-pink-500">
        <Text className="block text-white/80 text-sm">Venus-Mate</Text>
        <Text className="block text-white text-2xl font-bold mt-1">我的</Text>
        <Text className="block text-white/70 text-xs mt-1">AI 学习成长伴侣</Text>
      </View>

      <View className="px-4 py-4 space-y-4">
        {/* 学习概览 */}
        <Card className="bg-white">
          <CardContent className="p-4">
            <View className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} color="#F59E0B" />
              <Text className="block text-sm font-semibold text-foreground">学习概览</Text>
            </View>
            <View className="grid grid-cols-3 gap-3">
              <View className="bg-orange-50 rounded-xl p-3 text-center">
                <BookOpen size={16} color="#EF4444" className="mx-auto mb-1" />
                <Text className="block text-xl font-bold text-gray-900">{mistakes.length}</Text>
                <Text className="block text-xs text-gray-500 mt-1">错题数</Text>
              </View>
              <View className="bg-yellow-50 rounded-xl p-3 text-center">
                <Clock size={16} color="#F59E0B" className="mx-auto mb-1" />
                <Text className="block text-xl font-bold text-gray-900">{dueReviewCount}</Text>
                <Text className="block text-xs text-gray-500 mt-1">待复习</Text>
              </View>
              <View className="bg-green-50 rounded-xl p-3 text-center">
                <TrendingUp size={16} color="#10B981" className="mx-auto mb-1" />
                <Text className="block text-xl font-bold text-gray-900">{stats.practiceAccuracy}%</Text>
                <Text className="block text-xs text-gray-500 mt-1">掌握度</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* 数据导出 */}
        <Card className="bg-white">
          <CardContent className="p-4">
            <View className="flex items-center gap-2 mb-3">
              <Download size={18} color="#3B82F6" />
              <Text className="block text-sm font-semibold text-foreground">错题报告</Text>
            </View>
            <Text className="block text-xs text-gray-600 mb-3 leading-relaxed">
              导出包含错题统计、知识点分析、练习记录的 PDF 报告，方便家长了解学习情况或打印保存。
            </Text>
            <Button
              className="w-full bg-blue-500 text-white"
              disabled={isExporting}
              onClick={handleExport}
            >
              {isExporting ? '生成中...' : '导出 PDF 报告'}
            </Button>
          </CardContent>
        </Card>

        {/* 偏好设置 */}
        <View className="space-y-3">
          <Text className="block text-xs font-medium text-gray-500 px-1">偏好设置</Text>

          {/* 演示模式 */}
          <Card className={demoMode ? "bg-blue-100 border-2 border-blue-400" : "bg-blue-50 border border-blue-200"}>
            <CardContent className="p-4">
              <View className="flex items-center gap-2 mb-2">
                <TestTube size={18} color={demoMode ? "#1D4ED8" : "#3B82F6"} />
                <Text className={cn("block text-sm font-semibold", demoMode ? "text-blue-900" : "text-foreground")}>演示模式</Text>
                {demoMode && (
                  <View className="ml-2 px-2 py-0.5 rounded-full bg-blue-500">
                    <Text className="block text-xs text-white">已开启</Text>
                  </View>
                )}
              </View>
              <Text className="block text-xs text-gray-600 mb-3 leading-relaxed">
                开启后所有 AI 功能使用模拟数据，无需配置 API Key。适合功能预览。
              </Text>
              <View className="flex items-center justify-between">
                <Text className="block text-sm text-gray-700">启用演示模式</Text>
                <Switch
                  checked={demoMode}
                  onCheckedChange={async (checked) => {
                    setDemoMode(checked)
                    Taro.setStorageSync('demo_mode', checked.toString())
                    try {
                      await Network.request({
                        url: '/api/settings/mock-mode',
                        method: 'POST',
                        data: { enabled: checked },
                      })
                    } catch (e) {
                      console.warn('[settings] 通知后端演示模式失败:', e)
                    }
                    Taro.showToast({
                      title: checked ? '已开启演示模式' : '已关闭演示模式',
                      icon: 'success',
                    })
                    // 不再刷新页面，只刷新数据
                    void useAppStore.getState().fetchAll()
                  }}
                />
              </View>
            </CardContent>
          </Card>

          {/* F-04 音效设置 */}
          <Card className={soundOn ? "bg-purple-100 border-2 border-purple-400" : "bg-purple-50 border border-purple-200"}>
            <CardContent className="p-4">
              <View className="flex items-center gap-2 mb-2">
                <Volume2 size={18} color={soundOn ? "#6D28D9" : "#8B5CF6"} />
                <Text className={cn("block text-sm font-semibold", soundOn ? "text-purple-900" : "text-foreground")}>音效反馈</Text>
                {soundOn && (
                  <View className="ml-2 px-2 py-0.5 rounded-full bg-purple-500">
                    <Text className="block text-xs text-white">已开启</Text>
                  </View>
                )}
              </View>
              <Text className="block text-xs text-gray-600 mb-3 leading-relaxed">
                答对/答错时播放提示音，答对&ldquo;叮咚&rdquo;上扬，答错&ldquo;咚咚&rdquo;柔和。
              </Text>
              <View className="flex items-center justify-between">
                <Text className="block text-sm text-gray-700">启用音效</Text>
                <Switch
                  checked={soundOn}
                  onCheckedChange={(checked) => {
                    setSoundOn(checked)
                    setSoundEnabled(checked)
                    Taro.setStorageSync('sound_enabled', checked.toString())
                    Taro.showToast({ title: checked ? '已开启音效' : '已关闭音效', icon: 'success' })
                    if (checked) playSound('correct')
                  }}
                />
              </View>
            </CardContent>
          </Card>
        </View>

        {/* 复习提醒入口（Phase 4 启用，目前占位）*/}
        <Card className="bg-white opacity-60">
          <CardContent className="p-4">
            <View className="flex items-center gap-2 mb-2">
              <Calendar size={18} color="#9CA3AF" />
              <Text className="block text-sm font-semibold text-foreground">复习提醒</Text>
              <View className="ml-auto px-2 py-1 rounded-full bg-gray-200">
                <Text className="block text-xs text-gray-500">即将上线</Text>
              </View>
            </View>
            <Text className="block text-xs text-gray-500 leading-relaxed">
              按艾宾浩斯曲线，到期自动推送微信订阅消息，让你不再忘记复习。
            </Text>
          </CardContent>
        </Card>

        {/* 关于 */}
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <View className="flex items-center gap-2 mb-3">
              <Info size={18} color="#6B7280" />
              <Text className="block text-sm font-semibold text-foreground">关于 Venus-Mate</Text>
            </View>
            <View className="space-y-2 text-xs text-gray-600">
              <View className="flex justify-between">
                <Text>版本</Text>
                <Text className="text-gray-900">v{APP_VERSION}</Text>
              </View>
              <View className="flex justify-between">
                <Text>后端</Text>
                <Text className="text-gray-900">NestJS + SQLite</Text>
              </View>
              <View className="flex justify-between">
                <Text>AI</Text>
                <Text className="text-gray-900">MiniMax-M3 (OpenAI 兼容)</Text>
              </View>
              <View className="flex justify-between">
                <Text>云存储</Text>
                <Text className="text-gray-900">腾讯 COS (ap-guangzhou)</Text>
              </View>
            </View>
            <Text className="block text-xs text-gray-400 mt-3 leading-relaxed">
              Venus-Mate 是一个面向全年龄段孩子的 AI 学习成长伴侣。只需拍照录入错题，剩下的系统全自动。
            </Text>
          </CardContent>
        </Card>
      </View>
    </View>
  )
}
