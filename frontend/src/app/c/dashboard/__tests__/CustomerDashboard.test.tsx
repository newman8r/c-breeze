import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import CustomerDashboard from '../CustomerDashboard'

// Mock the Supabase browser client
const mockGetSession = jest.fn()
jest.mock('@/lib/supabase-browser', () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    }),
    removeChannel: jest.fn(),
  }),
}))

// Mock the function URL helper
jest.mock('@/lib/supabase', () => ({
  getFunctionUrl: (name: string) => `https://mock-api/${name}`,
}))

// Mock fetch
global.fetch = jest.fn().mockImplementation((url) => {
  if (url.includes('get-customer-tickets')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        tickets: [
          {
            id: '1',
            title: 'Test Ticket',
            status: 'open',
            priority: 'high',
            created_at: '2024-01-25T00:00:00Z',
            ticket_messages: []
          }
        ]
      })
    })
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  })
})

describe('CustomerDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default mock implementation for successful auth
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: '123', email: 'test@example.com' },
          access_token: 'mock-token'
        }
      },
      error: null
    })
  })

  it('shows loading state initially', () => {
    render(<CustomerDashboard company="test-company" />)
    expect(screen.getByText(/Loading your tickets/i)).toBeInTheDocument()
  })

  it('renders the dashboard with tickets after loading', async () => {
    await act(async () => {
      render(<CustomerDashboard company="test-company" />)
    })
    
    // Wait for loading to finish and content to appear
    await waitFor(() => {
      expect(screen.queryByText(/Loading your tickets/i)).not.toBeInTheDocument()
    })

    // Verify dashboard content
    expect(screen.getByText('Test Ticket')).toBeInTheDocument()
  })

  it('handles authentication errors', async () => {
    // Mock getSession to return no session for this test
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null
    })

    await act(async () => {
      render(<CustomerDashboard company="test-company" />)
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Not authenticated/i)).toBeInTheDocument()
    })
  })
}) 