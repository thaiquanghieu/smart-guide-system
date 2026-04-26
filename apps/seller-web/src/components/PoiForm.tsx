import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/router'
import apiClient from '@/lib/api'

export const LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
]

type Translation = {
  languageCode: string
  name: string
  category: string
  shortDescription: string
  description: string
  address: string
  priceText: string
}

type AudioDraft = {
  languageCode: string
  languageName: string
  voiceName: string
  scriptText: string
  audioUrl: string
}

export type PoiFormValue = {
  name: string
  shortDescription: string
  description: string
  address: string
  category: string
  selectedCategories: string[]
  customCategory: string
  openTime: string
  closeTime: string
  priceText: string
  phone: string
  websiteUrl: string
  latitude: string
  longitude: string
  radius: string
  priority: string
  imageText: string
  selectedLanguages: string[]
  translations: Record<string, Translation>
  audios: Record<string, AudioDraft>
}

type Props = {
  mode: 'create' | 'edit'
  initialValue?: Partial<PoiFormValue>
  poiId?: string
  onDone: () => void
}

const emptyTranslation = (languageCode: string): Translation => ({
  languageCode,
  name: '',
  category: '',
  shortDescription: '',
  description: '',
  address: '',
  priceText: '',
})

const emptyAudio = (languageCode: string): AudioDraft => ({
  languageCode,
  languageName: LANGUAGES.find((x) => x.code === languageCode)?.label || languageCode,
  voiceName: 'System',
  scriptText: '',
  audioUrl: '',
})

const defaultValue: PoiFormValue = {
  name: '',
  shortDescription: '',
  description: '',
  address: '',
  category: '',
  selectedCategories: [],
  customCategory: '',
  openTime: '',
  closeTime: '',
  priceText: '',
  phone: '',
  websiteUrl: '',
  latitude: '',
  longitude: '',
  radius: '100',
  priority: '0',
  imageText: '',
  selectedLanguages: ['vi'],
  translations: { vi: emptyTranslation('vi') },
  audios: { vi: emptyAudio('vi') },
}

const API_MEDIA_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '')

const CATEGORY_OPTIONS = ['Y tế', 'Giáo dục', 'Văn hóa', 'Lịch sử', 'Kiến trúc', 'Tôn giáo', 'Thiên nhiên', 'Ẩm thực', 'Mua sắm', 'Giải trí']
const RADIUS_OPTIONS = [
  { label: 'Tiêu chuẩn', value: '100', price: 0, description: '100m, phù hợp điểm nhỏ hoặc khu vực ít chồng lấn.' },
  { label: 'Mở rộng', value: '200', price: 49000, description: '200m, dễ kích hoạt hơn khi khách đến gần khu vực.' },
  { label: 'Phủ rộng', value: '300', price: 99000, description: '300m, dành cho khuôn viên lớn hoặc vị trí khó định vị.' },
]
const PRIORITY_OPTIONS = [
  { label: 'Bình thường', value: '0', price: 0, description: 'Ưu tiên tiêu chuẩn khi trùng vùng.' },
  { label: 'Trung bình', value: '5', price: 29000, description: 'Được ưu tiên hơn POI bình thường khi khách ở trong nhiều vùng.' },
  { label: 'Cao', value: '10', price: 39000, description: 'Ưu tiên cao nhất khi nhiều POI cùng đủ điều kiện phát.' },
]

const TRANSLATION_PHRASES: Record<string, Record<string, string>> = {
  en: {
    'Bệnh viện': 'Hospital',
    'Trường Đại học': 'University',
    'Nhà thờ': 'Church',
    'Chợ': 'Market',
    'Y tế': 'Healthcare',
    'Giáo dục': 'Education',
    'Văn hóa': 'Culture',
    'Lịch sử': 'History',
    'Kiến trúc': 'Architecture',
    'Tôn giáo': 'Religion',
    'Thiên nhiên': 'Nature',
    'Ẩm thực': 'Food',
    'Mua sắm': 'Shopping',
    'Giải trí': 'Entertainment',
    'Miễn phí': 'Free',
    'Phường': 'Ward',
    'Quận': 'District',
    'Thành phố Hồ Chí Minh': 'Ho Chi Minh City',
    'TP.HCM': 'Ho Chi Minh City',
    'Nơi khám và điều trị': 'A place for examination and treatment',
    'đội ngũ bác sĩ chuyên môn cao': 'a highly qualified medical team',
  },
  ja: {
    'Bệnh viện': '病院',
    'Trường Đại học': '大学',
    'Nhà thờ': '教会',
    'Chợ': '市場',
    'Y tế': '医療',
    'Giáo dục': '教育',
    'Văn hóa': '文化',
    'Lịch sử': '歴史',
    'Kiến trúc': '建築',
    'Tôn giáo': '宗教',
    'Thiên nhiên': '自然',
    'Ẩm thực': 'グルメ',
    'Mua sắm': 'ショッピング',
    'Giải trí': '娯楽',
    'Miễn phí': '無料',
    'Phường': '区',
    'Quận': '郡',
    'Thành phố Hồ Chí Minh': 'ホーチミン市',
    'TP.HCM': 'ホーチミン市',
  },
  ko: {
    'Bệnh viện': '병원',
    'Trường Đại học': '대학교',
    'Nhà thờ': '성당',
    'Chợ': '시장',
    'Y tế': '의료',
    'Giáo dục': '교육',
    'Văn hóa': '문화',
    'Lịch sử': '역사',
    'Kiến trúc': '건축',
    'Tôn giáo': '종교',
    'Thiên nhiên': '자연',
    'Ẩm thực': '음식',
    'Mua sắm': '쇼핑',
    'Giải trí': '엔터테인먼트',
    'Miễn phí': '무료',
    'Phường': '동',
    'Quận': '군',
    'Thành phố Hồ Chí Minh': '호치민시',
    'TP.HCM': '호치민시',
  },
  zh: {
    'Bệnh viện': '医院',
    'Trường Đại học': '大学',
    'Nhà thờ': '教堂',
    'Chợ': '市场',
    'Y tế': '医疗',
    'Giáo dục': '教育',
    'Văn hóa': '文化',
    'Lịch sử': '历史',
    'Kiến trúc': '建筑',
    'Tôn giáo': '宗教',
    'Thiên nhiên': '自然',
    'Ẩm thực': '美食',
    'Mua sắm': '购物',
    'Giải trí': '娱乐',
    'Miễn phí': '免费',
    'Phường': '坊',
    'Quận': '郡',
    'Thành phố Hồ Chí Minh': '胡志明市',
    'TP.HCM': '胡志明市',
  },
}

function mediaUrl(value: string) {
  if (!value.startsWith('/')) return value
  return API_MEDIA_ORIGIN ? `${API_MEDIA_ORIGIN}${value}` : value
}

function mockTranslate(value: string, languageCode: string) {
  if (!value.trim()) return ''
  if (languageCode === 'vi') return value
  const phrases = TRANSLATION_PHRASES[languageCode] || {}
  let translated = value

  Object.entries(phrases)
    .sort((left, right) => right[0].length - left[0].length)
    .forEach(([source, target]) => {
      translated = translated.split(source).join(target)
    })

  return translated
}

export default function PoiForm({ mode, initialValue, poiId, onDone }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<PoiFormValue>({ ...defaultValue, ...initialValue })
  const [activeLang, setActiveLang] = useState(form.selectedLanguages[0] || 'vi')
  const [showTranslations, setShowTranslations] = useState(false)
  const [showAudio, setShowAudio] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!initialValue) return
    setForm({ ...defaultValue, ...initialValue })
    setActiveLang(initialValue.selectedLanguages?.[0] || 'vi')
  }, [initialValue])

  const images = useMemo(
    () =>
      form.imageText
        .split(/\n|,/)
        .map((x) => x.trim())
        .filter(Boolean),
    [form.imageText]
  )

  const updateField = (name: keyof PoiFormValue, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const getSelectedCategories = (value = form) => {
    const categories = [...value.selectedCategories]
    if (value.customCategory.trim()) categories.push(value.customCategory.trim())
    return Array.from(new Set(categories.map((item) => item.trim()).filter(Boolean)))
  }

  const syncCategoryLabel = (categories: string[]) => categories.join(', ')

  const toggleCategory = (category: string) => {
    setForm((prev) => {
      const selectedCategories = prev.selectedCategories.includes(category)
        ? prev.selectedCategories.filter((item) => item !== category)
        : [...prev.selectedCategories, category]
      return {
        ...prev,
        selectedCategories,
        category: syncCategoryLabel([...selectedCategories, prev.customCategory].filter(Boolean)),
      }
    })
  }

  const updateCustomCategory = (value: string) => {
    setForm((prev) => {
      const next = { ...prev, customCategory: value }
      return { ...next, category: syncCategoryLabel(getSelectedCategories(next)) }
    })
  }

  const removeImage = (image: string) => {
    setForm((prev) => ({
      ...prev,
      imageText: prev.imageText
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter((item) => item && item !== image)
        .join('\n'),
    }))
  }

  const toggleLanguage = (code: string) => {
    setForm((prev) => {
      const enabled = prev.selectedLanguages.includes(code)
      const nextLanguages = enabled
        ? prev.selectedLanguages.filter((item) => item !== code)
        : [...prev.selectedLanguages, code]
      const safeLanguages = nextLanguages.length ? nextLanguages : ['vi']

      return {
        ...prev,
        selectedLanguages: safeLanguages,
        translations: {
          ...prev.translations,
          [code]: prev.translations[code] || emptyTranslation(code),
        },
        audios: {
          ...prev.audios,
          [code]: prev.audios[code] || emptyAudio(code),
        },
      }
    })
    setActiveLang(code)
  }

  const translateText = async (value: string, languageCode: string) => {
    if (!value.trim() || languageCode === 'vi') return value

    try {
      const response = await apiClient.post('/owner/pois/translate', {
        text: value,
        sourceLanguage: 'vi',
        targetLanguage: languageCode,
      })
      const translated = response.data?.text
      return typeof translated === 'string' && translated.trim() ? translated : mockTranslate(value, languageCode)
    } catch {
      return mockTranslate(value, languageCode)
    }
  }

  const buildTranslatedContent = async (source: PoiFormValue, preserveExisting = false) => {
    const translations = { ...source.translations }
    const audios = { ...source.audios }
    const baseScript = source.description || source.shortDescription || source.name

    for (const code of source.selectedLanguages) {
      const existingTranslation = translations[code] || emptyTranslation(code)
      const existingAudio = audios[code] || emptyAudio(code)
      const [
        name,
        category,
        shortDescription,
        description,
        address,
        priceText,
        scriptText,
      ] = await Promise.all([
        preserveExisting && existingTranslation.name.trim() ? existingTranslation.name : translateText(source.name, code),
        preserveExisting && existingTranslation.category.trim() ? existingTranslation.category : translateText(source.category, code),
        preserveExisting && existingTranslation.shortDescription.trim() ? existingTranslation.shortDescription : translateText(source.shortDescription, code),
        preserveExisting && existingTranslation.description.trim() ? existingTranslation.description : translateText(source.description, code),
        preserveExisting && existingTranslation.address.trim() ? existingTranslation.address : translateText(source.address, code),
        preserveExisting && existingTranslation.priceText.trim() ? existingTranslation.priceText : translateText(source.priceText, code),
        preserveExisting && existingAudio.scriptText.trim() ? existingAudio.scriptText : translateText(baseScript, code),
      ])

      translations[code] = {
        languageCode: code,
        name,
        category,
        shortDescription,
        description,
        address,
        priceText,
      }

      audios[code] = {
        ...existingAudio,
        scriptText,
      }
    }

    return { translations, audios }
  }

  const fillTranslations = async () => {
    setTranslating(true)
    setError('')
    try {
      const { translations } = await buildTranslatedContent(form)
      setForm((prev) => ({ ...prev, translations }))
      setShowTranslations(true)
    } catch {
      setError('Tự động dịch thất bại, vui lòng thử lại hoặc tự điền bản dịch')
    } finally {
      setTranslating(false)
    }
  }

  const fillAudioScripts = async () => {
    setTranslating(true)
    setError('')
    try {
      const { audios } = await buildTranslatedContent(form)
      setForm((prev) => ({ ...prev, audios }))
      setShowAudio(true)
    } catch {
      setError('Tự tạo script thất bại, vui lòng thử lại hoặc tự điền lời thuyết minh')
    } finally {
      setTranslating(false)
    }
  }

  const updateTranslation = (code: string, field: keyof Translation, value: string) => {
    setForm((prev) => ({
      ...prev,
      translations: {
        ...prev.translations,
        [code]: { ...(prev.translations[code] || emptyTranslation(code)), [field]: value },
      },
    }))
  }

  const updateAudio = (code: string, field: keyof AudioDraft, value: string) => {
    setForm((prev) => ({
      ...prev,
      audios: {
        ...prev.audios,
        [code]: { ...(prev.audios[code] || emptyAudio(code)), [field]: value },
      },
    }))
  }

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return

    setError('')
    setUploadingImages(true)
    try {
      const body = new FormData()
      Array.from(files).forEach((file) => body.append('files', file))
      const response = await apiClient.post('/owner/pois/uploads/images', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const uploadedUrls = response.data?.urls || []
      if (uploadedUrls.length) {
        setForm((prev) => {
          const current = prev.imageText.trim()
          const next = [...(current ? current.split(/\n|,/).map((x) => x.trim()).filter(Boolean) : []), ...uploadedUrls]
          return { ...prev, imageText: next.join('\n') }
        })
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload ảnh thất bại')
    } finally {
      setUploadingImages(false)
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name.trim()) return setError('Tên POI không được để trống')
    if (!form.description.trim()) return setError('Mô tả chi tiết không được để trống')
    if (!form.latitude || !form.longitude) return setError('Vui lòng nhập tọa độ POI')
    if (!Number.isFinite(Number(form.latitude)) || !Number.isFinite(Number(form.longitude))) return setError('Tọa độ phải là số hợp lệ')
    if (Number(form.latitude) < -90 || Number(form.latitude) > 90) return setError('Vĩ độ phải nằm trong khoảng -90 đến 90')
    if (Number(form.longitude) < -180 || Number(form.longitude) > 180) return setError('Kinh độ phải nằm trong khoảng -180 đến 180')
    if (!getSelectedCategories().length) return setError('Vui lòng chọn ít nhất một danh mục')

    setLoading(true)

    let translations = form.translations
    let audios = form.audios
    try {
      const translatedContent = await buildTranslatedContent(form, true)
      translations = translatedContent.translations
      audios = translatedContent.audios
      setForm((prev) => ({ ...prev, translations, audios }))
    } catch {
      translations = form.translations
      audios = form.audios
    }

    const payload = {
      name: form.name.trim(),
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim(),
      address: form.address.trim(),
      category: getSelectedCategories()[0] || form.category.trim() || 'Khác',
      categories: getSelectedCategories(),
      openTime: form.openTime,
      closeTime: form.closeTime,
      priceText: form.priceText.trim(),
      phone: form.phone.trim(),
      websiteUrl: form.websiteUrl.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius: Number(form.radius || 100),
      priority: Number(form.priority || 0),
      images,
      translations: form.selectedLanguages.map((code) => translations[code] || emptyTranslation(code)),
      audios: form.selectedLanguages
        .map((code) => audios[code] || emptyAudio(code))
        .filter((audio) => audio.scriptText.trim()),
    }

    try {
      if (mode === 'edit' && poiId) {
        await apiClient.put(`/owner/pois/${poiId}`, payload)
        setSuccess('Đã cập nhật POI và gửi duyệt lại')
      } else if (upgradeAmount > 0) {
        const paymentCode = `SGUP_${Date.now().toString(36).toUpperCase()}`
        const response = await apiClient.post('/owner/payments/prepare-poi-upgrade', {
          ...payload,
          upgradeAmount,
          upgradePaymentCode: paymentCode,
          upgradeDescription,
        })
        router.push(`/payments/poi-upgrade?code=${encodeURIComponent(response.data?.code || paymentCode)}`)
        return
      } else {
        await apiClient.post('/owner/pois', payload)
        setSuccess('Đã tạo POI và gửi admin duyệt')
      }
      setTimeout(onDone, 500)
    } catch (err: any) {
      const message = err.response?.data?.message || 'Lưu POI thất bại'
      const detail = err.response?.data?.detail
      setError(detail ? `${message} Chi tiết: ${detail}` : message)
    } finally {
      setLoading(false)
    }
  }

  const activeTranslation = form.translations[activeLang] || emptyTranslation(activeLang)
  const activeAudio = form.audios[activeLang] || emptyAudio(activeLang)
  const selectedRadiusOption = RADIUS_OPTIONS.find((option) => option.value === form.radius) || RADIUS_OPTIONS[0]
  const selectedPriorityOption = PRIORITY_OPTIONS.find((option) => option.value === form.priority) || PRIORITY_OPTIONS[0]
  const upgradeAmount = mode === 'create' ? selectedRadiusOption.price + selectedPriorityOption.price : 0
  const upgradeDescription = [
    selectedRadiusOption.price > 0 ? `Bán kính ${selectedRadiusOption.label} ${selectedRadiusOption.value}m` : '',
    selectedPriorityOption.price > 0 ? `Ưu tiên ${selectedPriorityOption.label}` : '',
  ].filter(Boolean).join(' + ')

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <div className="border border-red-500 bg-red-500/15 text-red-200 px-4 py-3 rounded-xl">{error}</div>}
      {success && <div className="border border-green-500 bg-green-500/15 text-green-200 px-4 py-3 rounded-xl">{success}</div>}

      <section className="bg-secondary border border-gray-700 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white">Thông tin cơ bản</h2>
          <p className="text-gray-400 text-sm">Những thông tin này sẽ được admin duyệt trước khi hiển thị trong app.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Tên POI *" value={form.name} onChange={(value) => updateField('name', value)} placeholder="Bệnh viện Mắt TP.HCM" />
          <div className="md:col-span-1">
            <span className="block text-sm font-medium text-gray-300 mb-2">Danh mục</span>
            <div className="flex flex-wrap gap-2 rounded-xl border border-gray-700 bg-dark/50 p-3">
              {CATEGORY_OPTIONS.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    form.selectedCategories.includes(category)
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-600 text-gray-300 hover:border-primary'
                  }`}
                >
                  {category}
                </button>
              ))}
              <input
                value={form.customCategory}
                onChange={(event) => updateCustomCategory(event.target.value)}
                placeholder="Khác..."
                className="min-w-[120px] flex-1 rounded-full border border-gray-600 bg-secondary px-3 py-1.5 text-sm text-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <Input label="Mô tả ngắn" value={form.shortDescription} onChange={(value) => updateField('shortDescription', value)} placeholder="Một câu ngắn dùng trong card" />
          <Input label="Địa chỉ" value={form.address} onChange={(value) => updateField('address', value)} placeholder="280 Điện Biên Phủ..." />
          <Input label="Giờ mở cửa" type="time" value={form.openTime} onChange={(value) => updateField('openTime', value)} />
          <Input label="Giờ đóng cửa" type="time" value={form.closeTime} onChange={(value) => updateField('closeTime', value)} />
          <Input label="Giá/chi phí" value={form.priceText} onChange={(value) => updateField('priceText', value)} placeholder="Miễn phí, 50.000đ..." />
          <Input label="Số điện thoại" value={form.phone} onChange={(value) => updateField('phone', value)} />
          <Input label="Website" value={form.websiteUrl} onChange={(value) => updateField('websiteUrl', value)} placeholder="https://..." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vĩ độ *" value={form.latitude} onChange={(value) => updateField('latitude', value)} placeholder="10.779783" />
            <Input label="Kinh độ *" value={form.longitude} onChange={(value) => updateField('longitude', value)} placeholder="106.699018" />
          </div>
          <OptionSelect
            label="Bán kính nhận diện"
            value={form.radius}
            options={RADIUS_OPTIONS}
            onChange={(value) => updateField('radius', value)}
            hint="Tăng diện tích nhận diện giúp khách dễ kích hoạt audio hơn khi bước vào vùng POI."
          />
          <OptionSelect
            label="Độ ưu tiên"
            value={form.priority}
            options={PRIORITY_OPTIONS}
            onChange={(value) => updateField('priority', value)}
            hint="Khi nhiều POI cùng nằm trong vùng của khách, hệ thống ưu tiên POI có bậc cao hơn."
          />
        </div>
        <TextArea label="Mô tả chi tiết *" value={form.description} onChange={(value) => updateField('description', value)} rows={5} />
        <div className="rounded-2xl border border-gray-700 bg-dark/40 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-300">Ảnh POI</p>
              <p className="text-xs text-gray-500">Chỉ upload ảnh từ thiết bị. Có thể bấm X để hủy ảnh trước khi gửi.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-white hover:bg-blue-700">
              {uploadingImages ? 'Đang upload...' : 'Upload ảnh'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={(event) => uploadImages(event.target.files)}
                disabled={uploadingImages}
              />
            </label>
          </div>
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map((image) => (
                <div key={image} className="relative rounded-xl border border-gray-700 bg-secondary p-2">
                  <button
                    type="button"
                    onClick={() => removeImage(image)}
                    className="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-600"
                    aria-label="Xóa ảnh"
                  >
                    ×
                  </button>
                  <div className="aspect-square overflow-hidden rounded-lg bg-dark">
                    <img src={mediaUrl(image)} alt="POI preview" className="h-full w-full object-cover" />
                  </div>
                  <p className="mt-2 truncate text-xs text-gray-400">{image}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-secondary border border-gray-700 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Ngôn ngữ hiển thị</h2>
            <p className="text-gray-400 text-sm">Seller có thể tự dịch hoặc sửa nội dung sau khi tự động dịch.</p>
          </div>
          <button type="button" onClick={fillTranslations} disabled={translating} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-blue-900/30">
            {translating ? 'Đang dịch...' : 'Tự động dịch'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <button
              type="button"
              key={lang.code}
              onClick={() => toggleLanguage(lang.code)}
              className={`px-4 py-2 rounded-full border transition ${form.selectedLanguages.includes(lang.code) ? 'bg-primary text-white border-primary' : 'border-gray-600 text-gray-300 hover:border-primary'}`}
            >
              {lang.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowTranslations((value) => !value)} className="text-primary hover:underline">
          {showTranslations ? 'Ẩn chi tiết bản dịch' : 'Xem chi tiết / tự điền bản dịch'}
        </button>
        {showTranslations && (
          <DetailEditor activeLang={activeLang} setActiveLang={setActiveLang} selectedLanguages={form.selectedLanguages}>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Tên" value={activeTranslation.name} onChange={(value) => updateTranslation(activeLang, 'name', value)} />
              <Input label="Danh mục" value={activeTranslation.category} onChange={(value) => updateTranslation(activeLang, 'category', value)} />
              <Input label="Mô tả ngắn" value={activeTranslation.shortDescription} onChange={(value) => updateTranslation(activeLang, 'shortDescription', value)} />
              <Input label="Giá" value={activeTranslation.priceText} onChange={(value) => updateTranslation(activeLang, 'priceText', value)} />
            </div>
            <TextArea label="Địa chỉ" value={activeTranslation.address} onChange={(value) => updateTranslation(activeLang, 'address', value)} rows={2} />
            <TextArea label="Mô tả" value={activeTranslation.description} onChange={(value) => updateTranslation(activeLang, 'description', value)} rows={4} />
          </DetailEditor>
        )}
      </section>

      <section className="bg-secondary border border-gray-700 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Lời thuyết minh / Audio</h2>
            <p className="text-gray-400 text-sm">Audio sẽ ở trạng thái chờ duyệt, admin duyệt xong mới dùng trong app.</p>
          </div>
          <button type="button" onClick={fillAudioScripts} disabled={translating} className="bg-accent hover:bg-accent/80 disabled:bg-gray-600 disabled:text-gray-300 text-dark font-bold px-5 py-3 rounded-xl shadow-lg shadow-emerald-900/20">
            {translating ? 'Đang tạo...' : 'Tự tạo script TTS'}
          </button>
        </div>
        <button type="button" onClick={() => setShowAudio((value) => !value)} className="text-primary hover:underline">
          {showAudio ? 'Ẩn chi tiết audio' : 'Xem chi tiết / tự điền lời thuyết minh'}
        </button>
        {showAudio && (
          <DetailEditor activeLang={activeLang} setActiveLang={setActiveLang} selectedLanguages={form.selectedLanguages}>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Giọng đọc" value={activeAudio.voiceName} onChange={(value) => updateAudio(activeLang, 'voiceName', value)} placeholder="System, Nam/Nữ..." />
              <Input label="Audio URL nếu có" value={activeAudio.audioUrl} onChange={(value) => updateAudio(activeLang, 'audioUrl', value)} placeholder="/audio/..." />
            </div>
            <TextArea label="Lời thuyết minh" value={activeAudio.scriptText} onChange={(value) => updateAudio(activeLang, 'scriptText', value)} rows={5} />
          </DetailEditor>
        )}
      </section>

      <div className="flex gap-3">
        <button disabled={loading} className={`flex-1 disabled:bg-gray-600 font-bold py-4 rounded-xl ${upgradeAmount > 0 ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'bg-primary hover:bg-blue-700 text-white'}`}>
          {loading
            ? 'Đang lưu...'
            : mode === 'edit'
            ? 'Cập nhật và gửi duyệt lại'
            : upgradeAmount > 0
            ? `Thanh toán nâng cấp ${upgradeAmount.toLocaleString('vi-VN')}đ`
            : 'Tạo POI và gửi duyệt'}
        </button>
      </div>
    </form>
  )
}

function DetailEditor({ activeLang, setActiveLang, selectedLanguages, children }: { activeLang: string; setActiveLang: (value: string) => void; selectedLanguages: string[]; children: ReactNode }) {
  return (
    <div className="border border-gray-700 bg-dark/40 rounded-2xl p-4 space-y-4">
      <div className="flex gap-2 flex-wrap">
        {selectedLanguages.map((code) => (
          <button
            type="button"
            key={code}
            onClick={() => setActiveLang(code)}
            className={`px-3 py-2 rounded-lg text-sm ${activeLang === code ? 'bg-primary text-white' : 'bg-secondary text-gray-300'}`}
          >
            {LANGUAGES.find((x) => x.code === code)?.label || code}
          </button>
        ))}
      </div>
      {children}
    </div>
  )
}

function Input({ label, value, onChange, placeholder = '', type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-300 mb-2">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full px-4 py-3 bg-dark border border-gray-600 rounded-xl text-white focus:border-primary focus:outline-none" />
    </label>
  )
}

function OptionSelect({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string
  value: string
  options: Array<{ label: string; value: string; price: number; description: string }>
  onChange: (value: string) => void
  hint: string
}) {
  const selected = options.find((option) => option.value === value) || options[0]
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-300 mb-2">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-3 bg-dark border border-gray-600 rounded-xl text-white focus:border-primary focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} {label.includes('Bán kính') ? `${option.value}m` : ''} - {option.price ? `${option.price.toLocaleString('vi-VN')}đ` : 'Miễn phí'}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-gray-500">{hint}</p>
      <p className="mt-1 text-xs text-yellow-300">{selected.description}</p>
    </label>
  )
}

function TextArea({ label, value, onChange, placeholder = '', rows = 3 }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-300 mb-2">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className="w-full px-4 py-3 bg-dark border border-gray-600 rounded-xl text-white focus:border-primary focus:outline-none resize-y" />
    </label>
  )
}
