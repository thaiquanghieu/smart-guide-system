import { useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Sidebar from '@/components/Sidebar'
import apiClient from '@/lib/api'
import { Eye, RefreshCw } from 'lucide-react'

type QrEntry = {
  id: number
  name: string
  entryCode: string
  poiId: string
  poi_name: string
  owner_id: number
  owner_name: string
  totalScans: number
  usedScans: number
  remaining_scans: number
  status: 'active' | 'inactive' | 'expired'
  expiresAt?: string | null
  createdAt: string
  updatedAt: string
  total_logs: number
  last_scanned_at?: string | null
}

type QrLog = {
  id: number
  deviceId: number
  poiId?: string | null
  code: string
  scanStatus: string
  grantedFreeListen: boolean
  scannedAt: string
}

export default function AdminQrPage() {
  const [entries, setEntries] = useState<QrEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all')
  const [sortBy, setSortBy] = useState<'updated' | 'remaining' | 'used' | 'owner'>('updated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedEntry, setSelectedEntry] = useState<QrEntry | null>(null)
  const [logs, setLogs] = useState<QrLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/admin/qr')
      setEntries(response.data || [])
    } catch (error) {
      console.error('Failed to fetch QR entries', error)
      alert('Không tải được dữ liệu QR')
    } finally {
      setLoading(false)
    }
  }

  const filteredEntries = useMemo(() => {
    const next = filter === 'all' ? [...entries] : entries.filter((entry) => entry.status === filter)
    next.sort((left, right) => {
      const factor = sortOrder === 'asc' ? 1 : -1
      if (sortBy === 'remaining') return (left.remaining_scans - right.remaining_scans) * factor
      if (sortBy === 'used') return (left.usedScans - right.usedScans) * factor
      if (sortBy === 'owner') return left.owner_name.localeCompare(right.owner_name) * factor
      return (new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()) * factor
    })
    return next
  }, [entries, filter, sortBy, sortOrder])

  const openLogs = async (entry: QrEntry) => {
    setSelectedEntry(entry)
    setLogsLoading(true)
    try {
      const response = await apiClient.get(`/admin/qr/${entry.id}/logs`)
      setLogs(response.data || [])
    } catch (error) {
      console.error('Failed to fetch logs', error)
      alert('Không tải được log QR')
    } finally {
      setLogsLoading(false)
    }
  }

  const updateStatus = async (entry: QrEntry, status: 'active' | 'inactive' | 'expired') => {
    try {
      await apiClient.put(`/admin/qr/${entry.id}/status`, { status })
      await fetchEntries()
      if (selectedEntry?.id === entry.id) {
        setSelectedEntry({ ...selectedEntry, status })
      }
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Cập nhật trạng thái thất bại')
    }
  }

  const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có')

  return (
    <ProtectedRoute>
      <div className="flex bg-dark min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white">Quản lý QR</h1>
                <p className="mt-2 text-gray-400">Theo dõi toàn bộ QR của seller, lượt quét, trạng thái và lịch sử quét.</p>
              </div>
              <button
                onClick={fetchEntries}
                className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary/80"
              >
                <RefreshCw size={18} />
                Làm mới
              </button>
            </div>

            <section className="rounded-xl border border-gray-700 bg-secondary p-6">
              <div className="mb-4 flex flex-wrap gap-3">
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as any)}
                  className="rounded-lg border border-gray-700 bg-dark px-4 py-2 text-white"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Tạm ngưng</option>
                  <option value="expired">Hết hạn</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as any)}
                  className="rounded-lg border border-gray-700 bg-dark px-4 py-2 text-white"
                >
                  <option value="updated">Mới cập nhật</option>
                  <option value="remaining">Lượt còn lại</option>
                  <option value="used">Lượt đã dùng</option>
                  <option value="owner">Seller</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value as any)}
                  className="rounded-lg border border-gray-700 bg-dark px-4 py-2 text-white"
                >
                  <option value="desc">Giảm dần</option>
                  <option value="asc">Tăng dần</option>
                </select>
              </div>

              {loading ? (
                <div className="py-12 text-center text-gray-400">Đang tải...</div>
              ) : (
                <div className="overflow-auto rounded-lg border border-gray-700">
                  <table className="min-w-full text-sm">
                    <thead className="bg-dark/80 text-left text-gray-300">
                      <tr>
                        <th className="px-4 py-3">QR</th>
                        <th className="px-4 py-3">Seller</th>
                        <th className="px-4 py-3">POI</th>
                        <th className="px-4 py-3">Lượt</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th className="px-4 py-3">Lần quét gần nhất</th>
                        <th className="px-4 py-3">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((entry) => (
                        <tr key={entry.id} className="border-t border-gray-700 text-gray-100">
                          <td className="px-4 py-3">
                            <div className="font-semibold">{entry.name}</div>
                            <div className="text-xs text-gray-400">{entry.entryCode}</div>
                          </td>
                          <td className="px-4 py-3">{entry.owner_name}</td>
                          <td className="px-4 py-3">{entry.poi_name}</td>
                          <td className="px-4 py-3">
                            <div>Đã dùng: {entry.usedScans}</div>
                            <div className="text-xs text-accent">Còn: {entry.remaining_scans}</div>
                          </td>
                          <td className="px-4 py-3">{entry.status}</td>
                          <td className="px-4 py-3">{formatDate(entry.last_scanned_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => openLogs(entry)} className="rounded bg-primary/20 px-3 py-1 text-primary hover:bg-primary/30">
                                <Eye size={14} className="inline mr-1" />
                                Log
                              </button>
                              {entry.status !== 'active' ? (
                                <button onClick={() => updateStatus(entry, 'active')} className="rounded bg-green-500/20 px-3 py-1 text-green-400 hover:bg-green-500/30">
                                  Kích hoạt
                                </button>
                              ) : (
                                <button onClick={() => updateStatus(entry, 'inactive')} className="rounded bg-yellow-500/20 px-3 py-1 text-yellow-400 hover:bg-yellow-500/30">
                                  Tạm ngưng
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!filteredEntries.length ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Không có QR nào</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {selectedEntry ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-4xl rounded-xl border border-gray-700 bg-secondary p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Log QR</h2>
                    <p className="text-sm text-gray-400">{selectedEntry.name}</p>
                  </div>
                  <button onClick={() => setSelectedEntry(null)} className="rounded-lg bg-dark px-4 py-2 text-white">Đóng</button>
                </div>

                {logsLoading ? (
                  <div className="py-12 text-center text-gray-400">Đang tải log...</div>
                ) : (
                  <div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-700">
                    <table className="min-w-full text-sm">
                      <thead className="bg-dark/80 text-left text-gray-300">
                        <tr>
                          <th className="px-4 py-3">Thời gian</th>
                          <th className="px-4 py-3">Device ID</th>
                          <th className="px-4 py-3">POI</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3">Free listen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className="border-t border-gray-700 text-gray-100">
                            <td className="px-4 py-3">{formatDate(log.scannedAt)}</td>
                            <td className="px-4 py-3">{log.deviceId}</td>
                            <td className="px-4 py-3">{log.poiId || '-'}</td>
                            <td className="px-4 py-3">{log.scanStatus}</td>
                            <td className="px-4 py-3">{log.grantedFreeListen ? 'Có' : 'Không'}</td>
                          </tr>
                        ))}
                        {!logs.length ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Chưa có log</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </ProtectedRoute>
  )
}
