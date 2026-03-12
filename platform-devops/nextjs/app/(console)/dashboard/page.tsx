'use client'

import { useEffect, useState } from 'react'
import { usersApi, rolesApi, auditApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { AuditLogTable } from '@/components/AuditLogTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AuditLog } from '@/lib/types'

interface DashboardStats {
  totalUsers: number
  totalRoles: number
  recentAuditCount: number
}

export default function DashboardPage() {
  const { token } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    async function fetchDashboard() {
      setLoading(true)
      setError(null)
      try {
        const [usersRes, rolesRes, auditRes] = await Promise.all([
          usersApi.list({ page: 1, page_size: 1 }, token!),
          rolesApi.list(token!),
          auditApi.list({ page: 1, page_size: 5 }, token!),
        ])
        setStats({
          totalUsers: usersRes.total,
          totalRoles: rolesRes.data.length,
          recentAuditCount: auditRes.total,
        })
        setRecentLogs(auditRes.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [token])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">Error loading dashboard</p>
        <p className="mt-1 text-sm text-red-700">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">Overview of your platform</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalUsers ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Total Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalRoles ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Audit Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats?.recentAuditCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <AuditLogTable logs={recentLogs} loading={false} />
        </CardContent>
      </Card>
    </div>
  )
}
