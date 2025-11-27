import React from 'react'
import { Upload, Button, Alert, Space, Typography } from 'antd'
import { UploadOutlined, InfoCircleOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

interface UploadHelperProps {
  onFileSelect?: (file: File) => void
  showTips?: boolean
}

const UploadHelper: React.FC<UploadHelperProps> = ({ onFileSelect, showTips = true }) => {
  const uploadProps = {
    name: 'package',
    beforeUpload: (file: File) => {
      if (file.size > 50 * 1024 * 1024) {
        message.error('文件大小不能超过50MB')
        return false
      }
      onFileSelect?.(file)
      return false // 阻止自动上传
    },
    showUploadList: false,
  }

  return (
    <div>
      {showTips && (
        <Alert
          message="推荐使用 CLI 上传"
          description={
            <div>
              <p>使用 <Text code>npx pilet publish --url=http://localhost:3000/api/packages/upload</Text> 命令上传，可以：</p>
              <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
                <li>自动提取包名和版本号</li>
                <li>确保包名与 package.json 一致</li>
                <li>支持 --fresh 参数覆盖现有版本</li>
                <li>更可靠的上传体验</li>
              </ul>
            </div>
          }
          type="info"
          style={{ marginBottom: 16 }}
          icon={<InfoCircleOutlined />}
        />
      )}
      
      <Upload.Dragger {...uploadProps} style={{ padding: '20px' }}>
        <p className="ant-upload-drag-icon">
          <UploadOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p className="ant-upload-hint">
          支持 .tgz, .tar.gz 格式文件，最大 50MB
        </p>
      </Upload.Dragger>
    </div>
  )
}

export default UploadHelper