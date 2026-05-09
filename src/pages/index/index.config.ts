export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '学习助手' })
  : { navigationBarTitleText: '学习助手' }
