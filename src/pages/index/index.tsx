import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Camera, BookOpen, Calendar, TrendingUp, Star, ChevronRight, Sparkles } from 'lucide-react-taro'
import { useAppStore } from '../../store/appStore'
import { Card, CardContent } from '../../components/ui/card'
import './index.css'

export default function Index() {
  const [greeting, setGreeting] = useState('')
  const { stats } = useAppStore()
  
  // 获取今日待复习数量
  const todayReviewCount = stats.reviewToday

  useEffect(() => {
    // 设置问候语
    const hour = new Date().getHours()
    if (hour < 6) setGreeting('晚上好')
    else if (hour < 9) setGreeting('早上好')
    else if (hour < 12) setGreeting('上午好')
    else if (hour < 14) setGreeting('中午好')
    else if (hour < 18) setGreeting('下午好')
    else setGreeting('晚上好')
  }, [])

  // 页面跳转
  const navigateTo = (url: string) => {
    Taro.navigateTo({ url })
  }

  return (
    <View className="min-h-screen bg-background pb-20">
      {/* 顶部欢迎区域 */}
      <View className="px-4 pt-8 pb-4">
        <Text className="block text-gray-500 text-sm">{greeting}，小朋友</Text>
        <Text className="block text-2xl font-bold text-foreground mt-1">
          今天是学习的好日子！
        </Text>
      </View>

      {/* 学习建议卡片 */}
      <View className="px-4">
        <View className="rounded-2xl p-4" style={{ background: 'linear-gradient(to right, rgba(245, 158, 11, 0.1), rgba(34, 197, 94, 0.1), rgba(249, 115, 22, 0.1))' }}>
          <View className="flex items-center gap-3">
            <View className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <Sparkles size={24} color="#F59E0B" />
            </View>
            <View className="flex-1">
              <Text className="block text-base font-semibold text-foreground">每日学习建议</Text>
              <Text className="block text-sm text-gray-600 mt-1">
                {todayReviewCount > 0 
                  ? `今天有 ${todayReviewCount} 道错题需要复习，记得巩固哦！`
                  : '继续保持！坚持复习让知识记得更牢'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 待复习提醒 */}
      <View className="px-4 mt-4">
        {todayReviewCount > 0 && (
          <View 
            className="bg-white rounded-2xl p-4 shadow-sm"
            onClick={() => navigateTo('/pages/review/index')}
          >
            <View className="flex items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-warning bg-opacity-20 flex items-center justify-center">
                <Calendar size={20} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Text className="block text-base font-semibold text-foreground">今日待复习</Text>
                <Text className="block text-sm text-gray-500">还有 {todayReviewCount} 道错题需要回顾</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </View>
          </View>
        )}
      </View>
      
      {/* 统计卡片区域 */}
      <View className="px-4 -mt-4">
        <View className="grid grid-cols-2 gap-3">
          {/* 错题统计 */}
          <Card className="bg-white">
            <CardContent className="p-4">
              <View className="flex items-center gap-2 mb-2">
                <View className="w-8 h-8 rounded-lg bg-error bg-opacity-10 flex items-center justify-center">
                  <BookOpen size={16} color="#EF4444" />
                </View>
                <Text className="block text-sm text-gray-500">错题总数</Text>
              </View>
              <Text className="block text-2xl font-bold text-foreground">{stats.totalMistakes}</Text>
              <Text className="block text-xs text-gray-400 mt-1">已掌握 {stats.masteredCount} 道</Text>
            </CardContent>
          </Card>
          
          {/* 今日复习 */}
          <Card className="bg-white">
            <CardContent className="p-4">
              <View className="flex items-center gap-2 mb-2">
                <View className="w-8 h-8 rounded-lg bg-warning bg-opacity-10 flex items-center justify-center">
                  <Calendar size={16} color="#F59E0B" />
                </View>
                <Text className="block text-sm text-gray-500">今日复习</Text>
              </View>
              <Text className="block text-2xl font-bold text-foreground">{stats.reviewToday}</Text>
              <Text className="block text-xs text-gray-400 mt-1">项复习任务</Text>
            </CardContent>
          </Card>
          
          {/* 练习正确率 */}
          <Card className="bg-white">
            <CardContent className="p-4">
              <View className="flex items-center gap-2 mb-2">
                <View className="w-8 h-8 rounded-lg bg-success bg-opacity-10 flex items-center justify-center">
                  <TrendingUp size={16} color="#22C55E" />
                </View>
                <Text className="block text-sm text-gray-500">练习正确率</Text>
              </View>
              <Text className="block text-2xl font-bold text-foreground">{stats.practiceAccuracy}%</Text>
              <Text className="block text-xs text-gray-400 mt-1">最近7天</Text>
            </CardContent>
          </Card>
          
          {/* 学习天数 */}
          <Card className="bg-white">
            <CardContent className="p-4">
              <View className="flex items-center gap-2 mb-2">
                <View className="w-8 h-8 rounded-lg bg-accent bg-opacity-10 flex items-center justify-center">
                  <Star size={16} color="#F59E0B" />
                </View>
                <Text className="block text-sm text-gray-500">坚持学习</Text>
              </View>
              <Text className="block text-2xl font-bold text-foreground">7</Text>
              <Text className="block text-xs text-gray-400 mt-1">天连续打卡</Text>
            </CardContent>
          </Card>
        </View>
      </View>
      
      {/* 快速入口区域 */}
      <View className="px-4 mt-6">
        <Text className="block text-base font-semibold text-foreground mb-3">快速开始</Text>
        <View className="grid grid-cols-2 gap-3">
          {/* 拍照提交作业 */}
          <View 
            className="bg-white rounded-2xl p-4 shadow-sm active:bg-gray-50"
            onClick={() => navigateTo('/pages/homework/index')}
          >
            <View className="w-12 h-12 rounded-2xl bg-gradient-to-br from-subject-chinese to-subject-math flex items-center justify-center mb-3">
              <Camera size={24} color="#FFFFFF" />
            </View>
            <Text className="block text-base font-semibold text-foreground">拍照提交作业</Text>
            <Text className="block text-xs text-gray-500 mt-1">拍一拍，检查作业完成情况</Text>
          </View>
          
          {/* 记录错题 */}
          <View 
            className="bg-white rounded-2xl p-4 shadow-sm active:bg-gray-50"
            onClick={() => navigateTo('/pages/mistakes/index')}
          >
            <View className="w-12 h-12 rounded-2xl bg-gradient-to-br from-subject-math to-subject-english flex items-center justify-center mb-3">
              <BookOpen size={24} color="#FFFFFF" />
            </View>
            <Text className="block text-base font-semibold text-foreground">记录错题</Text>
            <Text className="block text-xs text-gray-500 mt-1">拍一拍，保存并分析错题</Text>
          </View>
          
          {/* 复习提醒 */}
          <View 
            className="bg-white rounded-2xl p-4 shadow-sm active:bg-gray-50"
            onClick={() => navigateTo('/pages/review/index')}
          >
            <View className="w-12 h-12 rounded-2xl bg-gradient-to-br from-warning to-accent flex items-center justify-center mb-3">
              <Calendar size={24} color="#FFFFFF" />
            </View>
            <Text className="block text-base font-semibold text-foreground">复习提醒</Text>
            <Text className="block text-xs text-gray-500 mt-1">根据记忆曲线科学复习</Text>
          </View>
          
          {/* 练习中心 */}
          <View 
            className="bg-white rounded-2xl p-4 shadow-sm active:bg-gray-50"
            onClick={() => navigateTo('/pages/practice/index')}
          >
            <View className="w-12 h-12 rounded-2xl bg-gradient-to-br from-success to-info flex items-center justify-center mb-3">
              <TrendingUp size={24} color="#FFFFFF" />
            </View>
            <Text className="block text-base font-semibold text-foreground">练习中心</Text>
            <Text className="block text-xs text-gray-500 mt-1">针对薄弱点强化训练</Text>
          </View>
        </View>
      </View>

      {/* 功能说明 */}
      <View className="px-4 mt-6 mb-4">
        <Card className="bg-primary bg-opacity-5 border border-primary border-opacity-20">
          <CardContent className="p-4">
            <Text className="block text-sm font-medium text-foreground mb-2">功能简介</Text>
            <View className="space-y-2">
              <View className="flex items-start gap-2">
                <View className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <Text className="block text-xs text-gray-600">拍照提交作业：拍下语文、数学、英语作业，系统自动检查完成情况</Text>
              </View>
              <View className="flex items-start gap-2">
                <View className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <Text className="block text-xs text-gray-600">错题记录与分析：拍照保存错题，自动分析知识点，标记知识盲点</Text>
              </View>
              <View className="flex items-start gap-2">
                <View className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <Text className="block text-xs text-gray-600">记忆曲线复习：基于艾宾浩斯记忆法，自动提醒复习，强化长期记忆</Text>
              </View>
              <View className="flex items-start gap-2">
                <View className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <Text className="block text-xs text-gray-600">同类习题练习：根据错题情况智能生成针对性练习题</Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </View>
    </View>
  )
}
