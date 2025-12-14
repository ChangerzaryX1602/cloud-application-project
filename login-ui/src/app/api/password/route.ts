import { NextRequest, NextResponse } from 'next/server';
import { getServiceToken } from '@/lib/auth';
import { createSession, setSessionPassword, getAuthRequestCallback, getUserSecondFactors } from '@/lib/zitadel';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loginName, password, requestId, organization } = body;

    console.log('Password API called with:', { loginName, requestId, organization });

    if (!loginName || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const token = await getServiceToken();

    // Create a new session
    const session = await createSession(token, loginName, organization);
    console.log('Session created:', session);
    
    if (!session || !session.sessionId) {
      return NextResponse.json(
        { error: 'ไม่สามารถสร้าง session ได้' },
        { status: 500 }
      );
    }

    // Verify password
    const passwordResult = await setSessionPassword(
      token, 
      session.sessionId, 
      session.sessionToken,
      password
    );
    console.log('Password result:', passwordResult);

    if (!passwordResult.success) {
      return NextResponse.json(
        { error: 'รหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const currentSessionToken = passwordResult.sessionToken || session.sessionToken;

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('session', JSON.stringify({
      id: session.sessionId,
      token: currentSessionToken,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    // Check if user has second factors configured
    const userSecondFactors = await getUserSecondFactors(token, session.userId || '');
    console.log('User second factors:', userSecondFactors);

    // If user has 2FA configured, redirect to 2FA page BEFORE getting callback
    if (userSecondFactors && userSecondFactors.hasSecondFactor) {
      const params = new URLSearchParams();
      params.set('loginName', loginName);
      params.set('sessionId', session.sessionId);
      params.set('sessionToken', currentSessionToken);
      if (requestId) params.set('authRequestId', requestId);
      if (organization) params.set('organization', organization);

      // Redirect based on what type of 2FA user has
      if (userSecondFactors.hasPasskey || userSecondFactors.hasU2F) {
        return NextResponse.json({ 
          redirect: `/passkey?${params.toString()}`,
          needsMFA: true,
        });
      } else if (userSecondFactors.hasTOTP) {
        return NextResponse.json({ 
          redirect: `/otp?${params.toString()}`,
          needsMFA: true,
        });
      }
    }

    // If there's an auth request and no 2FA needed, get callback
    if (requestId) {
      console.log('Getting callback for authRequestId:', requestId);
      const callback = await getAuthRequestCallback(
        token,
        requestId,
        session.sessionId,
        currentSessionToken
      );
      console.log('Callback result:', callback);

      if (callback?.callbackUrl) {
        return NextResponse.json({ redirect: callback.callbackUrl });
      }
    }

    // No auth request, redirect to success page
    console.log('No callback, redirecting to signedin');
    return NextResponse.json({ redirect: `/signedin` });
  } catch (error) {
    console.error('Password verification error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
