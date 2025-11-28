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
    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f0f2f5',
    colorText: '#000000',
    colorTextSecondary: '#595959',
    colorTextTertiary: '#8c8c8c',
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',
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
      darkItemHoverBg: '#002140',
      darkItemSelectedBg: '#1677ff',
      darkItemColor: '#ffffff',
      darkItemSelectedColor: '#ffffff',
      darkItemHoverColor: '#ffffff',
    },
    Card: {
      colorBgContainer: '#ffffff',
      colorBorderSecondary: '#d9d9d9',
    },
    Button: {
      colorBgContainer: '#1677ff',
      colorText: '#ffffff',
    },
    Input: {
      colorBgContainer: '#ffffff',
      colorBorder: '#d9d9d9',
      colorText: '#000000',
    },
    Table: {
      colorBgContainer: '#ffffff',
      headerBg: '#fafafa',
      headerColor: '#000000',
      rowHoverBg: '#f5f5f5',
    },
    Typography: {
      colorText: '#000000',
      colorTextSecondary: '#595959',
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
    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f5f5f5',
    colorText: '#000000',
    colorTextSecondary: '#595959',
    colorTextTertiary: '#8c8c8c',
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',
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
      itemHoverBg: '#f0f7ff',
      itemColor: '#262626',
      itemSelectedColor: '#52c41a',
      itemHoverColor: '#000000',
    },
    Card: {
      colorBgContainer: '#ffffff',
      colorBorderSecondary: '#d9d9d9',
    },
    Button: {
      colorBgContainer: '#52c41a',
      colorText: '#ffffff',
      colorPrimary: '#52c41a',
      colorPrimaryHover: '#73d13d',
      defaultBg: '#ffffff',
      defaultColor: '#262626',
    },
    Input: {
      colorBgContainer: '#ffffff',
      colorBorder: '#d9d9d9',
      colorText: '#000000',
    },
    Table: {
      colorBgContainer: '#ffffff',
      headerBg: '#fafafa',
      headerColor: '#000000',
      rowHoverBg: '#f5f5f5',
    },
    Typography: {
      colorText: '#000000',
      colorTextSecondary: '#595959',
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
    colorBgBase: '#000000',
    colorBgContainer: '#141414',
    colorBgElevated: '#1f1f1f',
    colorBgLayout: '#000000',
    colorText: '#ffffff',
    colorTextSecondary: '#a6a6a6',
    colorTextTertiary: '#737373',
    colorBorder: '#434343',
    colorBorderSecondary: '#303030',
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
      darkItemHoverBg: '#1f1f1f',
      itemSelectedBg: '#1890ff',
      itemHoverBg: '#1f1f1f',
    },
    Card: {
      colorBgContainer: '#141414',
      colorBorderSecondary: '#434343',
    },
    Button: {
      colorBgContainer: '#1890ff',
      colorText: '#ffffff',
    },
    Input: {
      colorBgContainer: '#1f1f1f',
      colorBorder: '#434343',
      colorText: '#ffffff',
    },
    Table: {
      colorBgContainer: '#141414',
      headerBg: '#1f1f1f',
      headerColor: '#ffffff',
      rowHoverBg: '#1f1f1f',
    },
    Typography: {
      colorText: '#ffffff',
      colorTextSecondary: '#a6a6a6',
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