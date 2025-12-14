import { NextRequest, NextResponse } from 'next/server';
import { getServiceToken } from '@/lib/auth';
import { verifyTOTP, getAuthRequestCallback } from '@/lib/zitadel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, sessionId, requestId } = body;

    if (!code || !sessionId) {
      return NextResponse.json(
        { error: 'กรุณากรอกรหัส OTP' },
        { status: 400 }
      );
    }

    const token = await getServiceToken();

    const result = await verifyTOTP(token, sessionId, code);

    if (!result.success) {
      return NextResponse.json(
        { error: 'รหัส OTP ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // If there's an auth request, get the callback URL
    if (requestId && result.sessionToken) {
      const callback = await getAuthRequestCallback(
        token,
        requestId,
        sessionId,
        result.sessionToken
      );

      if (callback?.callbackUrl) {
        return NextResponse.json({ redirect: callback.callbackUrl });
      }
    }

    return NextResponse.json({ redirect: `/signedin` });
  } catch (error) {
    console.error('TOTP verification error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการตรวจสอบ OTP' },
      { status: 500 }
    );
  }
}
