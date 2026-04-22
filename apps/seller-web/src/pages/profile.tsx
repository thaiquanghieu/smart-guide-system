import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuthStore } from '@/lib/store'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      setProfile({
        id: user.id,
        userName: user.userName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: new Date().toISOString(),
      })
    }
    setLoading(false)
  }, [user])

  return (
    <ProtectedRoute>
      <div className="flex bg-dark min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold text-white mb-8">Hồ sơ cá nhân</h1>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin">⏳</div>
              </div>
            ) : profile ? (
              <div className="space-y-6">
                {/* Profile Card */}
                <div className="bg-secondary border border-gray-700 rounded-lg p-8">
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-3xl mb-4">
                      👤
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                      {profile.userName}
                    </h2>
                    <p className="text-accent">{profile.email}</p>
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

                {/* Coming Soon */}
                <div className="bg-secondary/50 border border-dashed border-gray-600 rounded-lg p-8 text-center">
                  <p className="text-gray-400 mb-3">🚀 Tính năng sắp có</p>
                  <ul className="text-left space-y-2 text-gray-400 max-w-xs mx-auto text-sm">
                    <li>✓ Cập nhật thông tin hồ sơ</li>
                    <li>✓ Đổi mật khẩu</li>
                    <li>✓ Cài đặt thông báo</li>
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
