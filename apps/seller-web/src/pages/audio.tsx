import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { Music, Edit2, CheckCircle, Clock, XCircle } from 'lucide-react'

type Poi = {
  id: string
  name: string
  status: string
  audios: Array<{
    id: string
    languageCode: string
    languageName: string
    scriptText: string
    approvalStatus: string
    rejectedReason?: string
  }>
}

export default function AudioPage() {
  const [pois, setPois] = useState<Poi[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get('/owner/pois')
      .then((response) => setPois(response.data))
      .finally(() => setLoading(false))
  }, [])

  const audios = pois.flatMap((poi) => (poi.audios || []).map((audio) => ({ ...audio, poi })))

  const iconFor = (status: string) => {
    if (status === 'approved') return <CheckCircle className="text-green-400" size={18} />
    if (status === 'rejected') return <XCircle className="text-red-400" size={18} />
    return <Clock className="text-yellow-400" size={18} />
  }

  return (
    <ProtectedRoute>
      <div className="flex bg-dark min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl">
            <div className="flex justify-between gap-4 items-start mb-8">
              <div>
                <h1 className="text-4xl font-bold text-white">Audio/TTS</h1>
                <p className="text-gray-400 mt-2">Quản lý lời thuyết minh theo từng POI và từng ngôn ngữ.</p>
              </div>
              <Link href="/pois" className="bg-primary hover:bg-blue-700 text-white px-4 py-3 rounded-xl">
                Quản lý trong POI
              </Link>
            </div>

            {loading ? (
              <p className="text-gray-400">Đang tải...</p>
            ) : audios.length ? (
              <div className="grid md:grid-cols-2 gap-4">
                {audios.map((item) => (
                  <div key={item.id} className="bg-secondary border border-gray-700 rounded-2xl p-5">
                    <div className="flex justify-between gap-3 mb-3">
                      <div>
                        <p className="text-white font-bold">{item.poi.name}</p>
                        <p className="text-primary text-sm">{item.languageName || item.languageCode}</p>
                      </div>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        {iconFor(item.approvalStatus)}
                        <span className="text-gray-300 text-sm">{item.approvalStatus}</span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-4">{item.scriptText}</p>
                    {item.rejectedReason && <p className="text-red-300 text-sm mt-3">Lý do: {item.rejectedReason}</p>}
                    <Link href={`/pois/${item.poi.id}/edit`} className="inline-flex items-center gap-2 mt-4 text-primary hover:underline">
                      <Edit2 size={16} />
                      Sửa script/audio
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-secondary border border-dashed border-gray-700 rounded-2xl p-10 text-center">
                <Music className="mx-auto text-gray-500 mb-3" size={48} />
                <p className="text-gray-400">Chưa có audio. Hãy vào tạo/sửa POI để thêm lời thuyết minh.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
