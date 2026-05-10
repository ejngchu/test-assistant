export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: 'LLM配置' })
  : { navigationBarTitleText: 'LLM配置' }
