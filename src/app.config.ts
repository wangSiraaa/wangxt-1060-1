export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/booking/index',
    'pages/training/index',
    'pages/mine/index',
    'pages/session-detail/index',
    'pages/booking-confirm/index',
    'pages/result-register/index',
    'pages/retraining/index',
    'pages/exception/index',
    'pages/statistics/index',
    'pages/suspension-impact/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1E88E5',
    navigationBarTitleText: '农机驾驶培训',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F5F7FA'
  },
  tabBar: {
    color: '#90A4AE',
    selectedColor: '#1E88E5',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页'
      },
      {
        pagePath: 'pages/booking/index',
        text: '预约'
      },
      {
        pagePath: 'pages/training/index',
        text: '培训'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
