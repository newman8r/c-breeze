import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { middleware } from '../middleware'

// Mock Supabase
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createMiddlewareClient: jest.fn(),
}))

describe('Middleware', () => {
  let mockSupabase: any
  
  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
    }

    ;(createMiddlewareClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('allows access to non-admin routes without session', async () => {
    const mockReq = {
      nextUrl: { pathname: '/some-public-route' },
      url: 'http://localhost:3000/some-public-route',
    }

    const mockRes = { headers: new Map() }
    jest.spyOn(NextResponse, 'next').mockReturnValue(mockRes as any)

    const response = await middleware(mockReq as any)
    expect(response).toBe(mockRes)
    expect(NextResponse.next).toHaveBeenCalled()
  })

  it('redirects to signin for admin routes without session', async () => {
    const mockReq = {
      nextUrl: { pathname: '/admin/dashboard' },
      url: 'http://localhost:3000/admin/dashboard',
    }

    const mockRedirectRes = { headers: new Map() }
    jest.spyOn(NextResponse, 'redirect').mockReturnValue(mockRedirectRes as any)
    jest.spyOn(global, 'URL').mockImplementation((url) => {
      return {
        pathname: url,
        href: `http://localhost:3000${url}`,
      } as any
    })

    const response = await middleware(mockReq as any)
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/auth/signin',
      })
    )
    expect(response).toBe(mockRedirectRes)
  })

  it('redirects to home for admin routes with non-admin user', async () => {
    // Mock authenticated session but non-admin role
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { 
        session: { 
          user: { id: 'test-user-id' } 
        } 
      }
    })

    const mockReq = {
      nextUrl: { pathname: '/admin/dashboard' },
      url: 'http://localhost:3000/admin/dashboard',
    }

    const mockRedirectRes = { headers: new Map() }
    jest.spyOn(NextResponse, 'redirect').mockReturnValue(mockRedirectRes as any)
    jest.spyOn(global, 'URL').mockImplementation((url) => {
      return {
        pathname: url,
        href: `http://localhost:3000${url}`,
      } as any
    })

    const response = await middleware(mockReq as any)
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/',
      })
    )
    expect(response).toBe(mockRedirectRes)
  })
}) 
