import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import DashboardLayout from '../layout'

describe('DashboardLayout', () => {
  beforeEach(() => {
    // Reset document to a clean state before each test
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'description')
    document.head.appendChild(meta)
  })

  afterEach(() => {
    // Clean up any changes to document
    document.head.innerHTML = ''
    document.title = ''
  })

  it('sets document title and meta description', () => {
    render(<DashboardLayout>Test Content</DashboardLayout>)
    
    expect(document.title).toBe('Dashboard - Customer Portal')
    const metaDescription = document.querySelector('meta[name="description"]')
    expect(metaDescription).toHaveAttribute('content', 'Customer dashboard for managing tickets and resources')
  })

  it('creates meta description if it does not exist', () => {
    // Remove existing meta description
    const existingMeta = document.querySelector('meta[name="description"]')
    if (existingMeta) {
      existingMeta.remove()
    }

    render(<DashboardLayout>Test Content</DashboardLayout>)
    
    const metaDescription = document.querySelector('meta[name="description"]')
    expect(metaDescription).toHaveAttribute('content', 'Customer dashboard for managing tickets and resources')
  })

  it('renders children content', () => {
    render(<DashboardLayout>
      <div data-testid="test-child">Test Content</div>
    </DashboardLayout>)
    
    expect(screen.getByTestId('test-child')).toBeInTheDocument()
    expect(screen.getByTestId('test-child')).toHaveTextContent('Test Content')
  })
}) 