'use client'

import { useEffect, useState, useCallback } from 'react'
import { auditApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { AuditLogTable } from '@/components/AuditLogTable'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { AuditLog } from '@/lib/types'

const PAGE_SIZE = 25

const OPERATION_OPTIONS = [
  { value: '', label: 'All Operations' },
  { value: 'Login', label: 'Login' },
  { value: 'Save', label: 'Save' },
  { value: 'Delete', label: 'Delete' },
]

export default function AuditLogsPage() {
  const { token } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [userFilter, setUserFilter] = useState('')
  const [operationFilter, setOperationFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchLogs = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await auditApi.list(
        {
          user: userFilter || undefined,
          operation: operationFilter || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          page,
          page_size: PAGE_SIZE,
        },
        token
      )
      setLogs(res.data)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [token, userFilter, operationFilter, startDate, endDate, page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function handleExportCsv() {
    if (logs.length === 0) return

    const headers = ['Timestamp', 'User', 'Operation', 'DocType', 'Document']
    const rows = logs.map(log => [
      new Date(log.creation).toISOString(),
      log.user,
      log.operation,
      log.reference_doctype,
      log.reference_name,
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
          <p className="mt-1 text-sm text-gray-500">{total} total events</p>
        </div>
        <Button variant="outline" onClick={handleExportCsv} disabled={logs.length === 0}>
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Input
            label="User"
            placeholder="Filter by user..."
            value={userFilter}
            onChange={e => {
              setUserFilter(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="w-44">
          <Select
            label="Operation"
            options={OPERATION_OPTIONS}
            value={operationFilter}
            onChange={e => {
              setOperationFilter(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="w-44">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={e => {
              setStartDate(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="w-44">
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={e => {
              setEndDate(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setUserFilter('')
            setOperationFilter('')
            setStartDate('')
            setEndDate('')
            setPage(1)
          }}
        >
          Clear
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <AuditLogTable logs={logs} loading={loading} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
