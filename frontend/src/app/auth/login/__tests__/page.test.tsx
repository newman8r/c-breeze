import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import LoginPage from '../page'
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
      const { animate, transition, ...validProps } = props;
      return <span {...validProps}>{children}</span>;
    },
  },
}))

// Mock supabase client
jest.mock('@/utils/supabase', () => {
  const mockSignIn = jest.fn().mockResolvedValue({
    data: {
      session: {
        user: { id: '123', email: 'test@example.com' },
      },
    },
    error: null,
  })

  return {
    createClient: jest.fn(() => ({
      auth: {
        signInWithPassword: mockSignIn,
        setSession: jest.fn(),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { organization_id: 'org123' },
            }),
          }),
        }),
      }),
      functions: {
        invoke: jest.fn(),
      },
    })),
  }
})

describe('LoginPage', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  it('renders login form', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('has link to registration page', () => {
    render(<LoginPage />)
    const registerLink = screen.getByRole('link', { name: /sign up/i })
    expect(registerLink).toBeInTheDocument()
    expect(registerLink).toHaveAttribute('href', '/auth/register')
  })

  it('has link to reset password page', () => {
    render(<LoginPage />)
    const resetLink = screen.getByRole('link', { name: /forgot your password/i })
    expect(resetLink).toBeInTheDocument()
    expect(resetLink).toHaveAttribute('href', '/auth/reset-password')
  })

  it('shows loading state when submitting', async () => {
    render(<LoginPage />)
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    })
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Should show loading state
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('navigates to dashboard on successful login', async () => {
    render(<LoginPage />)
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    })
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard')
    }, { timeout: 3000 })
  })
}) 
