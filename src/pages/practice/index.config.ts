export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '练习中心' })
  : { navigationBarTitleText: '练习中心' }
