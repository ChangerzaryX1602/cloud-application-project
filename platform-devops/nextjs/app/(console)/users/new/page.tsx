'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { usersApi, rolesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { RoleSelector } from '@/components/RoleSelector'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Role } from '@/lib/types'

interface FormValues {
  email: string
  full_name: string
  send_welcome_email: boolean
}

export default function NewUserPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { send_welcome_email: false },
  })

  useEffect(() => {
    if (!token) return
    rolesApi.list(token).then(res => setAvailableRoles(res.data)).catch(() => {})
  }, [token])

  async function onSubmit(values: FormValues) {
    if (!token) return
    setSubmitError(null)
    try {
      await usersApi.create(
        {
          email: values.email,
          full_name: values.full_name,
          send_welcome_email: values.send_welcome_email,
          roles: selectedRoles,
        },
        token
      )
      router.push('/users')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create user')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">New User</h2>
        <Button variant="outline" onClick={() => router.push('/users')}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="user@example.com"
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email address' },
              })}
            />
            <Input
              label="Full Name"
              placeholder="Full name"
              error={errors.full_name?.message}
              {...register('full_name', { required: 'Full name is required' })}
            />
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                {...register('send_welcome_email')}
              />
              <span className="text-sm text-gray-700">Send welcome email</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <RoleSelector
              availableRoles={availableRoles}
              selectedRoles={selectedRoles}
              onChange={setSelectedRoles}
            />
          </CardContent>
        </Card>

        {submitError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{submitError}</div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/users')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create User'}
          </Button>
        </div>
      </form>
    </div>
  )
}
