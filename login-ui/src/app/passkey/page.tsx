'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginHeader } from '@/components/LoginHeader';
import { Alert } from '@/components/Alert';
import { Spinner } from '@/components/Spinner';
import { getApiUrl } from '@/lib/config';

function PasskeyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginName = searchParams.get('loginName') || '';
  const sessionId = searchParams.get('sessionId') || '';
  const sessionToken = searchParams.get('sessionToken') || '';
  const requestId = searchParams.get('authRequestId') || searchParams.get('requestId') || '';
  const organization = searchParams.get('organization') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Auto-start passkey verification on mount
    startPasskeyVerification();
  }, []);

  async function startPasskeyVerification() {
    setLoading(true);
    setError('');

    try {
      // Get passkey challenge from server
      const challengeResponse = await fetch(getApiUrl('/api/passkey/challenge'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          sessionToken,
        }),
      });

      const challengeData = await challengeResponse.json();

      if (!challengeResponse.ok) {
        setError(challengeData.error || 'ไม่สามารถเริ่มการยืนยันได้');
        setChecking(false);
        return;
      }

      if (!challengeData.publicKeyCredentialRequestOptions) {
        setError('ไม่พบข้อมูล Passkey');
        setChecking(false);
        return;
      }

      // Convert challenge data for WebAuthn API
      const publicKey = preparePublicKeyOptions(challengeData.publicKeyCredentialRequestOptions);
      
      // Use the new session token from challenge response
      const newSessionToken = challengeData.sessionToken || sessionToken;

      console.log('WebAuthn publicKey options:', publicKey);

      // Call browser WebAuthn API
      const credential = await navigator.credentials.get({ publicKey }) as PublicKeyCredential;

      if (!credential) {
        setError('การยืนยัน Passkey ถูกยกเลิก');
        setChecking(false);
        return;
      }

      // Send credential to server
      const response = credential.response as AuthenticatorAssertionResponse;
      const verifyResponse = await fetch(getApiUrl('/api/passkey/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          sessionToken: newSessionToken,
          credentialId: credential.id,
          rawId: arrayBufferToBase64(credential.rawId),
          type: credential.type,
          clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
          authenticatorData: arrayBufferToBase64(response.authenticatorData),
          signature: arrayBufferToBase64(response.signature),
          userHandle: response.userHandle 
            ? arrayBufferToBase64(response.userHandle)
            : '',
          requestId,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        setError(verifyData.error || 'การยืนยัน Passkey ไม่สำเร็จ');
        setChecking(false);
        return;
      }

      if (verifyData.redirect) {
        if (verifyData.redirect.startsWith('http')) {
          window.location.href = verifyData.redirect;
        } else {
          router.push(verifyData.redirect);
        }
      }
    } catch (err: any) {
      console.error('Passkey error:', err);
      if (err.name === 'NotAllowedError') {
        setError('การยืนยัน Passkey ถูกยกเลิกหรือหมดเวลา');
      } else {
        setError('เกิดข้อผิดพลาดในการยืนยัน Passkey');
      }
      setChecking(false);
    } finally {
      setLoading(false);
    }
  }

  function preparePublicKeyOptions(options: any) {
    const prepared = { ...options };
    
    if (prepared.challenge) {
      prepared.challenge = base64ToArrayBuffer(prepared.challenge);
    }
    
    if (prepared.allowCredentials) {
      prepared.allowCredentials = prepared.allowCredentials.map((cred: any) => ({
        ...cred,
        id: base64ToArrayBuffer(cred.id),
      }));
    }
    
    return prepared;
  }

  function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  function handleRetry() {
    setChecking(true);
    setError('');
    startPasskeyVerification();
  }

  function handleUseOTP() {
    const params = new URLSearchParams();
    params.set('loginName', loginName);
    params.set('sessionId', sessionId);
    if (requestId) params.set('authRequestId', requestId);
    if (organization) params.set('organization', organization);
    router.push(`/otp?${params.toString()}`);
  }

  return (
    <div className="login-card animate-fadeIn">
      <LoginHeader />

      <div className="text-center mb-6">
        <div className="text-5xl mb-4">👆</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">ยืนยันตัวตนด้วย Passkey</h2>
        <p className="text-gray-500 text-sm">กรุณาใช้ลายนิ้วมือหรือ Face ID เพื่อยืนยันตัวตน</p>
        {loginName && (
          <p className="text-gray-400 text-xs mt-2">{loginName}</p>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center py-8">
          <Spinner />
          <p className="mt-4 text-gray-600">กำลังรอการยืนยัน...</p>
        </div>
      )}

      {error && (
        <div className="space-y-4">
          <Alert type="error">{error}</Alert>
          
          <button
            type="button"
            onClick={handleRetry}
            className="btn-primary"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      )}

      <div className="mt-6 text-center space-y-2">
        <button
          type="button"
          onClick={handleUseOTP}
          className="text-sm text-kku-primary hover:text-kku-dark hover:underline transition-colors"
        >
          ใช้รหัส OTP แทน
        </button>
      </div>
    </div>
  );
}

function PasskeyLoading() {
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

export default function PasskeyPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <Suspense fallback={<PasskeyLoading />}>
        <PasskeyForm />
      </Suspense>
    </main>
  );
}
