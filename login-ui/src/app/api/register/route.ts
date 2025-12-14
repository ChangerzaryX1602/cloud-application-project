import { NextRequest, NextResponse } from 'next/server';
import { getServiceToken } from '@/lib/auth';
import { createUser } from '@/lib/zitadel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, givenName, familyName, password, organization } = body;

    if (!email || !givenName || !familyName || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const token = await getServiceToken();

    const result = await createUser(token, {
      email,
      username: username || email,
      givenName,
      familyName,
      password,
      organization,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'ไม่สามารถสร้างบัญชีได้' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: result.userId,
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลงทะเบียน' },
      { status: 500 }
    );
  }
}
