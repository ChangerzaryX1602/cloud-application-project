'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginHeader } from '@/components/LoginHeader';
import { Alert } from '@/components/Alert';
import { Spinner } from '@/components/Spinner';
import { getApiUrl } from '@/lib/config';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('authRequestId') || searchParams.get('requestId') || '';
  const organization = searchParams.get('organization') || '';

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    givenName: '',
    familyName: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (formData.password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          givenName: formData.givenName,
          familyName: formData.familyName,
          password: formData.password,
          organization,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'เกิดข้อผิดพลาดในการลงทะเบียน');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        const params = new URLSearchParams();
        if (requestId) params.set('authRequestId', requestId);
        if (organization) params.set('organization', organization);
        router.push(`/loginname${params.toString() ? '?' + params.toString() : ''}`);
      }, 2000);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  }

  function handleBackToLogin() {
    const params = new URLSearchParams();
    if (requestId) params.set('authRequestId', requestId);
    if (organization) params.set('organization', organization);
    router.push(`/loginname${params.toString() ? '?' + params.toString() : ''}`);
  }

  if (success) {
    return (
      <div className="login-card animate-fadeIn">
        <LoginHeader />
        <div className="text-center py-8">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">ลงทะเบียนสำเร็จ!</h2>
          <p className="text-gray-500">กำลังนำคุณไปหน้าเข้าสู่ระบบ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-card animate-fadeIn">
      <LoginHeader />
      
      <h2 className="text-xl font-semibold text-gray-800 mb-2">ลงทะเบียนผู้ใช้ใหม่</h2>
      <p className="text-gray-500 text-sm mb-6">กรุณากรอกข้อมูลเพื่อสร้างบัญชีใหม่</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="givenName" className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อ
            </label>
            <input
              type="text"
              id="givenName"
              name="givenName"
              value={formData.givenName}
              onChange={handleChange}
              className="form-input"
              placeholder="ชื่อ"
              required
            />
          </div>
          <div>
            <label htmlFor="familyName" className="block text-sm font-medium text-gray-700 mb-1">
              นามสกุล
            </label>
            <input
              type="text"
              id="familyName"
              name="familyName"
              value={formData.familyName}
              onChange={handleChange}
              className="form-input"
              placeholder="นามสกุล"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            อีเมล
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="form-input"
            placeholder="email@example.com"
            required
          />
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อผู้ใช้ (ถ้ามี)
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="form-input"
            placeholder="username"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            รหัสผ่าน
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="form-input"
            placeholder="อย่างน้อย 8 ตัวอักษร"
            required
            minLength={8}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            ยืนยันรหัสผ่าน
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="form-input"
            placeholder="กรอกรหัสผ่านอีกครั้ง"
            required
          />
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {loading ? <Spinner /> : null}
          {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={handleBackToLogin}
            className="text-sm text-kku-primary hover:text-kku-dark hover:underline transition-colors"
          >
            มีบัญชีแล้ว? เข้าสู่ระบบ
          </button>
        </div>
      </form>
    </div>
  );
}

function RegisterLoading() {
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

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <Suspense fallback={<RegisterLoading />}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
