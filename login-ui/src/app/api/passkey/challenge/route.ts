import { NextRequest, NextResponse } from 'next/server';
import { getServiceToken } from '@/lib/auth';
import { getWebAuthnChallenge } from '@/lib/zitadel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, sessionToken } = body;

    if (!sessionId || !sessionToken) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    const token = await getServiceToken();

    const challenge = await getWebAuthnChallenge(token, sessionId, sessionToken);

    if (!challenge) {
      return NextResponse.json(
        { error: 'ไม่สามารถสร้าง challenge ได้' },
        { status: 500 }
      );
    }

    return NextResponse.json(challenge);
  } catch (error) {
    console.error('Passkey challenge error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}
