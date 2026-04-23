import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { MapPin, Volume2, QrCode, Clock } from 'lucide-react'

interface Analytics {
  total_pois: number
  total_listens: number
  avg_duration_seconds: number
  pending_pois: number
  approved_pois: number
  rejected_pois: number
  top_pois: Array<{ id: string; name: string; listened_count: number }>
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await apiClient.get('/owner/pois/analytics/summary')
        setAnalytics(response.data)
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  return (
    <ProtectedRoute>
      <div className="flex bg-dark min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl">
            <h1 className="text-4xl font-bold text-white mb-8">Dashboard</h1>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin">⏳</div>
                <p className="text-gray-400 mt-2">Đang tải dữ liệu...</p>
              </div>
            ) : analytics ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Link href="/pois" className="bg-secondary border border-gray-700 rounded-lg p-6 hover:border-primary/60 transition block">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">POI của bạn</p>
                        <p className="text-4xl font-bold text-white">
                          {analytics.total_pois}
                        </p>
                      </div>
                      <MapPin className="text-primary" size={32} />
                    </div>
                  </Link>

                  <Link href="/analytics" className="bg-secondary border border-gray-700 rounded-lg p-6 hover:border-primary/60 transition block">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Tổng lượt nghe</p>
                        <p className="text-4xl font-bold text-white">
                          {analytics.total_listens}
                        </p>
                      </div>
                      <Volume2 className="text-primary" size={32} />
                    </div>
                  </Link>

                  <Link href="/pois?status=pending" className="bg-secondary border border-gray-700 rounded-lg p-6 hover:border-yellow-400/60 transition block">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Chờ duyệt</p>
                        <p className="text-4xl font-bold text-white">
                          {analytics.pending_pois}
                        </p>
                        <p className="text-sm text-green-400 mt-2">{analytics.approved_pois} đã duyệt</p>
                      </div>
                      <Clock className="text-yellow-400" size={32} />
                    </div>
                  </Link>

                  <Link href="/qr" className="bg-secondary border border-gray-700 rounded-lg p-6 hover:border-primary/60 transition block">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">QR & chiến dịch</p>
                        <p className="text-4xl font-bold text-primary">QR</p>
                        <p className="text-sm text-gray-400 mt-2">Tạo, in và xem lượt quét</p>
                      </div>
                      <QrCode className="text-accent" size={32} />
                    </div>
                  </Link>
                </div>

                {/* Top POIs */}
                <div className="bg-secondary border border-gray-700 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-white mb-4">POI Hàng đầu</h2>
                  <div className="space-y-3">
                    {analytics.top_pois.length > 0 ? (
                      analytics.top_pois.map((poi, index) => (
                        <div
                          key={poi.id}
                          className="flex items-center justify-between bg-dark/50 p-4 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-primary w-8">
                              #{index + 1}
                            </span>
                            <span className="text-white">{poi.name}</span>
                          </div>
                          <span className="text-accent font-semibold">
                            {poi.listened_count} lượt
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400">Chưa có dữ liệu POI</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-red-400">Lỗi khi tải dữ liệu</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
