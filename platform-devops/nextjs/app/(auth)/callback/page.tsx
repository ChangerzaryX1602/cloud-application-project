'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { authApi } from '@/lib/api'
import { setToken } from '@/lib/auth'
import { Suspense } from 'react'

function CallbackContent() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const errorParam = searchParams.get('error')

      if (errorParam) {
        setError(`OAuth error: ${errorParam}`)
        return
      }

      if (!code) {
        setError('No authorization code received.')
        return
      }

      const savedState = sessionStorage.getItem('oauth_state')
      if (state && savedState && state !== savedState) {
        setError('Invalid OAuth state. Possible CSRF attempt.')
        return
      }

      const codeVerifier = sessionStorage.getItem('pkce_verifier')
      if (!codeVerifier) {
        setError('Missing PKCE verifier. Please try logging in again.')
        return
      }

      try {
        const redirectUri = `${window.location.origin}/callback`
        const tokenResponse = await authApi.exchangeToken(code, redirectUri, codeVerifier)

        sessionStorage.removeItem('pkce_verifier')
        sessionStorage.removeItem('oauth_state')

        setToken(tokenResponse.access_token, tokenResponse.expires_in)
        window.location.href = '/dashboard'
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Token exchange failed')
      }
    }

    handleCallback()
  }, [searchParams])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">Authentication Error</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <a
              href="/login"
              className="mt-3 inline-flex text-sm font-medium text-red-700 underline hover:text-red-900"
            >
              Return to login
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-500">Completing sign-in&hellip;</p>
        </div>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  )
}
