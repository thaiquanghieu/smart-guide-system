import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { Ban, Trash2, Shield } from 'lucide-react'

interface User {
  id: number
  userName: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'user' | 'owner'>('all')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/admin/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (userId: number) => {
    try {
      await apiClient.put(`/admin/users/${userId}/toggle-active`)
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
      )
    } catch (error) {
      console.error('Failed to toggle user:', error)
      alert('Cập nhật trạng thái thất bại')
    }
  }

  const handleDelete = async (userId: number) => {
    if (!confirm('Xóa user này?')) return

    try {
      await apiClient.delete(`/admin/users/${userId}`)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert('Xóa user thất bại')
    }
  }

  const filteredUsers = filter === 'all' ? users : users.filter((u) => u.role === filter)

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-danger bg-danger/10'
      case 'owner':
        return 'text-primary bg-primary/10'
      default:
        return 'text-accent bg-accent/10'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Chủ gian hàng'
      case 'admin':
        return 'Quản trị viên'
      default:
        return 'Người dùng'
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex bg-dark min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl">
            <h1 className="text-3xl font-bold text-white mb-6">Quản lý Người dùng</h1>

            {/* Filter */}
            <div className="flex gap-2 mb-6">
              {(['all', 'user', 'owner'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    filter === f
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-gray-300 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'Tất cả' : f === 'user' ? 'User' : 'Chủ gian hàng'}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin">⏳</div>
              </div>
            ) : (
              <div className="bg-secondary border border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/50 border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                          Tên
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                          Email
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                          Vai trò
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                          Trạng thái
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-gray-700 hover:bg-dark/50 transition"
                        >
                          <td className="px-6 py-4 text-white">{user.userName}</td>
                          <td className="px-6 py-4 text-gray-400 text-sm">{user.email}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>
                              {getRoleLabel(user.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                user.isActive
                                  ? 'text-success bg-success/10'
                                  : 'text-warning bg-warning/10'
                              }`}
                            >
                              {user.isActive ? 'Hoạt động' : 'Tạm dừng'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleToggleActive(user.id)}
                                className="flex items-center gap-1 px-2 py-1 bg-warning/20 text-warning hover:bg-warning/30 rounded text-sm transition"
                              >
                                <Ban size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="flex items-center gap-1 px-2 py-1 bg-danger/20 text-danger hover:bg-danger/30 rounded text-sm transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
