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
        if (!key.startsWith('$') && !['hoverStyle', 'pressStyle', 'inputMode', 'onPress', 'chromeless', 'animation', 'numberOfLines', 'textAlign', 'onChangeText', 'borderTopWidth', 'paddingHorizontal', 'paddingVertical', 'marginHorizontal', 'marginVertical', 'paddingBottom', 'paddingTop', 'borderBottomWidth', 'borderColor', 'flexShrink', 'borderRadius', 'backgroundColor', 'alignItems', 'justifyContent', 'textTransform', 'flexWrap', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'shadowColor', 'shadowOpacity', 'shadowRadius', 'shadowOffset', 'borderWidth'].includes(key)) {
           cleanProps[key] = props[key]
        }
      })

      // React uses lowercase for some attributes on DOM elements
      const lowerKeyMap: Record<string, string> = {
        'borderRadius': 'borderradius',
        'backgroundColor': 'backgroundcolor',
        'alignItems': 'alignitems',
        'justifyContent': 'justifycontent',
        'paddingHorizontal': 'paddinghorizontal',
        'textTransform': 'texttransform',
        'paddingBottom': 'paddingbottom',
        'paddingVertical': 'paddingvertical',
        'marginVertical': 'marginvertical',
        'marginHorizontal': 'marginhorizontal',
        'paddingTop': 'paddingtop',
        'borderBottomWidth': 'borderbottomwidth',
        'borderColor': 'bordercolor',
        'flexShrink': 'flexshrink',
        'borderWidth': 'borderwidth',
        'shadowColor': 'shadowcolor',
        'shadowOpacity': 'shadowopacity',
        'shadowRadius': 'shadowradius',
        'shadowOffset': 'shadowoffset',
        'minWidth': 'minwidth',
        'minHeight': 'minheight',
        'maxWidth': 'maxwidth',
        'maxHeight': 'maxheight',
        'flexWrap': 'flexwrap',
        'numberOfLines': 'numberoflines',
        'textAlign': 'textalign',
        'borderTopWidth': 'bordertopwidth',
      }

      Object.keys(props).forEach(key => {
        if (lowerKeyMap[key]) {
          cleanProps[lowerKeyMap[key]] = String(props[key])
        }
      })

      // Avoid adding children to void elements (like input)
      const isVoid = ['input', 'br', 'hr', 'img'].includes(tag.toLowerCase())
      
      // If component has a 'value' prop but no children, render value as child (unless void)
      // Only do this if children is not already provided
      let content = children
      if (content === undefined && !isVoid) {
        if (props.value !== undefined) content = String(props.value)
        else if (props.label !== undefined) content = String(props.label)
        else if (props.title !== undefined) content = String(props.title)
      }

      return React.createElement(tag, cleanProps, content)
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
    ScrollView: mockComponent('ScrollView'),
    Separator: mockComponent('Separator'),
    ThemeableStack: mockComponent('ThemeableStack'),
    Progress: mockComponent('Progress'),
    AnimatePresence: ({ children }: any) => children,
    Tooltip: mockComponent('Tooltip'),
    Adapt: ({ children }: any) => children,
    Sheet: mockComponent('Sheet'),
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
    ArrowUp: mockIcon('ArrowUp'),
    ArrowDown: mockIcon('ArrowDown'),
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
    Film: mockIcon('Film'),
    Zap: mockIcon('Zap'),
    Home: mockIcon('Home'),
    Smartphone: mockIcon('Smartphone'),
    CheckCircle2: mockIcon('CheckCircle2'),
    ChevronLeft: mockIcon('ChevronLeft'),
    Plus: mockIcon('Plus'),
    Info: mockIcon('Info'),
    Search: mockIcon('Search'),
    Filter: mockIcon('Filter'),
    TrendingDown: mockIcon('TrendingDown'),
    UtensilsCrossed: mockIcon('UtensilsCrossed'),
    UserCircle: mockIcon('UserCircle'),
    Car: mockIcon('Car'),
    HeartPulse: mockIcon('HeartPulse'),
    GraduationCap: mockIcon('GraduationCap'),
    MoreHorizontal: mockIcon('MoreHorizontal'),
    Heart: mockIcon('Heart'),
    LayoutGrid: mockIcon('LayoutGrid'),
    CheckCircle2: mockIcon('CheckCircle2'),
    CalendarDays: mockIcon('CalendarDays'),
    Trophy: mockIcon('Target'),
    History: mockIcon('History'),
    TrendingDown: mockIcon('TrendingDown'),
    Clock: mockIcon('Clock'),
    ChevronUp: mockIcon('ChevronUp'),
    Activity: mockIcon('Activity'),
    ArrowRight: mockIcon('ArrowRight'),
    Calculator: mockIcon('Calculator'),
    Minus: mockIcon('Minus'),
    RotateCcw: mockIcon('RotateCcw'),
  }
})
