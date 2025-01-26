import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import TicketFeed from '../TicketFeed'
import { Ticket } from '@/types/ticket'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { animate, initial, exit, layout, whileHover, variants, ...validProps } = props;
      return <div {...validProps}>{children}</div>;
    },
  },
}))

const mockTickets: Ticket[] = [
  {
    id: '1',
    title: 'Test Ticket 1',
    description: 'Test Description 1',
    status: 'open',
    priority: 'high',
    created_at: '2024-01-20T12:00:00Z',
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    ticket_tags: [],
  },
  {
    id: '2',
    title: 'Test Ticket 2',
    description: 'Test Description 2',
    status: 'in_progress',
    priority: 'medium',
    created_at: '2024-01-20T13:00:00Z',
    customer: {
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
    ticket_tags: [],
  },
]

describe('TicketFeed', () => {
  const defaultProps = {
    tickets: mockTickets,
    ticketsLoading: false,
    zoomLevel: 1 as const,
    setZoomLevel: jest.fn(),
    expandedTickets: {},
    toggleTicketExpansion: jest.fn(),
    setSelectedTicket: jest.fn(),
  }

  it('renders tickets in detail view (zoom level 1)', () => {
    render(<TicketFeed {...defaultProps} />)
    expect(screen.getByText('Test Ticket 1')).toBeInTheDocument()
    expect(screen.getByText('Test Ticket 2')).toBeInTheDocument()
  })

  it('renders tickets in grid view (zoom level 2)', () => {
    render(<TicketFeed {...defaultProps} zoomLevel={2} />)
    expect(screen.getByText('Test Ticket 1')).toBeInTheDocument()
    expect(screen.getByText('Test Ticket 2')).toBeInTheDocument()
  })

  it('renders tickets in heatmap view (zoom level 3)', () => {
    render(<TicketFeed {...defaultProps} zoomLevel={3} />)
    // In heatmap view, we should still see the ticket info in tooltips
    expect(screen.getByText('Test Ticket 1')).toBeInTheDocument()
    expect(screen.getByText('Test Ticket 2')).toBeInTheDocument()
  })

  it('shows loading spinner when loading', () => {
    render(<TicketFeed {...defaultProps} ticketsLoading={true} />)
    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('animate-spin')
  })

  it('calls setZoomLevel when zoom buttons are clicked', () => {
    render(<TicketFeed {...defaultProps} />)
    const gridViewButton = screen.getByTitle('Grid View')
    fireEvent.click(gridViewButton)
    expect(defaultProps.setZoomLevel).toHaveBeenCalledWith(2)
  })

  it('calls setSelectedTicket when a ticket is clicked', () => {
    render(<TicketFeed {...defaultProps} />)
    fireEvent.click(screen.getByText('Test Ticket 1'))
    expect(defaultProps.setSelectedTicket).toHaveBeenCalledWith({ id: '1', isOpen: true })
  })

  it('displays correct number of tickets', () => {
    render(<TicketFeed {...defaultProps} />)
    expect(screen.getByText('2 tickets')).toBeInTheDocument()
  })
}) 
