'use client'

import { AuditLog } from '@/lib/types'

interface Props {
  logs: AuditLog[]
  loading?: boolean
}

export function AuditLogTable({ logs, loading }: Props) {
  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        No audit logs found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Timestamp
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              User
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Operation
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              DocType
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Document
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {logs.map(log => (
            <tr key={log.name} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {new Date(log.creation).toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                {log.user}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <span
                  className={
                    log.operation === 'Delete'
                      ? 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800'
                      : log.operation === 'Login'
                      ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800'
                      : 'rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800'
                  }
                >
                  {log.operation}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                {log.reference_doctype}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                {log.reference_name}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
