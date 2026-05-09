export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '错题详情' })
  : { navigationBarTitleText: '错题详情' }
