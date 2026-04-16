import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { BarChart3, TrendingUp } from 'lucide-react'

interface Analytics {
  users: { total: number; owners: number }
  pois: { total: number; approved: number; pending: number; rejected: number }
  listens: { total: number; avg_duration_seconds: number }
  top_pois: Array<{ id: string; name: string; listened_count: number }>
  top_owners: Array<{ owner_id: number; poi_count: number; total_listens: number }>
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await apiClient.get('/admin/analytics/dashboard')
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
        <main className="flex-1 p-8 bg-gradient-to-br from-dark via-secondary/10 to-dark">
          <div className="max-w-7xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-5xl font-bold text-white mb-2">📈 Thống Kê Hệ Thống</h1>
              <p className="text-gray-400">Phân tích chi tiết dữ liệu Smart Guide</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="inline-block animate-spin text-4xl mb-3">⏳</div>
                  <p className="text-gray-400">Đang tải dữ liệu...</p>
                </div>
              </div>
            ) : analytics ? (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-secondary to-secondary/50 border border-blue-500/30 rounded-xl p-6 hover:border-blue-500/60 transition shadow-lg hover:shadow-blue-500/20">
                    <p className="text-gray-400 text-sm font-medium mb-2">👥 Tổng Users</p>
                    <p className="text-4xl font-bold text-white mb-2">
                      {analytics.users.total}
                    </p>
                    <p className="text-sm text-blue-400">
                      🏪 {analytics.users.owners} chủ gian hàng
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-secondary to-secondary/50 border border-green-500/30 rounded-xl p-6 hover:border-green-500/60 transition shadow-lg hover:shadow-green-500/20">
                    <p className="text-gray-400 text-sm font-medium mb-2">📍 Tổng POI</p>
                    <p className="text-4xl font-bold text-white mb-2">
                      {analytics.pois.total}
                    </p>
                    <p className="text-sm text-green-400">
                      ✅ {analytics.pois.approved} phê duyệt
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-secondary to-secondary/50 border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 transition shadow-lg hover:shadow-purple-500/20">
                    <p className="text-gray-400 text-sm font-medium mb-2">🎵 Tổng Nghe</p>
                    <p className="text-4xl font-bold text-white mb-2">
                      {analytics.listens.total}
                    </p>
                    <p className="text-sm text-purple-400">
                      ⏱️ {analytics.listens.avg_duration_seconds}s trung bình
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-secondary to-secondary/50 border border-yellow-500/30 rounded-xl p-6 hover:border-yellow-500/60 transition shadow-lg hover:shadow-yellow-500/20">
                    <p className="text-gray-400 text-sm font-medium mb-2">⏳ Chờ Duyệt</p>
                    <p className="text-4xl font-bold text-yellow-400 mb-2">
                      {analytics.pois.pending}
                    </p>
                    <p className="text-sm text-yellow-400">
                      ❌ {analytics.pois.rejected} từ chối
                    </p>
                  </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Top POIs */}
                  <div className="bg-gradient-to-br from-secondary to-secondary/50 border border-gray-700 rounded-xl p-6 shadow-lg">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                      🏆 Top POI
                    </h2>
                    <div className="space-y-3">
                      {analytics.top_pois.length > 0 ? (
                        analytics.top_pois.map((poi, idx) => (
                          <div
                            key={poi.id}
                            className="flex justify-between items-center bg-gradient-to-r from-dark/50 to-dark/30 p-4 rounded-lg border border-gray-700/50 hover:border-primary/50 hover:bg-dark/70 transition group"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-lg font-bold text-primary bg-primary/20 w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-primary/30 transition">
                                #{idx + 1}
                              </span>
                              <span className="text-white font-semibold truncate">
                                {poi.name}
                              </span>
                            </div>
                            <span className="text-accent font-bold text-lg ml-2">
                              {poi.listened_count}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-center py-8">📊 Chưa có dữ liệu</p>
                      )}
                    </div>
                  </div>

                  {/* Top Owners */}
                  <div className="bg-gradient-to-br from-secondary to-secondary/50 border border-gray-700 rounded-xl p-6 shadow-lg">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                      ⭐ Top Chủ Gian Hàng
                    </h2>
                    <div className="space-y-3">
                      {analytics.top_owners.length > 0 ? (
                        analytics.top_owners.map((owner, idx) => (
                          <div
                            key={owner.owner_id}
                            className="flex justify-between items-center bg-gradient-to-r from-dark/50 to-dark/30 p-4 rounded-lg border border-gray-700/50 hover:border-primary/50 hover:bg-dark/70 transition group"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-lg font-bold text-primary bg-primary/20 w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-primary/30 transition">
                                #{idx + 1}
                              </span>
                              <div>
                                <p className="text-white font-semibold">
                                  Owner #{owner.owner_id}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {owner.poi_count} POI
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-accent font-bold text-lg">
                                {owner.total_listens}
                              </p>
                              <p className="text-xs text-gray-400">lượt nghe</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-center py-8">📊 Chưa có dữ liệu</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <p className="text-red-400 text-lg">❌ Lỗi khi tải dữ liệu</p>
                  <button
                    onClick={() => fetchAnalytics()}
                    className="mt-4 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Thử lại
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
