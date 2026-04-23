import { useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Sidebar from '@/components/Sidebar'
import apiClient from '@/lib/api'
import { AlertTriangle, Copy, Eye, History, PauseCircle, PlayCircle, Plus, Printer, QrCode, RefreshCw, Trash2 } from 'lucide-react'

type PoiOption = {
  id: string
  name: string
}

type QrEntry = {
  id: number
  name: string
  entryCode: string
  poiId: string
  poi_name: string
  totalScans: number
  usedScans: number
  remaining_scans: number
  status: 'active' | 'inactive' | 'expired' | 'admin_suspended' | 'seller_deleted'
  suspension_reason?: string | null
  activation_requested_at?: string | null
  activation_request_note?: string | null
  createdAt: string
  updatedAt: string
  last_scanned_at?: string | null
  total_logs: number
}

type QrLog = {
  id: number
  qrEntryId?: number | null
  entry_code: string
  qr_name: string
  poi_id?: string | null
  poi_name: string
  code: string
  scannedAt: string
  scanStatus: string
  grantedFreeListen: boolean
  device_label: string
}

const FIXED_PWA_URL = (process.env.NEXT_PUBLIC_PWA_URL || 'https://smart-guide-system.vercel.app').replace(/\/$/, '')

type SortMode =
  | 'updated_desc'
  | 'updated_asc'
  | 'remaining_desc'
  | 'remaining_asc'
  | 'used_desc'
  | 'used_asc'
  | 'name_asc'
  | 'name_desc'

const scanStatusLabel: Record<string, string> = {
  granted: 'Được tặng nghe miễn phí',
  subscription_active: 'Đã có gói còn hạn',
  quota_exceeded: 'QR đã hết lượt',
  free_already_used: 'Thiết bị đã dùng lượt free',
  duplicate_fingerprint: 'Thiết bị đã dùng lượt free',
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

function getQrUrl(entryCode: string) {
  return `${FIXED_PWA_URL}/qr/${entryCode}`
}

function getQrImageUrl(entryCode: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(getQrUrl(entryCode))}`
}

function printSingleQr(entry: QrEntry) {
  const qrUrl = getQrUrl(entry.entryCode)
  const imageUrl = getQrImageUrl(entry.entryCode)
  const popup = window.open('', '_blank', 'width=720,height=900')
  if (!popup) return

  popup.document.write(`
    <html>
      <head>
        <title>In QR - ${entry.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 32px; text-align: center; }
          .sheet { display: inline-block; border: 1px solid #d9e0ea; border-radius: 24px; padding: 28px; }
          .qr-box { display: inline-flex; align-items: center; justify-content: center; background: #fff; padding: 16px; border-radius: 20px; border: 1px solid #d9e0ea; }
          .title { margin: 18px 0 6px; font-size: 28px; font-weight: 700; }
          .poi { color: #475569; margin-bottom: 16px; }
          .code { margin-top: 12px; font-size: 14px; color: #334155; letter-spacing: 0.08em; }
          .url { margin-top: 8px; font-size: 14px; color: #0f5bd7; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="qr-box"><img src="${imageUrl}" width="220" height="220" /></div>
          <div class="title">${entry.name}</div>
          <div class="poi">${entry.poi_name}</div>
          <div class="code">${entry.entryCode}</div>
          <div class="url">${qrUrl}</div>
        </div>
      </body>
    </html>
  `)
  popup.document.close()
  popup.focus()
  popup.print()
}

export default function SellerQrPage() {
  const [pois, setPois] = useState<PoiOption[]>([])
  const [entries, setEntries] = useState<QrEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showLogsFor, setShowLogsFor] = useState<QrEntry | null>(null)
  const [logs, setLogs] = useState<QrLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [showAllLogs, setShowAllLogs] = useState(false)
  const [allLogs, setAllLogs] = useState<QrLog[]>([])
  const [allLogsLoading, setAllLogsLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'expired' | 'admin_suspended'>('all')
  const [sortMode, setSortMode] = useState<SortMode>('updated_desc')
  const [logFilter, setLogFilter] = useState<'all' | 'granted' | 'free_already_used' | 'quota_exceeded' | 'subscription_active'>('all')
  const [logSort, setLogSort] = useState<'desc' | 'asc'>('desc')
  const [copiedEntryId, setCopiedEntryId] = useState<number | null>(null)
  const [form, setForm] = useState({
    poiId: '',
    name: '',
    totalScans: 50,
  })

  useEffect(() => {
    void fetchData()
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchData({ silent: true })
      if (showLogsFor) {
        void openLogs(showLogsFor, true)
      }
      if (showAllLogs) {
        void openAllLogs(true)
      }
    }, 10000)

    return () => window.clearInterval(interval)
  }, [showAllLogs, showLogsFor])

  const fetchData = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true)
    try {
      const [poisResponse, qrResponse] = await Promise.all([
        apiClient.get('/owner/pois'),
        apiClient.get('/owner/qr'),
      ])
      setPois((poisResponse.data || []).map((poi: any) => ({ id: poi.id, name: poi.name })))
      setEntries(qrResponse.data || [])
    } catch (error) {
      console.error('Failed to load QR data:', error)
      if (!silent) alert('Không tải được dữ liệu QR')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const filteredEntries = useMemo(() => {
    const next = filter === 'all' ? [...entries] : entries.filter((entry) => entry.status === filter)
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
        case 'name_asc':
          return left.name.localeCompare(right.name)
        case 'name_desc':
          return right.name.localeCompare(left.name)
        default:
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      }
    })
    return next
  }, [entries, filter, sortMode])

  const filteredLogs = useMemo(() => {
    const source = showAllLogs ? allLogs : logs
    const next = logFilter === 'all' ? [...source] : source.filter((log) => log.scanStatus === logFilter)
    next.sort((left, right) => {
      const diff = new Date(left.scannedAt).getTime() - new Date(right.scannedAt).getTime()
      return logSort === 'asc' ? diff : -diff
    })
    return next
  }, [allLogs, logFilter, logSort, logs, showAllLogs])

  const handleCreate = async () => {
    if (!form.poiId) {
      alert('Vui lòng chọn POI')
      return
    }

    setSubmitting(true)
    try {
      await apiClient.post('/owner/qr', {
        poiId: form.poiId,
        name: form.name,
        totalScans: Number(form.totalScans),
        baseUrl: FIXED_PWA_URL,
      })
      setForm({ poiId: '', name: '', totalScans: 50 })
      await fetchData()
      alert('Tạo QR thành công')
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Tạo QR thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTopup = async (entry: QrEntry) => {
    const value = window.prompt('Cộng thêm bao nhiêu lượt quét?', '20')
    const additionalScans = Number(value || 0)
    if (!additionalScans || additionalScans <= 0) return

    try {
      await apiClient.put(`/owner/qr/${entry.id}/topup`, { additionalScans })
      await fetchData({ silent: true })
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Cộng thêm lượt thất bại')
    }
  }

  const handleStatusToggle = async (entry: QrEntry) => {
    if (entry.status === 'admin_suspended') {
      const note = window.prompt('QR do hệ thống tạm ngưng. Nhập ghi chú gửi admin để yêu cầu kích hoạt lại:', entry.activation_request_note || '')
      if (note === null) return
      try {
        await apiClient.post(`/owner/qr/${entry.id}/activation-request`, { note })
        await fetchData({ silent: true })
        alert('Đã gửi yêu cầu kích hoạt lại cho admin')
      } catch (error: any) {
        alert(error?.response?.data?.message || 'Gửi yêu cầu thất bại')
      }
      return
    }

    const status = entry.status === 'active' ? 'inactive' : 'active'
    try {
      await apiClient.put(`/owner/qr/${entry.id}/status`, { status })
      await fetchData({ silent: true })
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Cập nhật trạng thái thất bại')
    }
  }

  const handleDelete = async (entry: QrEntry) => {
    const confirmed = window.confirm(`Xóa QR "${entry.name}" khỏi trang seller? Admin vẫn thấy lịch sử và trạng thái QR này.`)
    if (!confirmed) return

    try {
      await apiClient.delete(`/owner/qr/${entry.id}`)
      setEntries((prev) => prev.filter((item) => item.id !== entry.id))
      if (showLogsFor?.id === entry.id) setShowLogsFor(null)
      await fetchData({ silent: true })
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Xóa QR thất bại')
    }
  }

  const copyQrLink = async (entry: QrEntry) => {
    try {
      await navigator.clipboard.writeText(getQrUrl(entry.entryCode))
      setCopiedEntryId(entry.id)
      window.setTimeout(() => {
        setCopiedEntryId((current) => (current === entry.id ? null : current))
      }, 1800)
    } catch {
      alert('Không copy được link QR')
    }
  }

  const openLogs = async (entry: QrEntry, silent = false) => {
    setShowAllLogs(false)
    setShowLogsFor(entry)
    if (!silent) setLogsLoading(true)
    try {
      const response = await apiClient.get(`/owner/qr/${entry.id}/logs`)
      setLogs(response.data || [])
    } catch (error) {
      console.error('Failed to fetch logs', error)
      if (!silent) alert('Không tải được lịch sử quét')
    } finally {
      if (!silent) setLogsLoading(false)
    }
  }

  const openAllLogs = async (silent = false) => {
    setShowLogsFor(null)
    setShowAllLogs(true)
    if (!silent) setAllLogsLoading(true)
    try {
      const response = await apiClient.get('/owner/qr/logs')
      setAllLogs(response.data || [])
    } catch (error) {
      console.error('Failed to fetch all logs', error)
      if (!silent) alert('Không tải được lịch sử quét tổng')
    } finally {
      if (!silent) setAllLogsLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-dark">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-white">QR cho POI</h1>
                <p className="mt-2 text-gray-400">Mỗi QR gắn với một POI. Mỗi thiết bị chỉ được tặng nghe miễn phí một lần duy nhất trên toàn hệ thống.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openAllLogs()}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary/15 px-4 py-2 text-primary hover:bg-primary/25"
                >
                  <History size={18} />
                  Xem toàn bộ lịch sử
                </button>
                <button
                  onClick={() => fetchData()}
                  className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary/80"
                >
                  <RefreshCw size={18} />
                  Làm mới
                </button>
              </div>
            </div>

            <section className="rounded-xl border border-gray-700 bg-secondary p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-white">Tạo QR mới</h2>
                <p className="text-sm text-emerald-300">Link quét cố định: {FIXED_PWA_URL}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-[1.2fr,1fr,0.7fr,auto]">
                <select
                  value={form.poiId}
                  onChange={(event) => setForm((prev) => ({ ...prev, poiId: event.target.value }))}
                  className="rounded-lg border border-gray-700 bg-dark px-4 py-3 pr-10 text-white"
                >
                  <option value="">Chọn POI</option>
                  {pois.map((poi) => (
                    <option key={poi.id} value={poi.id}>
                      {poi.name}
                    </option>
                  ))}
                </select>

                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Tên QR hiển thị (không bắt buộc)"
                  className="rounded-lg border border-gray-700 bg-dark px-4 py-3 text-white placeholder:text-gray-500"
                />

                <input
                  type="number"
                  min={1}
                  value={form.totalScans}
                  onChange={(event) => setForm((prev) => ({ ...prev, totalScans: Number(event.target.value) }))}
                  placeholder="Số lượt"
                  className="rounded-lg border border-gray-700 bg-dark px-4 py-3 text-white"
                />

                <button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <Plus size={18} />
                  {submitting ? 'Đang tạo...' : 'Tạo QR'}
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-gray-700 bg-secondary p-5">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as any)}
                  className="rounded-lg border border-gray-700 bg-dark px-4 py-2 pr-10 text-white"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Đã ẩn</option>
                  <option value="expired">Hết lượt</option>
                  <option value="admin_suspended">Hệ thống tạm ngưng</option>
                </select>

                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="rounded-lg border border-gray-700 bg-dark px-4 py-2 pr-10 text-white"
                >
                  <option value="updated_desc">Mới cập nhật nhất</option>
                  <option value="updated_asc">Mới cập nhật cũ nhất</option>
                  <option value="remaining_desc">Lượt còn lại nhiều nhất</option>
                  <option value="remaining_asc">Lượt còn lại ít nhất</option>
                  <option value="used_desc">Lượt đã dùng nhiều nhất</option>
                  <option value="used_asc">Lượt đã dùng ít nhất</option>
                  <option value="name_asc">Tên A đến Z</option>
                  <option value="name_desc">Tên Z đến A</option>
                </select>
              </div>

              {loading ? (
                <div className="py-12 text-center text-gray-400">Đang tải...</div>
              ) : filteredEntries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-700 py-12 text-center text-gray-400">
                  Chưa có QR nào
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {filteredEntries.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-gray-700 bg-dark/50 p-4">
                      <div className="grid gap-4 lg:grid-cols-[170px,1fr]">
                        <div className="flex flex-col items-center gap-3">
                          <div className="inline-flex w-fit rounded-2xl bg-white p-3 shadow-sm">
                            <img src={getQrImageUrl(entry.entryCode)} alt={entry.name} className="h-[148px] w-[148px]" />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-semibold tracking-[0.18em] text-gray-300">{entry.entryCode}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-bold text-white">{entry.name}</h3>
                              <p className="mt-1 text-sm text-gray-400">{entry.poi_name}</p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                                entry.status === 'active'
                                  ? 'bg-green-500/15 text-green-400'
                                  : entry.status === 'expired'
                                  ? 'bg-yellow-500/15 text-yellow-400'
                                  : entry.status === 'admin_suspended'
                                  ? 'bg-red-500/15 text-red-300'
                                  : 'bg-gray-500/15 text-gray-300'
                              }`}
                            >
                              {statusLabel[entry.status] || entry.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="rounded-lg bg-secondary p-3">
                              <p className="text-gray-400">Tổng lượt</p>
                              <p className="mt-1 text-lg font-bold text-white">{entry.totalScans}</p>
                            </div>
                            <div className="rounded-lg bg-secondary p-3">
                              <p className="text-gray-400">Đã dùng</p>
                              <p className="mt-1 text-lg font-bold text-white">{entry.usedScans}</p>
                            </div>
                            <div className="rounded-lg bg-secondary p-3">
                              <p className="text-gray-400">Còn lại</p>
                              <p className="mt-1 text-lg font-bold text-accent">{entry.remaining_scans}</p>
                            </div>
                          </div>

                          <div className="grid gap-1 text-sm text-gray-300 sm:grid-cols-2">
                            <p>Lần quét gần nhất: <span className="text-white">{formatDate(entry.last_scanned_at)}</span></p>
                            <p>Tổng lượt quét ghi log: <span className="text-white">{entry.total_logs}</span></p>
                          </div>

	                          {entry.status === 'admin_suspended' && (
	                            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                              <div className="flex items-start gap-2">
                                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                                <div>
                                  <p className="font-semibold">QR do hệ thống tạm ngưng</p>
                                  <p className="text-red-200/80">{entry.suspension_reason || 'Vui lòng gửi yêu cầu để admin xem xét kích hoạt lại.'}</p>
                                  {entry.activation_requested_at && (
                                    <p className="mt-1 text-xs text-yellow-200">Đã gửi yêu cầu: {formatDate(entry.activation_requested_at)}</p>
                                  )}
                                </div>
	                              </div>
	                            </div>
	                          )}
	                        </div>

	                          <div className="grid gap-2 sm:grid-cols-6 lg:col-span-2">
	                            <button
	                              onClick={() => copyQrLink(entry)}
	                              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 py-2 sm:col-span-2 ${
                                  copiedEntryId === entry.id
                                    ? 'bg-green-500/20 text-green-300'
                                    : 'bg-primary/15 text-primary hover:bg-primary/25'
                                }`}
	                            >
	                              <Copy size={16} />
	                              {copiedEntryId === entry.id ? 'Copied' : 'Copy link'}
                            </button>
	                            <button
	                              onClick={() => window.open(getQrUrl(entry.entryCode), '_blank')}
	                              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-white hover:bg-secondary/80 sm:col-span-2"
	                            >
                              <Eye size={16} />
                              Mở thử
                            </button>
	                            <button
	                              onClick={() => printSingleQr(entry)}
	                              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-white hover:bg-secondary/80 sm:col-span-2"
	                            >
                              <Printer size={16} />
                              In QR
                            </button>
	                            <button
	                              onClick={() => handleTopup(entry)}
	                              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-yellow-500/15 px-3 py-2 text-yellow-400 hover:bg-yellow-500/25 sm:col-span-2"
	                            >
                              <Plus size={16} />
                              Cộng lượt
                            </button>
	                            <button
	                              onClick={() => handleStatusToggle(entry)}
	                              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-white hover:bg-secondary/80 sm:col-span-2"
	                            >
                              {entry.status === 'active' ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                              {entry.status === 'admin_suspended' ? 'Gửi yêu cầu' : entry.status === 'active' ? 'Tạm ngưng' : 'Kích hoạt'}
                            </button>
	                            <button
	                              onClick={() => handleDelete(entry)}
	                              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-red-500/15 px-3 py-2 text-red-300 hover:bg-red-500/25 sm:col-span-2"
	                            >
                              <Trash2 size={16} />
                              Xóa
                            </button>
	                            <button
	                              onClick={() => openLogs(entry)}
	                              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-white hover:bg-secondary/80 sm:col-span-6"
	                            >
                              <QrCode size={16} />
                              Xem lịch sử của QR này
	                            </button>
	                          </div>
	                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {(showLogsFor || showAllLogs) ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-6xl rounded-xl border border-gray-700 bg-secondary p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {showAllLogs ? 'Toàn bộ lịch sử quét' : 'Lịch sử quét của QR'}
                    </h2>
                    <p className="text-sm text-gray-400">
                      {showAllLogs ? 'Danh sách tất cả lượt quét của seller' : showLogsFor?.name}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowLogsFor(null)
                      setShowAllLogs(false)
                    }}
                    className="rounded-lg bg-dark px-4 py-2 text-white"
                  >
                    Đóng
                  </button>
                </div>

                <div className="mb-4 flex flex-wrap gap-3">
                  <select
                    value={logFilter}
                    onChange={(event) => setLogFilter(event.target.value as any)}
                    className="rounded-lg border border-gray-700 bg-dark px-4 py-2 text-white"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="granted">Được tặng nghe miễn phí</option>
                    <option value="free_already_used">Thiết bị đã dùng free trước đó</option>
                    <option value="subscription_active">Đã có gói còn hạn</option>
                    <option value="quota_exceeded">QR đã hết lượt</option>
                  </select>
                  <select
                    value={logSort}
                    onChange={(event) => setLogSort(event.target.value as any)}
                    className="rounded-lg border border-gray-700 bg-dark px-4 py-2 text-white"
                  >
                    <option value="desc">Mới nhất trước</option>
                    <option value="asc">Cũ nhất trước</option>
                  </select>
                </div>

                {(showAllLogs ? allLogsLoading : logsLoading) ? (
                  <div className="py-12 text-center text-gray-400">Đang tải log...</div>
                ) : (
                  <div className="max-h-[65vh] overflow-auto rounded-lg border border-gray-700">
                    <table className="min-w-full text-sm">
                      <thead className="bg-dark/80 text-left text-gray-300">
                        <tr>
                          <th className="px-4 py-3">Thời gian</th>
                          {showAllLogs ? <th className="px-4 py-3">QR</th> : null}
                          <th className="px-4 py-3">POI</th>
                          <th className="px-4 py-3">Thiết bị</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3">Free listen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map((log) => (
                          <tr key={log.id} className="border-t border-gray-700 text-gray-200">
                            <td className="px-4 py-3">{formatDate(log.scannedAt)}</td>
                            {showAllLogs ? (
                              <td className="px-4 py-3">
                                <div className="font-medium text-white">{log.qr_name}</div>
                                <div className="text-xs text-gray-400">{log.entry_code}</div>
                              </td>
                            ) : null}
                            <td className="px-4 py-3">{log.poi_name || '-'}</td>
                            <td className="px-4 py-3">{log.device_label}</td>
                            <td className="px-4 py-3">{scanStatusLabel[log.scanStatus] || log.scanStatus}</td>
                            <td className="px-4 py-3">{log.grantedFreeListen ? 'Có' : 'Không'}</td>
                          </tr>
                        ))}
                        {!filteredLogs.length ? (
                          <tr>
                            <td colSpan={showAllLogs ? 6 : 5} className="px-4 py-8 text-center text-gray-400">Chưa có log phù hợp</td>
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
