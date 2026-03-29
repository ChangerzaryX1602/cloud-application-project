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

type Tab = 'activity' | 'permissions'

export default function AuditLogsPage() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('activity')

  // ── Activity Log state ───────────────────────────────────────────────
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [operationOptions, setOperationOptions] = useState<{ value: string; label: string }[]>([
    { value: '', label: 'All Operations' },
  ])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState('')
  const [operationFilter, setOperationFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // ── Permission Log state ─────────────────────────────────────────────
  const [permLogs, setPermLogs] = useState<AuditLog[]>([])
  const [permTotal, setPermTotal] = useState(0)
  const [permPage, setPermPage] = useState(1)
  const [permLoading, setPermLoading] = useState(true)
  const [permError, setPermError] = useState<string | null>(null)
  const [permDoctypeFilter, setPermDoctypeFilter] = useState('')
  const [permUserFilter, setPermUserFilter] = useState('')

  // ── Fetch activity logs ──────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    if (!token || activeTab !== 'activity') return
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
  }, [token, activeTab, userFilter, operationFilter, startDate, endDate, page])

  // ── Fetch permission logs ────────────────────────────────────────────
  const fetchPermLogs = useCallback(async () => {
    if (!token || activeTab !== 'permissions') return
    setPermLoading(true)
    setPermError(null)
    try {
      const res = await auditApi.listPermissionLogs(
        {
          doctype: permDoctypeFilter || undefined,
          user: permUserFilter || undefined,
          page: permPage,
          page_size: PAGE_SIZE,
        },
        token
      )
      setPermLogs(res.data)
      setPermTotal(res.total)
    } catch (err) {
      setPermError(err instanceof Error ? err.message : 'Failed to load permission logs')
    } finally {
      setPermLoading(false)
    }
  }, [token, activeTab, permDoctypeFilter, permUserFilter, permPage])

  useEffect(() => {
    if (!token) return
    auditApi.listTypes(token).then(types => {
      setOperationOptions([
        { value: '', label: 'All Operations' },
        ...types.map(t => ({ value: t, label: t })),
      ])
    }).catch(() => {})
  }, [token])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useEffect(() => { fetchPermLogs() }, [fetchPermLogs])

  function handleExportCsv(data: AuditLog[], filename: string) {
    if (data.length === 0) return
    const headers = ['Timestamp', 'User', 'Operation', 'DocType', 'Document']
    const rows = data.map(log => [
      new Date(log.creation).toISOString(),
      log.user,
      log.operation,
      log.reference_doctype,
      log.reference_name,
    ])
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const permTotalPages = Math.ceil(permTotal / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {([
          { key: 'activity', label: 'Activity Log' },
          { key: 'permissions', label: 'Permission Changes' },
        ] as { key: Tab; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Activity Log tab ─────────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{total} total events</p>
            <Button
              variant="outline"
              onClick={() => handleExportCsv(logs, `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`)}
              disabled={logs.length === 0}
            >
              Export CSV
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-56">
              <Input
                label="User"
                placeholder="Filter by user..."
                value={userFilter}
                onChange={e => { setUserFilter(e.target.value); setPage(1) }}
              />
            </div>
            <div className="w-44">
              <Select
                label="Operation"
                options={operationOptions}
                value={operationFilter}
                onChange={e => { setOperationFilter(e.target.value); setPage(1) }}
              />
            </div>
            <div className="w-44">
              <Input label="Start Date" type="date" value={startDate}
                onChange={e => { setStartDate(e.target.value); setPage(1) }} />
            </div>
            <div className="w-44">
              <Input label="End Date" type="date" value={endDate}
                onChange={e => { setEndDate(e.target.value); setPage(1) }} />
            </div>
            <Button variant="ghost" size="sm" onClick={() => {
              setUserFilter(''); setOperationFilter(''); setStartDate(''); setEndDate(''); setPage(1)
            }}>Clear</Button>
          </div>

          {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          <AuditLogTable logs={logs} loading={loading} />

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Permission Changes tab ───────────────────────────────────── */}
      {activeTab === 'permissions' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{permTotal} total events</p>
            <Button
              variant="outline"
              onClick={() => handleExportCsv(permLogs, `permission-logs-${new Date().toISOString().slice(0, 10)}.csv`)}
              disabled={permLogs.length === 0}
            >
              Export CSV
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-56">
              <Input
                label="DocType"
                placeholder="Filter by doctype..."
                value={permDoctypeFilter}
                onChange={e => { setPermDoctypeFilter(e.target.value); setPermPage(1) }}
              />
            </div>
            <div className="w-56">
              <Input
                label="User"
                placeholder="Filter by user..."
                value={permUserFilter}
                onChange={e => { setPermUserFilter(e.target.value); setPermPage(1) }}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => {
              setPermDoctypeFilter(''); setPermUserFilter(''); setPermPage(1)
            }}>Clear</Button>
          </div>

          {permError && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{permError}</div>}
          <AuditLogTable logs={permLogs} loading={permLoading} />

          {permTotalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Page {permPage} of {permTotalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={permPage <= 1} onClick={() => setPermPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={permPage >= permTotalPages} onClick={() => setPermPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
