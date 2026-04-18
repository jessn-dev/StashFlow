import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock Supabase SSR to avoid "URL and API key required" errors in components
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  })),
}))

// HEAVY MOCK: Tamagui
vi.mock('tamagui', () => {
  const mockComponent = (name: string, tag: string = 'div') => {
    const Component = ({ children, ...props }: any) => {
      // Filter out Tamagui-specific props that React doesn't like on DOM elements
      const cleanProps: any = { 'data-testid': name }
      Object.keys(props).forEach(key => {
        if (!key.startsWith('$') && !['hoverStyle', 'pressStyle', 'inputMode'].includes(key)) {
          cleanProps[key] = props[key]
        }
      })
      return React.createElement(tag, cleanProps, children)
    }
    Component.displayName = name
    return Component
  }

  return {
    YStack: mockComponent('YStack'),
    XStack: mockComponent('XStack'),
    ZStack: mockComponent('ZStack'),
    Text: mockComponent('Text', 'span'),
    Heading: mockComponent('Heading', 'h2'),
    Button: mockComponent('Button', 'button'),
    Input: mockComponent('Input', 'input'),
    TextArea: mockComponent('TextArea', 'textarea'),
    Label: mockComponent('Label', 'label'),
    Circle: mockComponent('Circle'),
    Spinner: mockComponent('Spinner'),
    View: mockComponent('View'),
    Theme: ({ children }: any) => children,
    createTamagui: vi.fn(),
    createFont: vi.fn(),
    getConfig: () => ({
      themes: { light: {}, dark: {} },
      tokens: {},
      shorthands: {},
      components: {},
    }),
  }
})

// Mock Lucide Icons
vi.mock('lucide-react-native', () => {
  const mockIcon = (name: string) => {
    const Icon = () => React.createElement('div', { 'data-testid': `icon-${name}` })
    Icon.displayName = name
    return Icon
  }
  return {
    LayoutDashboard: mockIcon('LayoutDashboard'),
    TrendingUp: mockIcon('TrendingUp'),
    CreditCard: mockIcon('CreditCard'),
    Landmark: mockIcon('Landmark'),
    Settings: mockIcon('Settings'),
    LogOut: mockIcon('LogOut'),
    Bell: mockIcon('Bell'),
    DollarSign: mockIcon('DollarSign'),
    Wallet: mockIcon('Wallet'),
    ArrowUpRight: mockIcon('ArrowUpRight'),
    ArrowDownRight: mockIcon('ArrowDownRight'),
    ChevronRight: mockIcon('ChevronRight'),
    RefreshCw: mockIcon('RefreshCw'),
    PieChart: mockIcon('PieChart'),
    ChevronDown: mockIcon('ChevronDown'),
    Trash2: mockIcon('Trash2'),
    Target: mockIcon('Target'),
    FileText: mockIcon('FileText'),
    X: mockIcon('X'),
    Sun: mockIcon('Sun'),
    Moon: mockIcon('Moon'),
    Monitor: mockIcon('Monitor'),
    Sparkles: mockIcon('Sparkles'),
    AlertTriangle: mockIcon('AlertTriangle'),
  }
})
