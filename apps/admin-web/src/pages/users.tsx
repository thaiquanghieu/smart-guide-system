import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { Ban, Search, Trash2, Store, QrCode } from 'lucide-react'

interface User {
  id: number
  userName: string
  email: string
  role: string
  isActive: boolean
  account_status: string
  poi_count: number
  pending_poi_count: number
  listen_count: number
  createdAt: string
}

export default function Users() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'admin' | 'owner'>('all')
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectedUser, setSelectedUser] = useState<any | null>(null)

  useEffect(() => {
    if (!router.isReady) return
    const roleQuery = typeof router.query.role === 'string' ? router.query.role : ''
    const qQuery = typeof router.query.q === 'string' ? router.query.q : ''
    if (roleQuery === 'admin' || roleQuery === 'owner' || roleQuery === 'all') setFilter(roleQuery)
    if (qQuery) setQuery(qQuery)
    void fetchUsers()
  }, [router.isReady])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/admin/users', { params: { q: query } })
      setUsers(response.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchUsers()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query])

  const openDetail = async (userId: number) => {
    const response = await apiClient.get(`/admin/users/${userId}/detail`)
    setSelectedUser(response.data)
  }

  const updateStatus = async (userId: number, status: 'active' | 'paused' | 'banned' | 'canceled') => {
    await apiClient.put(`/admin/users/${userId}/status`, { status })
    setUsers((prev) => prev.map((user) => (
      user.id === userId
        ? { ...user, account_status: status, isActive: !['banned', 'canceled'].includes(status) }
        : user
    )))
    if (selectedUser?.id === userId) {
      setSelectedUser((prev: any) => ({ ...prev, account_status: status, isActive: !['banned', 'canceled'].includes(status) }))
    }
  }

  const bulkCancel = async () => {
    if (!selectedIds.length) return
    if (!confirm(`Cập nhật ${selectedIds.length} tài khoản sang đã hủy?`)) return
    for (const id of selectedIds) {
      await apiClient.put(`/admin/users/${id}/status`, { status: 'canceled' })
    }
    setUsers((prev) => prev.map((user) => selectedIds.includes(user.id) ? { ...user, account_status: 'canceled', isActive: false } : user))
    setSelectedIds([])
  }

  const filteredUsers = (filter === 'all' ? users : users.filter((user) => user.role === filter))

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-dark">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl">
            <h1 className="mb-6 text-3xl font-bold text-white">Quản lý tài khoản</h1>

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
              {selectedIds.length > 0 && (
                <button onClick={bulkCancel} className="rounded-xl bg-red-500/20 px-4 py-3 font-semibold text-red-300 hover:bg-red-500/30">
                  Hủy {selectedIds.length} tài khoản
                </button>
              )}
            </div>

            <div className="mb-6 flex gap-2">
              {(['all', 'admin', 'owner'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-lg px-4 py-2 font-semibold ${filter === item ? 'bg-danger text-white' : 'bg-secondary text-gray-300 hover:text-white'}`}
                >
                  {item === 'all' ? 'Tất cả' : item === 'admin' ? 'Admin' : 'Chủ gian hàng'}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-700 bg-secondary">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-700 bg-dark/30">
                    <tr>
                      <th className="p-4" />
                      <th className="p-4 text-left text-sm text-gray-300">Tên</th>
                      <th className="p-4 text-left text-sm text-gray-300">Email</th>
                      <th className="p-4 text-left text-sm text-gray-300">Vai trò</th>
                      <th className="p-4 text-left text-sm text-gray-300">Trạng thái</th>
                      <th className="p-4 text-left text-sm text-gray-300">POI</th>
                      <th className="p-4 text-left text-sm text-gray-300">Lượt nghe</th>
                      <th className="p-4 text-right text-sm text-gray-300">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td className="p-6 text-gray-400" colSpan={8}>Đang tải...</td></tr>
                    ) : filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-700 hover:bg-dark/20">
                        <td className="p-4 align-top">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(user.id)}
                            onChange={(event) => setSelectedIds((prev) => event.target.checked ? [...prev, user.id] : prev.filter((item) => item !== user.id))}
                            className="mt-1 h-4 w-4 rounded border-gray-600 bg-dark text-danger"
                          />
                        </td>
                        <td className="p-4 text-white cursor-pointer" onClick={() => void openDetail(user.id)}>{user.userName}</td>
                        <td className="p-4 text-sm text-gray-400 cursor-pointer" onClick={() => void openDetail(user.id)}>{user.email}</td>
                        <td className="p-4 text-sm text-gray-300 cursor-pointer" onClick={() => void openDetail(user.id)}>{user.role === 'owner' ? 'Chủ gian hàng' : 'Quản trị viên'}</td>
                        <td className="p-4">
                          <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(user.account_status)}`}>
                            {statusLabel(user.account_status)}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-300 cursor-pointer" onClick={() => void openDetail(user.id)}>{user.poi_count} ({user.pending_poi_count} chờ duyệt)</td>
                        <td className="p-4 text-sm text-gray-300 cursor-pointer" onClick={() => void openDetail(user.id)}>{user.listen_count}</td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            {user.account_status !== 'active' && <button onClick={() => void updateStatus(user.id, 'active')} className="rounded-lg bg-green-500/15 px-3 py-2 text-green-300 hover:bg-green-500/25">Mở</button>}
                            {user.account_status !== 'paused' && <button onClick={() => void updateStatus(user.id, 'paused')} className="rounded-lg bg-yellow-500/15 px-3 py-2 text-yellow-200 hover:bg-yellow-500/25">Tạm nghỉ</button>}
                            {user.account_status !== 'banned' && <button onClick={() => void updateStatus(user.id, 'banned')} className="rounded-lg bg-red-500/15 px-3 py-2 text-red-300 hover:bg-red-500/25"><Ban size={16} /></button>}
                            <button onClick={() => void updateStatus(user.id, 'canceled')} className="rounded-lg bg-red-500/15 px-3 py-2 text-red-300 hover:bg-red-500/25"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedUser(null)}>
          <div className="w-full max-w-3xl rounded-2xl border border-gray-700 bg-secondary p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedUser.userName}</h2>
                <p className="text-gray-400">{selectedUser.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="rounded-lg bg-dark px-4 py-2 text-white">Đóng</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Info label="Vai trò" value={selectedUser.role === 'owner' ? 'Chủ gian hàng' : 'Quản trị viên'} />
              <Info label="Trạng thái" value={statusLabel(selectedUser.account_status)} />
              <Info label="Số POI" value={String(selectedUser.poi_count)} />
              <Info label="POI chờ duyệt" value={String(selectedUser.pending_poi_count)} />
              <Info label="Tổng lượt nghe" value={String(selectedUser.total_listens)} />
              <Info label="Số yêu thích" value={String(selectedUser.favorite_count)} />
              <Info label="Số QR" value={String(selectedUser.qr_count)} />
              <Info label="Lần đăng nhập cuối" value={selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString('vi-VN') : '-'} />
            </div>
            {selectedUser.role === 'owner' && (
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setSelectedUser(null)
                    void router.push(`/pois?ownerId=${selectedUser.id}&q=${encodeURIComponent(selectedUser.userName)}`)
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white"
                >
                  <Store size={18} />
                  Xem tất cả POI
                </button>
                <button
                  onClick={() => {
                    setSelectedUser(null)
                    void router.push(`/qr?q=${encodeURIComponent(selectedUser.userName)}`)
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-dark px-4 py-3 font-semibold text-white"
                >
                  <QrCode size={18} />
                  Xem QR của seller
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}

function badgeClass(status: string) {
  if (status === 'paused') return 'bg-yellow-500/15 text-yellow-200'
  if (status === 'banned') return 'bg-red-500/15 text-red-200'
  if (status === 'canceled') return 'bg-gray-500/15 text-gray-300'
  return 'bg-green-500/15 text-green-200'
}

function statusLabel(status: string) {
  if (status === 'paused') return 'Tạm nghỉ'
  if (status === 'banned') return 'Bị khóa'
  if (status === 'canceled') return 'Đã hủy'
  return 'Hoạt động'
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-dark/40 p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-white">{value}</p>
    </div>
  )
}
