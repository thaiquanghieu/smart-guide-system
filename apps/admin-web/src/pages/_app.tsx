import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { useAdminStore } from '@/lib/store'
import apiClient from '@/lib/api'

export default function App({ Component, pageProps }: AppProps) {
  const { setAdmin } = useAdminStore()

  useEffect(() => {
    const adminId = localStorage.getItem('adminId')
    if (adminId) {
      apiClient
        .get(`/auth/user/${adminId}`)
        .then((res) => {
          if (res.data.role === 'admin') {
            setAdmin(res.data)
          }
        })
        .catch(() => {
          localStorage.removeItem('adminId')
        })
    }
  }, [setAdmin])

  return <Component {...pageProps} />
}
