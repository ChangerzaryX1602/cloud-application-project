import { NextRequest, NextResponse } from 'next/server';
import { getServiceToken } from '@/lib/auth';
import { verifyWebAuthn, getAuthRequestCallback } from '@/lib/zitadel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sessionId, 
      sessionToken, 
      credentialId, 
      rawId,
      type,
      clientDataJSON, 
      authenticatorData, 
      signature, 
      userHandle,
      requestId 
    } = body;

    if (!sessionId || !sessionToken || !credentialId) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    const token = await getServiceToken();

    // Format credential assertion data as expected by Zitadel
    // This must match the format from webauthn_login.js
    const credentialAssertionData = {
      id: credentialId,
      rawId: rawId || credentialId,
      type: type || 'public-key',
      response: {
        clientDataJSON,
        authenticatorData,
        signature,
        userHandle: userHandle || '',
      },
    };

    console.log('Sending credentialAssertionData:', JSON.stringify(credentialAssertionData, null, 2));

    const result = await verifyWebAuthn(
      token,
      sessionId,
      sessionToken,
      credentialAssertionData
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'การยืนยัน Passkey ไม่สำเร็จ' },
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
    console.error('Passkey verify error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการยืนยัน' },
      { status: 500 }
    );
  }
}
