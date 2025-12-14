import { NextRequest, NextResponse } from 'next/server';
import { getServiceToken } from '@/lib/auth';
import { searchUser } from '@/lib/zitadel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loginName, requestId, organization } = body;

    if (!loginName) {
      return NextResponse.json(
        { error: 'กรุณากรอกชื่อผู้ใช้หรืออีเมล' },
        { status: 400 }
      );
    }

    const token = await getServiceToken();
    
    // Search for user in Zitadel
    const user = await searchUser(token, loginName, organization);

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้งาน' },
        { status: 404 }
      );
    }

    // Redirect to password page
    const params = new URLSearchParams();
    params.set('loginName', loginName);
    if (requestId) params.set('requestId', requestId);
    if (organization) params.set('organization', organization);

    return NextResponse.json({
      redirect: `/password?${params.toString()}`,
      user: {
        id: user.id,
        loginName: user.loginName,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error('Login name error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการค้นหาผู้ใช้' },
      { status: 500 }
    );
  }
}
