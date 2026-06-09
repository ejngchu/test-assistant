export default {
  pages: [
    'pages/index/index',
    'pages/homework/index',
    'pages/homework-result/index',
    'pages/mistakes/index',
    'pages/mistake-detail/index',
    'pages/review/index',
    'pages/practice/index',
    'pages/practice-answer/index',
    'pages/settings/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FAFAF9',
    navigationBarTitleText: 'Venus-Mate',
    navigationBarTextStyle: 'black'
  },
  // V2 单入口交互：TabBar 精简为 3 个
  // - 首页：拍错题主入口
  // - 错题本：所有错题 + 复习入口
  // - 我的：设置 / 统计 / 导出（替代旧"练习"Tab）
  tabBar: {
    color: '#6B7280',
    selectedColor: '#F59E0B',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: './assets/tabbar/home.png',
        selectedIconPath: './assets/tabbar/home-active.png'
      },
      {
        pagePath: 'pages/mistakes/index',
        text: '错题本',
        iconPath: './assets/tabbar/book-open.png',
        selectedIconPath: './assets/tabbar/book-open-active.png'
      },
      {
        pagePath: 'pages/settings/index',
        text: '我的',
        iconPath: './assets/tabbar/pencil.png',
        selectedIconPath: './assets/tabbar/pencil-active.png'
      }
    ]
  }
}
