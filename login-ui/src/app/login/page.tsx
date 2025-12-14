'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Spinner } from '@/components/Spinner';
import { LoginHeader } from '@/components/LoginHeader';

function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Get authRequest from Zitadel OIDC flow
    const authRequest = searchParams.get('authRequest') || '';
    const organization = searchParams.get('organization') || '';
    
    // Build redirect URL to loginname page
    const params = new URLSearchParams();
    if (authRequest) params.set('authRequestId', authRequest);
    if (organization) params.set('organization', organization);
    
    const queryString = params.toString();
    router.replace(`/loginname${queryString ? '?' + queryString : ''}`);
  }, [router, searchParams]);

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

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <Suspense fallback={
        <div className="login-card animate-fadeIn">
          <LoginHeader />
          <div className="flex items-center justify-center py-12">
            <Spinner />
            <span className="ml-3 text-gray-600">กำลังโหลด...</span>
          </div>
        </div>
      }>
        <LoginRedirect />
      </Suspense>
    </main>
  );
}
