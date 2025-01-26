import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '../page'
import { useUser } from '@/contexts/UserContext'

// Mock UserContext
jest.mock('@/contexts/UserContext', () => ({
  useUser: jest.fn(),
}))

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { animate, initial, transition, variants, ...validProps } = props
      return <div {...validProps}>{children}</div>
    },
    section: ({ children, ...props }: any) => {
      const { animate, initial, transition, variants, ...validProps } = props
      return <section {...validProps}>{children}</section>
    },
  },
}))

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the hero section with title', () => {
    ;(useUser as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    })

    const { container } = render(<Home />)
    const heading = container.querySelector('h1')
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent(/Customer Support/i)
    expect(heading).toHaveTextContent(/Simplified/i)
  })

  it('shows login and register buttons when user is not logged in', () => {
    ;(useUser as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    })

    render(<Home />)
    expect(screen.getByText(/Log in/i)).toBeInTheDocument()
    expect(screen.getByText(/Start Free Trial/i)).toBeInTheDocument()
  })

  it('shows dashboard button when user is logged in', () => {
    ;(useUser as jest.Mock).mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
    })

    render(<Home />)
    expect(screen.getByText(/Go to Dashboard/i)).toBeInTheDocument()
    expect(screen.queryByText(/Start Free Trial/i)).not.toBeInTheDocument()
  })

  it('renders feature sections', () => {
    ;(useUser as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    })

    render(<Home />)
    expect(screen.getByText(/Smart Ticketing/i)).toBeInTheDocument()
    expect(screen.getByText(/Team Collaboration/i)).toBeInTheDocument()
    expect(screen.getByText(/Customer Insights/i)).toBeInTheDocument()
    expect(screen.getByText(/Multi-Channel Support/i)).toBeInTheDocument()
  })

  it('does not show auth buttons while loading', () => {
    ;(useUser as jest.Mock).mockReturnValue({
      user: null,
      loading: true,
    })

    render(<Home />)
    expect(screen.queryByText(/Log in/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Start Free Trial/i)).not.toBeInTheDocument()
  })
}) 
