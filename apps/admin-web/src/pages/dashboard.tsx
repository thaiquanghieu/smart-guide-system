import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { Users, MapPin, Smartphone, Store } from 'lucide-react'

interface DashboardStats {
  users: { total: number; owners: number; admins: number }
  devices: { total: number; online: number; banned: number }
  pois: { total: number; approved: number; pending: number; rejected: number }
  listens: { total: number; avg_duration_seconds: number }
  top_pois: Array<{ id: string; name: string; listened_count: number }>
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    const interval = window.setInterval(() => {
      void fetchStats(true)
    }, 4000)

    return () => window.clearInterval(interval)
  }, [])

  const fetchStats = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const response = await apiClient.get('/admin/analytics/dashboard')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      if (!silent) setLoading(false)
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
                  <Link href="/devices" className="bg-gradient-to-br from-secondary to-secondary/50 border border-emerald-500/30 rounded-xl p-6 hover:border-emerald-500/60 transition shadow-lg hover:shadow-emerald-500/20 block">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm font-medium mb-2">Thiết bị đang truy cập</p>
                        <p className="text-4xl font-bold text-white">
                          {stats.devices?.online || 0}
                        </p>
                        <p className="text-sm text-gray-400 mt-2">{stats.devices?.total || 0} thiết bị</p>
                        <p className="text-sm text-red-400 mt-1">{stats.devices?.banned || 0} bị banned</p>
                      </div>
                      <Smartphone className="text-emerald-400" size={40} />
                    </div>
                  </Link>

                  <Link href="/users" className="bg-gradient-to-br from-secondary to-secondary/50 border border-blue-500/30 rounded-xl p-6 hover:border-blue-500/60 transition shadow-lg hover:shadow-blue-500/20 block">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm font-medium mb-2">Tổng tài khoản</p>
                        <p className="text-4xl font-bold text-white">
                          {stats.users.total}
                        </p>
                        <p className="text-sm text-blue-400 mt-2">{stats.users.owners} seller</p>
                        <p className="text-sm text-red-400 mt-1">{stats.users.admins} admin</p>
                      </div>
                      <Users className="text-blue-400" size={40} />
                    </div>
                  </Link>

                  <Link href="/users" className="bg-gradient-to-br from-secondary to-secondary/50 border border-cyan-500/30 rounded-xl p-6 hover:border-cyan-500/60 transition shadow-lg hover:shadow-cyan-500/20 block">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm font-medium mb-2">Seller đang quản lý</p>
                        <p className="text-4xl font-bold text-white">
                          {stats.users.owners}
                        </p>
                        <p className="text-sm text-gray-400 mt-2">Bấm để quản lý tài khoản</p>
                      </div>
                      <Store className="text-cyan-400" size={40} />
                    </div>
                  </Link>

                  <Link href="/pois?openApproval=1" className="bg-gradient-to-br from-secondary to-secondary/50 border border-yellow-500/30 rounded-xl p-6 hover:border-yellow-500/60 transition shadow-lg hover:shadow-yellow-500/20 block">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm font-medium mb-2">POI chờ duyệt</p>
                        <p className="text-4xl font-bold text-yellow-400">{stats.pois.pending}</p>
                        <p className="text-sm text-green-400 mt-2">{stats.pois.approved} đã duyệt</p>
                      </div>
                      <MapPin className="text-yellow-400" size={40} />
                    </div>
                  </Link>
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
