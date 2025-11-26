import React, { useState } from 'react'
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
  Select,
  message,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import type { ColumnsType } from 'antd/es/table'
import type { User } from '@/types'
import useAuthStore from '@/stores/authStore'

const { Option } = Select
const { Title } = Typography

const Users: React.FC = () => {
  const [searchText, setSearchText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // 获取用户列表
  const { data: usersData, isLoading } = useQuery(
    ['users', currentPage, pageSize, searchText],
    async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      })
      
      const token = useAuthStore.getState().token
      const response = await fetch(`/api/auth/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      return response.json()
    },
  )

  // 更新用户角色
  const updateRoleMutation = useMutation(
    async ({ userId, role }: { userId: string; role: string }) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`/api/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      })
      
      if (!response.ok) {
        throw new Error('更新失败')
      }
      
      return response.json()
    },
    {
      onSuccess: () => {
        message.success('角色更新成功')
        queryClient.invalidateQueries('users')
      },
      onError: () => {
        message.error('角色更新失败')
      },
    },
  )

  // 删除用户
  const deleteUserMutation = useMutation(
    async (userId: string) => {
      const token = useAuthStore.getState().token
      const response = await fetch(`/api/auth/users/${userId}`, {
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
        queryClient.invalidateQueries('users')
      },
      onError: () => {
        message.error('删除失败')
      },
    },
  )

  const columns: ColumnsType<User> = [
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? '管理员' : '普通用户'}
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
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: User) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<LockOutlined />}
            onClick={() => {
              Modal.confirm({
                title: '重置密码',
                content: '确定要重置该用户的密码吗？新密码将发送到用户邮箱。',
                onOk: async () => {
                  message.info('重置密码功能待实现')
                },
              })
            }}
          >
            重置密码
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => deleteUserMutation.mutate(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={deleteUserMutation.isLoading}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole })
  }

  return (
    <div>
      <Title level={2}>用户管理</Title>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索用户..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={usersData?.data?.users || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: usersData?.data?.pagination?.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page)
              setPageSize(size || 10)
            },
          }}
          expandable={{
            expandedRowRender: (record: User) => (
              <div style={{ padding: '16px' }}>
                <p><strong>用户ID:</strong> {record.id}</p>
                <p><strong>创建时间:</strong> {new Date(record.createdAt).toLocaleString()}</p>
                <p><strong>最后更新:</strong> {new Date(record.updatedAt).toLocaleString()}</p>
                <div style={{ marginTop: 16 }}>
                  <span><strong>角色变更:</strong></span>
                  <Select
                    defaultValue={record.role}
                    style={{ width: 120, marginLeft: 8 }}
                    onChange={(value) => handleRoleChange(record.id, value)}
                  >
                    <Option value="user">普通用户</Option>
                    <Option value="admin">管理员</Option>
                  </Select>
                </div>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  )
}

export default Users