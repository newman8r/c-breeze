import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StatusIndicator } from '../StatusIndicator'

describe('StatusIndicator', () => {
  it('renders with correct color for open status', () => {
    const { container } = render(<StatusIndicator status="open" />)
    const indicator = container.firstChild as HTMLElement
    expect(indicator).toHaveStyle({ backgroundColor: '#EF4444' })
  })

  it('renders with correct color for in_progress status', () => {
    const { container } = render(<StatusIndicator status="in_progress" />)
    const indicator = container.firstChild as HTMLElement
    expect(indicator).toHaveStyle({ backgroundColor: '#F59E0B' })
  })

  it('renders with correct color for resolved status', () => {
    const { container } = render(<StatusIndicator status="resolved" />)
    const indicator = container.firstChild as HTMLElement
    expect(indicator).toHaveStyle({ backgroundColor: '#10B981' })
  })

  it('renders with correct color for closed status', () => {
    const { container } = render(<StatusIndicator status="closed" />)
    const indicator = container.firstChild as HTMLElement
    expect(indicator).toHaveStyle({ backgroundColor: '#404040' })
  })

  it('renders with default color for unknown status', () => {
    const { container } = render(<StatusIndicator status="unknown" />)
    const indicator = container.firstChild as HTMLElement
    expect(indicator).toHaveStyle({ backgroundColor: '#EF4444' })
  })

  it('applies heatmap opacity when isHeatmap is true', () => {
    const { container } = render(<StatusIndicator status="open" isHeatmap={true} />)
    const indicator = container.firstChild as HTMLElement
    expect(indicator).toHaveClass('opacity-50')
  })
}) 
