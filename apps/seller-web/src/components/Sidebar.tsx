import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/lib/store'
import { LogOut, LayoutDashboard, MapPin, Music, BarChart3, User, QrCode } from 'lucide-react'

export default function Sidebar() {
  const router = useRouter()
  const { logout } = useAuthStore()

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pois', label: 'Quản lý POI', icon: MapPin },
    { href: '/audio', label: 'Audio/TTS', icon: Music },
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
    <aside className="w-64 bg-secondary border-r border-gray-700 min-h-screen p-6 flex flex-col">
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
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-secondary/50 transition"
      >
        <LogOut size={20} />
        <span>Đăng xuất</span>
      </button>
    </aside>
  )
}
