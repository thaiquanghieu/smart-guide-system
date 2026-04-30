import { useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { CheckCircle, Search } from 'lucide-react'

type Payment = {
  id: number
  code: string
  amount: number
  status: string
  status_label: string
  payment_type: string
  payer_type: string
  owner_name?: string
  owner_email?: string
  device_name?: string
  device_id?: number
  device_uuid?: string
  poi_name?: string
  plan_name?: string
  description: string
  created_at: string
  confirmed_at?: string
  rejected_reason?: string
}

function formatSignedAmount(amount: number, direction: 'in' | 'out' = 'in') {
  const prefix = direction === 'in' ? '+' : '-'
  return `${prefix}${Math.abs(amount || 0).toLocaleString('vi-VN')}đ`
}

function formatDate(value?: string) {
  if (!value) return 'Chưa có'
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function statusClass(status: string) {
  if (status === 'confirmed' || status === 'used') return 'bg-green-400/10 text-green-300'
  if (status === 'rejected') return 'bg-red-400/10 text-red-300'
  return 'bg-gray-400/10 text-gray-300'
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  const fetchPayments = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const response = await apiClient.get('/admin/payments', { params: { status, type } })
      setPayments(response.data || [])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void fetchPayments()
    const timer = window.setInterval(() => void fetchPayments(true), 5000)
    return () => window.clearInterval(timer)
  }, [status, type])

  const visiblePayments = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return payments
      .filter((payment) => [payment.code, payment.owner_name, payment.device_name, payment.poi_name, payment.plan_name, payment.description, payment.status_label].join(' ').toLowerCase().includes(keyword))
      .sort((a, b) => {
        if (sort === 'amount_desc') return b.amount - a.amount
        if (sort === 'amount_asc') return a.amount - b.amount
        if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [payments, query, sort])

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-dark">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl">
            <h1 className="text-4xl font-bold text-white">Quản lý thanh toán</h1>
            <p className="mt-2 text-gray-400">Xem lịch sử user mua gói và seller nâng cấp POI. Thanh toán được SePay xác nhận hoàn toàn tự động.</p>

            <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_200px_200px_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-xl border border-gray-700 bg-secondary py-3 pl-10 pr-4 text-white" placeholder="Tìm mã, seller, thiết bị, POI..." />
              </div>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-gray-700 bg-secondary px-4 py-3 text-white">
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Đang chờ</option>
                <option value="used">Đã kích hoạt</option>
                <option value="rejected">Đã từ chối</option>
              </select>
              <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border border-gray-700 bg-secondary px-4 py-3 text-white">
                <option value="all">Tất cả loại</option>
                <option value="user_plan">User mua gói</option>
                <option value="poi_upgrade">Nâng cấp POI</option>
                <option value="qr_topup">Nạp QR</option>
              </select>
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-gray-700 bg-secondary px-4 py-3 text-white">
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="amount_desc">Số tiền cao đến thấp</option>
                <option value="amount_asc">Số tiền thấp đến cao</option>
              </select>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-700 bg-secondary">
              {loading ? <p className="p-6 text-gray-400">Đang tải...</p> : null}
              {!loading && visiblePayments.length === 0 ? <p className="p-6 text-gray-400">Chưa có thanh toán phù hợp.</p> : null}
              {visiblePayments.length > 0 ? (
                <div className="hidden border-b border-gray-700 bg-dark/30 px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-gray-400 xl:grid xl:grid-cols-[1.4fr_1fr_160px_170px_120px]">
                  <span>Nội dung</span>
                  <span>Thông tin</span>
                  <span>Số tiền</span>
                  <span>Trạng thái</span>
                  <span>Chi tiết</span>
                </div>
              ) : null}
              {visiblePayments.map((payment) => (
                <div key={payment.id} className="grid gap-4 border-b border-gray-700 p-5 last:border-b-0 xl:grid-cols-[1.4fr_1fr_160px_170px_120px]">
                  <div>
                    <p className="font-bold text-white">{payment.poi_name || payment.plan_name || payment.description}</p>
                    <p className="mt-1 text-sm text-gray-400">{payment.description}</p>
                    <p className="mt-2 font-mono text-sm text-primary">{payment.code}</p>
                  </div>
                  <div className="text-sm text-gray-400">
                    <p>Người trả: {payment.owner_name || payment.device_name || payment.payer_type}</p>
                    <p>Loại: {payment.payment_type}</p>
                    <p>Tạo: {formatDate(payment.created_at)}</p>
                    <p>Xác nhận: {formatDate(payment.confirmed_at)}</p>
                  </div>
                  <p className="text-xl font-bold text-yellow-300">{formatSignedAmount(payment.amount, 'in')}</p>
                  <span className={`h-fit rounded-full px-3 py-1 text-center text-sm font-semibold ${statusClass(payment.status)}`}>{payment.status_label}</span>
                  <div className="flex items-start xl:justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedPayment(payment)}
                      className="rounded-lg bg-primary/15 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/25"
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {selectedPayment ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-5" onClick={() => setSelectedPayment(null)}>
          <div className="w-full max-w-3xl rounded-2xl border border-gray-700 bg-secondary p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-white">{selectedPayment.poi_name || selectedPayment.plan_name || selectedPayment.description}</h3>
                <p className="mt-1 font-mono text-sm text-primary">{selectedPayment.code}</p>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="text-2xl text-gray-400 hover:text-white">×</button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InfoCard label="Nội dung" value={selectedPayment.description} />
              <InfoCard label="Trạng thái" value={selectedPayment.status_label} />
              <InfoCard label="Số tiền" value={formatSignedAmount(selectedPayment.amount, 'in')} accent />
              <InfoCard label="Người trả" value={selectedPayment.owner_name || selectedPayment.device_name || selectedPayment.payer_type} />
              <InfoCard label="Email seller" value={selectedPayment.owner_email || 'Chưa có'} />
              <InfoCard label="Thiết bị" value={selectedPayment.device_name || 'Chưa có'} />
              <InfoCard label="ID thiết bị" value={selectedPayment.device_uuid || (selectedPayment.device_id ? `#${selectedPayment.device_id}` : 'Chưa có')} />
              <InfoCard label="Loại thanh toán" value={selectedPayment.payment_type} />
              <InfoCard label="POI / Gói" value={selectedPayment.poi_name || selectedPayment.plan_name || 'Chưa có'} />
              <InfoCard label="Ngày tạo" value={formatDate(selectedPayment.created_at)} />
              <InfoCard label="Ngày xác nhận" value={formatDate(selectedPayment.confirmed_at)} />
            </div>

            {selectedPayment.rejected_reason ? (
              <div className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <span className="font-semibold">Lý do từ chối:</span> {selectedPayment.rejected_reason}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </ProtectedRoute>
  )
}

function InfoCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-dark/40 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.08em] text-gray-500">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${accent ? 'text-yellow-300' : 'text-white'}`}>{value || 'Chưa có'}</p>
    </div>
  )
}
