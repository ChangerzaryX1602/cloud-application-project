'use client'

import { useEffect, useState } from 'react'
import { rolesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { RoleSelector } from '@/components/RoleSelector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Role, RoleProfile } from '@/lib/types'

type EditingState = {
  name: string
  roles: string[]
  isNew: boolean
}

export default function RoleProfilesPage() {
  const { token } = useAuth()
  const [profiles, setProfiles] = useState<RoleProfile[]>([])
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)

  async function fetchData() {
    if (!token) return
    setLoading(true)
    try {
      const [profilesRes, rolesRes] = await Promise.all([
        rolesApi.listProfiles(token),
        rolesApi.list(token),
      ])
      setProfiles(profilesRes.data)
      setAvailableRoles(rolesRes.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load role profiles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function handleNewProfile() {
    setEditing({ name: '', roles: [], isNew: true })
    setNewProfileName('')
    setNameError(null)
    setSaveError(null)
  }

  function handleEditProfile(profile: RoleProfile) {
    setEditing({ name: profile.name, roles: [...profile.roles], isNew: false })
    setSaveError(null)
  }

  async function handleSave() {
    if (!token || !editing) return

    if (editing.isNew) {
      if (!newProfileName.trim()) {
        setNameError('Profile name is required')
        return
      }
    }

    setSaving(true)
    setSaveError(null)
    setNameError(null)

    try {
      if (editing.isNew) {
        await rolesApi.createProfile({ name: newProfileName.trim(), roles: editing.roles }, token)
      } else {
        await rolesApi.updateProfile(editing.name, { roles: editing.roles }, token)
      }
      setEditing(null)
      await fetchData()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Role Profiles</h2>
          <p className="mt-1 text-sm text-gray-500">
            Group roles together for easy user assignment.
          </p>
        </div>
        <Button onClick={handleNewProfile} disabled={!!editing}>
          New Profile
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Inline create/edit form */}
      {editing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>{editing.isNew ? 'New Role Profile' : `Edit: ${editing.name}`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing.isNew && (
              <Input
                label="Profile Name"
                placeholder="e.g. Standard Employee"
                value={newProfileName}
                onChange={e => setNewProfileName(e.target.value)}
                error={nameError ?? undefined}
              />
            )}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Roles</p>
              <RoleSelector
                availableRoles={availableRoles}
                selectedRoles={editing.roles}
                onChange={roles => setEditing(prev => prev ? { ...prev, roles } : null)}
              />
            </div>
            {saveError && (
              <p className="text-sm text-red-600">{saveError}</p>
            )}
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Profile'}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded bg-gray-100" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 py-16 text-gray-500">
          No role profiles yet. Create one to get started.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Profile Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Roles
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {profiles.map(profile => (
                <tr key={profile.name} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {profile.name}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {profile.roles.map(r => (
                        <Badge key={r} variant="secondary">
                          {r}
                        </Badge>
                      ))}
                      {profile.roles.length === 0 && (
                        <span className="text-xs text-gray-400">No roles</span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditProfile(profile)}
                      disabled={!!editing}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
