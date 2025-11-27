import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Typography, Tag, Button, Space, Table, message, Descriptions, Modal, Switch, Upload } from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  StarOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import type { ColumnsType } from 'antd/es/table'
import type { Package, Version } from '@/types'
import useAuthStore from '@/stores/authStore'

const { Title, Text } = Typography

const PackageDetail: React.FC = () => {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // 获取包详细信息
  const { data: packageData, isLoading } = useQuery(
    ['package', name],
    async () => {
      const response = await fetch(`/api/packages/${name}?includeVersions=true`)
      if (!response.ok) {
        throw new Error('包不存在')
      }
      return response.json()
    },
    {
      enabled: !!name,
    },
  )

  // 权限检查
  const user = useAuthStore.getState().user
  const isAdmin = user?.role === 'admin'
  const isOwner = packageData?.data?.authorId === user?.id
  const canEdit = isAdmin || isOwner

  // 编辑包信息
  const updatePackageMutation = useMutation(
    async (data: { name: string; description: string; isPublic: boolean }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`/api/packages/${data.name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: data.description,
          isPublic: data.isPublic
        }),
      })
      
      if (!response.ok) {
        throw new Error('更新失败')
      }
      
      return response.json()
    },
    {
      onSuccess: () => {
        message.success('包信息更新成功')
        queryClient.invalidateQueries(['package', name])
        queryClient.invalidateQueries('packages')
      },
      onError: () => {
        message.error('更新失败')
      },
    },
  )

  // 上传新版本
  const [uploadModalVisible, setUploadModalVisible] = React.useState(false)

  // 设置最新版本
  const setLatestMutation = useMutation(
    async ({ packageName, version }: { packageName: string; version: string }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`/api/versions/${packageName}/${version}/set-latest`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('设置失败')
      }
      
      return response.json()
    },
    {
      onSuccess: () => {
        message.success('最新版本设置成功')
        queryClient.invalidateQueries(['package', name])
      },
      onError: () => {
        message.error('设置最新版本失败')
      },
    },
  )

  // 废弃/取消废弃版本
  const deprecateMutation = useMutation(
    async ({ packageName, version, deprecate }: { packageName: string; version: string; deprecate: boolean }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`/api/versions/${packageName}/${version}/deprecate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deprecate }),
      })
      
      if (!response.ok) {
        throw new Error('操作失败')
      }
      
      return response.json()
    },
    {
      onSuccess: (_, { deprecate }) => {
        message.success(`版本已${deprecate ? '废弃' : '取消废弃'}`)
        queryClient.invalidateQueries(['package', name])
        // Also invalidate dashboard stats
        queryClient.invalidateQueries('dashboard-stats')
        queryClient.invalidateQueries('popular-packages')
      },
      onError: () => {
        message.error('操作失败')
      },
    },
  )

  // 删除版本
  const deleteVersionMutation = useMutation(
    async ({ packageName, version }: { packageName: string; version: string }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`/api/versions/${packageName}/${version}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('删除失败')
      }
      
      return response.json()
    },
    {
      onSuccess: () => {
        message.success('版本删除成功')
        queryClient.invalidateQueries(['package', name])
        // Also invalidate dashboard stats
        queryClient.invalidateQueries('dashboard-stats')
        queryClient.invalidateQueries('popular-packages')
        queryClient.invalidateQueries('packages')
      },
      onError: () => {
        message.error('版本删除失败')
      },
    },
  )

  // 处理编辑包信息
  const handleEditPackage = () => {
    if (!packageData?.data) return
    
    Modal.confirm({
      title: '编辑包信息',
      content: (
        <div>
          <p><strong>包名:</strong> {packageData.data.name}</p>
          <p><strong>描述:</strong></p>
          <textarea 
            id="package-description"
            defaultValue={packageData.data.description || ''}
            placeholder="请输入包描述"
            rows={3}
            style={{ width: '100%', marginBottom: 16, padding: '4px', border: '1px solid #d9d9d9', borderRadius: '2px' }}
          />
          <div>
            <strong>公开状态:</strong>
            <input 
              id="package-public"
              type="checkbox"
              defaultChecked={packageData.data.isPublic}
              style={{ marginLeft: 8 }}
            />
          </div>
        </div>
      ),
      width: 500,
      onOk: () => {
        const description = (document.getElementById('package-description') as HTMLTextAreaElement).value
        const isPublic = (document.getElementById('package-public') as HTMLInputElement).checked
        
        updatePackageMutation.mutate({
          name: packageData.data.name,
          description,
          isPublic
        })
      },
    })
  }

  // 上传新版本的表单
  const handleUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('package', file)
    formData.append('name', packageData!.data!.name) // 使用当前包名

    try {
      const token = useAuthStore.getState().token
      const response = await fetch('/api/packages/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('上传失败')
      }

      message.success('新版本上传成功')
      setUploadModalVisible(false)
      queryClient.invalidateQueries(['package', name])
      queryClient.invalidateQueries('dashboard-stats')
      queryClient.invalidateQueries('popular-packages')
      queryClient.invalidateQueries('packages')
    } catch (error: any) {
      message.error(error.message || '上传失败')
    }
  }

  const versionColumns: ColumnsType<Version> = [
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      render: (version: string, record: Version) => (
        <Space>
          <Text strong>{version}</Text>
          {record.isLatest && <Tag color="green">最新</Tag>}
          {record.isDeprecated && <Tag color="red">已废弃</Tag>}
        </Space>
      ),
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (size: number) => size ? `${(size / 1024 / 1024).toFixed(2)} MB` : '-',
    },
    {
      title: '下载量',
      dataIndex: 'downloads',
      key: 'downloads',
      sorter: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: Version) => {
        const user = useAuthStore.getState().user
        const isAdmin = user?.role === 'admin'
        
        return (
          <Space size="middle">
            <Button
              type="link"
              icon={<DownloadOutlined />}
              href={`/api/versions/${name}/${record.version}/download`}
              target="_blank"
            >
              下载
            </Button>
            {isAdmin && !record.isLatest && (
              <Button
                type="link"
                icon={<StarOutlined />}
                loading={setLatestMutation.isLoading}
                onClick={() => {
                  Modal.confirm({
                    title: '确认设置最新版本',
                    content: `确定要将版本 ${record.version} 设置为最新版本吗？`,
                    onOk: () => {
                      setLatestMutation.mutate({
                        packageName: name!,
                        version: record.version,
                      })
                    },
                  })
                }}
              >
                设为最新
              </Button>
            )}
            {isAdmin && (
              <Space>
                <span>废弃:</span>
                <Switch
                  checked={record.isDeprecated}
                  onChange={(checked) => {
                    Modal.confirm({
                      title: `确认${checked ? '废弃' : '取消废弃'}版本`,
                      content: `确定要${checked ? '废弃' : '取消废弃'}版本 ${record.version} 吗？`,
                      icon: <ExclamationCircleOutlined />,
                      onOk: () => {
                        deprecateMutation.mutate({
                          packageName: name!,
                          version: record.version,
                          deprecate: checked,
                        })
                      },
                    })
                  }}
                />
              </Space>
            )}
            <Button
              type="link"
              icon={<DeleteOutlined />}
              danger
              loading={deleteVersionMutation.isLoading}
              onClick={() => {
                if (window.confirm('确定要删除这个版本吗？')) {
                  deleteVersionMutation.mutate({
                    packageName: name!,
                    version: record.version,
                  })
                }
              }}
            >
              删除
            </Button>
          </Space>
        )
      },
    },
  ]

  if (isLoading) {
    return <div>加载中...</div>
  }

  if (!packageData?.data) {
    return <div>包不存在</div>
  }

  const pkg = packageData.data

  return (
    <div>
      {/* 返回按钮 */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/packages')}
        style={{ marginBottom: 16 }}
      >
        返回包列表
      </Button>

      {/* 包信息卡片 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Title level={2}>{pkg.name}</Title>
            <Text type="secondary">{pkg.description}</Text>
            <Descriptions column={1} style={{ marginTop: 16 }}>
              <Descriptions.Item label="作者">{pkg.author}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(pkg.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {new Date(pkg.updatedAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={pkg.isPublic ? 'green' : 'orange'}>
                  {pkg.isPublic ? '公开' : '私有'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>
          {canEdit && (
            <Space>
              <Button 
                icon={<EditOutlined />} 
                onClick={() => handleEditPackage()}
              >
                编辑
              </Button>
              <Button 
                icon={<UploadOutlined />} 
                type="primary"
                onClick={() => setUploadModalVisible(true)}
              >
                上传新版本
              </Button>
            </Space>
          )}
        </div>
      </Card>

      {/* 版本列表 */}
      <Card title={`版本列表 (${pkg.versions?.length || 0})`}>
        <Table
          columns={versionColumns}
          dataSource={pkg.versions || []}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* 上传新版本模态框 */}
      <Modal
        title="上传新版本"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={500}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Upload.Dragger
            name="package"
            beforeUpload={(file: File) => {
              if (file.size > 50 * 1024 * 1024) {
                message.error('文件大小不能超过50MB')
                return false
              }
              handleUpload(file)
              return false // 阻止默认上传行为
            }}
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 .tgz, .tar.gz 格式文件，最大 50MB
            </p>
          </Upload.Dragger>
        </div>
      </Modal>
    </div>
  )
}

export default PackageDetail