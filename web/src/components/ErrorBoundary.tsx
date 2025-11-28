import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Result, Button } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // 可以在这里添加错误上报逻辑
    if (process.env.NODE_ENV === 'production') {
      // 上报错误到监控服务
      console.error('Error Info:', errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Result
          status="error"
          icon={<ExclamationCircleOutlined />}
          title="页面出错了"
          subTitle={
            process.env.NODE_ENV === 'development' 
              ? this.state.error?.message 
              : '抱歉，页面遇到了一些问题'
          }
          extra={
            <Button type="primary" onClick={this.handleReset}>
              重试
            </Button>
          }
        />
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary