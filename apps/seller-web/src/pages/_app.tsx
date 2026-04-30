import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
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

  return (
    <>
      <Head>
        <title>Smart Guide Seller</title>
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#1e2b3f" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
