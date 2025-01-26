import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import RegisterPage from '../page'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { animate, initial, transition, ...validProps } = props;
      return <div {...validProps}>{children}</div>;
    },
    span: ({ children, ...props }: any) => {
      const { animate, initial, transition, ...validProps } = props;
      return <span {...validProps}>{children}</span>;
    },
  },
}))

// Mock supabase client with successful registration flow
jest.mock('@/utils/supabase', () => {
  const mockSignUp = jest.fn().mockResolvedValue({
    data: {
      user: { id: '123', email: 'test@example.com' },
    },
    error: null,
  })

  const mockSignIn = jest.fn().mockResolvedValue({
    data: {
      session: {
        user: { id: '123', email: 'test@example.com' },
      },
    },
    error: null,
  })

  const mockInsert = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: 'org123', name: 'Test Org' },
        error: null,
      }),
    }),
  })

  const mockSelect = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'emp123' },
          error: null,
        }),
      }),
    }),
  })

  return {
    createClient: jest.fn(() => ({
      auth: {
        signUp: mockSignUp,
        signInWithPassword: mockSignIn,
        refreshSession: jest.fn(),
      },
      from: jest.fn().mockImplementation((table) => ({
        insert: mockInsert,
        select: mockSelect,
      })),
      functions: {
        invoke: jest.fn().mockResolvedValue({ error: null }),
      },
    })),
  }
})

describe('RegisterPage', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  it('renders registration form', () => {
    render(<RegisterPage />)
    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('has link back to login page', () => {
    render(<RegisterPage />)
    const loginLink = screen.getByRole('link')
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/auth/login')
  })

  it('shows loading state when submitting', async () => {
    render(<RegisterPage />)
    
    fireEvent.change(screen.getByLabelText(/organization name/i), {
      target: { value: 'Test Org' },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    })
    
    fireEvent.click(screen.getByRole('button'))
    
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('completes registration flow and navigates to dashboard', async () => {
    render(<RegisterPage />)
    
    fireEvent.change(screen.getByLabelText(/organization name/i), {
      target: { value: 'Test Org' },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    })
    
    fireEvent.click(screen.getByRole('button'))
    
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard')
    }, { timeout: 3000 })
  })

  it('displays error message on registration failure', async () => {
    // Override the mock to simulate a failure
    const mockError = new Error('Registration failed')
    const mockClient = {
      auth: {
        signUp: jest.fn().mockRejectedValue(mockError),
        signInWithPassword: jest.fn(),
        refreshSession: jest.fn(),
      } as any,
      from: jest.fn(),
      functions: {
        invoke: jest.fn(),
      } as any,
    }
    jest.mocked(createClient).mockImplementationOnce(() => mockClient)

    render(<RegisterPage />)
    
    fireEvent.change(screen.getByLabelText(/organization name/i), {
      target: { value: 'Test Org' },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    })
    
    fireEvent.click(screen.getByRole('button'))
    
    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument()
    })
  })

  it('validates required fields', async () => {
    render(<RegisterPage />)
    
    // Try to submit without filling in any fields
    fireEvent.click(screen.getByRole('button'))
    
    // HTML5 validation should prevent submission and show validation message
    expect(screen.getByLabelText(/organization name/i)).toBeInvalid()
  })
}) 
