import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CustomerPortal from '../CustomerPortal'

describe('CustomerPortal', () => {
  const defaultProps = {
    company: 'Test Company',
    onSubmit: jest.fn(),
    isSubmitting: false,
    error: null
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders welcome message and form elements', () => {
    render(<CustomerPortal {...defaultProps} />)

    // Check welcome message
    expect(screen.getByText('Welcome to Test Company Support')).toBeInTheDocument()
    expect(screen.getByText('How can we help you today? 🌊')).toBeInTheDocument()

    // Check form elements
    expect(screen.getByPlaceholderText(/Type your question here/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter your email/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Choose a password/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Get Help Now 🌟' })).toBeInTheDocument()

    // Check knowledge base section
    expect(screen.getByText('Find Quick Answers 🔍')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search our knowledge base...')).toBeInTheDocument()
  })

  it('handles form submission correctly', async () => {
    const onSubmit = jest.fn()
    render(<CustomerPortal {...defaultProps} onSubmit={onSubmit} />)

    // Fill out the form
    fireEvent.change(screen.getByPlaceholderText(/Type your question here/), {
      target: { value: 'Test question' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Choose a password/), {
      target: { value: 'password123' },
    })

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: 'Get Help Now 🌟' }))

    // Check if onSubmit was called with correct values
    expect(onSubmit).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
      'Test question'
    )
  })

  it('shows loading state during submission', () => {
    render(<CustomerPortal {...defaultProps} isSubmitting={true} />)

    const submitButton = screen.getByRole('button', { name: 'Creating Ticket...' })
    expect(submitButton).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('displays error message when submission fails', () => {
    const error = 'Failed to create ticket'
    render(<CustomerPortal {...defaultProps} error={error} />)

    expect(screen.getByText(error)).toBeInTheDocument()
  })

  it('shows demo knowledge base articles', () => {
    render(<CustomerPortal {...defaultProps} />)

    // Check if all demo articles are rendered
    expect(screen.getByText('Getting Started Guide')).toBeInTheDocument()
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument()
    expect(screen.getByText('Account Management')).toBeInTheDocument()
    expect(screen.getByText('Troubleshooting Common Issues')).toBeInTheDocument()

    // Check if categories are displayed
    expect(screen.getByText('Basics')).toBeInTheDocument()
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
  })
}) 
