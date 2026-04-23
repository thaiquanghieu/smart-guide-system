import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { Ban, Search, Trash2 } from 'lucide-react'

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
  const [filter, setFilter] = useState<'all' | 'admin' | 'owner'>('all')
  const [query, setQuery] = useState('')

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
      const target = users.find((u) => u.id === userId)
      const action = target?.isActive ? 'khóa' : 'mở khóa'
      if (!confirm(`Bạn chắc chắn muốn ${action} tài khoản "${target?.userName || userId}"?`)) return
      await apiClient.put(`/admin/users/${userId}/status`, { isActive: !target?.isActive })
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: !u.isActive } : u)))
    } catch (error: any) {
      console.error('Failed to toggle account:', error)
      alert(error?.response?.data?.message || error?.response?.data?.detail || 'Cập nhật trạng thái thất bại')
    }
  }

  const handleDelete = async (userId: number) => {
    if (!confirm('Xóa tài khoản này?')) return

    try {
      await apiClient.delete(`/admin/users/${userId}`)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (error) {
      console.error('Failed to delete account:', error)
      alert('Xóa tài khoản thất bại')
    }
  }

  const filteredUsers = (filter === 'all' ? users : users.filter((u) => u.role === filter)).filter((user) => {
    const keyword = `${user.userName || ''} ${user.email || ''} ${user.role || ''}`.toLowerCase()
    return keyword.includes(query.trim().toLowerCase())
  })

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
        return 'Tài khoản'
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex bg-dark min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl">
            <h1 className="text-3xl font-bold text-white mb-6">Quản lý tài khoản</h1>

            {/* Filter */}
            <div className="mb-6 grid gap-3 md:grid-cols-[1fr,auto]">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-secondary py-3 pl-10 pr-4 text-white placeholder:text-gray-500"
                  placeholder="Tìm theo tên, email hoặc vai trò..."
                />
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              {(['all', 'admin', 'owner'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    filter === f
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-gray-300 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'Tất cả' : f === 'admin' ? 'Admin' : 'Chủ gian hàng'}
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
                              className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition ${
                                user.isActive
                                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                  : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                              }`}
                            >
                              <Ban size={14} />
                              {user.isActive ? 'Khóa' : 'Mở khóa'}
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
