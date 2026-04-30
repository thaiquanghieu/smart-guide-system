import { useEffect, useMemo, useRef, useState } from 'react'
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
  selectedLanguages: LANGUAGES.map((language) => language.code),
  translations: Object.fromEntries(LANGUAGES.map((language) => [language.code, emptyTranslation(language.code)])),
  audios: Object.fromEntries(LANGUAGES.map((language) => [language.code, emptyAudio(language.code)])),
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

async function searchAddresses(keyword: string) {
  if (!keyword.trim()) return []
  const normalizedKeyword = /việt nam|vietnam/i.test(keyword) ? keyword : `${keyword}, Hồ Chí Minh, Việt Nam`
  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '8',
    q: normalizedKeyword,
    addressdetails: '1',
    namedetails: '1',
    countrycodes: 'vn',
    dedupe: '1',
    'accept-language': 'vi',
  })
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) return []
  const data = await response.json()
  return Array.isArray(data)
    ? data.map((item: any) => {
        const address = item.address || {}
        const primary = [
          [address.house_number, address.road].filter(Boolean).join(' ').trim(),
          address.suburb || address.neighbourhood || address.hamlet || address.village,
          address.city_district || address.county,
          address.city || address.town || address.state,
          address.country,
        ]
          .filter(Boolean)
          .join(', ')

        return {
          ...item,
          display_label: primary || item.display_name,
        }
      })
    : []
}

declare global {
  interface Window {
    L: any
  }
}

export default function PoiForm({ mode, initialValue, poiId, onDone }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<PoiFormValue>({ ...defaultValue, ...initialValue })
  const [activeLang, setActiveLang] = useState('vi')
  const [showTranslations, setShowTranslations] = useState(false)
  const [showAudio, setShowAudio] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [translatingContent, setTranslatingContent] = useState(false)
  const [translatingAudio, setTranslatingAudio] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const addressTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!initialValue) return
    setForm({
      ...defaultValue,
      ...initialValue,
      selectedLanguages: LANGUAGES.map((language) => language.code),
      translations: { ...defaultValue.translations, ...(initialValue.translations || {}) },
      audios: { ...defaultValue.audios, ...(initialValue.audios || {}) },
    })
    setActiveLang('vi')
  }, [initialValue])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    )
  }, [])

  const images = useMemo(
    () =>
      form.imageText
        .split(/\n|,/)
        .map((x) => x.trim())
        .filter(Boolean),
    [form.imageText]
  )

  const updateField = (name: keyof PoiFormValue, value: string) => {
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const updateAddress = (value: string) => {
    updateField('address', value)
    if (addressTimerRef.current) window.clearTimeout(addressTimerRef.current)
    if (!value.trim()) {
      setAddressSuggestions([])
      return
    }
    addressTimerRef.current = window.setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        setAddressSuggestions(await searchAddresses(value))
      } finally {
        setLoadingSuggestions(false)
      }
    }, 250)
  }

  const applyAddressSuggestion = (item: any) => {
    setAddressSuggestions([])
    setForm((prev) => ({
      ...prev,
      address: item.display_label || item.display_name || prev.address,
      latitude: Number(item.lat).toFixed(7),
      longitude: Number(item.lon).toFixed(7),
    }))
    setFieldErrors((prev) => ({ ...prev, address: '', latitude: '', longitude: '' }))
  }

  const applyMapCoordinates = (latitude: number, longitude: number) => {
    setFieldErrors((prev) => ({ ...prev, latitude: '', longitude: '' }))
    setForm((prev) => ({
      ...prev,
      latitude: latitude.toFixed(7),
      longitude: longitude.toFixed(7),
    }))
    setShowMapPicker(false)
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
    setTranslatingContent(true)
    setError('')
    try {
      const { translations } = await buildTranslatedContent(form)
      setForm((prev) => ({ ...prev, translations }))
      setShowTranslations((value) => !value || !showTranslations)
    } catch {
      setError('Không thể chuẩn bị bản dịch, vui lòng thử lại.')
    } finally {
      setTranslatingContent(false)
    }
  }

  const fillAudioScripts = async () => {
    setTranslatingAudio(true)
    setError('')
    try {
      const { audios } = await buildTranslatedContent(form)
      setForm((prev) => ({ ...prev, audios }))
      setShowAudio((value) => !value || !showAudio)
    } catch {
      setError('Không thể chuẩn bị lời thuyết minh, vui lòng thử lại.')
    } finally {
      setTranslatingAudio(false)
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
    const nextErrors: Record<string, string> = {}
    if (!form.name.trim()) nextErrors.name = 'Vui lòng nhập tên POI.'
    if (!getSelectedCategories().length) nextErrors.category = 'Vui lòng chọn ít nhất một danh mục.'
    if (!form.address.trim()) nextErrors.address = 'Vui lòng nhập địa chỉ.'
    if (!form.description.trim()) nextErrors.description = 'Vui lòng nhập mô tả chi tiết.'
    if (!images.length) nextErrors.images = 'Vui lòng upload ít nhất 1 ảnh.'
    if (!form.latitude) nextErrors.latitude = 'Vui lòng nhập vĩ độ.'
    if (!form.longitude) nextErrors.longitude = 'Vui lòng nhập kinh độ.'
    if (form.latitude && !Number.isFinite(Number(form.latitude))) nextErrors.latitude = 'Vĩ độ phải là số hợp lệ.'
    if (form.longitude && !Number.isFinite(Number(form.longitude))) nextErrors.longitude = 'Kinh độ phải là số hợp lệ.'
    if (Number(form.latitude) < -90 || Number(form.latitude) > 90) nextErrors.latitude = 'Vĩ độ phải nằm trong khoảng -90 đến 90.'
    if (Number(form.longitude) < -180 || Number(form.longitude) > 180) nextErrors.longitude = 'Kinh độ phải nằm trong khoảng -180 đến 180.'
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors)
      const firstKey = Object.keys(nextErrors)[0]
      const target = document.querySelector(`[data-field="${firstKey}"]`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setFieldErrors({})

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
        const paymentCode = `SGUP${Date.now().toString(36).toUpperCase()}`
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
          <Input dataField="name" error={fieldErrors.name} label="Tên POI *" value={form.name} onChange={(value) => updateField('name', value)} placeholder="Bệnh viện Mắt TP.HCM" />
          <div className="md:col-span-1">
            <span className="mb-2 block text-sm font-medium text-gray-300">Danh mục *</span>
            <div data-field="category" className={`flex flex-wrap gap-2 rounded-xl border bg-dark/50 p-3 ${fieldErrors.category ? 'border-red-500' : 'border-gray-700'}`}>
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
            {fieldErrors.category ? <p className="mt-2 text-sm text-red-300">{fieldErrors.category}</p> : null}
          </div>
          <Input label="Mô tả ngắn" value={form.shortDescription} onChange={(value) => updateField('shortDescription', value)} placeholder="Một câu ngắn dùng trong card" />
          <AddressSuggestInput
            dataField="address"
            error={fieldErrors.address}
            value={form.address}
            onChange={updateAddress}
            suggestions={addressSuggestions}
            loading={loadingSuggestions}
            onSelect={applyAddressSuggestion}
          />
          <Input label="Giờ mở cửa" type="time" value={form.openTime} onChange={(value) => updateField('openTime', value)} />
          <Input label="Giờ đóng cửa" type="time" value={form.closeTime} onChange={(value) => updateField('closeTime', value)} />
          <Input label="Giá/chi phí" value={form.priceText} onChange={(value) => updateField('priceText', value)} placeholder="Miễn phí, 50.000đ..." />
          <Input label="Số điện thoại" value={form.phone} onChange={(value) => updateField('phone', value)} />
          <Input label="Website" value={form.websiteUrl} onChange={(value) => updateField('websiteUrl', value)} placeholder="https://..." />
          <div className="grid grid-cols-2 gap-3">
            <Input dataField="latitude" error={fieldErrors.latitude} label="Vĩ độ *" value={form.latitude} onChange={(value) => updateField('latitude', value)} placeholder="10.779783" />
            <Input dataField="longitude" error={fieldErrors.longitude} label="Kinh độ *" value={form.longitude} onChange={(value) => updateField('longitude', value)} placeholder="106.699018" />
          </div>
          <div className="md:col-span-2 grid gap-3 md:grid-cols-[minmax(0,1fr),220px] items-stretch">
            <MiniMapPreview latitude={Number(form.latitude)} longitude={Number(form.longitude)} userPosition={userPosition} />
            <div className="flex items-stretch">
              <button
                type="button"
                onClick={() => setShowMapPicker(true)}
                className="w-full rounded-xl border border-gray-600 px-4 py-3 text-sm font-semibold text-gray-200 hover:border-primary hover:text-white"
              >
                Chọn từ bản đồ
              </button>
            </div>
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
        <TextArea dataField="description" error={fieldErrors.description} label="Mô tả chi tiết *" value={form.description} onChange={(value) => updateField('description', value)} rows={5} />
        <div className="rounded-2xl border border-gray-700 bg-dark/40 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-300">Ảnh POI *</p>
              <p className="text-xs text-gray-500">Upload ảnh từ thiết bị</p>
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
          {fieldErrors.images ? <p className="text-sm text-red-300">{fieldErrors.images}</p> : null}
        </div>
      </section>

      <section className="bg-secondary border border-gray-700 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Nội dung hiển thị</h2>
            <p className="text-gray-400 text-sm">Hệ thống sẽ lấy thông tin bên trên, bạn có thể xem chi tiết và chỉnh sửa lại.</p>
          </div>
          <button type="button" onClick={showTranslations ? () => setShowTranslations(false) : fillTranslations} disabled={translatingContent} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-blue-900/30">
            {translatingContent ? 'Đang chuẩn bị...' : showTranslations ? 'Ẩn chi tiết' : 'Xem chi tiết'}
          </button>
        </div>
        {showTranslations && (
          <DetailEditor activeLang={activeLang} setActiveLang={setActiveLang} selectedLanguages={form.selectedLanguages}>
            <div className="grid md:grid-cols-1 gap-4">
              <Input label="Tên" value={activeTranslation.name} onChange={(value) => updateTranslation(activeLang, 'name', value)} />
              <Input label="Mô tả ngắn" value={activeTranslation.shortDescription} onChange={(value) => updateTranslation(activeLang, 'shortDescription', value)} />
            </div>
            <TextArea label="Mô tả" value={activeTranslation.description} onChange={(value) => updateTranslation(activeLang, 'description', value)} rows={4} />
          </DetailEditor>
        )}
      </section>

      <section className="bg-secondary border border-gray-700 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Lời thuyết minh / Audio</h2>
            <p className="text-gray-400 text-sm">Hệ thống sẽ tự chuẩn bị sẵn lời thuyết minh cho 5 ngôn ngữ để bạn kiểm tra và chỉnh sửa.</p>
          </div>
          <button type="button" onClick={showAudio ? () => setShowAudio(false) : fillAudioScripts} disabled={translatingAudio} className="bg-accent hover:bg-accent/80 disabled:bg-gray-600 disabled:text-gray-300 text-dark font-bold px-5 py-3 rounded-xl shadow-lg shadow-emerald-900/20">
            {translatingAudio ? 'Đang tạo...' : showAudio ? 'Ẩn chi tiết' : 'Xem chi tiết'}
          </button>
        </div>
        {showAudio && (
          <DetailEditor activeLang={activeLang} setActiveLang={setActiveLang} selectedLanguages={form.selectedLanguages}>
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

      {showMapPicker && (
        <MapPickerModal
          initialLatitude={Number(form.latitude) || 10.7765}
          initialLongitude={Number(form.longitude) || 106.7009}
          userPosition={userPosition}
          onClose={() => setShowMapPicker(false)}
          onPick={applyMapCoordinates}
        />
      )}
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

function Input({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  error,
  dataField,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  error?: string
  dataField?: string
}) {
  return (
    <label className="block" data-field={dataField}>
      <span className="block text-sm font-medium text-gray-300 mb-2">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`w-full rounded-xl border bg-dark px-4 py-3 text-white focus:outline-none ${error ? 'border-red-500 focus:border-red-500' : 'border-gray-600 focus:border-primary'}`} />
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
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

function TextArea({
  label,
  value,
  onChange,
  placeholder = '',
  rows = 3,
  error,
  dataField,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  error?: string
  dataField?: string
}) {
  return (
    <label className="block" data-field={dataField}>
      <span className="block text-sm font-medium text-gray-300 mb-2">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className={`w-full resize-y rounded-xl border bg-dark px-4 py-3 text-white focus:outline-none ${error ? 'border-red-500 focus:border-red-500' : 'border-gray-600 focus:border-primary'}`} />
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </label>
  )
}

function AddressSuggestInput({
  value,
  onChange,
  suggestions,
  loading,
  onSelect,
  error,
  dataField,
}: {
  value: string
  onChange: (value: string) => void
  suggestions: any[]
  loading: boolean
  onSelect: (item: any) => void
  error?: string
  dataField?: string
}) {
  return (
    <div className="relative" data-field={dataField}>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-gray-300">Địa chỉ *</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="280 Điện Biên Phủ..."
          className={`w-full rounded-xl border bg-dark px-4 py-3 text-white focus:outline-none ${error ? 'border-red-500 focus:border-red-500' : 'border-gray-600 focus:border-primary'}`}
        />
      </label>
      {loading ? <div className="absolute right-3 top-[46px] text-xs text-gray-400">Đang tìm...</div> : null}
      {suggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-[78px] z-20 max-h-64 overflow-y-auto rounded-xl border border-gray-700 bg-dark shadow-2xl">
          {suggestions.map((item) => (
            <button
              key={`${item.place_id}-${item.lat}-${item.lon}`}
              type="button"
              onClick={() => onSelect(item)}
              className="block w-full border-b border-gray-800 px-4 py-3 text-left text-sm text-gray-200 hover:bg-primary/10"
            >
              {item.display_label || item.display_name}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </div>
  )
}

function MiniMapPreview({
  latitude,
  longitude,
  userPosition,
}: {
  latitude: number
  longitude: number
  userPosition: { latitude: number; longitude: number } | null
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const [leafletReady, setLeafletReady] = useState(false)
  const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude)

  useEffect(() => {
    const cssId = 'smartguide-leaflet-css'
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link')
      link.id = cssId
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const scriptId = 'smartguide-leaflet-script'
    const ready = () => {
      if (window.L?.map) setLeafletReady(true)
    }

    if (window.L?.map) {
      ready()
      return undefined
    }

    let script = document.getElementById(scriptId) as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.async = true
      script.crossOrigin = ''
      document.body.appendChild(script)
    }

    script.addEventListener('load', ready)
    return () => script?.removeEventListener('load', ready)
  }, [])

  useEffect(() => {
    if (!hasValidCoordinates || !leafletReady || !containerRef.current || mapRef.current) return undefined

    const map = window.L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false,
      touchZoom: false,
    }).setView([latitude, longitude], 16)

    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    markerRef.current = window.L.marker([latitude, longitude]).addTo(map)
    mapRef.current = map

    window.setTimeout(() => map.invalidateSize(), 40)

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
      userMarkerRef.current = null
    }
  }, [hasValidCoordinates, leafletReady, latitude, longitude])

  useEffect(() => {
    if (!hasValidCoordinates || !mapRef.current) return
    markerRef.current?.setLatLng([latitude, longitude])
    mapRef.current.setView([latitude, longitude], 16, { animate: false })
  }, [hasValidCoordinates, latitude, longitude])

  useEffect(() => {
    if (!mapRef.current) return
    if (!userPosition) {
      if (userMarkerRef.current) {
        mapRef.current.removeLayer(userMarkerRef.current)
        userMarkerRef.current = null
      }
      return
    }

    if (!userMarkerRef.current) {
      userMarkerRef.current = window.L.circleMarker([userPosition.latitude, userPosition.longitude], {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#2563eb',
        fillOpacity: 1,
      }).addTo(mapRef.current)
    } else {
      userMarkerRef.current.setLatLng([userPosition.latitude, userPosition.longitude])
    }
  }, [userPosition])

  if (!hasValidCoordinates) {
    return <div className="h-48 rounded-xl border border-dashed border-gray-700 bg-dark/30 px-4 py-3 text-sm text-gray-500">Chưa chọn tọa độ</div>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-700 bg-dark/40">
      <div ref={containerRef} className="h-48 w-full" />
    </div>
  )
}

function MapPickerModal({
  initialLatitude,
  initialLongitude,
  userPosition,
  onClose,
  onPick,
}: {
  initialLatitude: number
  initialLongitude: number
  userPosition: { latitude: number; longitude: number } | null
  onClose: () => void
  onPick: (latitude: number, longitude: number) => void
}) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const [leafletReady, setLeafletReady] = useState(false)
  const [selectedPoint, setSelectedPoint] = useState({ latitude: initialLatitude, longitude: initialLongitude })
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const cssId = 'smartguide-leaflet-css'
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link')
      link.id = cssId
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const scriptId = 'smartguide-leaflet-script'
    const ready = () => {
      if (window.L?.map) setLeafletReady(true)
    }

    if (window.L?.map) {
      ready()
      return undefined
    }

    let script = document.getElementById(scriptId) as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.async = true
      script.crossOrigin = ''
      document.body.appendChild(script)
    }

    script.addEventListener('load', ready)
    return () => script?.removeEventListener('load', ready)
  }, [])

  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstanceRef.current) return undefined

    const map = window.L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([userPosition?.latitude || initialLatitude, userPosition?.longitude || initialLongitude], 15)

    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    const marker = window.L.marker([initialLatitude, initialLongitude]).addTo(map)
    markerRef.current = marker
    mapInstanceRef.current = map

    map.on('click', (event: any) => {
      const latitude = event.latlng.lat
      const longitude = event.latlng.lng
      setSelectedPoint({ latitude, longitude })
      marker.setLatLng([latitude, longitude])
    })

    window.setTimeout(() => {
      map.invalidateSize()
    }, 80)

    return () => {
      map.remove()
      mapInstanceRef.current = null
      markerRef.current = null
      userMarkerRef.current = null
    }
  }, [initialLatitude, initialLongitude, leafletReady, userPosition])

  const moveToPoint = (latitude: number, longitude: number) => {
    setSelectedPoint({ latitude, longitude })
    markerRef.current?.setLatLng([latitude, longitude])
    mapInstanceRef.current?.setView([latitude, longitude], 16)
  }

  const locateUser = () => {
    if (userPosition) {
      mapInstanceRef.current?.setView([userPosition.latitude, userPosition.longitude], 16)
      return
    }
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((position) => {
      mapInstanceRef.current?.setView([position.coords.latitude, position.coords.longitude], 16)
    })
  }

  useEffect(() => {
    locateUser()
  }, [userPosition])

  useEffect(() => {
    if (!mapInstanceRef.current || !userPosition) return
    if (!userMarkerRef.current) {
      userMarkerRef.current = window.L.circleMarker([userPosition.latitude, userPosition.longitude], {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#2563eb',
        fillOpacity: 1,
      }).addTo(mapInstanceRef.current)
    } else {
      userMarkerRef.current.setLatLng([userPosition.latitude, userPosition.longitude])
    }
  }, [userPosition, leafletReady])

  const runSearch = async () => {
    setSearching(true)
    try {
      setResults(await searchAddresses(search))
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-5xl rounded-2xl border border-gray-700 bg-secondary p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-white">Chọn vị trí từ bản đồ</h3>
            <p className="text-sm text-gray-400">Bấm vào bản đồ để đặt vị trí, sau đó xác nhận để điền tọa độ.</p>
          </div>
          <button onClick={onClose} className="rounded-lg bg-dark px-4 py-2 text-white">
            Đóng
          </button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr,auto]">
          <div className="relative">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm địa chỉ hoặc địa danh..." className="w-full rounded-xl border border-gray-700 bg-dark px-4 py-3 text-white" />
            {results.length > 0 ? (
              <div className="absolute left-0 right-0 top-[56px] z-20 max-h-56 overflow-y-auto rounded-xl border border-gray-700 bg-dark shadow-2xl">
                {results.map((item) => (
                  <button
                    key={`${item.place_id}-${item.lat}-${item.lon}`}
                    type="button"
                    onClick={() => {
                      moveToPoint(Number(item.lat), Number(item.lon))
                      setResults([])
                    }}
                    className="block w-full border-b border-gray-800 px-4 py-3 text-left text-sm text-gray-200 hover:bg-primary/10"
                  >
                    {item.display_label || item.display_name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void runSearch()} className="rounded-xl bg-dark px-4 py-3 text-white">{searching ? 'Đang tìm...' : 'Tìm'}</button>
            <button type="button" onClick={locateUser} className="rounded-xl bg-primary px-4 py-3 text-white">Locate</button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-700 bg-dark">
          <div ref={mapRef} className="h-[420px] w-full" />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-300">
            <span className="font-semibold text-white">Vị trí đã chọn:</span>{' '}
            {selectedPoint.latitude.toFixed(7)}, {selectedPoint.longitude.toFixed(7)}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="rounded-xl bg-dark px-4 py-3 font-semibold text-white">
              Hủy
            </button>
            <button
              onClick={() => onPick(selectedPoint.latitude, selectedPoint.longitude)}
              className="rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Dùng tọa độ này
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
