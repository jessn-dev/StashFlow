import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LandingPage from '@/app/page' // <-- Updated absolute import

// 1. Mock Chart.js to prevent canvas errors in the terminal
vi.mock('chart.js/auto', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      destroy: vi.fn(),
    })),
  }
})

// 2. Mock Next.js Link component
vi.mock('next/link', () => {
  return {
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
      <a href={href}>{children}</a>
    ),
  }
})

// 3. Mock the browser's IntersectionObserver (used for scroll animations)
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

describe('Landing Page', () => {
  it('renders the main FinTrack headline', () => {
    render(<LandingPage />)

    expect(screen.getByText(/Total/i)).toBeInTheDocument()
    expect(screen.getByText(/Clarity./i)).toBeInTheDocument()
  })

  it('contains navigation links to the login page', () => {
    render(<LandingPage />)

    const loginLinks = screen.getAllByText(/Sign In/i)
    expect(loginLinks.length).toBeGreaterThan(0)
    expect(loginLinks[0].closest('a')).toHaveAttribute('href', '/login')
  })
})