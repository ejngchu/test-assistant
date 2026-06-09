import { useState, useMemo, useEffect } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Plus, Camera, Search, ChevronRight, BookOpen, LayoutGrid, LayoutList, Clock } from 'lucide-react-taro'
import { Input } from '@/components/ui/input'
import { useAppStore, Subject, subjectInfo } from '@/store/appStore'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KNOWLEDGE_POINT_COLORS } from '@/constants'
// 插图已上传到 COS（避免 inline 进 WeApp 主包超 2MB 限制）
const emptyMistakesImg = 'https://venus-mate-1426731873.cos.ap-guangzhou.myqcloud.com/illustrations/empty-mistakes.png'
import './index.css'

export default function MistakesPage() {
  const [activeTab, setActiveTab] = useState<Subject | 'all'>('all')
  const [selectedKnowledgePoints, setSelectedKnowledgePoints] = useState<Set<string>>(new Set()) // 空=全部
  const [searchText, setSearchText] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const { mistakes, reviewReminders } = useAppStore()

  // 进入错题本页时拉数据（用 getState() 拿稳定引用，避免 useEffect 死循环）
  useEffect(() => {
    void useAppStore.getState().fetchAll()
  }, [])

  // 今日待复习数（due 状态 = 今天到期或已过期）
  const dueReviewCount = reviewReminders.filter((r) => r.status === 'due').length

  // 过滤错题 - 按科目
  const subjectFilteredMistakes = activeTab === 'all'
    ? mistakes
    : mistakes.filter(m => m.subject === activeTab)

  // 搜索过滤
  const searchFilteredMistakes = searchText
    ? subjectFilteredMistakes.filter(m =>
        m.title.toLowerCase().includes(searchText.toLowerCase()) ||
        m.knowledgePoints.some(kp => kp.toLowerCase().includes(searchText.toLowerCase()))
      )
    : subjectFilteredMistakes

  // 获取当前科目过滤后的知识点及其颜色
  const knowledgePointsWithColors = useMemo(() => {
    const pointsSet = new Set<string>()
    searchFilteredMistakes.forEach(m => {
      m.knowledgePoints.forEach(p => pointsSet.add(p))
    })

    return Array.from(pointsSet).map((point, idx) => ({
      name: point,
      color: KNOWLEDGE_POINT_COLORS[idx % KNOWLEDGE_POINT_COLORS.length]
    }))
  }, [searchFilteredMistakes])

  // 过滤错题 - 按知识点（多选，OR 关系：匹配任一选中知识点即显示）
  const filteredMistakes = selectedKnowledgePoints.size === 0
    ? searchFilteredMistakes
    : searchFilteredMistakes.filter(m =>
        m.knowledgePoints.some(kp => selectedKnowledgePoints.has(kp))
      )

  // 获取知识点颜色
  const getKnowledgePointStyle = (point: string): { bg: string; color: string } => {
    const found = knowledgePointsWithColors.find(k => k.name === point)
    return found ? found.color : { bg: '#F3F4F6', color: '#6B7280' }
  }

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
          success: (chooseRes) => {
            const imagePath = chooseRes.tempFilePaths[0]
            // 将图片路径传递到详情页
            Taro.navigateTo({ url: `/pages/mistake-detail/index?mode=add&image=${encodeURIComponent(imagePath)}` })
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

      {/* V2: 今日复习高亮条 */}
      {dueReviewCount > 0 && (
        <View
          className="mx-4 mt-2 mb-3 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl p-3 flex items-center gap-3 active:opacity-70"
          onClick={() => Taro.navigateTo({ url: '/pages/review/index' })}
        >
          <View className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Clock size={18} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="block text-sm font-semibold text-gray-900">今日复习 {dueReviewCount} 道</Text>
            <Text className="block text-xs text-gray-600 mt-1">按艾宾浩斯曲线，点击开始</Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </View>
      )}

{/* 科目筛选 */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <View className="flex gap-2 overflow-x-auto">
          {(['all', 'chinese', 'math', 'english'] as const).map(tab => (
            <View
              key={tab}
              className="px-4 py-2 rounded-full whitespace-nowrap"
              style={{
                backgroundColor: activeTab === tab ? '#F59E0B' : '#F3F4F6'
              }}
              onClick={() => {
                setActiveTab(tab)
                setSelectedKnowledgePoints(new Set())
              }}
            >
              <Text
                className="block text-sm font-medium"
                style={{
                  color: activeTab === tab ? '#FFFFFF' : '#6B7280'
                }}
              >
                {tab === 'all' ? '全部' : subjectInfo[tab].name}
              </Text>
            </View>
          ))}
        </View>
      </View>
      {/* 知识点筛选 - P3多选（2026-06-08）：多选+OR，标签并列 inline */}
{knowledgePointsWithColors.length > 0 && (
  // ⚠️ H5 兼容：flex 用 inline style 绕过 Taro 元素选择器优先级问题
  // ⚠️ WeApp 兼容：避免使用 inline-flex（WXSS 支持不完整）；不用 gap（旧版 WXSS 不支持）
  // 改用 margin 在子元素上做间距
  <View className="px-4 py-2 bg-white border-b border-gray-100">
    <View style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
      {/* 全部 */}
      <View
        style={{
          padding: '4px 10px',
          borderRadius: '9999px',
          backgroundColor: selectedKnowledgePoints.size === 0 ? '#374151' : '#F3F4F6',
          margin: '3px',
        }}
        onClick={() => setSelectedKnowledgePoints(new Set())}
      >
        <Text
          className="block text-xs font-medium"
          style={{ color: selectedKnowledgePoints.size === 0 ? '#FFFFFF' : '#6B7280' }}
        >
          全部
        </Text>
      </View>
      {/* 知识点标签并列 inline */}
      {knowledgePointsWithColors.map((kp, idx) => {
        const isSelected = selectedKnowledgePoints.has(kp.name)
        return (
          <View
            key={idx}
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: isSelected ? kp.color.bg : '#F3F4F6',
              margin: '3px',
            }}
            onClick={() => {
              const next = new Set(selectedKnowledgePoints)
              if (isSelected) {
                next.delete(kp.name)
              } else {
                next.add(kp.name)
              }
              setSelectedKnowledgePoints(next)
            }}
          >
            <Text
              className="block text-xs font-medium"
              style={{ color: isSelected ? kp.color.color : '#6B7280' }}
            >
              {kp.name}
            </Text>
          </View>
        )
      })}
    </View>
  </View>
)}

      {/* 搜索栏 */}
      <View className="px-4 py-3">
        <View className="flex items-center gap-2">
          <View className="flex-1 bg-gray-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <Search size={18} color="#9CA3AF" />
            <Input
              className="flex-1 text-sm"
              placeholder="搜索错题或知识点"
              value={searchText}
              onChange={(e) => setSearchText(e.detail.value)}
            />
          </View>
          <View
            className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          >
            {viewMode === 'list' ? (
              <LayoutGrid size={20} color="#6B7280" />
            ) : (
              <LayoutList size={20} color="#6B7280" />
            )}
          </View>
        </View>
      </View>

      {/* 错题列表 */}
      <View className="px-4 py-2">
        {filteredMistakes.length === 0 ? (
          // 空状态 - V2 插画版（F-03）
          <View className="py-12 text-center">
            <Image
              src={emptyMistakesImg}
              className="w-64 h-64 mx-auto mb-4"
              mode="aspectFit"
            />
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
          <>
            {/* 列表视图 */}
            {viewMode === 'list' && (
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
                            {mistake.questionImage ? (
                              <Image
                                src={mistake.questionImage}
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

                            {/* 知识点标签 - 彩色背景 */}
                            <View className="flex flex-wrap gap-1 mb-2">
                              {mistake.knowledgePoints.slice(0, 2).map((kp, idx) => {
                                const kpStyle = getKnowledgePointStyle(kp)
                                const isHighlighted = selectedKnowledgePoints.has(kp)
                                return (
                                  <View
                                    key={idx}
                                    className={`px-2 py-1 rounded text-xs ${
                                      isHighlighted ? 'ring-1 ring-offset-0' : ''
                                    }`}
                                    style={{
                                      backgroundColor: isHighlighted ? kpStyle.bg : kpStyle.bg + '80',
                                      color: kpStyle.color,
                                      borderColor: kpStyle.color
                                    }}
                                  >
                                    {kp}
                                  </View>
                                )
                              })}
                              {mistake.knowledgePoints.length > 2 && (
                                <View className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-500">
                                  +{mistake.knowledgePoints.length - 2}
                                </View>
                              )}
                            </View>

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

            {/* 网格视图 */}
            {viewMode === 'grid' && (
              <View className="grid grid-cols-2 gap-3">
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
                        {/* 错题图片 */}
                        <View className="w-full h-32 bg-gray-100">
                          {mistake.questionImage ? (
                            <Image
                              src={mistake.questionImage}
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
                        <View className="p-3">
                          <View className="flex items-center gap-1 mb-2">
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

                          <Text className="block text-sm font-medium text-foreground mb-2 line-clamp-2">
                            {mistake.title}
                          </Text>

                          <Text className="block text-xs text-gray-400">
                            {mistake.date}
                          </Text>
                        </View>
                      </CardContent>
                    </Card>
                  )
                })}
              </View>
            )}
          </>
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
