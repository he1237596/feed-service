import { theme } from 'antd'
import type { ThemeConfig } from 'antd'
import type { ThemeType } from '@/stores/themeStore'

// Ant Design 默认蓝色主题
const blueTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 6,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#001529',
      bodyBg: '#f0f2f5',
    },
    Menu: {
      darkItemBg: '#001529',
      darkSubMenuItemBg: '#000c17',
    }
  }
}

// 亮色主题
const lightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#52c41a',
    borderRadius: 8,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      bodyBg: '#f5f5f5',
    },
    Menu: {
      itemBg: '#ffffff',
      itemSelectedBg: '#e6f7ff',
      itemHoverBg: '#f5f5f5',
    }
  }
}

// 暗黑主题
const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 8,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#141414',
      siderBg: '#000000',
      bodyBg: '#000000',
    },
    Menu: {
      darkItemBg: '#000000',
      darkSubMenuItemBg: '#141414',
      darkItemSelectedBg: '#111b26',
    }
  }
}

export const getThemeConfig = (themeType: ThemeType): ThemeConfig => {
  switch (themeType) {
    case 'dark':
      return darkTheme
    case 'blue':
      return blueTheme
    case 'light':
    default:
      return lightTheme
  }
}

export const getThemeName = (themeType: ThemeType): string => {
  switch (themeType) {
    case 'dark':
      return '暗黑模式'
    case 'blue':
      return '经典蓝'
    case 'light':
    default:
      return '亮色模式'
  }
}