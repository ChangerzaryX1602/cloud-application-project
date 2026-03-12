'use client'

export default function SettingsPage() {
  const fastapiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://platform.mysterchat.com'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Platform & DevOps configuration overview.</p>
      </div>

      {/* API Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">API Configuration</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">FastAPI Gateway URL</p>
            <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 px-3 py-1.5 rounded border">
              {fastapiUrl}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Console URL</p>
            <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 px-3 py-1.5 rounded border">
              {appUrl}
            </p>
          </div>
        </div>
      </div>

      {/* OAuth Client Setup */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">ERPNext OAuth2 Client Setup</h2>
        <p className="text-sm text-gray-600">
          To enable SSO, register an OAuth2 client in ERPNext:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>
            Navigate to <span className="font-mono bg-gray-100 px-1 rounded">ERPNext → OAuth Client</span>
          </li>
          <li>
            Create a new client with:
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-600">
              <li>Client ID: <span className="font-mono bg-gray-100 px-1 rounded">platform_devops</span></li>
              <li>Grant Type: <span className="font-mono bg-gray-100 px-1 rounded">Authorization Code</span></li>
              <li>Redirect URI: <span className="font-mono bg-gray-100 px-1 rounded">{appUrl}/callback</span></li>
              <li>Scope: <span className="font-mono bg-gray-100 px-1 rounded">openid all</span></li>
            </ul>
          </li>
          <li>Copy the Client Secret into the <span className="font-mono bg-gray-100 px-1 rounded">ERPNEXT_CLIENT_SECRET</span> environment variable.</li>
        </ol>
      </div>

      {/* Webhook Setup */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Webhook Configuration</h2>
        <p className="text-sm text-gray-600">
          Register webhooks in ERPNext to receive real-time user change events:
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-700">DocType</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Event</th>
                <th className="text-left py-2 font-medium text-gray-700">Request URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { event: 'after_insert' },
                { event: 'on_update' },
                { event: 'on_trash' },
              ].map(({ event }) => (
                <tr key={event}>
                  <td className="py-2 pr-4 text-gray-600">User</td>
                  <td className="py-2 pr-4 font-mono text-xs bg-transparent">{event}</td>
                  <td className="py-2 font-mono text-xs">{fastapiUrl}/webhooks/receive</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500">
          Set the Webhook Secret in ERPNext to match the <span className="font-mono bg-gray-100 px-1 rounded">WEBHOOK_SECRET</span> environment variable for HMAC signature verification.
        </p>
      </div>
    </div>
  )
}
