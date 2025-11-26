import React from 'react'
import { Card, Typography, Form, Input, Button, Switch, message, Divider, Space, Radio, Row, Col } from 'antd'
import { SaveOutlined, ReloadOutlined, BulbOutlined, MoonOutlined, SunOutlined, BgColorsOutlined } from '@ant-design/icons'
import { useQuery } from 'react-query'
import useThemeStore from '@/stores/themeStore'
import { getThemeName } from '@/utils/theme'

const { Title, Text } = Typography

const Settings: React.FC = () => {
  const [form] = Form.useForm()
  const { theme: currentTheme, setTheme } = useThemeStore()

  // 获取系统设置
  const { data: systemSettings } = useQuery('system-settings', async () => {
    const response = await fetch('/api/feed/health/status')
    return response.json()
  })

  const handleSave = async (values: any) => {
    try {
      // 这里应该调用保存设置的API
      message.success('设置保存成功')
    } catch (error) {
      message.error('设置保存失败')
    }
  }

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div>
      <Title level={2}>系统设置</Title>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 基本设置 */}
        <Card title="基本设置">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            initialValues={{
              siteName: 'Piral Feed Service',
              siteDescription: '企业级微前端包管理服务',
              allowRegistration: true,
              requireApproval: false,
            }}
          >
            <Form.Item
              label="站点名称"
              name="siteName"
              rules={[{ required: true, message: '请输入站点名称' }]}
            >
              <Input placeholder="Piral Feed Service" />
            </Form.Item>

            <Form.Item
              label="站点描述"
              name="siteDescription"
              rules={[{ required: true, message: '请输入站点描述' }]}
            >
              <Input.TextArea rows={3} placeholder="企业级微前端包管理服务" />
            </Form.Item>

            <Form.Item label="允许用户注册" name="allowRegistration" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item label="新包需要审批" name="requireApproval" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 主题设置 */}
        <Card title="主题设置">
          <Form layout="vertical">
            <Form.Item label="选择主题">
              <Radio.Group 
                value={currentTheme} 
                onChange={(e) => setTheme(e.target.value)}
                size="large"
              >
                <Space direction="vertical">
                  <Radio value="light">
                    <Space>
                      <SunOutlined style={{ color: '#faad14' }} />
                      <span>亮色模式</span>
                    </Space>
                  </Radio>
                  <Radio value="dark">
                    <Space>
                      <MoonOutlined style={{ color: '#1890ff' }} />
                      <span>暗黑模式</span>
                    </Space>
                  </Radio>
                  <Radio value="blue">
                    <Space>
                      <BgColorsOutlined style={{ color: '#1677ff' }} />
                      <span>经典蓝</span>
                    </Space>
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
            
            <Form.Item label="主题预览">
              <Row gutter={16}>
                <Col span={8}>
                  <Card 
                    size="small" 
                    title="亮色" 
                    hoverable
                    onClick={() => setTheme('light')}
                    style={{ 
                      cursor: 'pointer',
                      border: currentTheme === 'light' ? '2px solid #52c41a' : '1px solid #d9d9d9'
                    }}
                  >
                    <div style={{ background: '#ffffff', padding: '10px', borderRadius: '4px' }}>
                      <div style={{ background: '#52c41a', color: 'white', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                        主要颜色
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card 
                    size="small" 
                    title="暗黑" 
                    hoverable
                    onClick={() => setTheme('dark')}
                    style={{ 
                      cursor: 'pointer',
                      border: currentTheme === 'dark' ? '2px solid #1890ff' : '1px solid #d9d9d9'
                    }}
                  >
                    <div style={{ background: '#000000', padding: '10px', borderRadius: '4px' }}>
                      <div style={{ background: '#1890ff', color: 'white', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                        主要颜色
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card 
                    size="small" 
                    title="经典蓝" 
                    hoverable
                    onClick={() => setTheme('blue')}
                    style={{ 
                      cursor: 'pointer',
                      border: currentTheme === 'blue' ? '2px solid #1677ff' : '1px solid #d9d9d9'
                    }}
                  >
                    <div style={{ background: '#001529', padding: '10px', borderRadius: '4px' }}>
                      <div style={{ background: '#1677ff', color: 'white', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                        主要颜色
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>
            </Form.Item>
            
            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  icon={<BulbOutlined />}
                  onClick={() => setTheme(currentTheme === 'light' ? 'dark' : 'light')}
                >
                  切换到{currentTheme === 'light' ? '暗黑' : '亮色'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* 系统信息 */}
        <Card title="系统信息">
          {systemSettings?.data && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Text strong>服务名称: </Text>
                <Text>{systemSettings.data.service}</Text>
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text strong>版本: </Text>
                <Text>{systemSettings.data.version}</Text>
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text strong>环境: </Text>
                <Text>{systemSettings.data.environment}</Text>
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text strong>运行时间: </Text>
                <Text>{Math.floor(systemSettings.data.uptime / 60)} 分钟</Text>
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text strong>内存使用: </Text>
                <Text>
                  {Math.round(systemSettings.data.memory.used / 1024 / 1024)} MB / 
                  {Math.round(systemSettings.data.memory.total / 1024 / 1024)} MB
                </Text>
              </div>
            </div>
          )}
        </Card>

        {/* 统计数据 */}
        <Card title="统计数据">
          {systemSettings?.data?.stats && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Text strong>总包数: </Text>
                <Text>{systemSettings.data.stats.totalPackages}</Text>
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text strong>总版本数: </Text>
                <Text>{systemSettings.data.stats.totalVersions}</Text>
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text strong>总下载量: </Text>
                <Text>{systemSettings.data.stats.totalDownloads}</Text>
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text strong>今日下载: </Text>
                <Text>{systemSettings.data.stats.downloadsToday}</Text>
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text strong>本周下载: </Text>
                <Text>{systemSettings.data.stats.downloadsThisWeek}</Text>
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text strong>本月下载: </Text>
                <Text>{systemSettings.data.stats.downloadsThisMonth}</Text>
              </div>
            </div>
          )}
        </Card>

        {/* 系统操作 */}
        <Card title="系统操作">
          <Space direction="vertical" size="middle">
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleReload}
            >
              重启服务
            </Button>
            <Button danger>
              清理缓存
            </Button>
            <Button danger>
              清理日志
            </Button>
          </Space>
        </Card>
      </Space>
    </div>
  )
}

export default Settings