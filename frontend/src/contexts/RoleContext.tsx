'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useUser } from './UserContext'
import { createClient } from '@/utils/supabase'

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
  const [role, setRole] = useState<UserRole | null>(null)
  const [isRootAdmin, setIsRootAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useUser()
  const supabase = createClient()

  const fetchRole = async () => {
    console.log('Fetching role for user:', user?.id)
    if (!user) {
      setRole(null)
      setIsRootAdmin(false)
      setLoading(false)
      return
    }

    try {
      // First check if user is root admin
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, created_by')
        .single()

      console.log('Organization data:', orgData, 'Error:', orgError)

      if (orgData && orgData.created_by === user.id) {
        setIsRootAdmin(true)
        setRole('admin')
        setOrganizationId(orgData.id)
        setLoading(false)
        return
      }

      // Then check employee role
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .single()

      console.log('Employee data:', employeeData, 'Error:', employeeError)

      if (employeeError && employeeError.code !== 'PGRST116') {
        throw employeeError
      }

      setRole(employeeData?.role || null)
      setOrganizationId(employeeData?.organization_id || null)
    } catch (error) {
      console.error('Error fetching role:', error)
      setError(error instanceof Error ? error : new Error('Unknown error'))
      setRole(null)
    } finally {
      setLoading(false)
    }
  }

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, 'Session:', session?.user?.id)
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await fetchRole()
      } else if (event === 'SIGNED_OUT') {
        setRole(null)
        setIsRootAdmin(false)
        setOrganizationId(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Initial role fetch
  useEffect(() => {
    fetchRole()
  }, [user])

  return (
    <RoleContext.Provider value={{ 
      role, 
      isRootAdmin, 
      loading, 
      refreshRole: fetchRole,
      organizationId,
      error 
    }}>
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