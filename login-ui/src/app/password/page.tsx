'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginHeader } from '@/components/LoginHeader';
import { Alert } from '@/components/Alert';
import { Spinner } from '@/components/Spinner';
import { UserAvatar } from '@/components/UserAvatar';
import { getApiUrl } from '@/lib/config';

function PasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginName = searchParams.get('loginName') || '';
  const requestId = searchParams.get('authRequestId') || searchParams.get('requestId') || '';
  const organization = searchParams.get('organization') || '';
  
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          loginName,
          password, 
          requestId,
          organization 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'รหัสผ่านไม่ถูกต้อง');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }

      if (data.redirect) {
        // Use window.location for external URLs (callback from Zitadel)
        if (data.redirect.startsWith('http')) {
          window.location.href = data.redirect;
        } else {
          router.push(data.redirect);
        }
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    router.push(`/loginname?requestId=${requestId}&organization=${organization}`);
  }

  return (
    <div className="login-card animate-fadeIn">
      <LoginHeader />
      
      <div className="mb-6">
        <UserAvatar loginName={loginName} onBack={handleBack} />
      </div>

      <h2 className="text-xl font-semibold text-gray-800 mb-2">ยืนยันรหัสผ่าน</h2>
      <p className="text-gray-500 text-sm mb-6">กรุณากรอกรหัสผ่านของคุณ</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={shake ? 'animate-shake' : ''}>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            รหัสผ่าน
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder="••••••••"
            required
            autoFocus
            autoComplete="current-password"
          />
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <button
          type="submit"
          disabled={loading || !password}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {loading ? <Spinner /> : null}
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>

        <div className="text-center">
          <a href="#" className="text-sm text-kku-primary hover:text-kku-dark hover:underline transition-colors">
            ลืมรหัสผ่าน?
          </a>
        </div>
      </form>
    </div>
  );
}

function PasswordLoading() {
  return (
    <div className="login-card animate-fadeIn">
      <LoginHeader />
      <div className="flex items-center justify-center py-12">
        <Spinner />
        <span className="ml-3 text-gray-600">กำลังโหลด...</span>
      </div>
    </div>
  );
}

export default function PasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <Suspense fallback={<PasswordLoading />}>
        <PasswordForm />
      </Suspense>
    </main>
  );
}
