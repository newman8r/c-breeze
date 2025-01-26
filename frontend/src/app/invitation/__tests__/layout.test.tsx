import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import InvitationLayout from '../layout'

describe('InvitationLayout', () => {
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
    render(<InvitationLayout>Test Content</InvitationLayout>)
    
    expect(document.title).toBe('Join Organization - Invitation')
    const metaDescription = document.querySelector('meta[name="description"]')
    expect(metaDescription).toHaveAttribute('content', 'Accept your invitation and join the organization')
  })

  it('creates meta description if it does not exist', () => {
    // Remove existing meta description
    const existingMeta = document.querySelector('meta[name="description"]')
    if (existingMeta) {
      existingMeta.remove()
    }

    render(<InvitationLayout>Test Content</InvitationLayout>)
    
    const metaDescription = document.querySelector('meta[name="description"]')
    expect(metaDescription).toHaveAttribute('content', 'Accept your invitation and join the organization')
  })

  it('renders children content', () => {
    render(<InvitationLayout>
      <div data-testid="test-child">Test Content</div>
    </InvitationLayout>)
    
    expect(screen.getByTestId('test-child')).toBeInTheDocument()
    expect(screen.getByTestId('test-child')).toHaveTextContent('Test Content')
  })
}) 