import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '../page'
import { useUser } from '@/contexts/UserContext'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

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

describe('Home Page', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
  })

  it('shows login button and register link when user is not logged in', () => {
    ;(useUser as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    })

    render(<Home />)

    expect(screen.getByText('Log in')).toBeInTheDocument()
    expect(screen.getByText('Start Free Trial')).toBeInTheDocument()
    expect(screen.queryByText('Go to Dashboard')).not.toBeInTheDocument()
  })

  it('shows dashboard link when user is logged in', () => {
    ;(useUser as jest.Mock).mockReturnValue({
      user: { id: 'test-user' },
      loading: false,
    })

    render(<Home />)

    expect(screen.queryByText('Log in')).not.toBeInTheDocument()
    expect(screen.queryByText('Start Free Trial')).not.toBeInTheDocument()
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
  })

  it('hides auth buttons while loading', () => {
    ;(useUser as jest.Mock).mockReturnValue({
      user: null,
      loading: true,
    })

    render(<Home />)

    expect(screen.queryByText('Log in')).not.toBeInTheDocument()
    expect(screen.queryByText('Start Free Trial')).not.toBeInTheDocument()
    expect(screen.queryByText('Go to Dashboard')).not.toBeInTheDocument()
  })

  it('renders the hero section with title and description', () => {
    ;(useUser as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    })

    render(<Home />)

    expect(screen.getByText('Customer Support,')).toBeInTheDocument()
    expect(screen.getByText('Simplified')).toBeInTheDocument()
    expect(screen.getByText(/Streamline your customer support/)).toBeInTheDocument()
  })

  it('renders all feature sections', () => {
    ;(useUser as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    })

    render(<Home />)

    // Check main features
    expect(screen.getByText('Smart Ticketing')).toBeInTheDocument()
    expect(screen.getByText('Team Collaboration')).toBeInTheDocument()
    expect(screen.getByText('Customer Insights')).toBeInTheDocument()
    expect(screen.getByText('Multi-Channel Support')).toBeInTheDocument()

    // Check advanced features
    expect(screen.getByText('AI-Powered Responses')).toBeInTheDocument()
    expect(screen.getByText('Intelligent Routing')).toBeInTheDocument()
    expect(screen.getByText('Agent Copilot')).toBeInTheDocument()
    expect(screen.getByText('Smart Triage')).toBeInTheDocument()
    expect(screen.getByText('Unified Agent Workspace')).toBeInTheDocument()
    expect(screen.getByText('Knowledge Integration')).toBeInTheDocument()
  })
}) 
