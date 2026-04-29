import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import Sidebar from '@/components/Sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuthStore } from '@/lib/store'
import apiClient from '@/lib/api'
import { Mail, Shield, Store, MapPin, Volume2, Save, PauseCircle, PlayCircle, Trash2, Camera, Clock } from 'lucide-react'

interface UserProfile {
  id: number
  userName: string
  email: string
  avatarUrl?: string
  role: string
  isActive: boolean
  accountStatus: string
  createdAt: string
}

export default function Profile() {
  const { user, setUser } = useAuthStore()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm] = useState({ userName: '', email: '' })
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const isPaused = profile?.accountStatus === 'paused'

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      try {
        const [profileResponse, statsResponse] = await Promise.all([
          apiClient.get(`/auth/user/${user.id}`),
          apiClient.get('/owner/pois/analytics/summary'),
        ])
        const nextProfile = normalizeProfile(profileResponse.data)
        setProfile(nextProfile)
        setForm({ userName: nextProfile.userName || '', email: nextProfile.email || '' })
        setStats(statsResponse.data)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [user])

  const avatarUrl = useMemo(() => {
    const value = profile?.avatarUrl
    if (!value) return ''
    if (/^https?:\/\//i.test(value)) return value
    const origin = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5022/api').replace(/\/api\/?$/, '')
    return `${origin}${value.startsWith('/') ? value : `/${value}`}`
  }, [profile?.avatarUrl])

  const updateStatus = async (accountStatus: 'active' | 'paused' | 'canceled') => {
    if (!profile) return
    const shouldContinue =
      accountStatus === 'canceled'
        ? confirm('Hủy tài khoản seller? Toàn bộ POI sẽ bị ẩn khỏi hệ thống.')
        : accountStatus === 'paused'
          ? confirm('Chuyển seller sang trạng thái tạm nghỉ? Toàn bộ POI sẽ bị ẩn tạm thời.')
          : true
    if (!shouldContinue) return

    const response = await apiClient.put(`/auth/user/${profile.id}/status`, { accountStatus })
    const nextProfile = normalizeProfile(response.data)
    setProfile(nextProfile)
    setUser({
      id: nextProfile.id,
      userName: nextProfile.userName,
      email: nextProfile.email,
      role: nextProfile.role,
      isActive: nextProfile.isActive,
    })
    if (accountStatus === 'canceled') {
      alert('Tài khoản đã được chuyển sang trạng thái hủy.')
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    if (!form.userName.trim() || !form.email.trim()) {
      alert('Tên và email không được để trống')
      return
    }

    setSaving(true)
    try {
      const response = await apiClient.put(`/auth/user/${profile.id}`, form)
      const nextProfile = normalizeProfile(response.data)
      setProfile(nextProfile)
      setForm({ userName: nextProfile.userName || '', email: nextProfile.email || '' })
      setUser({
        id: nextProfile.id,
        userName: nextProfile.userName,
        email: nextProfile.email,
        role: nextProfile.role,
        isActive: nextProfile.isActive,
      })
      setEditing(false)
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Cập nhật hồ sơ thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (file?: File) => {
    if (!profile || !file) return
    const body = new FormData()
    body.append('file', file)
    try {
      const response = await apiClient.post(`/auth/user/${profile.id}/avatar`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const nextProfile = normalizeProfile(response.data)
      setProfile(nextProfile)
      setUser({
        id: nextProfile.id,
        userName: nextProfile.userName,
        email: nextProfile.email,
        role: nextProfile.role,
        isActive: nextProfile.isActive,
      })
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Upload avatar thất bại')
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex bg-dark min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-5xl">
            <h1 className="mb-8 text-4xl font-bold text-white">Hồ sơ cá nhân</h1>

            {isPaused && (
              <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-5">
                <div>
                  <p className="font-semibold text-yellow-200">Seller đang ở trạng thái tạm nghỉ.</p>
                  <p className="mt-1 text-sm text-yellow-100/80">POI của seller đang được ẩn khỏi hệ thống cho tới khi mở lại.</p>
                </div>
                <button
                  onClick={() => void updateStatus('active')}
                  className="rounded-xl bg-yellow-400 px-4 py-3 font-semibold text-black hover:bg-yellow-300"
                >
                  Mở lại
                </button>
              </div>
            )}

            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin">⏳</div>
              </div>
            ) : profile ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-700 bg-secondary p-8">
                  <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-5">
                      <div className="relative">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={profile.userName} className="h-24 w-24 rounded-full border border-gray-700 object-cover" />
                        ) : (
                          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl text-white">
                            <Store size={42} />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute -bottom-1 -right-1 rounded-full bg-primary p-2 text-white hover:bg-blue-700"
                        >
                          <Camera size={16} />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(event) => void handleAvatarUpload(event.target.files?.[0])}
                        />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">{profile.userName}</h2>
                        <p className="mt-1 flex items-center gap-2 text-accent"><Mail size={16} />{profile.email}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">Chủ gian hàng</span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(profile.accountStatus)}`}>
                            {statusLabel(profile.accountStatus)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setEditing((value) => !value)}
                        className="rounded-xl bg-dark px-4 py-3 font-semibold text-white hover:bg-dark/80"
                      >
                        {editing ? 'Đóng chỉnh sửa' : 'Edit'}
                      </button>
                      {profile.accountStatus !== 'paused' && (
                        <button
                          onClick={() => void updateStatus('paused')}
                          className="inline-flex items-center gap-2 rounded-xl bg-yellow-500/20 px-4 py-3 font-semibold text-yellow-200 hover:bg-yellow-500/30"
                        >
                          <PauseCircle size={18} />
                          Tạm nghỉ
                        </button>
                      )}
                      {profile.accountStatus === 'paused' && (
                        <button
                          onClick={() => void updateStatus('active')}
                          className="inline-flex items-center gap-2 rounded-xl bg-green-500/20 px-4 py-3 font-semibold text-green-200 hover:bg-green-500/30"
                        >
                          <PlayCircle size={18} />
                          Mở lại
                        </button>
                      )}
                    </div>
                  </div>

                  {editing && (
                    <div className="mt-6 grid gap-4 border-t border-gray-700 pt-6 md:grid-cols-[1fr,1fr,auto]">
                      <FormField label="Tên seller" value={form.userName} onChange={(value) => setForm((prev) => ({ ...prev, userName: value }))} />
                      <FormField label="Email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="self-end rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {saving ? 'Đang lưu...' : 'Lưu'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard href="/pois" icon={<MapPin />} label="POI đang quản lý" value={stats?.total_pois ?? 0} />
                  <StatCard href="/analytics" icon={<Volume2 />} label="Tổng lượt nghe" value={stats?.total_listens ?? 0} />
                  <StatCard href="/pois?status=pending" icon={<Clock />} label="Chờ duyệt" value={stats?.pending_pois ?? 0} />
                </div>

                <div className="rounded-2xl border border-gray-700 bg-secondary/60 p-8">
                  <h2 className="mb-4 text-xl font-bold text-white">Thông tin vận hành</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Info label="ID tài khoản" value={`#${profile.id}`} />
                    <Info label="Ngày tạo" value={profile.createdAt ? new Date(profile.createdAt).toLocaleString('vi-VN') : '-'} />
                    <Info label="Vai trò" value="Seller / Owner" />
                    <Info label="Trạng thái hiện tại" value={statusLabel(profile.accountStatus)} />
                  </div>
                </div>

                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
                  <h3 className="text-lg font-bold text-white">Hủy tài khoản</h3>
                  <p className="mt-2 text-sm text-red-100/80">Hệ thống sẽ chuyển tài khoản sang trạng thái đã hủy và ẩn toàn bộ POI khỏi trang người dùng.</p>
                  <button
                    onClick={() => void updateStatus('canceled')}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700"
                  >
                    <Trash2 size={18} />
                    Hủy tài khoản
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

function normalizeProfile(data: any): UserProfile {
  return {
    id: data.id,
    userName: data.userName,
    email: data.email,
    avatarUrl: data.avatarUrl,
    role: data.role,
    isActive: data.isActive,
    accountStatus: data.accountStatus || 'active',
    createdAt: data.createdAt,
  }
}

function statusBadge(status: string) {
  if (status === 'paused') return 'bg-yellow-500/15 text-yellow-200'
  if (status === 'canceled') return 'bg-red-500/15 text-red-200'
  return 'bg-green-500/15 text-green-200'
}

function statusLabel(status: string) {
  if (status === 'paused') return 'Tạm nghỉ'
  if (status === 'canceled') return 'Đã hủy'
  if (status === 'banned') return 'Bị khóa'
  return 'Hoạt động'
}

function StatCard({ href, icon, label, value }: { href: string; icon: ReactNode; label: string; value: number }) {
  return (
    <Link href={href} className="block rounded-2xl border border-gray-700 bg-secondary p-5 transition hover:border-primary/50">
      <div className="mb-3 text-primary">{icon}</div>
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
    </Link>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-dark/40 p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-white">{value}</p>
    </div>
  )
}

function FormField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-gray-400">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-700 bg-dark px-4 py-3 text-white"
      />
    </label>
  )
}
