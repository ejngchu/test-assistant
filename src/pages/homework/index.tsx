import { useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Camera, FileText, Calculator, Languages, LoaderCircle } from 'lucide-react-taro'
import { Subject, subjectInfo } from '../../store/appStore'
import { Card, CardContent } from '../../components/ui/card'
import { Network } from '../../network'
import './index.css'

// 科目配置
const subjects: { key: Subject; name: string; icon: any; description: string }[] = [
  { key: 'chinese', name: '语文', icon: FileText, description: '拼音、汉字、阅读理解' },
  { key: 'math', name: '数学', icon: Calculator, description: '计算、应用题、几何' },
  { key: 'english', name: '英语', icon: Languages, description: '单词、句型、阅读' }
]

export default function HomeworkPage() {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [capturedImage, setCapturedImage] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // 选择科目
  const selectSubject = (subject: Subject) => {
    setSelectedSubject(subject)
    setCapturedImage('')
  }

  // 拍照或从相册选择（与错题本一致）
  const chooseImage = async () => {
    if (!selectedSubject) {
      Taro.showToast({ title: '请先选择科目', icon: 'none' })
      return
    }

    try {
      const res = await Taro.showActionSheet({
        itemList: ['拍照上传', '从相册选择']
      })
      
      const sourceType = res.tapIndex === 0 ? ['camera'] : ['album']
      
      const imageRes = await Taro.chooseImage({
        count: 1,
        sourceType: sourceType as ('camera' | 'album')[],
        sizeType: ['compressed']
      })
      
      const imagePath = imageRes.tempFilePaths[0]
      setCapturedImage(imagePath)
      setIsUploading(true)
      
      // 调用后端 API 检查作业
      const result = await checkHomework(selectedSubject, imagePath)
      
      setIsUploading(false)
      setIsAnalyzing(true)
      
      // 等待一下让用户看到分析过程
      setTimeout(() => {
        setIsAnalyzing(false)
        // 跳转到结果页面，传递检查结果
        const params = new URLSearchParams({
          subject: selectedSubject,
          image: encodeURIComponent(imagePath),
        })
        
        if (result) {
          params.append('result', JSON.stringify(result))
        }
        
        Taro.navigateTo({
          url: `/pages/homework-result/index?${params.toString()}`
        })
      }, 1500)
    } catch (err) {
      console.error('选择图片失败:', err)
    }
  }

  return (
    <View className="min-h-screen bg-background pb-6">
      {/* 顶部说明 */}
      <View className="px-4 py-4">
        <Text className="block text-lg font-semibold text-foreground">拍照提交作业</Text>
        <Text className="block text-sm text-gray-500 mt-1">选择科目，拍照或从相册上传作业</Text>
      </View>

      {/* 科目选择区域 */}
      <View className="px-4 mb-4">
        <Text className="block text-sm font-medium text-gray-700 mb-3">选择科目</Text>
        <View className="grid grid-cols-3 gap-3">
          {subjects.map((subject) => {
            const Icon = subject.icon
            const isSelected = selectedSubject === subject.key
            const info = subjectInfo[subject.key]
            
            return (
              <View
                key={subject.key}
                className={`rounded-2xl p-4 text-center transition-all ${
                  isSelected 
                    ? 'shadow-md scale-105' 
                    : 'shadow-sm'
                }`}
                style={{ 
                  backgroundColor: isSelected ? info.bgColor : '#FFFFFF',
                  border: isSelected ? `2px solid ${info.color}` : '2px solid transparent'
                }}
                onClick={() => selectSubject(subject.key)}
              >
                <View 
                  className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center"
                  style={{ backgroundColor: isSelected ? info.color : '#F5F5F4' }}
                >
                  <Icon size={24} color={isSelected ? '#FFFFFF' : '#6B7280'} />
                </View>
                <Text 
                  className="block text-sm font-semibold"
                  style={{ color: isSelected ? info.color : '#374151' }}
                >
                  {subject.name}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* 已选科目说明 */}
      {selectedSubject && (
        <View className="px-4 mb-4">
          <Card className="bg-white">
            <CardContent className="p-3">
              <View className="flex items-center gap-2">
                <View 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: subjectInfo[selectedSubject].color }}
                />
                <Text className="block text-sm text-gray-600">
                  {subjects.find(s => s.key === selectedSubject)?.description}
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>
      )}

      {/* 拍照/上传区域 */}
      <View className="px-4 mt-4">
        <Card className="bg-white overflow-hidden">
          <CardContent className="p-0">
            {capturedImage ? (
              // 已拍摄/选择图片
              <View className="relative">
                <Image 
                  src={capturedImage} 
                  className="w-full h-64 object-cover"
                  mode="aspectFill"
                />
                {(isUploading || isAnalyzing) && (
                  <View className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
                    <LoaderCircle size={32} color="#FFFFFF" className="animate-spin mb-2" />
                    <Text className="block text-white text-sm">
                      {isUploading ? '上传中...' : 'AI分析中...'}
                    </Text>
                  </View>
                )}
                <View 
                  className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-white bg-opacity-90"
                  onClick={() => setCapturedImage('')}
                >
                  <Text className="block text-xs text-gray-600">重新选择</Text>
                </View>
              </View>
            ) : (
              // 未拍摄 - 显示占位区域
              <View 
                className="h-48 flex flex-col items-center justify-center py-8 cursor-pointer"
                onClick={chooseImage}
              >
                <View className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Camera size={28} color="#9CA3AF" />
                </View>
                <Text className="block text-sm text-gray-500 mb-4">
                  {selectedSubject ? '点击拍摄或上传作业图片' : '请先选择科目'}
                </Text>
              </View>
            )}
          </CardContent>
        </Card>
      </View>

      {/* 使用提示 */}
      <View className="px-4 mt-6">
        <View className="bg-primary bg-opacity-5 rounded-xl p-4">
          <Text className="block text-sm font-medium text-primary mb-2">拍照小技巧</Text>
          <View className="space-y-2">
            <Text className="block text-xs text-gray-600">• 确保光线充足，文字清晰可见</Text>
            <Text className="block text-xs text-gray-600">• 将作业平整放置，避免倾斜</Text>
            <Text className="block text-xs text-gray-600">• 尽量一次拍完整页作业</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
