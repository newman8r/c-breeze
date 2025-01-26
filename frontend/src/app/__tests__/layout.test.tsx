import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import RootLayout from '../layout'

// Mock the providers
jest.mock('@/contexts/UserContext', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-provider">{children}</div>
  ),
}))

jest.mock('@/contexts/RoleContext', () => ({
  RoleProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="role-provider">{children}</div>
  ),
}))

jest.mock('@/components/SessionProvider', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
}))

describe('RootLayout', () => {
  const originalDocument = global.document

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
    render(<RootLayout>Test Content</RootLayout>)
    
    expect(document.title).toBe('Ocean Breeze Demo')
    const metaDescription = document.querySelector('meta[name="description"]')
    expect(metaDescription).toHaveAttribute('content', 'A peaceful, ocean-themed demo app')
  })

  it('creates meta description if it does not exist', () => {
    // Remove existing meta description
    const existingMeta = document.querySelector('meta[name="description"]')
    if (existingMeta) {
      existingMeta.remove()
    }

    render(<RootLayout>Test Content</RootLayout>)
    
    const metaDescription = document.querySelector('meta[name="description"]')
    expect(metaDescription).toHaveAttribute('content', 'A peaceful, ocean-themed demo app')
  })

  it('renders with correct provider hierarchy', () => {
    const { container } = render(<RootLayout>Test Content</RootLayout>)
    
    // Check that providers are rendered in the correct order
    const sessionProvider = screen.getByTestId('session-provider')
    const userProvider = screen.getByTestId('user-provider')
    const roleProvider = screen.getByTestId('role-provider')
    
    expect(sessionProvider).toContainElement(userProvider)
    expect(userProvider).toContainElement(roleProvider)
    expect(roleProvider).toHaveTextContent('Test Content')
  })

  it('renders with correct HTML structure', () => {
    const { container } = render(<RootLayout>Test Content</RootLayout>)
    
    // Check HTML structure
    const html = container.querySelector('html')
    expect(html).toHaveAttribute('lang', 'en')
    
    const head = container.querySelector('head')
    expect(head).toBeInTheDocument()
    expect(head?.querySelector('meta[charset]')).toHaveAttribute('charset', 'utf-8')
    expect(head?.querySelector('meta[name="viewport"]')).toHaveAttribute('content', 'width=device-width, initial-scale=1')
    
    const body = container.querySelector('body')
    expect(body).toBeInTheDocument()
  })
}) 