import React, { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Typography, Space, Badge, Button, Tooltip, Switch } from 'antd'
import {
  DashboardOutlined,
  AppstoreOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  BellOutlined,
  BulbOutlined,
  MoonOutlined,
  SunOutlined,
  BgColorsOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '@/stores/authStore'
import useThemeStore from '@/stores/themeStore'
import { ConfigProvider, theme } from 'antd'
import { getThemeConfig, getThemeName } from '@/utils/theme'

const { Header, Sider, Content } = Layout
const { Title } = Typography

interface AppLayoutProps {
  children: React.ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { theme: currentTheme, setTheme, toggleTheme } = useThemeStore()
  const [collapsed, setCollapsed] = useState(false)
  
  const themeConfig = getThemeConfig(currentTheme)

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/packages',
      icon: <AppstoreOutlined />,
      label: '包管理',
    },
    ...(user?.role === 'admin'
      ? [
          {
            key: '/users',
            icon: <TeamOutlined />,
            label: '用户管理',
          },
        ]
      : []),
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ]

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleUserMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'profile':
        // TODO: 实现个人资料页面
        break
      case 'logout':
        logout()
        navigate('/login')
        break
    }
  }

  const selectedKeys = [location.pathname]

  // 主题切换菜单项
  const getThemeMenuIconColor = (theme: string) => {
    if (currentTheme === 'light') {
      return '#52c41a'
    } else if (currentTheme === 'blue') {
      return '#1677ff'
    }
    return undefined
  }

  const themeMenuItems = [
    {
      key: 'light',
      label: (
        <Space>
          <SunOutlined style={{ color: getThemeMenuIconColor('light') }} />
          <span style={{ color: getThemeMenuIconColor('light') }}>亮色模式</span>
        </Space>
      ),
      onClick: () => setTheme('light'),
    },
    {
      key: 'dark',
      label: (
        <Space>
          <MoonOutlined style={{ color: getThemeMenuIconColor('dark') }} />
          <span style={{ color: getThemeMenuIconColor('dark') }}>暗黑模式</span>
        </Space>
      ),
      onClick: () => setTheme('dark'),
    },
    {
      key: 'blue',
      label: (
        <Space>
          <BgColorsOutlined style={{ color: getThemeMenuIconColor('blue') }} />
          <span style={{ color: getThemeMenuIconColor('blue') }}>经典蓝</span>
        </Space>
      ),
      onClick: () => setTheme('blue'),
    },
  ]

  return (
    <ConfigProvider theme={themeConfig}>
      <Layout className="app-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Title 
            level={4} 
            style={{ 
              margin: 0,
              color: currentTheme === 'light' ? '#52c41a' : '#ffffff'
            }}
          >
            {collapsed ? 'FS' : 'Feed Service'}
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div />
          <Space size="middle">
            <Tooltip title={`当前主题: ${getThemeName(currentTheme)}`}>
              <Button
                type={currentTheme === 'light' || currentTheme === 'blue' ? 'default' : 'text'}
                icon={<BulbOutlined />}
                onClick={toggleTheme}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  ...(currentTheme === 'light' && {
                    borderColor: '#52c41a',
                    color: '#52c41a',
                    backgroundColor: '#f6ffed'
                  }),
                  ...(currentTheme === 'blue' && {
                    borderColor: '#1677ff',
                    color: '#1677ff',
                    backgroundColor: '#f0f7ff'
                  })
                }}
              />
            </Tooltip>
            <Dropdown
              menu={{
                items: themeMenuItems,
              }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button
                type={currentTheme === 'light' || currentTheme === 'blue' ? 'default' : 'text'}
                icon={<BgColorsOutlined />}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  ...(currentTheme === 'light' && {
                    borderColor: '#52c41a',
                    color: '#52c41a',
                    backgroundColor: '#f6ffed'
                  }),
                  ...(currentTheme === 'blue' && {
                    borderColor: '#1677ff',
                    color: '#1677ff',
                    backgroundColor: '#f0f7ff'
                  })
                }}
              />
            </Dropdown>
            <Badge count={0} size="small">
              <BellOutlined style={{ fontSize: '18px' }} />
            </Badge>
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: handleUserMenuClick,
              }}
              placement="bottomRight"
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <span>{user?.email}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: '24px',
            minHeight: 280,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
    </ConfigProvider>
  )
}

export default AppLayout