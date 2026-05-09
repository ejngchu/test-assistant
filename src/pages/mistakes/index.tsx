import { useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Plus, Camera, Search, ChevronRight, BookOpen } from 'lucide-react-taro'
import { useAppStore, Subject, subjectInfo } from '../../store/appStore'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import './index.css'

export default function MistakesPage() {
  const [activeTab, setActiveTab] = useState<Subject | 'all'>('all')
  const { mistakes } = useAppStore()

  // 过滤错题
  const filteredMistakes = activeTab === 'all' 
    ? mistakes 
    : mistakes.filter(m => m.subject === activeTab)

  // 导航到详情
  const navigateToDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/mistake-detail/index?id=${id}` })
  }

  // 拍照记录新错题
  const addNewMistake = () => {
    Taro.showActionSheet({
      itemList: ['拍照上传', '从相册选择'],
      success: (res) => {
        const sourceType = res.tapIndex === 0 ? ['camera'] : ['album']
        Taro.chooseImage({
          count: 1,
          sourceType: sourceType as ('camera' | 'album')[],
          success: () => {
            // 模拟跳转到错题详情页（新增模式）
            Taro.navigateTo({ url: '/pages/mistake-detail/index?mode=add' })
          }
        })
      }
    })
  }

  // 获取科目标签颜色
  const getSubjectStyle = (subject: Subject) => {
    const info = subjectInfo[subject]
    return {
      backgroundColor: info.bgColor,
      color: info.color
    }
  }

  // 获取状态标签
  const getStatusStyle = (mastered: boolean) => {
    if (mastered) {
      return { bg: 'bg-success bg-opacity-10', color: 'text-success', text: '已掌握' }
    }
    return { bg: 'bg-warning bg-opacity-10', color: 'text-warning', text: '学习中' }
  }

  return (
    <View className="min-h-screen bg-background pb-20">
      {/* 头部 */}
      <View className="px-4 py-4 bg-white">
        <View className="flex items-center justify-between mb-3">
          <Text className="block text-lg font-semibold text-foreground">错题本</Text>
          <View 
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center"
            onClick={addNewMistake}
          >
            <Plus size={20} color="#FFFFFF" />
          </View>
        </View>
        <Text className="block text-sm text-gray-500">记录每一次进步</Text>
      </View>

      {/* 科目筛选 */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <View className="flex gap-2 overflow-x-auto">
          {(['all', 'chinese', 'math', 'english'] as const).map(tab => (
            <View
              key={tab}
              className={`px-4 py-2 rounded-full whitespace-nowrap ${
                activeTab === tab ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              <Text className={`block text-sm font-medium ${
                activeTab === tab ? 'text-white' : 'text-gray-600'
              }`}
              >
                {tab === 'all' ? '全部' : subjectInfo[tab].name}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 搜索栏 */}
      <View className="px-4 py-3">
        <View className="bg-gray-100 rounded-xl px-4 py-3 flex items-center gap-3">
          <Search size={18} color="#9CA3AF" />
          <Text className="block text-sm text-gray-400 flex-1">搜索错题</Text>
        </View>
      </View>

      {/* 错题列表 */}
      <View className="px-4 py-2">
        {filteredMistakes.length === 0 ? (
          // 空状态
          <View className="py-16 text-center">
            <View className="w-20 h-20 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
              <BookOpen size={36} color="#D1D5DB" />
            </View>
            <Text className="block text-base font-medium text-gray-600 mb-2">
              还没有错题记录
            </Text>
            <Text className="block text-sm text-gray-400 mb-6">
              点击右上角按钮添加第一道错题
            </Text>
            <View 
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary rounded-full"
              onClick={addNewMistake}
            >
              <Camera size={18} color="#FFFFFF" />
              <Text className="block text-sm font-medium text-white">添加错题</Text>
            </View>
          </View>
        ) : (
          <View className="space-y-3">
            {filteredMistakes.map((mistake) => {
              const subjectStyle = getSubjectStyle(mistake.subject)
              const statusStyle = getStatusStyle(mistake.mastered || false)
              
              return (
                <Card 
                  key={mistake.id}
                  className="bg-white overflow-hidden"
                  onClick={() => navigateToDetail(mistake.id)}
                >
                  <CardContent className="p-0">
                    <View className="flex">
                      {/* 错题图片 */}
                      <View className="w-24 h-24 bg-gray-100 flex-shrink-0">
                        {mistake.imageUrl ? (
                          <Image 
                            src={mistake.imageUrl} 
                            className="w-full h-full"
                            mode="aspectFill"
                          />
                        ) : (
                          <View className="w-full h-full flex items-center justify-center">
                            <Camera size={24} color="#D1D5DB" />
                          </View>
                        )}
                      </View>
                      
                      {/* 错题信息 */}
                      <View className="flex-1 p-3">
                        <View className="flex items-center gap-2 mb-2">
                          <Badge 
                            className="text-xs px-2 py-1"
                            style={subjectStyle}
                          >
                            {subjectInfo[mistake.subject].name}
                          </Badge>
                          <Badge className={`text-xs px-2 py-1 ${statusStyle.bg} ${statusStyle.color}`}>
                            {statusStyle.text}
                          </Badge>
                        </View>
                        
                        <Text className="block text-sm font-medium text-foreground mb-1 line-clamp-2">
                          {mistake.title}
                        </Text>
                        
                        <View className="flex items-center justify-between">
                          <Text className="block text-xs text-gray-400">
                            {mistake.date}
                          </Text>
                          <View className="flex items-center gap-1 text-primary">
                            <Text className="block text-xs">查看详情</Text>
                            <ChevronRight size={14} color="#F59E0B" />
                          </View>
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

      {/* 底部提示 */}
      <View className="px-4 py-4">
        <View className="bg-primary bg-opacity-5 rounded-xl p-4">
          <Text className="block text-sm font-medium text-foreground mb-2">小贴士</Text>
          <Text className="block text-xs text-gray-600 leading-relaxed">
            定期复习错题本中的内容，按照记忆曲线安排复习时间，可以帮助你更好地掌握知识点，提高学习效率。
          </Text>
        </View>
      </View>
    </View>
  )
}
