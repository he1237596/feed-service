import React from 'react'
import { Row, Col, Card, Statistic, List, Typography, Space, Tag } from 'antd'
import {
  AppstoreOutlined,
  UploadOutlined,
  DownloadOutlined,
  UserOutlined,
  RiseOutlined,
} from '@ant-design/icons'
import { useQuery } from 'react-query'
import api from '@/utils/api'

const { Title, Text } = Typography

const Dashboard: React.FC = () => {
  // 获取所有 dashboard 数据（单次请求）
  const { data: dashboardData, isLoading: statsLoading } = useQuery(
    'dashboard-data', 
    async () => {
      const data = await api.get('/feed/')
      return data.data || {}
    },
    {
      retry: 2,
      staleTime: 30000, // 30秒缓存
    }
  )

  // 从返回数据中提取各部分
  const stats = dashboardData?.stats || {}
  const recentDownloads = dashboardData?.recentDownloads || []
  const popularPackages = dashboardData?.popularPackages || []
  const downloadsLoading = statsLoading // 共用加载状态

  return (
    <div>
      <Title level={2}>仪表板</Title>
      
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总包数"
              value={stats?.totalPackages || 0}
              prefix={<AppstoreOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总版本数"
              value={stats?.totalVersions || 0}
              prefix={<UploadOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总下载量"
              value={stats?.totalDownloads || 0}
              prefix={<DownloadOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日下载"
              value={stats?.downloadsToday || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 热门包 */}
        <Col xs={24} lg={12}>
          <Card title="热门包 (Top 5)" style={{ height: 240 }}>
            <List
              size="small"
              dataSource={popularPackages?.slice(0, 5) || []}
              renderItem={(item: any) => (
                <List.Item style={{ padding: '6px 0', border: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <Text strong>{item.name}</Text>
                      <Tag color="blue" style={{ marginLeft: 8 }}>{item.version}</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{item.downloads || 0} 次</Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 最近下载 */}
        <Col xs={24} lg={12}>
          <Card title="最近下载 (最近5条)" style={{ height: 240 }}>
            <List
              size="small"
              dataSource={recentDownloads?.slice(0, 5) || []}
              renderItem={(item: any) => (
                <List.Item style={{ padding: '6px 0', border: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <Text strong style={{ fontSize: '13px' }}>{item.packageName}</Text>
                      <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                        版本: {item.version}
                      </Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {new Date(item.downloadedAt).toLocaleDateString()}
                    </Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard