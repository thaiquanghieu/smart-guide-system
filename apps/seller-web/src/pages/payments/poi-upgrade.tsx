import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'

type PendingUpgrade = {
  payload: Record<string, any>
  payment: {
    code: string
    amount: number
    description: string
    poiName: string
  }
}

export default function PoiUpgradePaymentPage() {
  const router = useRouter()
  const [pending, setPending] = useState<PendingUpgrade | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = sessionStorage.getItem('pendingPoiUpgrade')
    if (!raw) {
      router.replace('/pois/create')
      return
    }

    try {
      setPending(JSON.parse(raw))
    } catch {
      sessionStorage.removeItem('pendingPoiUpgrade')
      router.replace('/pois/create')
    }
  }, [router])

  const qrUrl = useMemo(() => {
    if (!pending) return ''
    return `https://img.vietqr.io/image/TCB-4001012005-compact2.png?amount=${pending.payment.amount}&addInfo=${encodeURIComponent(pending.payment.code)}&accountName=THAI%20QUANG%20HIEU`
  }, [pending])

  const confirmPayment = async () => {
    if (!pending) return
    setLoading(true)
    setMessage('')

    try {
      await apiClient.post('/owner/pois', pending.payload)
      sessionStorage.removeItem('pendingPoiUpgrade')
      setMessage('Đã gửi POI và yêu cầu thanh toán cho admin duyệt.')
      setTimeout(() => router.replace('/pois'), 700)
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không gửi được POI sau thanh toán. Vui lòng kiểm tra lại.')
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
            <p className="mt-2 text-gray-400">Chuyển khoản theo mã bên dưới, sau đó bấm xác nhận để gửi POI cho admin duyệt.</p>

            {pending ? (
              <div className="mt-8 grid gap-6 md:grid-cols-[280px,1fr]">
                <div className="rounded-2xl border border-gray-700 bg-secondary p-5">
                  <div className="rounded-2xl bg-white p-4">
                    <img src={qrUrl} alt="QR thanh toán" className="mx-auto h-[220px] w-[220px] object-contain" />
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-gray-700 bg-secondary p-6">
                  <div>
                    <p className="text-sm text-gray-400">POI</p>
                    <p className="text-xl font-bold text-white">{pending.payment.poiName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Nâng cấp</p>
                    <p className="text-white">{pending.payment.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Số tiền</p>
                    <p className="text-3xl font-bold text-yellow-300">{pending.payment.amount.toLocaleString('vi-VN')}đ</p>
                  </div>
                  <div className="rounded-xl bg-dark/60 p-4 text-gray-200">
                    <p>Techcombank</p>
                    <p>4001012005</p>
                    <p>THAI QUANG HIEU</p>
                    <p className="mt-3 text-sm text-gray-400">Nội dung chuyển khoản</p>
                    <p className="font-bold text-primary">{pending.payment.code}</p>
                  </div>

                  {message ? <p className="rounded-xl bg-dark/60 p-3 text-sm text-gray-200">{message}</p> : null}

                  <button
                    onClick={confirmPayment}
                    disabled={loading}
                    className="w-full rounded-xl bg-yellow-400 py-4 font-bold text-dark hover:bg-yellow-300 disabled:opacity-60"
                  >
                    {loading ? 'Đang gửi...' : 'Tôi đã thanh toán'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
