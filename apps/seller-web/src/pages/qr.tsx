import { useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Sidebar from '@/components/Sidebar'
import apiClient from '@/lib/api'
import { Copy, Eye, PauseCircle, PlayCircle, Plus, Printer, QrCode, RefreshCw } from 'lucide-react'

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
  status: 'active' | 'inactive' | 'expired'
  expiresAt?: string | null
  createdAt: string
  updatedAt: string
  last_scanned_at?: string | null
  total_logs: number
}

type QrLog = {
  id: number
  code: string
  scannedAt: string
  scanStatus: string
  grantedFreeListen: boolean
  device_label: string
}

const PWA_URL_STORAGE_KEY = 'seller_qr_pwa_url'

export default function SellerQrPage() {
  const [pois, setPois] = useState<PoiOption[]>([])
  const [entries, setEntries] = useState<QrEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showLogsFor, setShowLogsFor] = useState<QrEntry | null>(null)
  const [logs, setLogs] = useState<QrLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all')
  const [sortBy, setSortBy] = useState<'updated' | 'remaining' | 'used' | 'name'>('updated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [logFilter, setLogFilter] = useState<'all' | 'granted' | 'duplicate_device' | 'quota_exceeded' | 'subscription_active'>('all')
  const [logSort, setLogSort] = useState<'desc' | 'asc'>('desc')
  const [form, setForm] = useState({
    poiId: '',
    name: '',
    totalScans: 50,
    expiresAt: '',
    pwaBaseUrl: '',
  })

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(PWA_URL_STORAGE_KEY) : ''
    setForm((prev) => ({
      ...prev,
      pwaBaseUrl:
        stored ||
        (process.env.NEXT_PUBLIC_PWA_URL as string | undefined) ||
        '',
    }))
    fetchData()
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchData()
      if (showLogsFor) {
        void openLogs(showLogsFor)
      }
    }, 10000)

    return () => window.clearInterval(interval)
  }, [showLogsFor])

  const isPhoneUnsafePwaUrl = useMemo(() => {
    const value = form.pwaBaseUrl.trim().toLowerCase()
    if (!value) return true
    return (
      value.includes('localhost') ||
      value.includes('127.0.0.1') ||
      value.includes('0.0.0.0')
    )
  }, [form.pwaBaseUrl])

  const looksLikeApiUrl = useMemo(() => {
    const pwaUrl = form.pwaBaseUrl.trim().replace(/\/$/, '')
    const apiUrl = String(process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/api$/, '').replace(/\/$/, '')
    return !!pwaUrl && !!apiUrl && pwaUrl === apiUrl
  }, [form.pwaBaseUrl])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [poisResponse, qrResponse] = await Promise.all([
        apiClient.get('/owner/pois'),
        apiClient.get('/owner/qr'),
      ])
      setPois((poisResponse.data || []).map((poi: any) => ({ id: poi.id, name: poi.name })))
      setEntries(qrResponse.data || [])
    } catch (error) {
      console.error('Failed to load QR data:', error)
      alert('Không tải được dữ liệu QR')
    } finally {
      setLoading(false)
    }
  }

  const filteredEntries = useMemo(() => {
    const next = filter === 'all' ? [...entries] : entries.filter((entry) => entry.status === filter)
    next.sort((left, right) => {
      const factor = sortOrder === 'asc' ? 1 : -1
      if (sortBy === 'name') return left.name.localeCompare(right.name) * factor
      if (sortBy === 'remaining') return (left.remaining_scans - right.remaining_scans) * factor
      if (sortBy === 'used') return (left.usedScans - right.usedScans) * factor
      return (new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()) * factor
    })
    return next
  }, [entries, filter, sortBy, sortOrder])

  const filteredLogs = useMemo(() => {
    const next = logFilter === 'all' ? [...logs] : logs.filter((log) => log.scanStatus === logFilter)
    next.sort((left, right) => {
      const diff = new Date(left.scannedAt).getTime() - new Date(right.scannedAt).getTime()
      return logSort === 'asc' ? diff : -diff
    })
    return next
  }, [logFilter, logSort, logs])

  const handleCreate = async () => {
    if (!form.poiId || !form.pwaBaseUrl.trim()) {
      alert('Vui lòng chọn POI và nhập PWA URL')
      return
    }

    setSubmitting(true)
    try {
      localStorage.setItem(PWA_URL_STORAGE_KEY, form.pwaBaseUrl.trim())
      await apiClient.post('/owner/qr', {
        poiId: form.poiId,
        name: form.name,
        totalScans: Number(form.totalScans),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        baseUrl: form.pwaBaseUrl.trim(),
      })
      setForm((prev) => ({ ...prev, poiId: '', name: '', totalScans: 50, expiresAt: '' }))
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
      await fetchData()
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Gia hạn lượt thất bại')
    }
  }

  const handleStatusToggle = async (entry: QrEntry) => {
    const status = entry.status === 'active' ? 'inactive' : 'active'
    try {
      await apiClient.put(`/owner/qr/${entry.id}/status`, { status })
      await fetchData()
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Cập nhật trạng thái thất bại')
    }
  }

  const openLogs = async (entry: QrEntry) => {
    setShowLogsFor(entry)
    setLogsLoading(true)
    try {
      const response = await apiClient.get(`/owner/qr/${entry.id}/logs`)
      setLogs(response.data || [])
    } catch (error) {
      console.error('Failed to fetch logs', error)
      alert('Không tải được lịch sử quét')
    } finally {
      setLogsLoading(false)
    }
  }

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có'

  const getQrUrl = (entryCode: string) => `${form.pwaBaseUrl.trim().replace(/\/$/, '')}/qr/${entryCode}`
  const getQrImageUrl = (entryCode: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(getQrUrl(entryCode))}`

  return (
    <ProtectedRoute>
      <div className="flex bg-dark min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white">QR cho POI</h1>
                <p className="mt-2 text-gray-400">Tạo QR cho từng POI, quản lý số lượt quét miễn phí, in mã và xem lịch sử quét.</p>
              </div>
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary/80"
              >
                <RefreshCw size={18} />
                Làm mới
              </button>
            </div>

            <section className="rounded-xl border border-gray-700 bg-secondary p-6">
              <h2 className="mb-4 text-xl font-bold text-white">Tạo QR mới</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <select
                  value={form.poiId}
                  onChange={(event) => setForm((prev) => ({ ...prev, poiId: event.target.value }))}
                  className="rounded-lg border border-gray-700 bg-dark px-4 py-3 text-white"
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
                  placeholder="Tên QR"
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

                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
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

              <div className="mt-4">
                <input
                  value={form.pwaBaseUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, pwaBaseUrl: event.target.value }))}
                  placeholder="PWA URL, ví dụ https://abc.ngrok-free.app"
                  className="w-full rounded-lg border border-gray-700 bg-dark px-4 py-3 text-white placeholder:text-gray-500"
                />
                {isPhoneUnsafePwaUrl ? (
                  <p className="mt-2 text-sm text-amber-300">
                    PWA URL hiện chưa dùng được cho điện thoại. Hãy nhập link public của web app, ví dụ link ngrok của cổng 3002.
                  </p>
                ) : looksLikeApiUrl ? (
                  <p className="mt-2 text-sm text-amber-300">
                    Link này đang giống link API. QR cần trỏ tới web app PWA, không phải backend API.
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-emerald-300">
                    QR sẽ mở bằng link này trên điện thoại: {form.pwaBaseUrl.trim().replace(/\/$/, '')}
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-gray-700 bg-secondary p-6">
              <div className="mb-4 flex flex-wrap items-center gap-3">
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
                  <option value="name">Tên QR</option>
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
              ) : filteredEntries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-700 py-12 text-center text-gray-400">
                  Chưa có QR nào
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {filteredEntries.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-gray-700 bg-dark/50 p-5">
                      <div className="grid gap-5 lg:grid-cols-[220px,1fr]">
                        <div className="rounded-xl bg-white p-4 text-center">
                          <img src={getQrImageUrl(entry.entryCode)} alt={entry.name} className="mx-auto h-[180px] w-[180px]" />
                          <p className="mt-3 text-xs font-semibold text-gray-700">{entry.entryCode}</p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-xl font-bold text-white">{entry.name}</h3>
                              <p className="mt-1 text-sm text-gray-400">{entry.poi_name}</p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                entry.status === 'active'
                                  ? 'bg-green-500/15 text-green-400'
                                  : entry.status === 'expired'
                                  ? 'bg-yellow-500/15 text-yellow-400'
                                  : 'bg-gray-500/15 text-gray-300'
                              }`}
                            >
                              {entry.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-sm">
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

                          <div className="space-y-1 text-sm text-gray-300">
                            <p>Hết hạn: <span className="text-white">{formatDate(entry.expiresAt)}</span></p>
                            <p>Lần quét gần nhất: <span className="text-white">{formatDate(entry.last_scanned_at)}</span></p>
                            <p>Tổng log quét: <span className="text-white">{entry.total_logs}</span></p>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            <button
                              onClick={() => navigator.clipboard.writeText(getQrUrl(entry.entryCode))}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary/15 px-4 py-2 text-primary hover:bg-primary/25"
                            >
                              <Copy size={16} />
                              Copy link
                            </button>
                            <button
                              onClick={() => window.open(getQrUrl(entry.entryCode), '_blank')}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary/80"
                            >
                              <Eye size={16} />
                              Mở thử QR
                            </button>
                            <button
                              onClick={() => handleTopup(entry)}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-500/15 px-4 py-2 text-yellow-400 hover:bg-yellow-500/25"
                            >
                              <Plus size={16} />
                              Gia hạn lượt
                            </button>
                            <button
                              onClick={() => handleStatusToggle(entry)}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary/80"
                            >
                              {entry.status === 'active' ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                              {entry.status === 'active' ? 'Tạm ngưng' : 'Kích hoạt'}
                            </button>
                            <button
                              onClick={() => window.print()}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary/80"
                            >
                              <Printer size={16} />
                              In QR
                            </button>
                            <button
                              onClick={() => openLogs(entry)}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-white hover:bg-secondary/80"
                            >
                              <QrCode size={16} />
                              Lịch sử quét
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {showLogsFor ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-4xl rounded-xl border border-gray-700 bg-secondary p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Lịch sử quét</h2>
                    <p className="text-sm text-gray-400">{showLogsFor.name}</p>
                  </div>
                  <button onClick={() => setShowLogsFor(null)} className="rounded-lg bg-dark px-4 py-2 text-white">Đóng</button>
                </div>

                <div className="mb-4 flex flex-wrap gap-3">
                  <select
                    value={logFilter}
                    onChange={(event) => setLogFilter(event.target.value as any)}
                    className="rounded-lg border border-gray-700 bg-dark px-4 py-2 text-white"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="granted">Được cấp free</option>
                    <option value="duplicate_device">Thiết bị đã quét</option>
                    <option value="quota_exceeded">Hết lượt</option>
                    <option value="subscription_active">Thiết bị đã có gói</option>
                  </select>
                  <select
                    value={logSort}
                    onChange={(event) => setLogSort(event.target.value as any)}
                    className="rounded-lg border border-gray-700 bg-dark px-4 py-2 text-white"
                  >
                    <option value="desc">Mới nhất</option>
                    <option value="asc">Cũ nhất</option>
                  </select>
                </div>

                {logsLoading ? (
                  <div className="py-12 text-center text-gray-400">Đang tải log...</div>
                ) : (
                  <div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-700">
                    <table className="min-w-full text-sm">
                      <thead className="bg-dark/80 text-left text-gray-300">
                        <tr>
                          <th className="px-4 py-3">Thời gian</th>
                          <th className="px-4 py-3">Thiết bị</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3">Free listen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map((log) => (
                          <tr key={log.id} className="border-t border-gray-700 text-gray-200">
                            <td className="px-4 py-3">{formatDate(log.scannedAt)}</td>
                            <td className="px-4 py-3">{log.device_label}</td>
                            <td className="px-4 py-3">{log.scanStatus}</td>
                            <td className="px-4 py-3">{log.grantedFreeListen ? 'Có' : 'Không'}</td>
                          </tr>
                        ))}
                        {!filteredLogs.length ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Chưa có log phù hợp</td>
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
