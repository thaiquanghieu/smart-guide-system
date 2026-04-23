import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuthStore } from '@/lib/store'
import apiClient from '@/lib/api'
import { Mail, Shield, Store, MapPin, Volume2 } from 'lucide-react'

interface UserProfile {
  id: number
  userName: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
}

export default function Profile() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      apiClient.get(`/Auth/user/${user.id}`).then((response) => setProfile(response.data)).catch(() => {
      setProfile({
        id: user.id,
        userName: user.userName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: new Date().toISOString(),
      })
      })
      apiClient.get('/owner/pois/analytics/summary').then((response) => setStats(response.data)).catch(() => {})
    }
    setLoading(false)
  }, [user])

  return (
    <ProtectedRoute>
      <div className="flex bg-dark min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-5xl">
            <h1 className="text-4xl font-bold text-white mb-8">Hồ sơ cá nhân</h1>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin">⏳</div>
              </div>
            ) : profile ? (
              <div className="space-y-6">
                {/* Profile Card */}
                <div className="bg-secondary border border-gray-700 rounded-2xl p-8">
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-3xl mb-4">
                      <Store size={38} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                      {profile.userName}
                    </h2>
                    <p className="text-accent flex items-center gap-2"><Mail size={16} />{profile.email}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-700">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Vai trò</p>
                      <p className="text-white font-semibold">
                        {profile.role === 'owner'
                          ? 'Chủ gian hàng'
                          : 'Người dùng'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Trạng thái</p>
                      <p className="text-green-400 font-semibold">
                        {profile.isActive ? 'Hoạt động' : 'Tạm dừng'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <Stat icon={<MapPin />} label="POI đang quản lý" value={stats?.total_pois ?? 0} />
                  <Stat icon={<Volume2 />} label="Tổng lượt nghe" value={stats?.total_listens ?? 0} />
                  <Stat icon={<Shield />} label="Chờ duyệt" value={stats?.pending_pois ?? 0} />
                </div>

                <div className="bg-secondary/50 border border-gray-700 rounded-2xl p-8">
                  <h2 className="text-xl font-bold text-white mb-4">Thông tin vận hành</h2>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <Info label="ID tài khoản" value={`#${profile.id}`} />
                    <Info label="Ngày tạo" value={profile.createdAt ? new Date(profile.createdAt).toLocaleString('vi-VN') : '-'} />
                    <Info label="Quyền truy cập" value="Quản lý POI, QR, Audio/TTS" />
                    <Info label="Ghi chú" value="Thông tin nhạy cảm cần đổi sẽ làm qua admin để đảm bảo an toàn." />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="bg-secondary border border-gray-700 rounded-2xl p-5">
      <div className="text-primary mb-3">{icon}</div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-dark/50 border border-gray-700 p-4">
      <p className="text-gray-400">{label}</p>
      <p className="text-white mt-1">{value}</p>
    </div>
  )
}
