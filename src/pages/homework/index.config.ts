export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '提交作业' })
  : { navigationBarTitleText: '提交作业' }
