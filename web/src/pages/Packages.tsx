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
  Switch,
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
import { useApiQuery, useApiMutationWithSuccess } from '@/hooks/useApi'
import api from '@/utils/api'

const { Title } = Typography
const { TextArea } = Input

// 从文件名提取包名（去掉扩展名）
const extractPackageNameFromFile = (filename: string): string => {
  // 移除常见的扩展名
  const nameWithoutExt = filename.replace(/\.(tgz|tar\.gz|zip)$/i, '')
  // 清理文件名，移除版本号等
  const cleanName = nameWithoutExt.replace(/[-_]\d+\.\d+\.\d+.*$/i, '').replace(/^[-_]/, '')
  return cleanName
}

const Packages: React.FC = () => {
  const [searchText, setSearchText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [uploadForm] = Form.useForm()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // 获取包列表
  const { data: packagesData, isLoading } = useApiQuery(
    ['packages', currentPage.toString(), pageSize.toString(), searchText],
    async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(searchText && { q: searchText }),
      })
      
      return api.get(`/packages?${params}`)
    },
  )

  // 删除包
  const deletePackageMutation = useApiMutationWithSuccess(
    async (packageName: string) => {
      return api.delete(`/packages/${packageName}`)
    },
    '删除成功',
    {
      onSuccess: () => {
        queryClient.invalidateQueries('packages')
      },
    }
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

  // 更新包
  const updatePackageMutation = useApiMutationWithSuccess(
    async (data: { packageName: string; values: any }) => {
      return api.put(`/packages/${data.packageName}`, data.values)
    },
    '更新成功',
    {
      onSuccess: () => {
        setIsModalVisible(false)
        setEditingPackage(null)
        form.resetFields()
        queryClient.invalidateQueries('packages')
      },
    }
  )

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      updatePackageMutation.mutate({
        packageName: editingPackage!.name,
        values
      })
    } catch (error: any) {
      message.error(error.message || '更新失败')
    }
  }

  // 自定义上传函数
  const handleUpload = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      message.error('文件大小不能超过50MB')
      return false
    }

    // 创建FormData对象
    const formData = new FormData()
    
    // 从文件名中提取包名（去掉.tgz扩展名）
    const fileName = file.name.replace(/\.tgz$|\.tar\.gz$/, '')
    const packageName = fileName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    
    formData.append('name', packageName)
    formData.append('description', `${packageName} - Piral微前端组件`)
    formData.append('isPublic', 'true')
    formData.append('package', file)

    try {
      const token = useAuthStore.getState().token
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '上传失败')
      }

      message.success('上传成功')
      queryClient.invalidateQueries('packages')
      return true
    } catch (error: any) {
      message.error(error.message || '上传失败')
      return false
    }
  }

  // 处理上传表单提交
  const handleUploadSubmit = async () => {
    try {
      const values = await uploadForm.validateFields()
      
      if (!values.package || !values.package.fileList || values.package.fileList.length === 0) {
        message.error('请选择要上传的文件')
        return
      }

      const file = values.package.fileList[0].originFileObj
      
      if (file.size > 50 * 1024 * 1024) {
        message.error('文件大小不能超过50MB')
        return
      }

      // 如果没有手动输入包名，从文件名中提取（用于非 CLI 上传）
      const packageName = values.name || extractPackageNameFromFile(file.name)

      // 创建FormData对象
      const formData = new FormData()
      formData.append('name', packageName)
      formData.append('description', values.description)
      formData.append('isPublic', values.isPublic ? 'true' : 'false')
      formData.append('package', file)

      try {
        const token = useAuthStore.getState().token
        const response = await fetch('/api/packages', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '上传失败')
        }

        message.success('上传成功')
        setUploadModalVisible(false)
        uploadForm.resetFields()
        queryClient.invalidateQueries('packages')
        // Also invalidate dashboard stats to update totals
        queryClient.invalidateQueries('dashboard-stats')
        queryClient.invalidateQueries('popular-packages')
        queryClient.invalidateQueries('recent-packages')
      } catch (error: any) {
        message.error(error.message || '上传失败')
      }
    } catch (error) {
      console.error('表单验证失败:', error)
    }
  }

  const uploadProps = {
    name: 'package',
    beforeUpload: () => false, // 阻止自动上传
    maxCount: 1,
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>包管理</Title>
        <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalVisible(true)}>
          上传新包
        </Button>
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
            <Switch checkedChildren="公开" unCheckedChildren="私有" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 上传新包模态框 */}
      <Modal
        title="上传新包"
        open={uploadModalVisible}
        onOk={handleUploadSubmit}
        onCancel={() => {
          setUploadModalVisible(false)
          uploadForm.resetFields()
        }}
        okText="上传"
        cancelText="取消"
        width={600}
      >
        <Form 
          form={uploadForm} 
          layout="vertical"
          initialValues={{
            isPublic: true,
            description: '',
          }}
        >
          <Form.Item
            label="选择文件"
            name="package"
            rules={[
              { required: true, message: '请选择要上传的文件' }
            ]}
            extra="仅支持 .tgz 或 .tar.gz 格式的文件，最大50MB"
          >
            <Upload 
              {...uploadProps}
              accept=".tgz,.tar.gz"
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>
          
          <Form.Item
            label="包名"
            name="name"
            rules={[
              { pattern: /^[a-z0-9._-]+$/, message: '包名只能包含小写字母、数字、点、连字符和下划线' },
              { min: 3, max: 50, message: '包名长度应在3-50个字符之间' }
            ]}
            extra="留空将自动从文件中提取包名（推荐使用CLI上传以保证准确性）"
          >
            <Input placeholder="留空自动提取，或手动输入: my-awesome-pilet" />
          </Form.Item>
          
          <Form.Item
            label="描述"
            name="description"
            rules={[
              { required: true, message: '请输入包描述' },
              { min: 10, max: 200, message: '描述长度应在10-200个字符之间' }
            ]}
          >
            <TextArea 
              rows={3} 
              placeholder="请描述这个包的功能和用途..." 
            />
          </Form.Item>
          
          <Form.Item
            label="可见性"
            name="isPublic"
            valuePropName="checked"
          >
            <Switch checkedChildren="公开" unCheckedChildren="私有" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Packages