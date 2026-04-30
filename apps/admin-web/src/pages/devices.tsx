import { useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { Ban, CheckCircle2, CheckSquare2, EyeOff, Search, Smartphone, Trash2, X } from 'lucide-react'

type Device = {
  id: number
  device_uuid?: string
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

type DeviceDetail = {
  id: number
  device_uuid?: string
  name?: string
  platform?: string
  model?: string
  app_version?: string
  status: string
  isActive: boolean
  lastSeen?: string
  registeredAt: string
  deletedAt?: string
  bannedAt?: string
  banReason?: string
  favorite_count: number
  listen_count: number
  heard_poi_count: number
  subscription_expire_at?: string
  latest_history: Array<{ poiId: string; listenedAt: string; durationSeconds: number }>
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [allDevices, setAllDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [revealedIds, setRevealedIds] = useState<number[]>([])
  const [selectedDevice, setSelectedDevice] = useState<DeviceDetail | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)

  useEffect(() => {
    void fetchDevices()
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
      if (!silent) alert(error?.response?.data?.message || 'Không tải được danh sách thiết bị')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const visibleDevices = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return devices.filter((device) =>
      [
        device.id,
        device.device_uuid,
        device.name,
        device.platform,
        device.model,
        device.app_version,
        device.status,
        device.ban_reason,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
  }, [devices, query])

  const openDetail = async (deviceId: number) => {
    const response = await apiClient.get(`/admin/devices/${deviceId}/detail`)
    setSelectedDevice(response.data)
  }

  const updateStatus = async (deviceId: number, status: string) => {
    const bodyReason = status === 'banned' ? window.prompt('Lý do chặn thiết bị?', '') || '' : ''
    try {
      await apiClient.put(`/admin/devices/${deviceId}/status`, { status, reason: bodyReason })
      await fetchDevices(true)
      if (selectedDevice?.id === deviceId) {
        const detail = await apiClient.get(`/admin/devices/${deviceId}/detail`)
        setSelectedDevice(detail.data)
      }
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Cập nhật thiết bị thất bại')
    }
  }

  const deleteDevice = async (deviceId: number) => {
    if (!confirm('Xóa hẳn thiết bị này khỏi DB?')) return
    try {
      await apiClient.delete(`/admin/devices/${deviceId}`)
      setSelectedIds((prev) => prev.filter((id) => id !== deviceId))
      setSelectedDevice((current) => (current?.id === deviceId ? null : current))
      await fetchDevices(true)
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Xóa thiết bị thất bại')
    }
  }

  const bulkUpdateStatus = async (status: 'active' | 'banned') => {
    if (!selectedIds.length) return
    const reason = status === 'banned' ? window.prompt('Lý do chặn các thiết bị đã chọn?', '') || '' : ''
    for (const id of selectedIds) {
      await apiClient.put(`/admin/devices/${id}/status`, { status, reason })
    }
    setSelectedIds([])
    await fetchDevices(true)
  }

  const bulkDelete = async () => {
    if (!selectedIds.length || !confirm(`Xóa hẳn ${selectedIds.length} thiết bị đã chọn?`)) return
    for (const id of selectedIds) {
      await apiClient.delete(`/admin/devices/${id}`)
    }
    setSelectedIds([])
    await fetchDevices(true)
  }

  const toggleSelected = (deviceId: number) => {
    setSelectedIds((prev) => (prev.includes(deviceId) ? prev.filter((id) => id !== deviceId) : [...prev, deviceId]))
  }

  const statusClass = (status: string) => {
    if (status === 'active') return 'bg-green-400/10 text-green-300'
    if (status === 'banned') return 'bg-red-400/10 text-red-300'
    if (status === 'user_deleted') return 'bg-gray-400/10 text-gray-300'
    return 'bg-yellow-400/10 text-yellow-300'
  }

  const statusLabel = (status: string) => {
    if (status === 'active') return 'Hoạt động'
    if (status === 'banned') return 'Bị chặn'
    if (status === 'user_deleted') return 'Khách tự xóa'
    return 'Không hoạt động'
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-dark">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-white">Quản lý thiết bị</h1>
              <p className="mt-2 text-gray-400">Theo dõi thiết bị đang truy cập, chặn hoặc xóa hẳn khi cần.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard label="Tổng thiết bị" value={allDevices.length} />
              <SummaryCard label="Thiết bị đang truy cập" value={allDevices.filter((device) => device.is_online).length} accent="emerald" note="Cập nhật mỗi 4 giây" />
              <SummaryCard label="Thiết bị bị chặn" value={allDevices.filter((device) => device.status === 'banned').length} accent="red" />
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr,auto]">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-secondary py-3 pl-10 pr-4 text-white placeholder:text-gray-500"
                  placeholder="Tìm theo tên máy, nền tảng, trạng thái, lý do chặn..."
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectionMode((value) => !value)
                    setSelectedIds([])
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 font-semibold ${selectionMode ? 'bg-primary text-white' : 'bg-secondary text-gray-200 hover:text-white'}`}
                >
                  {selectionMode ? <X size={16} /> : <CheckSquare2 size={16} />}
                  {selectionMode ? 'Thoát chọn' : 'Select'}
                </button>
              {selectedIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void bulkUpdateStatus('active')} className="rounded-xl bg-green-500/15 px-4 py-3 font-semibold text-green-300 hover:bg-green-500/25">
                    Mở {selectedIds.length} mục
                  </button>
                  <button onClick={() => void bulkUpdateStatus('banned')} className="rounded-xl bg-red-500/15 px-4 py-3 font-semibold text-red-300 hover:bg-red-500/25">
                    Chặn {selectedIds.length} mục
                  </button>
                  <button onClick={() => void bulkDelete()} className="rounded-xl bg-gray-500/15 px-4 py-3 font-semibold text-gray-200 hover:bg-gray-500/25">
                    Xóa {selectedIds.length} mục
                  </button>
                </div>
              )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {['all', 'active', 'banned', 'user_deleted', 'inactive'].map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-lg px-4 py-2 font-semibold ${filter === item ? 'bg-danger text-white' : 'bg-secondary text-gray-300 hover:text-white'}`}
                >
                  {item === 'all' ? 'Tất cả' : item === 'active' ? 'Hoạt động' : item === 'banned' ? 'Bị chặn' : item === 'user_deleted' ? 'Khách tự xóa' : 'Không hoạt động'}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-700 bg-secondary">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-700 bg-dark/40">
                    <tr>
                      <th className="p-4" />
                      <th className="p-4 text-left text-sm text-gray-300">Thiết bị</th>
                      <th className="p-4 text-left text-sm text-gray-300">Truy cập</th>
                      <th className="p-4 text-left text-sm text-gray-300">Trạng thái</th>
                      <th className="p-4 text-left text-sm text-gray-300">Gói</th>
                      <th className="p-4 text-left text-sm text-gray-300">Lượt nghe</th>
                      <th className="p-4 text-left text-sm text-gray-300">Lần cuối</th>
                      <th className="p-4 text-right text-sm text-gray-300">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={8} className="p-6 text-gray-400">Đang tải...</td></tr>
                    ) : visibleDevices.length ? (
                      visibleDevices.map((device) => {
                        const showId = revealedIds.includes(device.id)
                        return (
                          <tr
                            key={device.id}
                            className={`border-b border-gray-700 hover:bg-dark/20 ${selectedIds.includes(device.id) ? 'bg-primary/10 ring-1 ring-inset ring-primary/40' : ''} ${selectionMode ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                              if (selectionMode) {
                                toggleSelected(device.id)
                              } else {
                                void openDetail(device.id)
                              }
                            }}
                          >
                            <td className="p-4 align-top" />
                            <td className="p-4">
                              <div className="flex items-start gap-3">
                                <Smartphone className="mt-0.5 text-primary" size={20} />
                                <div>
                                  <p
                                    className="max-w-[360px] truncate font-semibold text-white"
                                    title={device.name || `Device #${device.id}`}
                                  >
                                    {device.name || `Device #${device.id}`}
                                  </p>
                                  <p className="text-xs text-gray-400">{device.platform || '-'} {device.model || ''}</p>
                                  <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                                    <span>ID: {showId ? (device.device_uuid || `#${device.id}`) : '••••••••••••••••'}</span>
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setRevealedIds((prev) => showId ? prev.filter((id) => id !== device.id) : [...prev, device.id])
                                      }}
                                      className="text-gray-400 hover:text-white"
                                    >
                                      {showId ? <EyeOff size={14} /> : <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">ID</span>}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex h-3 w-3 rounded-full ${device.is_online ? 'bg-green-400' : 'bg-gray-500'}`} />
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusClass(device.status)}`}
                                title={statusLabel(device.status)}
                              >
                                {statusLabel(device.status)}
                              </span>
                              {device.ban_reason ? <p className="mt-1 text-xs text-red-300">{device.ban_reason}</p> : null}
                            </td>
                            <td className="p-4 text-sm text-gray-300">{device.has_active_subscription ? 'Còn hạn' : 'Không có'}</td>
                            <td className="p-4 text-sm text-gray-300">{device.listen_count}</td>
                            <td className="p-4 text-sm text-gray-400">{device.last_seen ? new Date(device.last_seen).toLocaleString('vi-VN') : '-'}</td>
                            <td className="p-4">
                              <div className="flex justify-end gap-2">
                                {device.status !== 'active' && <button onClick={(event) => { event.stopPropagation(); void updateStatus(device.id, 'active') }} className="rounded-lg bg-green-500/15 px-3 py-2 text-green-300 hover:bg-green-500/25"><CheckCircle2 size={16} /></button>}
                                {device.status !== 'banned' && <button onClick={(event) => { event.stopPropagation(); void updateStatus(device.id, 'banned') }} className="rounded-lg bg-red-500/15 px-3 py-2 text-red-300 hover:bg-red-500/25"><Ban size={16} /></button>}
                                <button onClick={(event) => { event.stopPropagation(); void deleteDevice(device.id) }} className="rounded-lg bg-gray-500/15 px-3 py-2 text-gray-300 hover:bg-gray-500/25"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr><td colSpan={8} className="p-10 text-center text-gray-400">Chưa có thiết bị.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedDevice(null)}>
          <div className="w-full max-w-3xl max-h-[82vh] overflow-y-auto rounded-2xl border border-gray-700 bg-secondary p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedDevice.name || `Device #${selectedDevice.id}`}</h2>
                <p className="text-gray-400">{selectedDevice.platform || '-'} {selectedDevice.model || ''}</p>
              </div>
              <button onClick={() => setSelectedDevice(null)} className="rounded-lg bg-dark px-4 py-2 text-white">Đóng</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Info label="ID thiết bị" value={selectedDevice.device_uuid || `#${selectedDevice.id}`} mono />
              <Info label="Trạng thái" value={statusLabel(selectedDevice.status)} />
              <Info label="App version" value={selectedDevice.app_version || '-'} />
              <Info label="Đăng ký lúc" value={new Date(selectedDevice.registeredAt).toLocaleString('vi-VN')} />
              <Info label="Lần truy cập cuối" value={selectedDevice.lastSeen ? new Date(selectedDevice.lastSeen).toLocaleString('vi-VN') : '-'} />
              <Info label="Gói đang dùng" value={selectedDevice.subscription_expire_at ? `Tới ${new Date(selectedDevice.subscription_expire_at).toLocaleString('vi-VN')}` : 'Không có'} />
              <Info label="Tổng lượt nghe" value={String(selectedDevice.listen_count)} />
              <Info label="Tổng điểm đã nghe" value={String(selectedDevice.heard_poi_count)} />
              <Info label="Tổng điểm yêu thích" value={String(selectedDevice.favorite_count)} />
              <Info label="Lý do chặn" value={selectedDevice.banReason || 'Không có'} />
            </div>
            <div className="mt-6 rounded-xl border border-gray-700 bg-dark/40 p-4">
              <h3 className="mb-3 font-bold text-white">Lịch sử nghe gần đây</h3>
              {selectedDevice.latest_history?.length ? (
                <div className="space-y-2">
                  {selectedDevice.latest_history.map((item, index) => (
                    <div key={`${item.poiId}-${index}`} className="rounded-lg border border-gray-700 bg-dark/50 p-3 text-sm text-gray-300">
                      <div>POI: <span className="text-white">{item.poiId}</span></div>
                      <div>Thời gian: <span className="text-white">{new Date(item.listenedAt).toLocaleString('vi-VN')}</span></div>
                      <div>Thời lượng: <span className="text-white">{item.durationSeconds}s</span></div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">Chưa có dữ liệu nghe gần đây.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}

function SummaryCard({ label, value, accent, note }: { label: string; value: number; accent?: 'emerald' | 'red'; note?: string }) {
  const theme = accent === 'emerald'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    : accent === 'red'
      ? 'border-red-500/30 bg-red-500/10 text-red-300'
      : 'border-gray-700 bg-secondary text-white'
  return (
    <div className={`rounded-2xl border p-5 ${theme}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {note ? <p className="mt-1 text-xs opacity-70">{note}</p> : null}
    </div>
  )
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-dark/40 p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-1 text-white ${mono ? 'break-all font-mono text-sm' : ''}`}>{value}</p>
    </div>
  )
}
