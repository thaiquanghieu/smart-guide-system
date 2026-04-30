import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect } from 'react'
import { useAdminStore } from '@/lib/store'
import apiClient from '@/lib/api'

export default function App({ Component, pageProps }: AppProps) {
  const { setAdmin } = useAdminStore()

  useEffect(() => {
    if (typeof window === 'undefined') return
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

  return (
    <>
      <Head>
        <title>Smart Guide Admin</title>
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#1e2b3f" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
