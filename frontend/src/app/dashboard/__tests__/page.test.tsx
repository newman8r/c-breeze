import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import DashboardPage from '../page'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { useRole } from '@/contexts/RoleContext'

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
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockResolvedValue(null),
}

jest.mock('@/utils/supabase', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: jest.fn(),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: [], error: null }),
    },
    channel: jest.fn().mockReturnValue(mockChannel),
    removeChannel: jest.fn().mockResolvedValue(null),
  })),
  getRecentOrganizationTickets: jest.fn().mockResolvedValue({ data: [], error: null }),
}))

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

describe('DashboardPage', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useUser as jest.Mock).mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      profile: { organization_id: 'org123' },
    })
    ;(useRole as jest.Mock).mockReturnValue({
      role: 'admin',
    })
  })

  it('renders without crashing', async () => {
    await act(async () => {
      render(<DashboardPage />)
    })
    // This is our most basic test - just checking if the component renders
    expect(document.querySelector('div')).toBeInTheDocument()
  })
}) 
