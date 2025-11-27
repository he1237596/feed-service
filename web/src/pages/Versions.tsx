import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Table,
  Card,
  Typography,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  message,
  Upload,
  Popconfirm,
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import type { ColumnsType } from 'antd/es/table'
import type { Version } from '@/types'
import useAuthStore from '@/stores/authStore'

const { Title } = Typography

const Versions: React.FC = () => {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingVersion, setEditingVersion] = useState<Version | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

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

  // 处理编辑包
  const handleEditPackage = () => {
    if (!packageData?.data) return
    
    Modal.confirm({
      title: '编辑包信息',
      content: (
        <div>
          <p><strong>包名:</strong> {packageData.data.name}</p>
          <p><strong>描述:</strong></p>
          <Input.TextArea 
            id="package-description"
            defaultValue={packageData.data.description || ''}
            placeholder="请输入包描述"
            rows={3}
            style={{ marginBottom: 16 }}
          />
          <div>
            <strong>公开状态:</strong>
            <Switch 
              id="package-public"
              defaultChecked={packageData.data.isPublic}
              style={{ marginLeft: 8 }}
            />
          </div>
        </div>
      ),
      width: 500,
      onOk: () => {
        const description = (document.getElementById('package-description') as HTMLTextAreaElement).value
        const isPublic = (document.getElementById('package-public') as any).checked
        
        updatePackageMutation.mutate({
          name: packageData.data.name,
          description,
          isPublic
        })
      },
    })
  }

  // 获取包信息
  const { data: packageData } = useQuery(
    ['package', name],
    async () => {
      const response = await fetch(`/api/packages/${name}`)
      if (!response.ok) {
        throw new Error('包不存在')
      }
      return response.json()
    },
    {
      enabled: !!name,
    },
  )

  // 获取版本列表
  const { data: versionsData, isLoading } = useQuery(
    ['versions', name],
    async () => {
      const response = await fetch(`/api/versions/${name}`)
      if (!response.ok) {
        throw new Error('获取版本列表失败')
      }
      return response.json()
    },
    {
      enabled: !!name,
    },
  )

  // 删除版本
  const deleteVersionMutation = useMutation(
    async (version: string) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`/api/versions/${name}/${version}`, {
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
        message.success('删除成功')
        queryClient.invalidateQueries(['versions', name])
      },
      onError: () => {
        message.error('删除失败')
      },
    },
  )

  // 设置为最新版本
  const setLatestMutation = useMutation(
    async (version: string) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`/api/versions/${name}/${version}/latest`, {
        method: 'POST',
        headers: {
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
        message.success('设置成功')
        queryClient.invalidateQueries(['versions', name])
      },
      onError: () => {
        message.error('设置失败')
      },
    },
  )

  const columns: ColumnsType<Version> = [
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      render: (version: string, record: Version) => (
        <Space>
          <strong>{version}</strong>
          {record.isLatest && <Tag color="green">最新</Tag>}
          {record.isDeprecated && <Tag color="red">已废弃</Tag>}
        </Space>
      ),
    },
    {
      title: '变更日志',
      dataIndex: 'changelog',
      key: 'changelog',
      ellipsis: true,
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
      render: (_, record: Version) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<DownloadOutlined />}
            href={`/api/versions/${name}/${record.version}/download`}
            target="_blank"
          >
            下载
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {!record.isLatest && (
            <Button
              type="link"
              onClick={() => setLatestMutation.mutate(record.version)}
              loading={setLatestMutation.isLoading}
            >
              设为最新
            </Button>
          )}
          <Popconfirm
            title="确定要删除这个版本吗？"
            onConfirm={() => deleteVersionMutation.mutate(record.version)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={deleteVersionMutation.isLoading}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const handleEdit = (version: Version) => {
    setEditingVersion(version)
    form.setFieldsValue({
      version: version.version,
      changelog: version.changelog,
      isDeprecated: version.isDeprecated,
    })
    setIsModalVisible(true)
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      const token = useAuthStore.getState().token
      const response = await fetch(`/api/versions/${name}/${editingVersion!.version}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        throw new Error('更新失败')
      }

      message.success('更新成功')
      setIsModalVisible(false)
      setEditingVersion(null)
      form.resetFields()
      queryClient.invalidateQueries(['versions', name])
    } catch (error: any) {
      message.error(error.message || '更新失败')
    }
  }

  const uploadProps = {
    name: 'package',
    action: `/api/versions/${name}`,
    headers: {
      authorization: `Bearer ${useAuthStore.getState().token}`,
    },
    beforeUpload: (file: File) => {
      if (file.size > 50 * 1024 * 1024) {
        message.error('文件大小不能超过50MB')
        return false
      }
      return true
    },
    onChange: (info: any) => {
      if (info.file.status === 'done') {
        message.success('上传成功')
        queryClient.invalidateQueries(['versions', name])
        // Also invalidate related queries
        queryClient.invalidateQueries('dashboard-stats')
        queryClient.invalidateQueries('popular-packages')
        queryClient.invalidateQueries('packages')
        // Close modal on success
        setIsModalVisible(false)
      } else if (info.file.status === 'error') {
        message.error('上传失败')
      }
    },
  }

  if (isLoading) {
    return <div>加载中...</div>
  }

  const user = useAuthStore.getState().user
  const isAdmin = user?.role === 'admin'
  const isOwner = packageData?.data?.authorId === user?.id

  return (
    <div>
      {/* 包信息卡片 */}
      {packageData?.data && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Title level={3}>{packageData.data.name}</Title>
              <p>{packageData.data.description}</p>
              <p>作者: {packageData.data.author}</p>
            </div>
            {(isAdmin || isOwner) && (
              <Space>
                <Button 
                  icon={<EditOutlined />}
                  onClick={() => handleEditPackage()}
                >
                  编辑
                </Button>
                <Button 
                  icon={<UploadOutlined />}
                  onClick={() => setIsModalVisible(true)}
                >
                  上传新版本
                </Button>
              </Space>
            )}
          </div>
        </Card>
      )}

      {/* 返回按钮 */}
      <div style={{ marginBottom: 16 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/packages/${name}`)}
        >
          返回包列表
        </Button>
      </div>

      {/* 版本列表 */}
      <Card title={`版本管理 - ${name}`}>
        <Table
          columns={columns}
          dataSource={versionsData?.data?.versions || []}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
        />
      </Card>

      {/* 上传新版本模态框 */}
      <Modal
        title="上传新版本"
        open={isModalVisible}
        onOk={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
        okText="取消"
        cancelText="关闭"
        width={600}
        footer={null}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Upload {...uploadProps}>
            <Button type="primary" size="large" icon={<UploadOutlined />}>
              选择文件上传
            </Button>
          </Upload>
          <p style={{ marginTop: 16, color: '#666' }}>
            支持 .tgz, .tar.gz 格式文件，最大 50MB
          </p>
        </div>
      </Modal>
    </div>
  )
}

export default Versions