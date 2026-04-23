import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/lib/store'
import { useState } from 'react'
import { LogOut, LayoutDashboard, MapPin, BarChart3, User, QrCode } from 'lucide-react'

export default function Sidebar() {
  const router = useRouter()
  const { logout } = useAuthStore()
  const [showConfirm, setShowConfirm] = useState(false)

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pois', label: 'Quản lý POI', icon: MapPin },
    { href: '/qr', label: 'QR', icon: QrCode },
    { href: '/analytics', label: 'Thống kê', icon: BarChart3 },
    { href: '/profile', label: 'Hồ sơ', icon: User },
  ]

  const handleLogout = () => {
    localStorage.removeItem('userId')
    logout()
    router.push('/')
  }

  return (
    <aside className="w-64 bg-secondary border-r border-gray-700 h-screen sticky top-0 p-6 flex flex-col">
      {/* Logo */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-3xl">📍</div>
          <div>
            <div className="font-bold text-white">Smart Guide</div>
            <div className="text-xs text-accent">Owner</div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = router.pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:bg-secondary/50'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-red-200 hover:bg-red-500/15 hover:border-red-500/40 border border-transparent transition"
      >
        <LogOut size={20} />
        <span>Đăng xuất</span>
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-secondary border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Xác nhận đăng xuất</h3>
            <p className="text-gray-400 mb-6">Bạn chắc chắn muốn rời khỏi trang seller?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 bg-dark text-gray-300 py-2 rounded-lg hover:text-white">
                Hủy
              </button>
              <button onClick={handleLogout} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
