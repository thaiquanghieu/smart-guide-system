import { useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Sidebar from '@/components/Sidebar'
import apiClient from '@/lib/api'
import { AlertTriangle, CheckCircle, CheckSquare2, Eye, History, RefreshCw, Search, Trash2, X, XCircle } from 'lucide-react'

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
  status: 'active' | 'inactive' | 'expired' | 'admin_suspended' | 'seller_deleted'
  suspension_reason?: string | null
  activation_requested_at?: string | null
  activation_request_note?: string | null
  createdAt: string
  updatedAt: string
  total_logs: number
  last_scanned_at?: string | null
}

type QrLog = {
  id: number
  qrEntryId?: number | null
  owner_id?: number | null
  owner_name: string
  poi_id?: string | null
  poi_name: string
  entry_code: string
  qr_name: string
  device_label: string
  code: string
  scanStatus: string
  grantedFreeListen: boolean
  scannedAt: string
}

type SortMode =
  | 'updated_desc'
  | 'updated_asc'
  | 'remaining_desc'
  | 'remaining_asc'
  | 'used_desc'
  | 'used_asc'
  | 'owner_asc'
  | 'owner_desc'

const scanStatusLabel: Record<string, string> = {
  granted: 'Được tặng nghe miễn phí',
  subscription_active: 'Đã có gói còn hạn',
  quota_exceeded: 'QR đã hết lượt',
  free_already_used: 'Thiết bị đã dùng free trước đó',
  duplicate_fingerprint: 'Thiết bị đã dùng free trước đó',
  duplicate_device: 'Thiết bị đã quét trước đó',
}

const statusLabel: Record<string, string> = {
  active: 'Đang hoạt động',
  inactive: 'Đã ẩn',
  expired: 'Hết lượt',
  admin_suspended: 'Hệ thống tạm ngưng',
  seller_deleted: 'Seller đã xóa',
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có'
}

export default function AdminQrPage() {
  const [entries, setEntries] = useState<QrEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'expired' | 'admin_suspended' | 'seller_deleted'>('all')
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('updated_desc')
  const [selectedEntry, setSelectedEntry] = useState<QrEntry | null>(null)
  const [logs, setLogs] = useState<QrLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logQuery, setLogQuery] = useState('')
  const [showAllLogs, setShowAllLogs] = useState(false)
  const [allLogs, setAllLogs] = useState<QrLog[]>([])
  const [allLogsLoading, setAllLogsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectionMode, setSelectionMode] = useState(false)

  useEffect(() => {
    void fetchEntries()
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
    const normalizedQuery = query.trim().toLowerCase()
    const next = (filter === 'all' ? [...entries] : entries.filter((entry) => entry.status === filter)).filter((entry) => {
      const keyword = [
        entry.name,
        entry.entryCode,
        entry.poi_name,
        entry.owner_name,
        entry.status,
        entry.suspension_reason,
        entry.activation_request_note,
      ].join(' ').toLowerCase()
      return keyword.includes(normalizedQuery)
    })
    next.sort((left, right) => {
      switch (sortMode) {
        case 'updated_asc':
          return new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()
        case 'remaining_desc':
          return right.remaining_scans - left.remaining_scans
        case 'remaining_asc':
          return left.remaining_scans - right.remaining_scans
        case 'used_desc':
          return right.usedScans - left.usedScans
        case 'used_asc':
          return left.usedScans - right.usedScans
        case 'owner_asc':
          return left.owner_name.localeCompare(right.owner_name)
        case 'owner_desc':
          return right.owner_name.localeCompare(left.owner_name)
        default:
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      }
    })
    return next
  }, [entries, filter, query, sortMode])

  const activationRequests = useMemo(
    () => entries.filter((entry) => Boolean(entry.activation_requested_at)),
    [entries]
  )

  const openLogs = async (entry: QrEntry) => {
    setShowAllLogs(false)
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

  const openAllLogs = async () => {
    setSelectedEntry(null)
    setShowAllLogs(true)
    setAllLogsLoading(true)
    try {
      const response = await apiClient.get('/admin/qr/logs')
      setAllLogs(response.data || [])
    } catch (error) {
      console.error('Failed to fetch all logs', error)
      alert('Không tải được log tổng')
    } finally {
      setAllLogsLoading(false)
    }
  }

  const updateStatus = async (entry: QrEntry, status: 'active' | 'inactive' | 'expired' | 'admin_suspended' | 'seller_deleted') => {
    const reason = status === 'admin_suspended' ? window.prompt('Lý do admin tạm ngưng QR?', entry.suspension_reason || '') || 'Admin tạm ngưng QR để kiểm tra' : undefined
    try {
      await apiClient.put(`/admin/qr/${entry.id}/status`, { status, reason })
      await fetchEntries()
      if (selectedEntry?.id === entry.id) {
        setSelectedEntry({ ...selectedEntry, status })
      }
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Cập nhật trạng thái thất bại')
    }
  }

  const rejectActivationRequest = async (entry: QrEntry) => {
    const reason = window.prompt('Lý do từ chối yêu cầu kích hoạt lại?', entry.suspension_reason || '') || ''
    try {
      await apiClient.post(`/admin/qr/${entry.id}/activation-request/reject`, { reason })
      await fetchEntries()
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Từ chối yêu cầu thất bại')
    }
  }

  const hardDeleteQr = async (entry: QrEntry) => {
    const confirmed = window.confirm(`Xóa hẳn QR "${entry.name}"? Hành động này không thể hoàn tác.`)
    if (!confirmed) return

    try {
      await apiClient.delete(`/admin/qr/${entry.id}/hard`)
      if (selectedEntry?.id === entry.id) setSelectedEntry(null)
      await fetchEntries()
    } catch (error: any) {
      alert(error?.response?.data?.message || error?.response?.data?.detail || 'Xóa hẳn QR thất bại')
    }
  }

  const bulkDelete = async () => {
    if (!selectedIds.length || !window.confirm(`Xóa hẳn ${selectedIds.length} QR đã chọn?`)) return
    for (const id of selectedIds) {
      await apiClient.delete(`/admin/qr/${id}/hard`)
    }
    setSelectedIds([])
    await fetchEntries()
  }

  const toggleSelected = (entryId: number) => {
    setSelectedIds((prev) => (prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId]))
  }

  const logsToRender = (showAllLogs ? allLogs : logs).filter((log) => {
    const keyword = [
      log.qr_name,
      log.entry_code,
      log.owner_name,
      log.poi_name,
      log.device_label,
      log.scanStatus,
      scanStatusLabel[log.scanStatus],
      log.code,
    ].join(' ').toLowerCase()
    return keyword.includes(logQuery.trim().toLowerCase())
  })

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-dark">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white">Quản lý QR</h1>
                <p className="mt-2 text-gray-400">Theo dõi toàn bộ QR của seller, lượt quét, trạng thái và lịch sử quét tổng.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={openAllLogs}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary/15 px-4 py-2 text-primary hover:bg-primary/25"
                >
                  <History size={18} />
                  Xem log tổng
                </button>
                <button
                  onClick={fetchEntries}
                  className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary/80"
                >
                  <RefreshCw size={18} />
                  Làm mới
                </button>
              </div>
            </div>

            <section className="rounded-xl border border-gray-700 bg-secondary p-6">
              {activationRequests.length > 0 && (
                <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <div className="mb-3 flex items-center gap-2 text-yellow-200">
                    <AlertTriangle size={20} />
                    <h2 className="text-lg font-bold">Yêu cầu kích hoạt lại QR</h2>
                  </div>
                  <p className="mb-4 text-sm text-yellow-100/80">
                    Seller không thể tự mở QR do admin ngưng. Admin kiểm tra lý do, log quét, rồi chọn mở lại hoặc từ chối.
                  </p>
                  <div className="space-y-3">
                    {activationRequests.map((entry) => (
                      <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-dark/70 p-4">
                        <div>
                          <p className="font-semibold text-white">{entry.name}</p>
                          <p className="text-sm text-gray-400">{entry.owner_name} • {entry.poi_name}</p>
                          <p className="text-sm text-yellow-200">Ghi chú: {entry.activation_request_note || 'Không có'}</p>
                          <p className="text-xs text-gray-500">Gửi lúc: {formatDate(entry.activation_requested_at)}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => updateStatus(entry, 'active')} className="inline-flex items-center gap-2 rounded-lg bg-green-500/20 px-3 py-2 text-green-300 hover:bg-green-500/30">
                            <CheckCircle size={16} />
                            Kích hoạt
                          </button>
                          <button onClick={() => rejectActivationRequest(entry)} className="inline-flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-2 text-red-300 hover:bg-red-500/30">
                            <XCircle size={16} />
                            Từ chối
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4 grid gap-3 lg:grid-cols-[1fr,auto,auto,auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-dark py-2 pl-10 pr-4 text-white placeholder:text-gray-500"
                    placeholder="Tìm theo tên QR, mã, seller, POI, trạng thái..."
                  />
                </div>
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as any)}
                  className="rounded-lg border border-gray-700 bg-dark px-4 py-2 text-white"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Đã ẩn</option>
                  <option value="expired">Hết lượt</option>
                  <option value="admin_suspended">Hệ thống tạm ngưng</option>
                  <option value="seller_deleted">Seller đã xóa</option>
                </select>
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="rounded-lg border border-gray-700 bg-dark px-4 py-2 text-white"
                >
                  <option value="updated_desc">Mới cập nhật nhất</option>
                  <option value="updated_asc">Mới cập nhật cũ nhất</option>
                  <option value="remaining_desc">Lượt còn lại nhiều nhất</option>
                  <option value="remaining_asc">Lượt còn lại ít nhất</option>
                  <option value="used_desc">Lượt đã dùng nhiều nhất</option>
                  <option value="used_asc">Lượt đã dùng ít nhất</option>
                  <option value="owner_asc">Seller A đến Z</option>
                  <option value="owner_desc">Seller Z đến A</option>
                </select>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode((value) => !value)
                      setSelectedIds([])
                    }}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold ${selectionMode ? 'bg-primary text-white' : 'bg-dark text-gray-200 hover:text-white'}`}
                  >
                    {selectionMode ? <X size={16} /> : <CheckSquare2 size={16} />}
                    {selectionMode ? 'Thoát chọn' : 'Select'}
                  </button>
                  {selectedIds.length > 0 ? (
                    <button onClick={() => void bulkDelete()} className="rounded-lg bg-red-500/15 px-4 py-2 font-semibold text-red-300 hover:bg-red-500/25">
                      Xóa {selectedIds.length} mục
                    </button>
                  ) : null}
                </div>
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
                        <tr
                          key={entry.id}
                          className={`border-t border-gray-700 text-gray-100 ${selectedIds.includes(entry.id) ? 'bg-primary/10' : ''} ${selectionMode ? 'cursor-pointer' : ''}`}
                          onClick={() => {
                            if (selectionMode) toggleSelected(entry.id)
                          }}
                        >
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
                          <td className="px-4 py-3">
                            <div>{statusLabel[entry.status] || entry.status}</div>
                            {entry.suspension_reason && <div className="mt-1 text-xs text-red-300">{entry.suspension_reason}</div>}
                          </td>
                          <td className="px-4 py-3">{formatDate(entry.last_scanned_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button onClick={(event) => { event.stopPropagation(); void openLogs(entry) }} className="rounded bg-primary/20 px-3 py-1 text-primary hover:bg-primary/30">
                                <Eye size={14} className="mr-1 inline" />
                                Xem log
                              </button>
                              {entry.status === 'active' ? (
                                <button onClick={(event) => { event.stopPropagation(); void updateStatus(entry, 'admin_suspended') }} className="rounded bg-orange-500/20 px-3 py-1 text-orange-300 hover:bg-orange-500/30">
                                  Tạm ngừng
                                </button>
                              ) : entry.status !== 'seller_deleted' ? (
                                <button onClick={(event) => { event.stopPropagation(); void updateStatus(entry, 'active') }} className="rounded bg-green-500/20 px-3 py-1 text-green-300 hover:bg-green-500/30">
                                  Kích hoạt
                                </button>
                              ) : null}
                              <button onClick={(event) => { event.stopPropagation(); void hardDeleteQr(entry) }} className="rounded bg-red-500/20 px-3 py-1 text-red-300 hover:bg-red-500/30" title="Xóa hẳn QR">
                                <Trash2 size={14} />
                              </button>
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

          {(selectedEntry || showAllLogs) ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-6xl rounded-xl border border-gray-700 bg-secondary p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{showAllLogs ? 'Toàn bộ log quét' : 'Log QR'}</h2>
                    <p className="text-sm text-gray-400">{showAllLogs ? 'Log của toàn hệ thống QR' : selectedEntry?.name}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedEntry(null)
                      setShowAllLogs(false)
                    }}
                    className="rounded-lg bg-dark px-4 py-2 text-white"
                  >
                    Đóng
                  </button>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                  <input
                    value={logQuery}
                    onChange={(event) => setLogQuery(event.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-dark py-2 pl-10 pr-4 text-white placeholder:text-gray-500"
                    placeholder="Tìm trong log theo QR, POI, seller, thiết bị, trạng thái..."
                  />
                </div>

                {(showAllLogs ? allLogsLoading : logsLoading) ? (
                  <div className="py-12 text-center text-gray-400">Đang tải log...</div>
                ) : (
                  <div className="max-h-[65vh] overflow-auto rounded-lg border border-gray-700">
                    <table className="min-w-full text-sm">
                      <thead className="bg-dark/80 text-left text-gray-300">
                        <tr>
                          <th className="px-4 py-3">Thời gian</th>
                          <th className="px-4 py-3">QR</th>
                          <th className="px-4 py-3">Seller</th>
                          <th className="px-4 py-3">POI</th>
                          <th className="px-4 py-3">Thiết bị</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3">Free listen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logsToRender.map((log) => (
                          <tr key={log.id} className="border-t border-gray-700 text-gray-100">
                            <td className="px-4 py-3">{formatDate(log.scannedAt)}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-white">{log.qr_name}</div>
                              <div className="text-xs text-gray-400">{log.entry_code}</div>
                            </td>
                            <td className="px-4 py-3">{log.owner_name || '-'}</td>
                            <td className="px-4 py-3">{log.poi_name || '-'}</td>
                            <td className="px-4 py-3">{log.device_label}</td>
                            <td className="px-4 py-3">{scanStatusLabel[log.scanStatus] || log.scanStatus}</td>
                            <td className="px-4 py-3">{log.grantedFreeListen ? 'Có' : 'Không'}</td>
                          </tr>
                        ))}
                        {!logsToRender.length ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Chưa có log</td>
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
