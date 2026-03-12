'use client'

import { useEffect, useState } from 'react'
import { authApi } from '@/lib/api'

async function generatePKCE() {
  const verifier = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  return { verifier, challenge }
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function initiateLogin() {
      try {
        const { verifier, challenge } = await generatePKCE()
        const state = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '')

        sessionStorage.setItem('pkce_verifier', verifier)
        sessionStorage.setItem('oauth_state', state)

        const redirectUri = `${window.location.origin}/callback`
        const { url } = await authApi.getAuthorizeUrl(redirectUri, state, challenge)
        window.location.href = url
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initiate login')
      }
    }

    initiateLogin()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Platform &amp; DevOps Console</h1>
          <p className="mt-2 text-sm text-gray-500">Admin management portal</p>
        </div>

        {error ? (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">Login Error</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <a
              href="/login"
              className="mt-3 inline-flex text-sm font-medium text-red-700 underline hover:text-red-900"
            >
              Try again
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="text-sm text-gray-500">Redirecting to login&hellip;</p>
          </div>
        )}
      </div>
    </div>
  )
}
