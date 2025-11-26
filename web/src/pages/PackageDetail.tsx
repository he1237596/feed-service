import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Typography, Tag, Button, Space, Table, message, Descriptions } from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
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
      },
      onError: () => {
        message.error('版本删除失败')
      },
    },
  )

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
      ),
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
          <Space>
            <Button icon={<EditOutlined />}>编辑</Button>
            <Button icon={<UploadOutlined />} type="primary">
              上传新版本
            </Button>
          </Space>
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
    </div>
  )
}

export default PackageDetail