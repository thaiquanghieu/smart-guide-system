import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import PoiForm, { PoiFormValue } from '@/components/PoiForm'
import apiClient from '@/lib/api'
import { ArrowLeft } from 'lucide-react'

const CATEGORY_OPTIONS = ['Y tế', 'Giáo dục', 'Văn hóa', 'Lịch sử', 'Kiến trúc', 'Tôn giáo', 'Thiên nhiên', 'Ẩm thực', 'Mua sắm', 'Giải trí']

export default function EditPOI() {
  const router = useRouter()
  const { id } = router.query
  const [initialValue, setInitialValue] = useState<Partial<PoiFormValue> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || Array.isArray(id)) return
    apiClient
      .get(`/owner/pois/${id}`)
      .then((response) => {
        const poi = response.data
        const selectedLanguages = (poi.translations || []).map((x: any) => x.languageCode) || ['vi']
        const translations: any = {}
        ;(poi.translations || []).forEach((item: any) => {
          translations[item.languageCode] = {
            languageCode: item.languageCode,
            name: item.name || '',
            category: item.category || '',
            shortDescription: item.shortDescription || '',
            description: item.description || '',
            address: item.address || '',
            priceText: item.priceText || '',
          }
        })
        const audios: any = {}
        ;(poi.audios || []).forEach((item: any) => {
          audios[item.languageCode] = {
            languageCode: item.languageCode,
            languageName: item.languageName || item.languageCode,
            voiceName: item.voiceName || 'System',
            scriptText: item.scriptText || '',
            audioUrl: item.audioUrl || '',
          }
        })
        const categories = Array.isArray(poi.categories) && poi.categories.length ? poi.categories : (poi.category ? [poi.category] : [])
        const selectedCategories = categories.filter((category: string) => CATEGORY_OPTIONS.includes(category))
        const customCategory = categories.filter((category: string) => !CATEGORY_OPTIONS.includes(category)).join(', ')

        setInitialValue({
          name: poi.name || '',
          shortDescription: poi.shortDescription || '',
          description: poi.description || '',
          address: poi.address || '',
          category: poi.category || '',
          selectedCategories,
          customCategory,
          openTime: poi.openTime || '',
          closeTime: poi.closeTime || '',
          priceText: poi.priceText || '',
          phone: poi.phone || '',
          websiteUrl: poi.websiteUrl || '',
          latitude: String(poi.latitude || ''),
          longitude: String(poi.longitude || ''),
          radius: String(poi.radius || 100),
          priority: String(poi.priority || 0),
          imageText: (poi.images || []).join('\n'),
          selectedLanguages: selectedLanguages.length ? selectedLanguages : ['vi'],
          translations,
          audios,
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  return (
    <ProtectedRoute>
      <div className="flex bg-dark min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-5xl">
            <Link href={id && !Array.isArray(id) ? `/pois/${id}` : '/pois'} className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6">
              <ArrowLeft size={20} />
              Quay lại chi tiết
            </Link>
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white">Sửa POI</h1>
              <p className="text-gray-400 mt-2">Sau khi sửa, POI sẽ chuyển về trạng thái chờ admin duyệt.</p>
            </div>
            {loading || !initialValue || !id || Array.isArray(id) ? (
              <p className="text-gray-400">Đang tải...</p>
            ) : (
              <PoiForm mode="edit" poiId={id} initialValue={initialValue} onDone={() => router.push(`/pois/${id}`)} />
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
