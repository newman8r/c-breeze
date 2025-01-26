import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CustomerPortalPage from '../page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock CustomerPortalContainer
jest.mock('../CustomerPortalContainer', () => {
  return function MockCustomerPortalContainer({ company }: { company: string }) {
    return <div data-testid="customer-portal-container">Company: {company}</div>
  }
})

describe('CustomerPortalPage', () => {
  const mockWindowLocation = (search: string) => {
    Object.defineProperty(window, 'location', {
      value: { search },
      writable: true,
    })
  }

  beforeEach(() => {
    mockWindowLocation('?company=test-company')
    // Reset all mocks before each test
    jest.clearAllMocks()
  })

  it('transitions from loading to content', async () => {
    const { rerender } = render(<CustomerPortalPage />)
    
    // Force a rerender to ensure we catch the loading state
    rerender(<CustomerPortalPage />)
    
    // Eventually shows the portal container
    await waitFor(() => {
      expect(screen.getByTestId('customer-portal-container')).toBeInTheDocument()
    })
  })

  it('renders portal container when company param is present', async () => {
    render(<CustomerPortalPage />)
    await waitFor(() => {
      expect(screen.getByTestId('customer-portal-container')).toBeInTheDocument()
      expect(screen.getByText('Company: test-company')).toBeInTheDocument()
    })
  })

  it('shows error when company param is missing', async () => {
    mockWindowLocation('')
    render(<CustomerPortalPage />)
    await waitFor(() => {
      expect(screen.getByText('Company parameter is required')).toBeInTheDocument()
    })
  })
}) 
