import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { Users, MapPin, Volume2, TrendingUp } from 'lucide-react'

interface DashboardStats {
  users: { total: number; owners: number }
  pois: { total: number; approved: number; pending: number; rejected: number }
  listens: { total: number; avg_duration_seconds: number }
  top_pois: Array<{ id: string; name: string; listened_count: number }>
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/admin/analytics/dashboard')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
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
              <h1 className="text-5xl font-bold text-white mb-2">📊 Admin Dashboard</h1>
              <p className="text-gray-400">Quản lý toàn bộ hệ thống Smart Guide</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="inline-block animate-spin text-4xl mb-3">⏳</div>
                  <p className="text-gray-400">Đang tải dữ liệu...</p>
                </div>
              </div>
            ) : stats ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {/* Users Card */}
                  <div className="bg-gradient-to-br from-secondary to-secondary/50 border border-blue-500/30 rounded-xl p-6 hover:border-blue-500/60 transition shadow-lg hover:shadow-blue-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm font-medium mb-2">👥 Tổng Users</p>
                        <p className="text-4xl font-bold text-white">
                          {stats.users.total}
                        </p>
                        <p className="text-sm text-blue-400 mt-2">
                          🏪 {stats.users.owners} chủ gian hàng
                        </p>
                      </div>
                      <div className="text-5xl opacity-20">👥</div>
                    </div>
                  </div>

                  {/* POI Card */}
                  <div className="bg-gradient-to-br from-secondary to-secondary/50 border border-green-500/30 rounded-xl p-6 hover:border-green-500/60 transition shadow-lg hover:shadow-green-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm font-medium mb-2">📍 Tổng POI</p>
                        <p className="text-4xl font-bold text-white">
                          {stats.pois.total}
                        </p>
                        <div className="text-sm space-y-1 mt-2">
                          <p className="text-green-400">✅ {stats.pois.approved} phê duyệt</p>
                          <p className="text-yellow-400">⏳ {stats.pois.pending} chờ duyệt</p>
                        </div>
                      </div>
                      <div className="text-5xl opacity-20">📍</div>
                    </div>
                  </div>

                  {/* Listens Card */}
                  <div className="bg-gradient-to-br from-secondary to-secondary/50 border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 transition shadow-lg hover:shadow-purple-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm font-medium mb-2">🎵 Lượt Nghe</p>
                        <p className="text-4xl font-bold text-white">
                          {stats.listens.total}
                        </p>
                        <p className="text-sm text-purple-400 mt-2">
                          ⏱️ {stats.listens.avg_duration_seconds}s trung bình
                        </p>
                      </div>
                      <div className="text-5xl opacity-20">🎵</div>
                    </div>
                  </div>

                  {/* Status Card */}
                  <div className="bg-gradient-to-br from-secondary to-secondary/50 border border-emerald-500/30 rounded-xl p-6 hover:border-emerald-500/60 transition shadow-lg hover:shadow-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm font-medium mb-2">🟢 Trạng Thái</p>
                        <p className="text-3xl font-bold text-emerald-400">Hoạt Động</p>
                        <p className="text-sm text-emerald-400 mt-2">
                          ✓ Hệ thống hoạt động bình thường
                        </p>
                      </div>
                      <div className="text-5xl opacity-20">🟢</div>
                    </div>
                  </div>
                </div>

                {/* Top POIs Section */}
                <div className="bg-gradient-to-br from-secondary to-secondary/50 border border-gray-700 rounded-xl p-6 shadow-lg">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      🏆 POI Hàng Đầu
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Những điểm đến được nghe nhiều nhất</p>
                  </div>

                  {stats.top_pois.length > 0 ? (
                    <div className="space-y-3">
                      {stats.top_pois.map((poi, index) => (
                        <div
                          key={poi.id}
                          className="flex items-center justify-between bg-gradient-to-r from-dark/50 to-dark/30 p-4 rounded-lg border border-gray-700/50 hover:border-primary/50 hover:bg-dark/70 transition group"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <span className="text-lg font-bold text-primary bg-primary/20 w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-primary/30 transition">
                              #{index + 1}
                            </span>
                            <div>
                              <p className="text-white font-semibold">{poi.name}</p>
                              <p className="text-gray-400 text-sm">ID: {poi.id}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-accent font-bold text-lg">
                              {poi.listened_count}
                            </p>
                            <p className="text-gray-400 text-xs">lượt nghe</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400">📊 Chưa có dữ liệu POI</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <p className="text-red-400 text-lg">❌ Lỗi khi tải dữ liệu</p>
                  <button
                    onClick={() => fetchStats()}
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
