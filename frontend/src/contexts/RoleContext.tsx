'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useUser } from './UserContext'
import { supabase } from '@/lib/supabase'

// Types for role management
export type UserRole = 'customer' | 'employee' | 'admin'

export interface UserRoleData {
  role: UserRole | null
  isRootAdmin: boolean
  organizationId: string | null
  loading: boolean
  error: Error | null
}

// Type for the RPC response
interface UserRoleResponse {
  role: UserRole
  is_root_admin: boolean
  organization_id: string
}

interface RoleContextType extends UserRoleData {
  refreshRole: () => Promise<void>
}

// Create the context
const RoleContext = createContext<RoleContextType | undefined>(undefined)

// Provider component
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const [roleData, setRoleData] = useState<UserRoleData>({
    role: null,
    isRootAdmin: false,
    organizationId: null,
    loading: true,
    error: null
  })

  const fetchUserRole = async () => {
    try {
      if (!user) {
        setRoleData(prev => ({
          ...prev,
          role: null,
          isRootAdmin: false,
          organizationId: null,
          loading: false,
          error: null
        }))
        return
      }

      const { data, error } = await supabase
        .rpc('get_current_user_role')
        .single()

      if (error) throw error

      const roleResponse = data as UserRoleResponse
      setRoleData({
        role: roleResponse.role,
        isRootAdmin: roleResponse.is_root_admin,
        organizationId: roleResponse.organization_id,
        loading: false,
        error: null
      })
    } catch (error) {
      setRoleData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to fetch user role')
      }))
    }
  }

  // Fetch role when user changes
  useEffect(() => {
    fetchUserRole()
  }, [user?.id])

  // Set up real-time subscription for role changes
  useEffect(() => {
    if (!user?.id) return

    const subscription = supabase
      .channel('role-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUserRole()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user?.id])

  const value = {
    ...roleData,
    refreshRole: fetchUserRole
  }

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  )
}

// Custom hook to use the role context
export function useRole() {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}

// Helper hook for role-based access control
export function useHasPermission(requiredRole: UserRole | UserRole[]) {
  const { role, isRootAdmin } = useRole()
  
  if (!role) return false
  if (isRootAdmin) return true
  
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  return roles.includes(role)
} 