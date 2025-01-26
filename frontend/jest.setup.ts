import '@testing-library/jest-dom'

// Mock Headers
class MockHeaders {
  private headers: Map<string, string>

  constructor(init?: Record<string, string>) {
    this.headers = new Map(Object.entries(init || {}))
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null
  }

  set(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value)
  }

  append(name: string, value: string): void {
    const existing = this.get(name)
    this.set(name, existing ? `${existing}, ${value}` : value)
  }
}

// Keep the original URL class
const OriginalURL = global.URL

// Mock URL
class MockURL {
  pathname: string
  searchParams: URLSearchParams
  href: string

  constructor(url: string) {
    const originalUrl = new OriginalURL(url)
    this.pathname = originalUrl.pathname
    this.searchParams = originalUrl.searchParams
    this.href = originalUrl.href
  }
}

// Mock Response
class MockResponse {
  headers: MockHeaders
  
  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this.headers = new MockHeaders(init?.headers as Record<string, string>)
  }
}

// Mock Request
class MockRequest {
  url: string
  headers: MockHeaders

  constructor(input: string | URL, init?: RequestInit) {
    this.url = input instanceof URL ? input.href : input
    this.headers = new MockHeaders(init?.headers as Record<string, string>)
  }
}

// Assign mocks to global object
global.Headers = MockHeaders as any
global.Request = MockRequest as any
global.Response = MockResponse as any
global.URL = MockURL as any 
