export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '答题练习' })
  : { navigationBarTitleText: '答题练习' }
