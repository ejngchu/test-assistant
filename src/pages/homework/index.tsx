import { useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Camera, LoaderCircle } from 'lucide-react-taro'
import { Subject, subjectInfo } from '../../store/appStore'
import { Card, CardContent } from '../../components/ui/card'
import { Network } from '../../network'
import './index.css'

// 作业检查结果类型
interface HomeworkCheckResult {
  completed: boolean
  totalProblems: number
  correctCount: number
  incorrectCount: number
  unclearCount: number
  problems: Array<{
    id: string
    status: 'correct' | 'incorrect' | 'unclear'
    hint?: string
  }>
}

// 科目识别结果
interface SubjectDetectResult {
  subject: Subject
  confidence: number
  isUncertain: boolean
}

export default function HomeworkPage() {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [capturedImage, setCapturedImage] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)

  // 自动识别科目（调用后端 LLM API）
  const detectSubject = async (imagePath: string): Promise<SubjectDetectResult | null> => {
    try {
      const res = await Network.request({
        url: '/api/study/subject/detect',
        method: 'POST',
        data: { imageUrl: imagePath }
      })
      
      if (res.data?.code === 200 && res.data?.data) {
        return {
          subject: res.data.data.subject as Subject,
          confidence: res.data.data.confidence,
          isUncertain: res.data.data.isUncertain
        }
      }
      return null
    } catch (err) {
      console.error('科目识别失败:', err)
      return null
    }
  }

  // 调用后端 API 检查作业
  const checkHomework = async (subject: Subject, imagePath: string): Promise<HomeworkCheckResult | null> => {
    try {
      const res = await Network.request({
        url: '/api/study/homework/check',
        method: 'POST',
        data: { subject, imageUrl: imagePath }
      })
      
      if (res.data?.code === 200 && res.data?.data?.result) {
        return res.data.data.result
      }
      return null
    } catch (err) {
      console.error('作业检查失败:', err)
      return null
    }
  }

  // 拍照或从相册选择（与错题本一致）
  const chooseImage = async () => {
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
      
      // 自动识别科目
      const detectResult = await detectSubject(imagePath)
      
      setIsUploading(false)
      
      // 如果识别不确定，显示手动选择
      if (detectResult?.isUncertain || !detectResult) {
        setIsDetecting(true)
        
        // 显示科目选择确认
        const subjectOptions = [
          { key: 'chinese', name: '语文' },
          { key: 'math', name: '数学' },
          { key: 'english', name: '英语' }
        ]
        
        Taro.showActionSheet({
          itemList: subjectOptions.map(s => s.name),
          success: async (res) => {
            const selected = subjectOptions[res.tapIndex].key as Subject
            setSelectedSubject(selected)
            setIsDetecting(false)
            await processHomework(selected, imagePath)
          },
          fail: () => {
            setIsDetecting(false)
            setCapturedImage('')
            Taro.showToast({ title: '请选择科目继续', icon: 'none' })
          }
        })
      } else {
        // 识别成功，使用识别结果
        setSelectedSubject(detectResult.subject)
        Taro.showToast({
          title: `已识别为${subjectInfo[detectResult.subject].name}`,
          icon: 'success',
          duration: 1500
        })
        
        // 延迟后自动继续检查
        setTimeout(async () => {
          await processHomework(detectResult.subject, imagePath)
        }, 1500)
      }
    } catch (err) {
      console.error('选择图片失败:', err)
    }
  }

  // 处理作业检查流程
  const processHomework = async (subject: Subject, imagePath: string) => {
    setIsAnalyzing(true)
    
    // 调用后端 API 检查作业
    const result = await checkHomework(subject, imagePath)
    
    // 等待一下让用户看到分析过程
    setTimeout(() => {
      setIsAnalyzing(false)
      // 跳转到结果页面，传递检查结果
      const params = new URLSearchParams({
        subject: subject,
        image: encodeURIComponent(imagePath),
      })
      
      if (result) {
        params.append('result', JSON.stringify(result))
      }
      
      Taro.navigateTo({
        url: `/pages/homework-result/index?${params.toString()}`
      })
    }, 1500)
  }

  // 手动选择科目
  const manualSelectSubject = async (subject: Subject) => {
    if (!capturedImage) {
      Taro.showToast({ title: '请先上传作业图片', icon: 'none' })
      return
    }
    
    setSelectedSubject(subject)
    await processHomework(subject, capturedImage)
  }

  return (
    <View className="min-h-screen bg-background pb-6">
      {/* 顶部说明 */}
      <View className="px-4 py-4">
        <Text className="block text-lg font-semibold text-foreground">拍照提交作业</Text>
        <Text className="block text-sm text-gray-500 mt-1">拍照或从相册上传作业，AI自动识别科目</Text>
      </View>

      {/* 识别结果/手动选择区域 */}
      {capturedImage && (isDetecting || selectedSubject) && (
        <View className="px-4 mb-4">
          <Card className="bg-white">
            <CardContent className="p-3">
              {isDetecting ? (
                <View className="flex items-center gap-2">
                  <LoaderCircle size={16} color="#3B82F6" className="animate-spin" />
                  <Text className="block text-sm text-gray-600">正在识别科目...</Text>
                </View>
              ) : selectedSubject ? (
                <View className="flex items-center gap-2">
                  <View 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: subjectInfo[selectedSubject].color }}
                  />
                  <Text className="block text-sm text-gray-600">
                    已识别：{subjectInfo[selectedSubject].name}
                  </Text>
                  <Text 
                    className="block text-xs text-gray-400 ml-auto"
                    onClick={() => {
                      setSelectedSubject(null)
                      setCapturedImage('')
                    }}
                  >
                    重新上传
                  </Text>
                </View>
              ) : null}
            </CardContent>
          </Card>
        </View>
      )}

      {/* 手动选择科目（识别不确定时显示） */}
      {capturedImage && !isDetecting && !selectedSubject && (
        <View className="px-4 mb-4">
          <Text className="block text-sm font-medium text-gray-700 mb-3">请手动选择科目</Text>
          <View className="grid grid-cols-3 gap-3">
            {(['chinese', 'math', 'english'] as Subject[]).map((subject) => {
              const info = subjectInfo[subject]
              return (
                <View
                  key={subject}
                  className="rounded-2xl p-3 text-center shadow-sm bg-white"
                  style={{ border: `2px solid ${info.color}` }}
                  onClick={() => manualSelectSubject(subject)}
                >
                  <Text 
                    className="block text-sm font-semibold"
                    style={{ color: info.color }}
                  >
                    {info.name}
                  </Text>
                </View>
              )
            })}
          </View>
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
                {(isUploading || isAnalyzing || isDetecting) && (
                  <View className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
                    <LoaderCircle size={32} color="#FFFFFF" className="animate-spin mb-2" />
                    <Text className="block text-white text-sm">
                      {isUploading ? '上传中...' : isDetecting ? 'AI识别科目中...' : 'AI分析中...'}
                    </Text>
                  </View>
                )}
                <View 
                  className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-white bg-opacity-90"
                  onClick={() => {
                    setCapturedImage('')
                    setSelectedSubject(null)
                  }}
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
                  点击拍摄或上传作业图片
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
            <Text className="block text-xs text-gray-600">• AI会自动识别作业科目</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
