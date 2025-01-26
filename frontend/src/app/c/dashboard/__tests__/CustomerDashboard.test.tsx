import { render, screen } from '@testing-library/react'
import CustomerDashboard from '../CustomerDashboard'

// Mock the supabase client
jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: '123' } } }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  }),
}))

describe('CustomerDashboard', () => {
  it('renders the dashboard title', () => {
    render(<CustomerDashboard />)
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument()
  })

  // Add more test cases as needed
}) 