// 测试 Dashboard API 调用
import { api } from './src/utils/api'

async function testDashboardAPI() {
  try {
    console.log('Testing /api/feed/ endpoint...')
    
    const data = await api.get('/feed/')
    console.log('API Response:', data)
    
    console.log('Stats:', data.data?.stats)
    console.log('Recent Downloads:', data.data?.recentDownloads?.slice(0, 3))
    console.log('Popular Packages:', data.data?.popularPackages?.slice(0, 3))
    
    return data
  } catch (error) {
    console.error('API Test Failed:', error)
    throw error
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testDashboardAPI()
}

export { testDashboardAPI }