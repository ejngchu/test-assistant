import { useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Camera, FileText, Calculator, Languages, LoaderCircle } from 'lucide-react-taro'
import { Subject, subjectInfo } from '../../store/appStore'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
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

  // 拍照上传
  const takePhoto = async () => {
    if (!selectedSubject) {
      Taro.showToast({ title: '请先选择科目', icon: 'none' })
      return
    }

    try {
      const res = await Taro.chooseImage({
        count: 1,
        sourceType: ['camera'],
        sizeType: ['compressed']
      })
      
      setCapturedImage(res.tempFilePaths[0])
      setIsUploading(true)
      
      // 模拟上传和分析过程
      setTimeout(() => {
        setIsUploading(false)
        setIsAnalyzing(true)
        
        setTimeout(() => {
          setIsAnalyzing(false)
          // 跳转到结果页面
          Taro.navigateTo({
            url: `/pages/homework-result/index?subject=${selectedSubject}&image=${encodeURIComponent(res.tempFilePaths[0])}`
          })
        }, 2000)
      }, 1000)
    } catch (err) {
      console.error('拍照失败:', err)
      Taro.showToast({ title: '拍照失败，请重试', icon: 'none' })
    }
  }

  // 从相册选择
  const chooseFromAlbum = async () => {
    if (!selectedSubject) {
      Taro.showToast({ title: '请先选择科目', icon: 'none' })
      return
    }

    try {
      const res = await Taro.chooseImage({
        count: 1,
        sourceType: ['album'],
        sizeType: ['compressed']
      })
      
      setCapturedImage(res.tempFilePaths[0])
      setIsUploading(true)
      
      // 模拟上传和分析过程
      setTimeout(() => {
        setIsUploading(false)
        setIsAnalyzing(true)
        
        setTimeout(() => {
          setIsAnalyzing(false)
          Taro.navigateTo({
            url: `/pages/homework-result/index?subject=${selectedSubject}&image=${encodeURIComponent(res.tempFilePaths[0])}`
          })
        }, 2000)
      }, 1000)
    } catch (err) {
      console.error('选择图片失败:', err)
      Taro.showToast({ title: '选择失败，请重试', icon: 'none' })
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
              <View className="h-48 flex flex-col items-center justify-center py-8">
                <View className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Camera size={28} color="#9CA3AF" />
                </View>
                <Text className="block text-sm text-gray-500 mb-4">
                  {selectedSubject ? '拍摄或上传作业图片' : '请先选择科目'}
                </Text>
              </View>
            )}
          </CardContent>
        </Card>
      </View>

      {/* 操作按钮 */}
      <View className="px-4 mt-6 space-y-3">
        <Button
          className="w-full bg-primary text-white"
          disabled={!selectedSubject || isUploading || isAnalyzing}
          onClick={takePhoto}
        >
          <Camera size={18} color="#FFFFFF" className="mr-2" />
          <Text className="block text-sm">拍照上传</Text>
        </Button>
        
        <Button
          variant="outline"
          className="w-full border-primary text-primary"
          disabled={!selectedSubject || isUploading || isAnalyzing}
          onClick={chooseFromAlbum}
        >
          <Text className="block text-sm">从相册选择</Text>
        </Button>
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
