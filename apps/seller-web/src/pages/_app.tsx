import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import apiClient from '@/lib/api'

export default function App({ Component, pageProps }: AppProps) {
  const { setUser } = useAuthStore()

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (userId) {
      // Fetch user info to verify token is still valid
      apiClient
        .get(`/auth/user/${userId}`)
        .then((res) => {
          setUser(res.data)
        })
        .catch(() => {
          localStorage.removeItem('userId')
        })
    }
  }, [setUser])

  return <Component {...pageProps} />
}
