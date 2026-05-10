export default defineAppConfig({
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
    navigationBarTitleText: '学习助手',
    navigationBarTextStyle: 'black'
  },
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
        pagePath: 'pages/homework/index',
        text: '作业',
        iconPath: './assets/tabbar/camera.png',
        selectedIconPath: './assets/tabbar/camera-active.png'
      },
      {
        pagePath: 'pages/mistakes/index',
        text: '错题本',
        iconPath: './assets/tabbar/book-open.png',
        selectedIconPath: './assets/tabbar/book-open-active.png'
      },
      {
        pagePath: 'pages/review/index',
        text: '复习',
        iconPath: './assets/tabbar/calendar.png',
        selectedIconPath: './assets/tabbar/calendar-active.png'
      },
      {
        pagePath: 'pages/practice/index',
        text: '练习',
        iconPath: './assets/tabbar/pencil.png',
        selectedIconPath: './assets/tabbar/pencil-active.png'
      }
    ]
  }
})
