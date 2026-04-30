import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAdminStore } from '@/lib/store'
import { useState } from 'react'
import { LogOut, LayoutDashboard, MapPin, Users, BarChart3, QrCode, Smartphone, CreditCard, Package } from 'lucide-react'

export default function Sidebar() {
  const router = useRouter()
  const { logout } = useAdminStore()
  const [showConfirm, setShowConfirm] = useState(false)

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/users', label: 'Quản lý tài khoản', icon: Users },
    { href: '/devices', label: 'Quản lý thiết bị', icon: Smartphone },
    { href: '/pois', label: 'Quản lý POI', icon: MapPin },
    { href: '/qr', label: 'Quản lý QR', icon: QrCode },
    { href: '/plans', label: 'Quản lý gói', icon: Package },
    { href: '/payments', label: 'Thanh toán', icon: CreditCard },
    { href: '/analytics', label: 'Thống kê', icon: BarChart3 },
  ]

  const handleLogout = () => {
    localStorage.removeItem('adminId')
    logout()
    router.push('/')
  }

  return (
    <aside className="w-64 overflow-visible bg-secondary border-r border-gray-700 h-screen sticky top-0 px-6 pb-6 pt-4 flex flex-col">
      <Link href="/dashboard" className="mb-8 flex flex-col items-center overflow-visible pt-0 text-center">
        <div className="flex h-44 items-start justify-center overflow-visible">
          <img src="/assets/appiconfg.png" alt="Smart Guide" className="-mt-4 h-40 w-auto object-contain" />
        </div>
        <div className="-mt-2 text-xs uppercase leading-none tracking-[0.3em] text-danger">Admin</div>
      </Link>

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
            <p className="text-gray-400 mb-6">Bạn chắc chắn muốn rời khỏi trang admin?</p>
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
