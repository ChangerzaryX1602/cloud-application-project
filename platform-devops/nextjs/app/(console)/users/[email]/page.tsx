'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { usersApi, rolesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { RoleSelector } from '@/components/RoleSelector'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { User, Role } from '@/lib/types'

interface ProfileFormValues {
  full_name: string
  enabled: boolean
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { token } = useAuth()
  const email = decodeURIComponent(params.email as string)

  const [user, setUser] = useState<User | null>(null)
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [rolesSuccess, setRolesSuccess] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingRoles, setSavingRoles] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>()

  useEffect(() => {
    if (!token) return

    async function fetchData() {
      setLoading(true)
      try {
        const [userRes, rolesRes] = await Promise.all([
          usersApi.get(email, token!),
          rolesApi.list(token!),
        ])
        setUser(userRes)
        setAvailableRoles(rolesRes.data)
        setSelectedRoles(userRes.roles)
        reset({ full_name: userRes.full_name, enabled: userRes.enabled })
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : 'Failed to load user')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token, email, reset])

  async function onSaveProfile(values: ProfileFormValues) {
    if (!token) return
    setSavingProfile(true)
    setProfileError(null)
    setProfileSuccess(false)
    try {
      const updated = await usersApi.update(
        email,
        { full_name: values.full_name, enabled: values.enabled },
        token
      )
      setUser(updated)
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  async function onSaveRoles() {
    if (!token) return
    setSavingRoles(true)
    setRolesError(null)
    setRolesSuccess(false)
    try {
      const updated = await usersApi.update(email, { roles: selectedRoles }, token)
      setUser(updated)
      setRolesSuccess(true)
      setTimeout(() => setRolesSuccess(false), 3000)
    } catch (err) {
      setRolesError(err instanceof Error ? err.message : 'Failed to save roles')
    } finally {
      setSavingRoles(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        {profileError || 'User not found'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push('/users')}>
          ← Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{user.full_name}</h2>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <Badge variant={user.enabled ? 'success' : 'secondary'}>
          {user.enabled ? 'Active' : 'Disabled'}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <form onSubmit={handleSubmit(onSaveProfile)}>
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Email" value={user.email} disabled />
              <Input
                label="Full Name"
                error={errors.full_name?.message}
                {...register('full_name', { required: 'Full name is required' })}
              />
              <div className="flex items-center gap-3">
                <input
                  id="enabled-toggle"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  {...register('enabled')}
                />
                <label htmlFor="enabled-toggle" className="text-sm text-gray-700 cursor-pointer">
                  Account enabled
                </label>
              </div>
              {user.last_ip && (
                <p className="text-xs text-gray-500">Last IP: {user.last_ip}</p>
              )}
              {user.last_login && (
                <p className="text-xs text-gray-500">
                  Last login: {new Date(user.last_login).toLocaleString()}
                </p>
              )}

              {profileError && (
                <p className="text-sm text-red-600">{profileError}</p>
              )}
              {profileSuccess && (
                <p className="text-sm text-green-600">Profile saved successfully.</p>
              )}

              <Button type="submit" disabled={savingProfile} className="w-full">
                {savingProfile ? 'Saving…' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>
        </form>

        {/* Roles Card */}
        <Card>
          <CardHeader>
            <CardTitle>Role Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RoleSelector
              availableRoles={availableRoles}
              selectedRoles={selectedRoles}
              onChange={setSelectedRoles}
            />

            {rolesError && (
              <p className="text-sm text-red-600">{rolesError}</p>
            )}
            {rolesSuccess && (
              <p className="text-sm text-green-600">Roles saved successfully.</p>
            )}

            <Button
              onClick={onSaveRoles}
              disabled={savingRoles}
              className="w-full"
            >
              {savingRoles ? 'Saving…' : 'Save Roles'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
