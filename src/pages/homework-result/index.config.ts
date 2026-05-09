export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '作业结果' })
  : { navigationBarTitleText: '作业结果' }
