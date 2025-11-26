import React, { useState } from 'react'
import {
  Table,
  Card,
  Input,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  message,
  Popconfirm,
  Upload,
  Typography,
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import type { Package } from '@/types'
import useAuthStore from '@/stores/authStore'

const { Title } = Typography
const { TextArea } = Input

const Packages: React.FC = () => {
  const [searchText, setSearchText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // 获取包列表
  const { data: packagesData, isLoading } = useQuery(
    ['packages', currentPage, pageSize, searchText],
    async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(searchText && { q: searchText }),
      })
      
      const response = await fetch(`/api/packages?${params}`)
      return response.json()
    },
  )

  // 删除包
  const deletePackageMutation = useMutation(
    async (packageName: string) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`/api/packages/${packageName}`, {
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
        queryClient.invalidateQueries('packages')
      },
      onError: () => {
        message.error('删除失败')
      },
    },
  )

  const columns: ColumnsType<Package> = [
    {
      title: '包名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Package) => (
        <Button
          type="link"
          onClick={() => navigate(`/packages/${record.name}`)}
          style={{ padding: 0 }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
    },
    {
      title: '最新版本',
      dataIndex: 'latestVersion',
      key: 'latestVersion',
      render: (version: string) => version && <Tag color="green">{version}</Tag>,
    },
    {
      title: '下载量',
      dataIndex: 'downloads',
      key: 'downloads',
      sorter: true,
    },
    {
      title: '状态',
      dataIndex: 'isPublic',
      key: 'isPublic',
      render: (isPublic: boolean) => (
        <Tag color={isPublic ? 'green' : 'orange'}>
          {isPublic ? '公开' : '私有'}
        </Tag>
      ),
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
      fixed: 'right',
      width: 300,
      render: (_, record: Package) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => navigate(`/packages/${record.name}/versions`)}
          >
            版本
          </Button>
          <Popconfirm
            title="确定要删除这个包吗？"
            onConfirm={() => deletePackageMutation.mutate(record.name)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={deletePackageMutation.isLoading}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg)
    form.setFieldsValue({
      name: pkg.name,
      description: pkg.description,
      isPublic: pkg.isPublic,
    })
    setIsModalVisible(true)
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      const token = useAuthStore.getState().token
      const response = await fetch(`/api/packages/${editingPackage!.name}`, {
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
      setEditingPackage(null)
      form.resetFields()
      queryClient.invalidateQueries('packages')
    } catch (error: any) {
      message.error(error.message || '更新失败')
    }
  }

  const uploadProps = {
    name: 'package',
    action: '/api/packages',
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
        queryClient.invalidateQueries('packages')
      } else if (info.file.status === 'error') {
        message.error('上传失败')
      }
    },
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>包管理</Title>
        <Upload {...uploadProps}>
          <Button type="primary" icon={<UploadOutlined />}>
            上传新包
          </Button>
        </Upload>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索包名..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={packagesData?.data?.packages || []}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: packagesData?.data?.pagination?.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page)
              setPageSize(size || 10)
            },
          }}
        />
      </Card>

      {/* 编辑模态框 */}
      <Modal
        title="编辑包"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false)
          setEditingPackage(null)
          form.resetFields()
        }}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="包名"
            name="name"
            rules={[{ required: true, message: '请输入包名' }]}
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            label="描述"
            name="description"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item
            label="可见性"
            name="isPublic"
            valuePropName="checked"
          >
            <Input placeholder="是否公开" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Packages