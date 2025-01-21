'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import { useUser } from './UserContext'

// Types for role management
type UserRole = 'admin' | 'employee' | 'customer' | null

export interface UserRoleData {
  role: UserRole
  isRootAdmin: boolean
  organizationId: string | null
  loading: boolean
}

type RoleContextType = {
  role: UserRole
  isRootAdmin: boolean
  organizationId: string | null
  loading: boolean
}

// Create the context
const RoleContext = createContext<RoleContextType>({
  role: null,
  isRootAdmin: false,
  organizationId: null,
  loading: true
})

// Provider component
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>(null)
  const [isRootAdmin, setIsRootAdmin] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { user, loading: userLoading } = useUser()
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    const fetchRole = async () => {
      if (!user || userLoading) {
        if (mounted) {
          setRole(null)
          setIsRootAdmin(false)
          setOrganizationId(null)
          setLoading(false)
        }
        return
      }

      try {
        // First try to get the employee record
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('role, is_root_admin, organization_id')
          .eq('user_id', user.id)
          .single()

        if (employeeError) {
          console.error('Error fetching employee data:', employeeError)
          throw employeeError
        }

        if (mounted) {
          setRole(employeeData.role)
          setIsRootAdmin(employeeData.is_root_admin)
          setOrganizationId(employeeData.organization_id)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error in fetchRole:', error)
        if (mounted) {
          setRole(null)
          setIsRootAdmin(false)
          setOrganizationId(null)
          setLoading(false)
        }
      }
    }

    fetchRole()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, 'Session:', session?.user?.id)
      if (event === 'SIGNED_OUT') {
        if (mounted) {
          setRole(null)
          setIsRootAdmin(false)
          setOrganizationId(null)
          setLoading(false)
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchRole()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [user, userLoading])

  return (
    <RoleContext.Provider value={{ role, isRootAdmin, organizationId, loading }}>
      {children}
    </RoleContext.Provider>
  )
}

// Custom hook to use the role context
export const useRole = () => useContext(RoleContext)

// Helper hook for role-based access control
export function useHasPermission(requiredRole: UserRole | UserRole[]) {
  const { role, isRootAdmin } = useRole()
  
  if (!role) return false
  if (isRootAdmin) return true
  
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  return roles.includes(role)
} 