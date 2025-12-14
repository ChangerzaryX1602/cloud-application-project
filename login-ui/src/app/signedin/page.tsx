import { LoginHeader } from '@/components/LoginHeader';

export default function SignedInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="login-card animate-fadeIn text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          เข้าสู่ระบบสำเร็จ!
        </h1>
        <p className="text-gray-500 mb-6">
          คุณได้เข้าสู่ระบบเรียบร้อยแล้ว
        </p>

        <div className="text-center">
          <p className="text-sm text-kku-primary font-medium">
            KKU Cloud Application Project SSO
          </p>
          <p className="text-xs text-kku-dark mt-1">
            by อาจารย์ชัชชัย
          </p>
        </div>
      </div>
    </main>
  );
}
