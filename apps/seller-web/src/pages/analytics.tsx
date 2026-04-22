import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Analytics {
  total_pois: number
  total_listens: number
  avg_duration_seconds: number
  top_pois: Array<{ id: string; name: string; listened_count: number }>
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

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

  return (
    <ProtectedRoute>
      <div className="flex bg-dark min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl">
            <h1 className="text-4xl font-bold text-white mb-8">Thống kê</h1>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin">⏳</div>
                <p className="text-gray-400 mt-2">Đang tải dữ liệu...</p>
              </div>
            ) : analytics ? (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-secondary border border-gray-700 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-gray-400 text-sm">Tổng lượt nghe</p>
                        <p className="text-4xl font-bold text-white mt-2">
                          {analytics.total_listens}
                        </p>
                      </div>
                      <TrendingUp className="text-primary" size={24} />
                    </div>
                    <p className="text-accent text-sm">↗ +12% từ tháng trước</p>
                  </div>

                  <div className="bg-secondary border border-gray-700 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-gray-400 text-sm">Thời lượng trung bình</p>
                        <p className="text-4xl font-bold text-white mt-2">
                          {analytics.avg_duration_seconds}s
                        </p>
                      </div>
                      <TrendingDown className="text-yellow-400" size={24} />
                    </div>
                    <p className="text-gray-400 text-sm">Mỗi lần nghe</p>
                  </div>

                  <div className="bg-secondary border border-gray-700 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-gray-400 text-sm">POI của bạn</p>
                        <p className="text-4xl font-bold text-white mt-2">
                          {analytics.total_pois}
                        </p>
                      </div>
                      <div className="text-3xl">📍</div>
                    </div>
                    <p className="text-accent text-sm">Điểm đến hoạt động</p>
                  </div>
                </div>

                {/* Top POIs Chart */}
                <div className="bg-secondary border border-gray-700 rounded-lg p-6 mb-8">
                  <h2 className="text-2xl font-bold text-white mb-6">Top POI</h2>
                  <div className="space-y-4">
                    {analytics.top_pois.length > 0 ? (
                      analytics.top_pois.map((poi, index) => {
                        const maxListens = Math.max(
                          ...analytics.top_pois.map((p) => p.listened_count)
                        )
                        const percentage = (poi.listened_count / maxListens) * 100

                        return (
                          <div key={poi.id}>
                            <div className="flex justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-primary w-8">
                                  #{index + 1}
                                </span>
                                <span className="text-white font-medium">
                                  {poi.name}
                                </span>
                              </div>
                              <span className="text-accent font-semibold">
                                {poi.listened_count}
                              </span>
                            </div>
                            <div className="w-full bg-dark rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-primary to-accent h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-gray-400 text-center py-8">
                        Chưa có dữ liệu
                      </p>
                    )}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-secondary border border-gray-700 rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    Hoạt động gần đây
                  </h2>
                  <div className="text-center py-8 text-gray-400">
                    Sẽ cập nhật sớm
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
