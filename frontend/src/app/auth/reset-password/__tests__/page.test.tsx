import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ResetPasswordPage from '../page'
import { createClient } from '@/lib/supabase'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

// Mock supabase client
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    auth: {
      resetPasswordForEmail: jest.fn(),
    },
  })),
}))

describe('Reset Password Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the reset password form', () => {
    render(<ResetPasswordPage />)

    expect(screen.getByText('Reset Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Reset Instructions' })).toBeInTheDocument()
    expect(screen.getByText('Remember your password?')).toBeInTheDocument()
    expect(screen.getByText('Log in')).toBeInTheDocument()
  })

  it('handles successful password reset request', async () => {
    const mockResetPasswordForEmail = jest.fn().mockResolvedValue({ error: null })
    ;(createClient as jest.Mock).mockReturnValue({
      auth: {
        resetPasswordForEmail: mockResetPasswordForEmail,
      },
    })

    render(<ResetPasswordPage />)

    const emailInput = screen.getByLabelText('Email')
    const submitButton = screen.getByRole('button', { name: 'Send Reset Instructions' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Check your email for password reset instructions.')).toBeInTheDocument()
    })

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/auth/update-password'),
      })
    )
  })

  it('handles password reset error', async () => {
    const mockError = new Error('Invalid email')
    const mockResetPasswordForEmail = jest.fn().mockResolvedValue({ error: mockError })
    ;(createClient as jest.Mock).mockReturnValue({
      auth: {
        resetPasswordForEmail: mockResetPasswordForEmail,
      },
    })

    render(<ResetPasswordPage />)

    const emailInput = screen.getByLabelText('Email')
    const submitButton = screen.getByRole('button', { name: 'Send Reset Instructions' })

    fireEvent.change(emailInput, { target: { value: 'invalid@example.com' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid email')).toBeInTheDocument()
    })
  })

  it('shows loading state during form submission', async () => {
    const mockResetPasswordForEmail = jest.fn().mockImplementation(() => new Promise(() => {})) // Never resolves
    ;(createClient as jest.Mock).mockReturnValue({
      auth: {
        resetPasswordForEmail: mockResetPasswordForEmail,
      },
    })

    render(<ResetPasswordPage />)

    const emailInput = screen.getByLabelText('Email')
    const submitButton = screen.getByRole('button', { name: 'Send Reset Instructions' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)

    expect(submitButton).toBeDisabled()
  })

  it('navigates to login page when clicking login link', () => {
    render(<ResetPasswordPage />)

    const loginLink = screen.getByText('Log in')
    expect(loginLink).toHaveAttribute('href', '/auth/login')
  })

  it('shows login link after successful password reset', async () => {
    const mockResetPasswordForEmail = jest.fn().mockResolvedValue({ error: null })
    ;(createClient as jest.Mock).mockReturnValue({
      auth: {
        resetPasswordForEmail: mockResetPasswordForEmail,
      },
    })

    render(<ResetPasswordPage />)

    const emailInput = screen.getByLabelText('Email')
    const submitButton = screen.getByRole('button', { name: 'Send Reset Instructions' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      const returnToLoginLink = screen.getByText('Return to login')
      expect(returnToLoginLink).toHaveAttribute('href', '/auth/login')
    })
  })

  it('handles non-Error objects in catch block', async () => {
    const mockResetPasswordForEmail = jest.fn().mockRejectedValue('Unknown error')
    ;(createClient as jest.Mock).mockReturnValue({
      auth: {
        resetPasswordForEmail: mockResetPasswordForEmail,
      },
    })

    render(<ResetPasswordPage />)

    const emailInput = screen.getByLabelText('Email')
    const submitButton = screen.getByRole('button', { name: 'Send Reset Instructions' })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('An error occurred while sending reset instructions')).toBeInTheDocument()
    })
  })
}) 
