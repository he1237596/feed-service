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

const { Title, Text } = Typography

const Dashboard: React.FC = () => {
  // 获取统计数据
  const { data: stats } = useQuery('dashboard-stats', async () => {
    const response = await fetch('/api/feed')
    const data = await response.json()
    return data.data.stats
  })

  // 获取最近下载
  const { data: recentDownloads } = useQuery('recent-downloads', async () => {
    const response = await fetch('/api/feed')
    const data = await response.json()
    return data.data.recentDownloads
  })

  // 获取热门包
  const { data: popularPackages } = useQuery('popular-packages', async () => {
    const response = await fetch('/api/packages/popular/list?limit=5')
    const data = await response.json()
    return data.data.packages
  })

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
          <Card title="热门包" style={{ height: 400 }}>
            <List
              dataSource={popularPackages || []}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text strong>{item.name}</Text>
                        <Tag color="blue">{item.version}</Tag>
                      </Space>
                    }
                    description={`${item.downloads} 次下载`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 最近下载 */}
        <Col xs={24} lg={12}>
          <Card title="最近下载" style={{ height: 400 }}>
            <List
              dataSource={recentDownloads || []}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.packageName}
                    description={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary">版本: {item.version}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {new Date(item.downloadedAt).toLocaleString()}
                        </Text>
                      </Space>
                    }
                  />
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