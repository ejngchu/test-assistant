export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '复习提醒' })
  : { navigationBarTitleText: '复习提醒' }
