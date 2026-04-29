import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'

type PaymentStatus = {
  id: number
  code: string
  amount: number
  status: string
  status_label: string
  description: string
  poi_name?: string
  qr_url?: string
  bank_name?: string
  account_number?: string
  account_name?: string
  transfer_content?: string
  rejected_reason?: string
}

export default function PoiUpgradePaymentPage() {
  const router = useRouter()
  const [payment, setPayment] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('Đang tải thanh toán...')
  const [showRejectedNotice, setShowRejectedNotice] = useState(false)
  const [canRetryRejected, setCanRetryRejected] = useState(false)
  const isExpired = payment?.status === 'rejected' && (payment?.rejected_reason || '').includes('hết thời gian chờ')

  const code = typeof router.query.code === 'string' ? router.query.code : ''

  useEffect(() => {
    if (!router.isReady) return
    if (!code) {
      router.replace('/pois/create')
      return
    }

    const load = async () => {
      try {
        const response = await apiClient.get('/owner/payments/status', { params: { code } })
        setPayment(response.data)
        setMessage(response.data?.status === 'rejected' ? response.data?.rejected_reason || 'Chưa ghi nhận giao dịch.' : 'Đang kiểm tra giao dịch từ SePay...')
      } catch (error: any) {
        setMessage(error?.response?.data?.message || 'Không tải được thanh toán nâng cấp.')
      }
    }

    load()
  }, [code, router, router.isReady])

  useEffect(() => {
    if (!payment || !code || payment.status !== 'pending') {
      return undefined
    }

    const timer = window.setInterval(async () => {
      try {
        const response = await apiClient.get('/owner/payments/status', { params: { code } })
        const nextPayment = response.data as PaymentStatus
        setPayment(nextPayment)

        if (nextPayment.status === 'used' || nextPayment.status === 'confirmed') {
          setMessage('Thanh toán thành công. Hệ thống sẽ chuyển về danh sách POI...')
          window.clearInterval(timer)
          setTimeout(() => router.replace('/pois?payment=success'), 1400)
          return
        }

        if (nextPayment.status === 'rejected') {
          setMessage(nextPayment.rejected_reason || 'Chưa ghi nhận giao dịch. Vui lòng kiểm tra lại nội dung chuyển khoản.')
          setCanRetryRejected(true)
          return
        }

        setMessage('Đang kiểm tra giao dịch từ SePay...')
      } catch {
        // silent polling
      }
    }, 3000)

    return () => window.clearInterval(timer)
  }, [code, payment, router])

  const confirmPayment = async () => {
    if (!payment) return

    if (payment.status === 'rejected' && !canRetryRejected) {
      setShowRejectedNotice(true)
      return
    }

    setLoading(true)
    try {
      const response = await apiClient.post('/owner/payments/submit', null, {
        params: { code },
      })
      setPayment((prev) => ({ ...(prev || payment), ...(response.data?.payment || {}) }))
      setMessage(response.data?.message || 'Đang kiểm tra giao dịch từ SePay...')
      setCanRetryRejected(response.data?.payment?.status === 'rejected')
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không kiểm tra được trạng thái thanh toán.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-dark">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-3xl">
            <button onClick={() => router.back()} className="mb-6 text-gray-400 hover:text-white">
              ← Quay lại
            </button>
            <h1 className="text-4xl font-bold text-white">Thanh toán nâng cấp POI</h1>
            <p className="mt-2 text-gray-400">Lưu ý: hãy ghi đúng nội dung chuyển khoản. Giao dịch sẽ tự hết hạn nếu để quá lâu.</p>

            {payment ? (
              <div className="mt-8 grid gap-6 md:grid-cols-[280px,1fr]">
                <div className="rounded-2xl border border-gray-700 bg-secondary p-5">
                  <div className="rounded-2xl bg-white p-4">
                    <img src={payment.qr_url} alt="QR thanh toán" className="mx-auto h-[240px] w-[240px] max-w-full object-contain" />
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-gray-700 bg-secondary p-6">
                  <div>
                    <p className="text-sm text-gray-400">POI nháp</p>
                    <p className="text-xl font-bold text-white">{payment.poi_name || 'POI mới'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Nâng cấp</p>
                    <p className="text-white">{payment.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Số tiền</p>
                    <p className="text-3xl font-bold text-yellow-300">{payment.amount.toLocaleString('vi-VN')}đ</p>
                  </div>
                  <div className="rounded-xl bg-dark/60 p-4 text-gray-200">
                    <p>{payment.bank_name || 'VietinBank'}</p>
                    <p>{payment.account_number || '109881770761'}</p>
                    <p>{payment.account_name || 'THAI QUANG HIEU'}</p>
                    <p className="mt-3 text-sm text-gray-400">Nội dung chuyển khoản</p>
                    <p className="font-bold text-primary">{payment.transfer_content || payment.code}</p>
                  </div>

                  {message ? (
                    <p className={`rounded-xl p-3 text-sm ${payment.status === 'rejected' ? 'bg-red-500/10 text-red-200' : 'bg-dark/60 text-gray-200'}`}>
                      {message}
                    </p>
                  ) : null}

                  <button
                    onClick={confirmPayment}
                    disabled={loading || payment.status === 'used' || payment.status === 'confirmed' || isExpired}
                    className={`w-full rounded-xl py-4 font-bold disabled:opacity-60 ${
                      isExpired ? 'bg-gray-600 text-white' : 'bg-yellow-400 text-black hover:bg-yellow-300'
                    }`}
                  >
                    {loading
                      ? 'Đang gửi...'
                      : isExpired
                        ? 'Đã hết hạn thanh toán'
                      : payment.status === 'used' || payment.status === 'confirmed'
                        ? 'Thanh toán thành công'
                        : payment.status === 'rejected' && canRetryRejected
                          ? 'Kiểm tra lại thanh toán'
                            : 'Tôi đã thanh toán'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-8 text-gray-300">{message}</p>
            )}
          </div>
        </main>
      </div>

      {showRejectedNotice ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-5">
          <div className="w-full max-w-[380px] rounded-2xl bg-secondary p-6">
            <h3 className="text-xl font-bold text-white">Chưa ghi nhận giao dịch</h3>
            <p className="mt-3 text-sm leading-6 text-gray-300">
              {payment?.rejected_reason || 'SePay chưa ghi nhận giao dịch này. Vui lòng kiểm tra lại chuyển khoản rồi bấm kiểm tra lại thanh toán.'}
            </p>
            <button
              onClick={() => {
                setShowRejectedNotice(false)
                setCanRetryRejected(true)
              }}
              className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </ProtectedRoute>
  )
}
