import Link from 'next/link'
import { useRouter } from 'next/router'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import PoiForm from '@/components/PoiForm'
import { ArrowLeft } from 'lucide-react'

export default function CreatePOI() {
  const router = useRouter()

  return (
    <ProtectedRoute>
      <div className="flex bg-dark min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-5xl">
            <Link href="/pois" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition">
              <ArrowLeft size={20} />
              Quay lại danh sách
            </Link>
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white">Tạo POI mới</h1>
              <p className="text-gray-400 mt-2">Điền thông tin, thêm bản dịch và lời thuyết minh rồi gửi admin duyệt.</p>
            </div>
            <PoiForm mode="create" onDone={() => router.push('/pois')} />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
