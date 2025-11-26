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
      } else if (info.file.status === 'error') {
        message.error('上传失败')
      }
    },
  }

  if (isLoading) {
    return <div>加载中...</div>
  }

  return (
    <div>
      {/* 返回和上传按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/packages/${name}`)}
        >
          返回包详情
        </Button>
        <Upload {...uploadProps}>
          <Button type="primary" icon={<PlusOutlined />}>
            上传新版本
          </Button>
        </Upload>
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

      {/* 编辑模态框 */}
      <Modal
        title="编辑版本"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false)
          setEditingVersion(null)
          form.resetFields()
        }}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="版本号"
            name="version"
            rules={[{ required: true, message: '请输入版本号' }]}
          >
            <Input disabled placeholder="例如: 1.0.0" />
          </Form.Item>
          <Form.Item
            label="变更日志"
            name="changelog"
            rules={[{ required: true, message: '请输入变更日志' }]}
          >
            <Input.TextArea rows={4} placeholder="描述这个版本的变更内容..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Versions