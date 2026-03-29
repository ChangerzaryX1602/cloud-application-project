'use client'

import { useEffect, useState, useCallback } from 'react'
import { permissionsApi, rolesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { Permission, PermissionCreate, PermissionUpdate } from '@/lib/types'

const PERM_FIELDS = ['read', 'write', 'create', 'delete', 'submit', 'cancel', 'amend'] as const
const emptyForm = (): PermissionCreate => ({
  doctype: '',
  role: '',
  permlevel: 0,
  read: false,
  write: false,
  create: false,
  delete: false,
  submit: false,
  cancel: false,
  amend: false,
})

export default function PermissionsPage() {
  const { token } = useAuth()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [doctypeFilter, setDoctypeFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  // Create / edit form
  const [showForm, setShowForm] = useState(false)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [form, setForm] = useState<PermissionCreate>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const PAGE_SIZE = 50

  const fetchPermissions = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await permissionsApi.list(
        { doctype: doctypeFilter || undefined, role: roleFilter || undefined, page, page_size: PAGE_SIZE },
        token
      )
      setPermissions(res.data)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions')
    } finally {
      setLoading(false)
    }
  }, [token, doctypeFilter, roleFilter, page])

  useEffect(() => { fetchPermissions() }, [fetchPermissions])

  useEffect(() => {
    if (!token) return
    rolesApi.list(token).then(res => setRoles(res.data.map(r => r.name))).catch(() => {})
  }, [token])

  function startCreate() {
    setEditingName(null)
    setForm(emptyForm())
    setSaveError(null)
    setShowForm(true)
  }

  function startEdit(p: Permission) {
    setEditingName(p.name)
    setForm({ doctype: p.doctype, role: p.role, permlevel: p.permlevel, read: p.read, write: p.write, create: p.create, delete: p.delete, submit: p.submit, cancel: p.cancel, amend: p.amend })
    setSaveError(null)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingName(null)
    setForm(emptyForm())
    setSaveError(null)
  }

  async function handleSave() {
    if (!token) return
    setSaving(true)
    setSaveError(null)
    try {
      if (editingName) {
        const update: PermissionUpdate = {
          read: form.read, write: form.write, create: form.create,
          delete: form.delete, submit: form.submit, cancel: form.cancel, amend: form.amend,
        }
        await permissionsApi.update(editingName, update, token)
      } else {
        await permissionsApi.create(form, token)
      }
      cancelForm()
      setPage(1)
      fetchPermissions()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(name: string) {
    if (!token || !confirm('Delete this permission rule?')) return
    try {
      await permissionsApi.remove(name, token)
      fetchPermissions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Permissions</h2>
          <p className="mt-1 text-sm text-gray-500">{total} permission rules</p>
        </div>
        <Button onClick={startCreate} disabled={showForm}>New Rule</Button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-blue-900">
            {editingName ? 'Edit Permission Rule' : 'New Permission Rule'}
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Input
              label="DocType"
              placeholder="e.g. User"
              value={form.doctype}
              disabled={!!editingName}
              onChange={e => setForm(f => ({ ...f, doctype: e.target.value }))}
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                value={form.role}
                disabled={!!editingName}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              >
                <option value="">Select role…</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <Input
              label="Perm Level"
              type="number"
              value={String(form.permlevel)}
              disabled={!!editingName}
              onChange={e => setForm(f => ({ ...f, permlevel: Number(e.target.value) }))}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            {PERM_FIELDS.map(field => (
              <label key={field} className="flex items-center gap-2 text-sm capitalize text-gray-700">
                <input
                  type="checkbox"
                  checked={!!form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                {field}
              </label>
            ))}
          </div>
          {saveError && (
            <p className="text-sm text-red-600">{saveError}</p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="outline" onClick={cancelForm} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Input
            label="DocType"
            placeholder="Filter by doctype..."
            value={doctypeFilter}
            onChange={e => { setDoctypeFilter(e.target.value); setPage(1) }}
          />
        </div>
        <div className="w-48">
          <Select
            label="Role"
            options={[{ value: '', label: 'All Roles' }, ...roles.map(r => ({ value: r, label: r }))]}
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setDoctypeFilter(''); setRoleFilter(''); setPage(1) }}
        >
          Clear
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">DocType</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Lvl</th>
              {PERM_FIELDS.map(f => (
                <th key={f} className="px-2 py-3 text-center font-medium text-gray-500 capitalize">{f}</th>
              ))}
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={PERM_FIELDS.length + 4} className="px-4 py-3">
                    <div className="h-4 rounded bg-gray-100 animate-pulse" />
                  </td>
                </tr>
              ))
            ) : permissions.length === 0 ? (
              <tr>
                <td colSpan={PERM_FIELDS.length + 4} className="px-4 py-8 text-center text-gray-400">
                  No permission rules found
                </td>
              </tr>
            ) : (
              permissions.map(p => (
                <tr key={p.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.doctype}</td>
                  <td className="px-4 py-3 text-gray-600">{p.role}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{p.permlevel}</td>
                  {PERM_FIELDS.map(f => (
                    <td key={f} className="px-2 py-3 text-center">
                      {p[f] ? (
                        <span className="inline-block h-4 w-4 rounded-full bg-green-500" title={f} />
                      ) : (
                        <span className="inline-block h-4 w-4 rounded-full bg-gray-200" />
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(p)}
                        disabled={showForm}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(p.name)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
