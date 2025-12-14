'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginHeader } from '@/components/LoginHeader';
import { Alert } from '@/components/Alert';
import { Spinner } from '@/components/Spinner';
import { getApiUrl } from '@/lib/config';

function LoginnameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('authRequest')||searchParams.get('authRequestId') || searchParams.get('requestId') || '';
  const organization = searchParams.get('organization') || '';
  
  const [loginName, setLoginName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/loginname'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          loginName, 
          requestId,
          organization 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'เกิดข้อผิดพลาด');
        return;
      }

      if (data.redirect) {
        router.push(data.redirect);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  }

  function handleRegister() {
    const params = new URLSearchParams();
    if (requestId) params.set('authRequestId', requestId);
    if (organization) params.set('organization', organization);
    router.push(`/register${params.toString() ? '?' + params.toString() : ''}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="loginName" className="block text-sm font-medium text-gray-700 mb-2">
          ชื่อผู้ใช้หรืออีเมล
        </label>
        <input
          type="text"
          id="loginName"
          name="loginName"
          value={loginName}
          onChange={(e) => setLoginName(e.target.value)}
          className="form-input"
          placeholder="username@example.com"
          required
          autoFocus
          autoComplete="username"
        />
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <button
        type="submit"
        disabled={loading || !loginName}
        className="btn-primary flex items-center justify-center gap-2"
      >
        {loading ? <Spinner /> : null}
        {loading ? 'กำลังตรวจสอบ...' : 'ดำเนินการต่อ'}
      </button>

      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500 mb-2">ยังไม่มีบัญชี?</p>
        <button
          type="button"
          onClick={handleRegister}
          className="text-kku-primary hover:text-kku-dark font-medium hover:underline transition-colors"
        >
          ลงทะเบียนผู้ใช้ใหม่
        </button>
      </div>
    </form>
  );
}

export default function LoginnamePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="login-card animate-fadeIn">
        <LoginHeader />
        
        <Suspense fallback={<div className="flex justify-center"><Spinner /></div>}>
          <LoginnameForm />
        </Suspense>

        <div className="mt-6 text-center">
          <p className="text-sm text-kku-dark font-medium">
            KKU Cloud Application Project SSO
          </p>
        </div>
      </div>
    </main>
  );
}
