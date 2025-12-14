'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginHeader } from '@/components/LoginHeader';
import { Alert } from '@/components/Alert';
import { Spinner } from '@/components/Spinner';
import { getApiUrl } from '@/lib/config';

function OTPForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginName = searchParams.get('loginName') || '';
  const sessionId = searchParams.get('sessionId') || '';
  const requestId = searchParams.get('authRequestId') || searchParams.get('requestId') || '';
  const organization = searchParams.get('organization') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-focus on first input
  useEffect(() => {
    const firstInput = document.getElementById('otp-0');
    if (firstInput) firstInput.focus();
  }, []);

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (i + index < 6) newOtp[i + index] = digit;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      document.getElementById(`otp-${nextIndex}`)?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join('');
    
    if (code.length !== 6) {
      setError('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/totp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          sessionId,
          requestId,
          organization,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'รหัส OTP ไม่ถูกต้อง');
        setOtp(['', '', '', '', '', '']);
        document.getElementById('otp-0')?.focus();
        return;
      }

      if (data.redirect) {
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

  return (
    <div className="login-card animate-fadeIn">
      <LoginHeader />

      <div className="text-center mb-6">
        <div className="text-4xl mb-4">🔐</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">ยืนยันตัวตนสองขั้นตอน</h2>
        <p className="text-gray-500 text-sm">กรุณากรอกรหัส 6 หลักจากแอป Authenticator</p>
        {loginName && (
          <p className="text-gray-400 text-xs mt-2">{loginName}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-kku-accent focus:border-transparent transition-all duration-200 bg-white/95"
              autoComplete="off"
            />
          ))}
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <button
          type="submit"
          disabled={loading || otp.join('').length !== 6}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {loading ? <Spinner /> : null}
          {loading ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
        </button>

        <div className="text-center space-y-2">
          <a href="#" className="block text-sm text-kku-primary hover:text-kku-dark hover:underline transition-colors">
            ใช้รหัสสำรอง
          </a>
          <a href="#" className="block text-sm text-gray-500 hover:text-gray-700 hover:underline transition-colors">
            มีปัญหาในการยืนยัน?
          </a>
        </div>
      </form>
    </div>
  );
}

function OTPLoading() {
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

export default function OTPPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <Suspense fallback={<OTPLoading />}>
        <OTPForm />
      </Suspense>
    </main>
  );
}
