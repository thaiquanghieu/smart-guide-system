import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import apiClient from '@/lib/api'
import { ArrowLeft, Edit2, Image as ImageIcon, Music, Globe2 } from 'lucide-react'

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5022/api').replace(/\/api\/?$/, '')

function assetUrl(url?: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`
}

type PoiDetail = {
  id: string
  name: string
  category?: string
  shortDescription?: string
  description?: string
  address?: string
  openTime?: string
  closeTime?: string
  priceText?: string
  phone?: string
  websiteUrl?: string
  status: string
  rejectedReason?: string
  latitude: number
  longitude: number
  listened_count: number
  rating_avg: number
  rating_count: number
  images: string[]
  translations: Array<{ languageCode: string; name?: string; description?: string; address?: string }>
  audios: Array<{ id: string; languageCode: string; languageName: string; scriptText: string; approvalStatus: string; rejectedReason?: string }>
}

export default function PoiDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [poi, setPoi] = useState<PoiDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || Array.isArray(id)) return
    apiClient
      .get(`/owner/pois/${id}`)
      .then((response) => setPoi(response.data))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <ProtectedRoute>
      <div className="flex bg-dark min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-6xl">
            <Link href="/pois" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6">
              <ArrowLeft size={20} />
              Quay lại POI
            </Link>

            {loading ? (
              <div className="text-gray-400">Đang tải...</div>
            ) : poi ? (
              <div className="space-y-6">
                <div className="bg-secondary border border-gray-700 rounded-2xl p-6">
                  <div className="flex flex-wrap justify-between gap-4">
                    <div>
                      <div className="flex gap-2 items-center mb-3">
                        <span className="px-3 py-1 rounded-full bg-primary/15 text-primary text-sm font-semibold whitespace-nowrap">{poi.status}</span>
                        {poi.rejectedReason && <span className="text-red-300 text-sm">Lý do: {poi.rejectedReason}</span>}
                      </div>
                      <h1 className="text-4xl font-bold text-white">{poi.name}</h1>
                      <p className="text-gray-400 mt-2">{poi.shortDescription || poi.description}</p>
                    </div>
                    <Link href={`/pois/${poi.id}/edit`} className="h-fit inline-flex items-center gap-2 px-4 py-3 bg-primary hover:bg-blue-700 text-white rounded-xl">
                      <Edit2 size={18} />
                      Sửa POI
                    </Link>
                  </div>
                  <div className="grid md:grid-cols-4 gap-4 mt-6">
                    <Info label="Danh mục" value={poi.category || '-'} />
                    <Info label="Giờ" value={poi.openTime || poi.closeTime ? `${poi.openTime || '?'} - ${poi.closeTime || '?'}` : '-'} />
                    <Info label="Giá" value={poi.priceText || '-'} />
                    <Info label="Lượt nghe" value={`${poi.listened_count}`} />
                  </div>
                  <div className="mt-6 text-gray-300">
                    <p>{poi.description}</p>
                    <p className="mt-3 text-gray-400">{poi.address}</p>
                    <p className="mt-2 text-gray-500">Tọa độ: {poi.latitude}, {poi.longitude}</p>
                  </div>
                </div>

                <Section title="Ảnh POI" icon={<ImageIcon size={20} />}>
                  {poi.images?.length ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {poi.images.map((image) => (
                        <a key={image} href={assetUrl(image)} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border border-gray-700 bg-dark/60">
                          <img src={assetUrl(image)} alt={poi.name} className="aspect-video w-full object-cover transition group-hover:scale-[1.02]" />
                          <div className="truncate px-3 py-2 text-xs text-gray-400">{image}</div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">Chưa có ảnh.</p>
                  )}
                </Section>

                <Section title="Bản dịch" icon={<Globe2 size={20} />}>
                  <div className="grid md:grid-cols-2 gap-4">
                    {poi.translations?.map((translation) => (
                      <div key={translation.languageCode} className="bg-dark/60 border border-gray-700 rounded-xl p-4">
                        <p className="text-primary font-bold">{translation.languageCode.toUpperCase()}</p>
                        <p className="text-white mt-2">{translation.name || '-'}</p>
                        <p className="text-gray-400 text-sm mt-2 line-clamp-3">{translation.description || '-'}</p>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section title="Audio/TTS" icon={<Music size={20} />}>
                  <div className="grid md:grid-cols-2 gap-4">
                    {poi.audios?.map((audio) => (
                      <div key={audio.id} className="bg-dark/60 border border-gray-700 rounded-xl p-4">
                        <div className="flex justify-between gap-2 mb-2">
                          <p className="text-white font-bold">{audio.languageName}</p>
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-400/10 text-yellow-300 whitespace-nowrap">{audio.approvalStatus}</span>
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-4">{audio.scriptText}</p>
                        {audio.rejectedReason && <p className="text-red-300 text-xs mt-2">{audio.rejectedReason}</p>}
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            ) : (
              <div className="text-red-300">Không tìm thấy POI.</div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-dark/60 border border-gray-700 rounded-xl p-4">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-white font-bold mt-1">{value}</p>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-secondary border border-gray-700 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">{icon}{title}</h2>
      {children}
    </div>
  )
}
