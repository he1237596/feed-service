import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import useAuthStore from '@/stores/authStore'
import useThemeStore from '@/stores/themeStore'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Packages from '@/pages/Packages'
import PackageDetail from '@/pages/PackageDetail'
import Versions from '@/pages/Versions'
import Users from '@/pages/Users'
import Settings from '@/pages/Settings'
import AppLayout from '@/components/AppLayout'
import { getThemeConfig } from '@/utils/theme'

const App: React.FC = () => {
  const { token, user } = useAuthStore()
  const { theme: currentTheme } = useThemeStore()
  const themeConfig = getThemeConfig(currentTheme)

  if (!token) {
    return (
      <ConfigProvider theme={themeConfig}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ConfigProvider>
    )
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/packages/:name" element={<PackageDetail />} />
        <Route path="/packages/:name/versions" element={<Versions />} />
        {user?.role === 'admin' && <Route path="/users" element={<Users />} />}
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default App