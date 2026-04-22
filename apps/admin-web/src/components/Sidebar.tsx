import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAdminStore } from '@/lib/store'
import { LogOut, LayoutDashboard, CheckCircle, Users, BarChart3, QrCode } from 'lucide-react'

export default function Sidebar() {
  const router = useRouter()
  const { logout } = useAdminStore()

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/users', label: 'Quản lý tài khoản', icon: Users },
    { href: '/pois', label: 'Duyệt POI', icon: CheckCircle },
    { href: '/qr', label: 'Quản lý QR', icon: QrCode },
    { href: '/analytics', label: 'Thống kê', icon: BarChart3 },
  ]

  const handleLogout = () => {
    localStorage.removeItem('adminId')
    logout()
    router.push('/')
  }

  return (
    <aside className="w-64 bg-secondary border-r border-gray-700 min-h-screen p-6 flex flex-col">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-3xl">🔐</div>
          <div>
            <div className="font-bold text-white">Smart Guide</div>
            <div className="text-xs text-danger">Admin</div>
          </div>
        </div>
      </div>

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
                  ? 'bg-danger text-white'
                  : 'text-gray-300 hover:bg-secondary/50'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

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
