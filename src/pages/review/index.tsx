import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Clock, Brain, Calendar, ChevronRight, CircleAlert } from 'lucide-react-taro'
import { useAppStore, subjectInfo, ReviewReminder } from '@/store/appStore'
import { Card, CardContent } from '@/components/ui/card'
import { WARM_GRADIENT_BG } from '@/constants'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import './index.css'

// 记忆曲线周期标签（与 server reviewStages [1,2,4,7,15,30,60,90] 对应）
const cycleLabels = ['第1天', '第2天', '第4天', '第7天', '第15天', '第30天', '第60天', '第90天']

export default function ReviewPage() {
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'completed'>('today')
  const { reviewReminders } = useAppStore()

  // 分类复习任务
  const todayReminders = reviewReminders.filter(r => r.status === 'due')
  const upcomingReminders = reviewReminders.filter(r => r.status === 'pending')
  const completedReminders = reviewReminders.filter(r => r.status === 'completed')

  const currentReminders = activeTab === 'today' ? todayReminders 
    : activeTab === 'upcoming' ? upcomingReminders 
    : completedReminders

  // 开始复习
  const startReview = (reminder: ReviewReminder) => {
    Taro.navigateTo({ url: `/pages/mistake-detail/index?id=${reminder.mistakeId}` })
  }

  // 获取进度显示
  const getProgressInfo = (reminder: ReviewReminder) => {
    const total = reminder.reviewCycle.length
    const current = reminder.currentStage
    const percentage = Math.round((current / total) * 100)
    return { total, current, percentage }
  }

  // 获取状态颜色
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'due': return { bg: 'bg-error bg-opacity-10', color: 'text-error', text: '待复习' }
      case 'pending': return { bg: 'bg-info bg-opacity-10', color: 'text-info', text: '即将复习' }
      case 'completed': return { bg: 'bg-success bg-opacity-10', color: 'text-success', text: '已完成' }
      default: return { bg: 'bg-gray-100', color: 'text-gray-500', text: '未知' }
    }
  }

  return (
    <View className="min-h-screen bg-background pb-20">
      {/* 头部 */}
      <View className="px-4 py-4 bg-white">
        <Text className="block text-lg font-semibold text-foreground">复习提醒</Text>
        <Text className="block text-sm text-gray-500 mt-1">根据艾宾浩斯记忆曲线安排复习</Text>
      </View>

      {/* 记忆曲线说明 */}
      <View className="px-4 py-3 bg-primary bg-opacity-5">
        <View className="flex items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-primary bg-opacity-20 flex items-center justify-center">
            <Brain size={20} color="#F59E0B" />
          </View>
          <View className="flex-1">
            <Text className="block text-sm font-medium text-foreground">艾宾浩斯记忆曲线</Text>
            <Text className="block text-xs text-gray-600 mt-1">
              科学复习周期：1天 → 3天 → 7天 → 14天 → 30天
            </Text>
          </View>
        </View>
        {/* 周期进度 */}
        <View className="flex justify-between mt-3 px-2">
          {cycleLabels.map((label, idx) => (
            <View key={idx} className="flex flex-col items-center">
              <View className="w-6 h-6 rounded-full bg-primary bg-opacity-20 flex items-center justify-center mb-1">
                <Text className="block text-xs text-primary font-medium">{idx + 1}</Text>
              </View>
              <Text className="block text-xs text-gray-500">{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 标签切换 */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'today' | 'upcoming' | 'completed')}
        >
          <TabsList className="w-full flex">
            <TabsTrigger value="today" className="flex-1">
              <Text>今日待复习 ({todayReminders.length})</Text>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex-1">
              <Text>即将复习 ({upcomingReminders.length})</Text>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">
              <Text>已完成 ({completedReminders.length})</Text>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </View>

      {/* 复习列表 */}
      <View className="px-4 py-4">
        {currentReminders.length === 0 ? (
          // 空状态
          <View className="py-12 text-center">
            <View className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
              <Calendar size={28} color="#D1D5DB" />
            </View>
            <Text className="block text-base font-medium text-gray-600 mb-2">
              {activeTab === 'today' ? '今日暂无复习任务' :
               activeTab === 'upcoming' ? '暂无即将复习的任务' : '暂无已完成的复习'}
            </Text>
            <Text className="block text-sm text-gray-400">
              {activeTab === 'today' ? '继续保持，很快就有新任务啦' : ''}
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {currentReminders.map((reminder) => {
              const progress = getProgressInfo(reminder)
              const statusStyle = getStatusStyle(reminder.status)
              
              return (
                <Card 
                  key={reminder.id} 
                  className="bg-white overflow-hidden"
                  onClick={() => startReview(reminder)}
                >
                  <CardContent className="p-0">
                    <View className="p-4">
                      {/* 头部信息 */}
                      <View className="flex items-start justify-between mb-3">
                        <View className="flex items-center gap-2">
                          <Badge 
                            className="text-xs px-2 py-1"
                            style={{
                              backgroundColor: subjectInfo[reminder.subject].bgColor,
                              color: subjectInfo[reminder.subject].color
                            }}
                          >
                            {subjectInfo[reminder.subject].name}
                          </Badge>
                          <Badge className={`text-xs px-2 py-1 ${statusStyle.bg} ${statusStyle.color}`}>
                            {statusStyle.text}
                          </Badge>
                        </View>
                        {reminder.status === 'due' && (
                          <View className="flex items-center gap-1 text-error">
                            <CircleAlert size={14} color="#EF4444" />
                            <Text className="block text-xs font-medium">立即复习</Text>
                          </View>
                        )}
                      </View>
                      
                      {/* 标题 */}
                      <Text className="block text-base font-medium text-foreground mb-2">
                        {reminder.title}
                      </Text>
                      
                      {/* 复习周期进度 */}
                      <View className="mb-3">
                        <View className="flex items-center justify-between mb-1">
                          <Text className="block text-xs text-gray-500">记忆阶段</Text>
                          <Text className="block text-xs text-gray-500">
                            第 {progress.current}/{progress.total} 阶段
                          </Text>
                        </View>
                        <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <View 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </View>
                      </View>
                      
                      {/* 底部信息 */}
                      <View className="flex items-center justify-between">
                        <View className="flex items-center gap-1 text-gray-400">
                          <Clock size={14} color="#9CA3AF" />
                          <Text className="block text-xs">
                            {reminder.status === 'due' ? '已到复习时间' : `下次: ${reminder.nextReviewAt}`}
                          </Text>
                        </View>
                        <View className="flex items-center gap-1 text-primary">
                          <Text className="block text-sm font-medium">
                            {reminder.status === 'completed' ? '查看' : '开始复习'}
                          </Text>
                          <ChevronRight size={16} color="#F59E0B" />
                        </View>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              )
            })}
          </View>
        )}
      </View>

      {/* 统计卡片 */}
      <View className="px-4 mt-4">
        <Card className="rounded-2xl" style={{ background: WARM_GRADIENT_BG }}>
          <CardContent className="p-4">
            <View className="flex items-center justify-around">
              <View className="text-center">
                <Text className="block text-2xl font-bold text-primary">{reviewReminders.length}</Text>
                <Text className="block text-xs text-gray-600 mt-1">总复习任务</Text>
              </View>
              <View className="w-px h-10 bg-gray-300 bg-opacity-50" />
              <View className="text-center">
                <Text className="block text-2xl font-bold text-success">{completedReminders.length}</Text>
                <Text className="block text-xs text-gray-600 mt-1">已完成</Text>
              </View>
              <View className="w-px h-10 bg-gray-300 bg-opacity-50" />
              <View className="text-center">
                <Text className="block text-2xl font-bold text-error">{todayReminders.length}</Text>
                <Text className="block text-xs text-gray-600 mt-1">今日待复习</Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </View>
    </View>
  )
}
