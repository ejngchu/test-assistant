import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect } from 'react'
import { Camera, Lightbulb, BookOpen, Clock, TrendingUp } from 'lucide-react-taro'
import { useAppStore } from '@/store/appStore'

export default function Index() {
  const { mistakes, reviewReminders, stats } = useAppStore()

  // 进入首页时拉取最新数据（用 getState() 拿稳定引用，避免 useEffect 死循环）
  useEffect(() => {
    void useAppStore.getState().fetchAll()
  }, [])

  // 待复习数量：从 reviewReminders 中筛选 due/pending 状态
  const pendingReviewCount = reviewReminders.filter(
    (r) => r.status === 'due' || r.status === 'pending'
  ).length

  // 最近一条需要巩固的知识点
  const latestKnowledgePoint =
    mistakes.length > 0
      ? `"${mistakes[0].knowledgePoints[0] || mistakes[0].title}"需要巩固哦~`
      : '开始记录错题，获取个性化学习建议吧！'

  // 拍照/选图 → 跳转拍照页（V2 单入口：唯一的 CTA）
  const handleTakePhoto = () => {
    Taro.navigateTo({ url: '/pages/homework/index' })
  }

  return (
    <View className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部区域：问候语 */}
      <View className="px-5 pt-10 pb-4">
        <Text className="block text-gray-500 text-sm">你好呀 👋</Text>
        <Text className="block text-2xl font-bold text-gray-900 mt-1">
          坚持每天进步一点点！
        </Text>
        <Text className="block text-xs text-gray-400 mt-1">
          拍一道错题，剩下的交给我
        </Text>
      </View>

      {/* CTA 拍错题按钮（V2 唯一主操作） */}
      <View className="flex justify-center mt-4 mb-8">
        <View
          className="w-48 h-48 rounded-3xl bg-gradient-to-br from-orange-500 to-pink-500 shadow-lg shadow-orange-200 flex flex-col items-center justify-center gap-3 active:opacity-80"
          onClick={handleTakePhoto}
        >
          <Camera size={72} color="#FFFFFF" />
          <Text className="text-white text-lg font-semibold">拍一道错题</Text>
          <Text className="text-white/80 text-xs">其它全自动</Text>
        </View>
      </View>

      {/* 统计卡片行：3 列（极简） */}
      <View className="px-5 mb-5">
        <View className="grid grid-cols-3 gap-3">
          {/* 错题数 */}
          <View className="bg-white rounded-xl p-3 shadow-sm">
            <View className="flex items-center gap-2 mb-2">
              <BookOpen size={14} color="#EF4444" />
              <Text className="text-xs text-gray-500">错题</Text>
            </View>
            <Text className="block text-2xl font-bold text-gray-900">{mistakes.length}</Text>
          </View>

          {/* 待复习 */}
          <View className="bg-white rounded-xl p-3 shadow-sm">
            <View className="flex items-center gap-2 mb-2">
              <Clock size={14} color="#F59E0B" />
              <Text className="text-xs text-gray-500">待复习</Text>
            </View>
            <Text className="block text-2xl font-bold text-gray-900">{pendingReviewCount}</Text>
          </View>

          {/* 掌握度 */}
          <View className="bg-white rounded-xl p-3 shadow-sm">
            <View className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} color="#22C55E" />
              <Text className="text-xs text-gray-500">掌握度</Text>
            </View>
            <Text className="block text-2xl font-bold text-gray-900">{stats.practiceAccuracy}%</Text>
          </View>
        </View>
      </View>

      {/* 学习建议卡片 */}
      <View className="px-5 mb-4">
        <View className="bg-orange-50 rounded-xl p-4 flex items-center gap-3">
          <View className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Lightbulb size={20} color="#F97316" />
          </View>
          <Text className="flex-1 text-sm text-gray-700">{latestKnowledgePoint}</Text>
        </View>
      </View>
    </View>
  )
}
