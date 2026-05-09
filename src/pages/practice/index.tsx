import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Sparkles, TrendingUp, ChevronRight, BookOpen, Plus, Calendar } from 'lucide-react-taro'
import { useAppStore, Subject, subjectInfo, PracticeTask } from '../../store/appStore'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import './index.css'

export default function PracticePage() {
  const [activeTab, setActiveTab] = useState<'recommended' | 'history'>('recommended')
  const { practiceTasks, stats } = useAppStore()

  // 分类任务
  const recommendedTasks = practiceTasks.filter(t => t.status !== 'completed')
  const historyTasks = practiceTasks.filter(t => t.status === 'completed')

  const currentTasks = activeTab === 'recommended' ? recommendedTasks : historyTasks

  // 开始练习
  const startPractice = (task: PracticeTask) => {
    Taro.navigateTo({ url: `/pages/practice-answer/index?id=${task.id}` })
  }

  // 获取任务状态
  const getTaskStatus = (task: PracticeTask) => {
    if (task.status === 'completed') return { label: '已完成', bg: 'bg-success bg-opacity-10', color: 'text-success' }
    if (task.status === 'in_progress') return { label: '进行中', bg: 'bg-info bg-opacity-10', color: 'text-info' }
    return { label: '待开始', bg: 'bg-warning bg-opacity-10', color: 'text-warning' }
  }

  // 获取科目样式
  const getSubjectStyle = (subject: Subject) => ({
    backgroundColor: subjectInfo[subject].bgColor,
    color: subjectInfo[subject].color
  })

  return (
    <View className="min-h-screen bg-background pb-20">
      {/* 头部 */}
      <View className="px-4 py-4 bg-white">
        <View className="flex items-center justify-between mb-3">
          <Text className="block text-lg font-semibold text-foreground">练习中心</Text>
          <View 
            className="w-10 h-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center"
            onClick={() => Taro.showToast({ title: '智能生成练习题', icon: 'success' })}
          >
            <Sparkles size={18} color="#F59E0B" />
          </View>
        </View>
        <Text className="block text-sm text-gray-500">基于薄弱知识点生成针对性练习</Text>
      </View>

      {/* 学习统计 */}
      <View className="px-4 py-4">
        <View className="rounded-2xl p-4" style={{ background: 'linear-gradient(to right, rgba(245, 158, 11, 0.1), rgba(34, 197, 94, 0.1))' }}>
          <View className="flex items-center gap-3 mb-3">
            <View className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <TrendingUp size={20} color="#F59E0B" />
            </View>
            <View>
              <Text className="block text-sm font-medium text-foreground">学习进度</Text>
              <Text className="block text-xs text-gray-500">最近7天数据</Text>
            </View>
          </View>
          <View className="grid grid-cols-3 gap-4">
            <View className="text-center bg-white bg-opacity-60 rounded-xl py-2">
              <Text className="block text-xl font-bold text-primary">{stats.practiceAccuracy}%</Text>
              <Text className="block text-xs text-gray-500 mt-1">正确率</Text>
            </View>
            <View className="text-center bg-white bg-opacity-60 rounded-xl py-2">
              <Text className="block text-xl font-bold text-success">{practiceTasks.length}</Text>
              <Text className="block text-xs text-gray-500 mt-1">练习次数</Text>
            </View>
            <View className="text-center bg-white bg-opacity-60 rounded-xl py-2">
              <Text className="block text-xl font-bold text-info">{stats.masteredCount}</Text>
              <Text className="block text-xs text-gray-500 mt-1">已掌握</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 标签切换 */}
      <View className="px-4">
        <View className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <View
            className={`flex-1 py-2 px-3 rounded-lg text-center transition-all ${
              activeTab === 'recommended' ? 'bg-white shadow-sm' : ''
            }`}
            onClick={() => setActiveTab('recommended')}
          >
            <Text className={`block text-sm font-medium ${
              activeTab === 'recommended' ? 'text-primary' : 'text-gray-600'
            }`}
            >
              推荐练习
            </Text>
          </View>
          <View
            className={`flex-1 py-2 px-3 rounded-lg text-center transition-all ${
              activeTab === 'history' ? 'bg-white shadow-sm' : ''
            }`}
            onClick={() => setActiveTab('history')}
          >
            <Text className={`block text-sm font-medium ${
              activeTab === 'history' ? 'text-primary' : 'text-gray-600'
            }`}
            >
              历史记录
            </Text>
          </View>
        </View>
      </View>

      {/* 任务列表 */}
      <View className="px-4 py-4">
        {currentTasks.length === 0 ? (
          // 空状态
          <View className="py-12 text-center">
            <View className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
              <BookOpen size={28} color="#D1D5DB" />
            </View>
            <Text className="block text-base font-medium text-gray-600 mb-2">
              {activeTab === 'recommended' ? '暂无推荐练习' : '暂无历史记录'}
            </Text>
            <Text className="block text-sm text-gray-400">
              {activeTab === 'recommended' ? '完成更多错题复习后会有更多推荐' : ''}
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {currentTasks.map((task) => {
              const statusStyle = getTaskStatus(task)
              const progressPercent = Math.round((task.completedCount / task.totalCount) * 100)
              
              return (
                <Card 
                  key={task.id} 
                  className="bg-white overflow-hidden"
                  onClick={() => startPractice(task)}
                >
                  <CardContent className="p-0">
                    <View className="p-4">
                      {/* 头部信息 */}
                      <View className="flex items-start justify-between mb-3">
                        <View className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            className="text-xs px-2 py-1"
                            style={getSubjectStyle(task.subject)}
                          >
                            {subjectInfo[task.subject].name}
                          </Badge>
                          <Badge className={`text-xs px-2 py-1 ${statusStyle.bg} ${statusStyle.color}`}>
                            {statusStyle.label}
                          </Badge>
                        </View>
                        <View className="flex items-center gap-1 text-gray-400">
                          <Calendar size={14} color="#9CA3AF" />
                          <Text className="block text-xs">{task.dueDate}</Text>
                        </View>
                      </View>
                      
                      {/* 标题 */}
                      <Text className="block text-base font-semibold text-foreground mb-2">
                        {task.title}
                      </Text>
                      
                      {/* 知识点标签 */}
                      <View className="flex flex-wrap gap-1 mb-3">
                        {task.knowledgePoints.slice(0, 3).map((point, idx) => (
                          <View key={idx} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
                            {point}
                          </View>
                        ))}
                      </View>
                      
                      {/* 进度条 */}
                      <View className="mb-3">
                        <View className="flex items-center justify-between mb-1">
                          <Text className="block text-xs text-gray-500">完成进度</Text>
                          <Text className="block text-xs text-gray-600 font-medium">
                            {task.completedCount}/{task.totalCount}题
                          </Text>
                        </View>
                        <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <View 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </View>
                      </View>
                      
                      {/* 操作按钮 */}
                      <View className="flex items-center justify-between">
                        <View className="flex items-center gap-1">
                          <View className={`w-2 h-2 rounded-full ${
                            task.status === 'completed' ? 'bg-success' :
                            task.status === 'in_progress' ? 'bg-info' : 'bg-warning'
                          }`}
                          />
                          <Text className="block text-xs text-gray-500">
                            {task.status === 'completed' ? '全部完成' :
                             task.status === 'in_progress' ? '继续答题' : '开始答题'}
                          </Text>
                        </View>
                        <View className="flex items-center gap-1 text-primary">
                          <Text className="block text-sm font-medium">
                            {task.status === 'completed' ? '查看详情' : 
                             task.status === 'in_progress' ? '继续' : '开始'}
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

      {/* 生成新练习按钮 */}
      {activeTab === 'recommended' && (
        <View className="px-4 pb-4">
          <View 
            className="bg-white rounded-2xl p-4 flex items-center gap-3 active:bg-gray-50"
            onClick={() => Taro.showToast({ title: '正在智能生成练习...', icon: 'loading' })}
          >
            <View className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Plus size={24} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="block text-sm font-medium text-foreground">生成新练习</Text>
              <Text className="block text-xs text-gray-500">基于你的薄弱知识点智能生成</Text>
            </View>
            <ChevronRight size={20} color="#D1D5DB" />
          </View>
        </View>
      )}
    </View>
  )
}
