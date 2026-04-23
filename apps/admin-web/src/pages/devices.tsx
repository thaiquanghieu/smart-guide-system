import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { Ban, CheckCircle, Search, Smartphone, Trash2 } from 'lucide-react'

type Device = {
  id: number
  name?: string
  platform?: string
  model?: string
  app_version?: string
  status: string
  is_online: boolean
  last_seen?: string
  registered_at: string
  ban_reason?: string
  listen_count: number
  has_active_subscription: boolean
  subscription_expire_at?: string
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [allDevices, setAllDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [reason, setReason] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetchDevices()
    const timer = window.setInterval(() => {
      void fetchDevices(true)
    }, 4000)

    return () => window.clearInterval(timer)
  }, [filter])

  const fetchDevices = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [response, allResponse] = await Promise.all([
        apiClient.get('/admin/devices', { params: { status: filter } }),
        apiClient.get('/admin/devices', { params: { status: 'all' } }),
      ])
      setDevices(response.data)
      setAllDevices(allResponse.data)
    } catch (error: any) {
      console.error('Failed to fetch devices:', error)
      if (!silent) alert(error?.response?.data?.message || 'Không tải được danh sách thiết bị')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const updateStatus = async (deviceId: number, status: string) => {
    const bodyReason = status === 'banned' ? reason || prompt('Lý do ban thiết bị?') || '' : ''
    try {
      await apiClient.put(`/admin/devices/${deviceId}/status`, { status, reason: bodyReason })
      setReason('')
      await fetchDevices()
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Cập nhật thiết bị thất bại')
    }
  }

  const deleteDevice = async (deviceId: number) => {
    if (!confirm('Xóa hẳn thiết bị này khỏi DB? Hành động này không thể khôi phục.')) return

    try {
      await apiClient.delete(`/admin/devices/${deviceId}`)
      setDevices((prev) => prev.filter((device) => device.id !== deviceId))
      setAllDevices((prev) => prev.filter((device) => device.id !== deviceId))
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Xóa thiết bị thất bại')
    }
  }

  const statusClass = (status: string) => {
    if (status === 'active') return 'bg-green-400/10 text-green-300'
    if (status === 'banned') return 'bg-red-400/10 text-red-300'
    if (status === 'user_deleted') return 'bg-gray-400/10 text-gray-300'
    return 'bg-yellow-400/10 text-yellow-300'
  }

  const visibleDevices = devices.filter((device) => {
    const keyword = [
      device.id,
      device.name,
      device.platform,
      device.model,
      device.app_version,
      device.status,
      device.ban_reason,
    ].join(' ').toLowerCase()
    return keyword.includes(query.trim().toLowerCase())
  })

  return (
    <ProtectedRoute>
      <div className="flex bg-dark min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white">Quản lý thiết bị</h1>
              <p className="text-gray-400 mt-2">Theo dõi online/offline, gói đang dùng và xử lý ban khi cần.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <div className="rounded-2xl border border-gray-700 bg-secondary p-5">
                <p className="text-sm text-gray-400">Tổng thiết bị trong DB</p>
                <p className="mt-2 text-3xl font-bold text-white">{allDevices.length}</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                <p className="text-sm text-emerald-200">Đang truy cập web app</p>
                <p className="mt-2 text-3xl font-bold text-emerald-300">{allDevices.filter((device) => device.is_online).length}</p>
                <p className="mt-1 text-xs text-emerald-200/70">Cập nhật mỗi 4 giây</p>
              </div>
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
                <p className="text-sm text-red-200">Thiết bị bị khóa</p>
                <p className="mt-2 text-3xl font-bold text-red-300">{allDevices.filter((device) => device.status === 'banned').length}</p>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-gray-500" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-secondary py-3 pl-10 pr-4 text-white placeholder:text-gray-500"
                placeholder="Tìm theo tên máy, nền tảng, trạng thái, lý do khóa..."
              />
            </div>

            <div className="flex gap-2 flex-wrap mb-6">
              {['all', 'active', 'banned', 'user_deleted', 'inactive'].map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`px-4 py-2 rounded-lg font-semibold ${filter === item ? 'bg-danger text-white' : 'bg-secondary text-gray-300 hover:text-white'}`}
                >
                  {item === 'all' ? 'Tất cả' : item === 'active' ? 'Hoạt động' : item === 'banned' ? 'Bị khóa' : item === 'user_deleted' ? 'Khách tự xóa' : 'Không hoạt động'}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="text-gray-400">Đang tải...</p>
            ) : visibleDevices.length ? (
              <div className="bg-secondary border border-gray-700 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-700 bg-dark/40">
                      <tr>
                        <th className="text-left p-4 text-gray-300">Thiết bị</th>
                        <th className="text-left p-4 text-gray-300">Online</th>
                        <th className="text-left p-4 text-gray-300">Trạng thái</th>
                        <th className="text-left p-4 text-gray-300">Gói</th>
                        <th className="text-left p-4 text-gray-300">Lượt nghe</th>
                        <th className="text-left p-4 text-gray-300">Lần cuối</th>
                        <th className="text-right p-4 text-gray-300">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDevices.map((device) => (
                        <tr key={device.id} className="border-b border-gray-700 hover:bg-dark/30">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Smartphone className="text-primary" />
                              <div>
                                <p className="text-white font-semibold">{device.name || `Device #${device.id}`}</p>
                                <p className="text-gray-400 text-xs">{device.platform || '-'} {device.model || ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex w-3 h-3 rounded-full ${device.is_online ? 'bg-green-400' : 'bg-gray-500'}`} />
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusClass(device.status)}`}>{device.status}</span>
                            {device.ban_reason && <p className="text-red-300 text-xs mt-1">{device.ban_reason}</p>}
                          </td>
                          <td className="p-4 text-sm text-gray-300">{device.has_active_subscription ? 'Còn hạn' : 'Không có'}</td>
                          <td className="p-4 text-gray-300">{device.listen_count}</td>
                          <td className="p-4 text-gray-400 text-sm">{device.last_seen ? new Date(device.last_seen).toLocaleString('vi-VN') : '-'}</td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              {device.status !== 'banned' && (
                                <button onClick={() => updateStatus(device.id, 'banned')} className="px-3 py-2 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25">
                                  <Ban size={16} />
                                </button>
                              )}
                              {device.status !== 'active' && (
                                <button onClick={() => updateStatus(device.id, 'active')} className="px-3 py-2 rounded-lg bg-green-500/15 text-green-300 hover:bg-green-500/25">
                                  <CheckCircle size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => deleteDevice(device.id)}
                                title="Xóa hẳn khỏi DB"
                                className="px-3 py-2 rounded-lg bg-gray-500/15 text-gray-300 hover:bg-gray-500/25"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-secondary border border-gray-700 rounded-2xl p-10 text-center text-gray-400">Chưa có thiết bị.</div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
