'use client'

import { Role } from '@/lib/types'

interface Props {
  availableRoles: Role[]
  selectedRoles: string[]
  onChange: (roles: string[]) => void
}

export function RoleSelector({ availableRoles, selectedRoles, onChange }: Props) {
  const handleToggle = (roleName: string) => {
    if (selectedRoles.includes(roleName)) {
      onChange(selectedRoles.filter(r => r !== roleName))
    } else {
      onChange([...selectedRoles, roleName])
    }
  }

  if (availableRoles.length === 0) {
    return (
      <p className="text-sm text-gray-500">No roles available.</p>
    )
  }

  return (
    <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 p-3">
      <div className="space-y-2">
        {availableRoles.map(role => (
          <label
            key={role.name}
            className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-gray-50"
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={selectedRoles.includes(role.name)}
              onChange={() => handleToggle(role.name)}
            />
            <span className="text-sm text-gray-700">{role.name}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
