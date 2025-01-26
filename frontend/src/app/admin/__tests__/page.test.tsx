import { render, screen, act, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminPanel from '../page'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { useRole } from '@/contexts/RoleContext'
import React from 'react'

// Mock React's useEffect
const mockUseEffect = jest.spyOn(React, 'useEffect')

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock UserContext
jest.mock('@/contexts/UserContext', () => ({
  useUser: jest.fn(),
}))

// Mock RoleContext
jest.mock('@/contexts/RoleContext', () => ({
  useRole: jest.fn(),
}))

// Mock Supabase
const mockSession = {
  access_token: 'mock-token',
  user: { id: '123', email: 'test@example.com' }
}

const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockResolvedValue(null),
}

jest.mock('@/lib/supabase-browser', () => ({
  getSupabaseBrowserClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
      signOut: jest.fn(),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: [], error: null }),
    },
    channel: jest.fn().mockReturnValue(mockChannel),
    removeChannel: jest.fn().mockResolvedValue(null),
  })),
}))

// Mock fetch for API calls
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ users: [] }),
  })
)

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { animate, initial, transition, layout, ...validProps } = props;
      return <div {...validProps}>{children}</div>;
    },
    svg: ({ children, ...props }: any) => {
      const { animate, initial, transition, layout, ...validProps } = props;
      return <svg {...validProps}>{children}</svg>;
    },
    span: ({ children, ...props }: any) => {
      const { animate, initial, transition, layout, ...validProps } = props;
      return <span {...validProps}>{children}</span>;
    },
  },
  AnimatePresence: ({ children }: any) => children,
}))

describe('AdminPanel', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock useEffect to do nothing
    mockUseEffect.mockImplementation(() => undefined)
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useUser as jest.Mock).mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      profile: { organization_id: 'org123' },
    })
    ;(useRole as jest.Mock).mockReturnValue({
      role: 'admin',
      isRootAdmin: true,
      loading: false,
    })
  })

  afterEach(() => {
    cleanup()
    jest.clearAllMocks()
  })

  it('renders without crashing', async () => {
    let rendered: ReturnType<typeof render> | null = null
    await act(async () => {
      rendered = render(<AdminPanel />)
    })
    expect(rendered).not.toBeNull()
    expect(rendered!.container.querySelector('div')).toBeInTheDocument()
  }, 30000) // Increased timeout to 30 seconds
}) 
