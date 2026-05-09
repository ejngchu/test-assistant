import { useEffect, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { ArrowLeft, CircleAlert, BookOpen, Brain, CircleCheck, Camera } from 'lucide-react-taro'
import { useAppStore, MistakeItem, subjectInfo } from '../../store/appStore'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import './index.css'

export default function MistakeDetailPage() {
  const [mistake, setMistake] = useState<MistakeItem | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isNewMode, setIsNewMode] = useState(false)

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params || {}
    const { id, mode } = params
    
    if (mode === 'add') {
      setIsNewMode(true)
      // 模拟新增模式下的空数据
      setMistake({
        id: 'new',
        subject: 'math',
        title: '新错题',
        questionImage: '',
        imageUrl: '',
        correctAnswer: '',
        knowledgePoints: [],
        blindPoints: [],
        createdAt: new Date().toISOString().split('T')[0],
        date: new Date().toISOString().split('T')[0],
        mastered: false,
        reviewCount: 0
      })
    } else if (id) {
      const { mistakes } = useAppStore.getState()
      const found = mistakes.find(m => m.id === id)
      if (found) setMistake(found)
    }
  }, [])

  // 模拟AI分析错题
  const analyzeMistake = async () => {
    if (!mistake) return
    
    setIsAnalyzing(true)
    
    // 模拟AI分析过程
    setTimeout(() => {
      const analysisResult = {
        knowledgePoints: ['有余数除法', '除法竖式计算', '余数概念理解'],
        blindPoints: ['余数必须小于除数', '商的位置确定'],
        analysis: '这道题考查了学生对有余数除法的理解。学生错误地将余数写成了大于除数的形式，说明对余数的概念理解不够清晰。'
      }
      
      setMistake(prev => prev ? {
        ...prev,
        title: '有余数的除法',
        correctAnswer: '24 ÷ 5 = 4 …… 4',
        knowledgePoints: analysisResult.knowledgePoints,
        blindPoints: analysisResult.blindPoints
      } : null)
      
      setIsAnalyzing(false)
      Taro.showToast({ title: '分析完成', icon: 'success' })
    }, 2000)
  }

  // 从相册选择
  const chooseImage = () => {
    Taro.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success: (res) => {
        setMistake(prev => prev ? {
          ...prev,
          imageUrl: res.tempFilePaths[0]
        } : null)
      }
    })
  }

  // 返回上一页
  const goBack = () => {
    Taro.navigateBack()
  }

  // 标记为已掌握
  const markAsMastered = () => {
    setMistake(prev => prev ? { ...prev, mastered: !prev.mastered } : null)
    Taro.showToast({ 
      title: mistake?.mastered ? '已取消掌握' : '已掌握', 
      icon: 'success' 
    })
  }

  // 复习错题
  const reviewMistake = () => {
    Taro.navigateTo({ url: `/pages/review/index?mistakeId=${mistake?.id}` })
  }

  if (!mistake) {
    return (
      <View className="min-h-screen bg-background flex items-center justify-center">
        <Text className="block text-gray-500">加载中...</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-background pb-6">
      {/* 头部 */}
      <View className="px-4 py-4 bg-white sticky top-0 z-10">
        <View className="flex items-center gap-3">
          <View 
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
            onClick={goBack}
          >
            <ArrowLeft size={20} color="#4B5563" />
          </View>
          <Text className="block text-lg font-semibold text-foreground">错题详情</Text>
        </View>
      </View>

      <View className="px-4 py-4 space-y-4">
        {/* 错题图片 */}
        <Card className="bg-white">
          <CardContent className="p-0">
            {mistake.imageUrl ? (
              <Image 
                src={mistake.imageUrl} 
                className="w-full rounded-t-xl"
                mode="widthFix"
              />
            ) : (
              <View 
                className="w-full h-48 bg-gray-100 rounded-t-xl flex flex-col items-center justify-center"
                onClick={chooseImage}
              >
                <Camera size={48} color="#D1D5DB" />
                <Text className="block text-sm text-gray-400 mt-2">点击上传错题图片</Text>
              </View>
            )}
            
            {mistake.imageUrl && (
              <View className="p-4">
                <View 
                  className="text-center py-2 border border-dashed border-gray-300 rounded-lg"
                  onClick={chooseImage}
                >
                  <Text className="block text-sm text-gray-500">更换图片</Text>
                </View>
              </View>
            )}
          </CardContent>
        </Card>

        {/* 错题信息 */}
        <Card className="bg-white">
          <CardContent className="p-4">
            <View className="flex items-center gap-2 mb-3">
              <Badge 
                className="text-xs px-2 py-1"
                style={{
                  backgroundColor: subjectInfo[mistake.subject].bgColor,
                  color: subjectInfo[mistake.subject].color
                }}
              >
                {subjectInfo[mistake.subject].name}
              </Badge>
              <Badge className={`text-xs px-2 py-1 ${
                mistake.mastered ? 'bg-success bg-opacity-10 text-success' : 'bg-warning bg-opacity-10 text-warning'
              }`}
              >
                {mistake.mastered ? '已掌握' : '学习中'}
              </Badge>
            </View>
            
            <Text className="block text-base font-semibold text-foreground mb-2">
              {mistake.title || '错题标题'}
            </Text>
            
            {mistake.correctAnswer && (
              <View className="mt-3 p-3 bg-success bg-opacity-5 rounded-xl">
                <Text className="block text-xs text-gray-500 mb-1">正确答案</Text>
                <Text className="block text-sm font-medium text-success">
                  {mistake.correctAnswer}
                </Text>
              </View>
            )}
          </CardContent>
        </Card>

        {/* 知识点分析 */}
        {mistake.knowledgePoints.length > 0 && (
          <Card className="bg-white">
            <CardContent className="p-4">
              <View className="flex items-center gap-2 mb-3">
                <BookOpen size={18} color="#F59E0B" />
                <Text className="block text-sm font-semibold text-foreground">涉及的知识点</Text>
              </View>
              <View className="flex flex-wrap gap-2">
                {mistake.knowledgePoints.map((point, idx) => (
                  <View key={idx} className="px-3 py-1 bg-primary bg-opacity-10 rounded-full">
                    <Text className="block text-xs text-primary">{point}</Text>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>
        )}

        {/* 知识盲点 */}
        {mistake.blindPoints.length > 0 && (
          <Card className="bg-error bg-opacity-5 border border-error border-opacity-20">
            <CardContent className="p-4">
              <View className="flex items-center gap-2 mb-3">
                <Brain size={18} color="#EF4444" />
                <Text className="block text-sm font-semibold text-foreground">知识盲点</Text>
              </View>
              <View className="space-y-2">
                {mistake.blindPoints.map((point, idx) => (
                  <View key={idx} className="flex items-start gap-2">
                    <View className="w-2 h-2 rounded-full bg-error mt-1 flex-shrink-0" />
                    <Text className="block text-sm text-gray-700">{point}</Text>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>
        )}

        {/* 分析按钮 */}
        {isNewMode && mistake.knowledgePoints.length === 0 && (
          <Button
            className="w-full bg-primary text-white"
            disabled={isAnalyzing}
            onClick={analyzeMistake}
          >
            {isAnalyzing ? (
              <>
                <View className="w-4 h-4 rounded-full border-2 border-white border-opacity-30 border-t-transparent animate-spin mr-2" />
                正在分析...
              </>
            ) : (
              <>
                <CircleAlert size={16} color="#FFFFFF" className="mr-1" />
                智能分析错题
              </>
            )}
          </Button>
        )}

        {/* 操作按钮 */}
        <View className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-primary text-primary"
            onClick={markAsMastered}
          >
            <CircleCheck size={16} color="#F59E0B" className="mr-1" />
            {mistake?.mastered ? '取消掌握' : '标记掌握'}
          </Button>
          <Button
            className="flex-1 bg-primary text-white"
            onClick={reviewMistake}
          >
            开始复习
          </Button>
        </View>
      </View>
    </View>
  )
}
