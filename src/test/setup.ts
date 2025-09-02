import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock globals.css BEFORE any other imports
vi.mock('@/app/globals.css', () => ({}))
vi.mock('../app/globals.css', () => ({}))
vi.mock('./globals.css', () => ({}))

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    beforePopState: vi.fn(),
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn()
    }
  })
}))

// Mock Next.js navigation (App Router)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}))



// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock HTMLElement methods
HTMLElement.prototype.scrollIntoView = vi.fn()
HTMLElement.prototype.hasPointerCapture = vi.fn()
HTMLElement.prototype.releasePointerCapture = vi.fn()
HTMLElement.prototype.setPointerCapture = vi.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

// Setup fetch mock
global.fetch = vi.fn()

// Mock all CSS imports before they reach any processing
vi.mock('*.css', () => ({}))
vi.mock('*.scss', () => ({}))
vi.mock('*.sass', () => ({}))
vi.mock('*.less', () => ({}))

// Mock globals.css specifically to prevent Tailwind import
vi.mock('@/app/globals.css', () => ({}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    form: 'form',
    input: 'input',
    textarea: 'textarea',
    select: 'select',
    option: 'option',
    label: 'label',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    p: 'p',
    ul: 'ul',
    li: 'li',
    table: 'table',
    thead: 'thead',
    tbody: 'tbody',
    tr: 'tr',
    td: 'td',
    th: 'th'
  },
  AnimatePresence: ({ children }: any) => children
}))

// Mock shadcn/ui components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => ({ type: 'div', props: { 'data-testid': 'card', ...props, children } }),
  CardContent: ({ children, ...props }: any) => ({ type: 'div', props: { 'data-testid': 'card-content', ...props, children } }),
  CardDescription: ({ children, ...props }: any) => ({ type: 'div', props: { 'data-testid': 'card-description', ...props, children } }),
  CardHeader: ({ children, ...props }: any) => ({ type: 'div', props: { 'data-testid': 'card-header', ...props, children } }),
  CardTitle: ({ children, ...props }: any) => ({ type: 'div', props: { 'data-testid': 'card-title', ...props, children } })
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => ({ type: 'button', props: { 'data-testid': 'button', onClick, ...props, children } })
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => ({ type: 'span', props: { 'data-testid': 'badge', ...props, children } })
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, ...props }: any) => ({ type: 'div', props: { 'data-testid': 'progress', 'data-value': value, ...props } })
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, ...props }: any) => ({ type: 'div', props: { 'data-testid': 'tabs', ...props, children } }),
  TabsContent: ({ children, ...props }: any) => ({ type: 'div', props: { 'data-testid': 'tabs-content', ...props, children } }),
  TabsList: ({ children, ...props }: any) => ({ type: 'div', props: { 'data-testid': 'tabs-list', ...props, children } }),
  TabsTrigger: ({ children, ...props }: any) => ({ type: 'button', props: { 'data-testid': 'tabs-trigger', ...props, children } })
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: any) => ({ type: 'div', props: { 'data-testid': 'select', ...props, children } }),
  SelectContent: ({ children, ...props }: any) => ({ type: 'div', props: { 'data-testid': 'select-content', ...props, children } }),
  SelectItem: ({ children, ...props }: any) => ({ type: 'div', props: { 'data-testid': 'select-item', ...props, children } }),
  SelectTrigger: ({ children, ...props }: any) => ({ type: 'button', props: { 'data-testid': 'select-trigger', ...props, children } }),
  SelectValue: ({ placeholder, ...props }: any) => ({ type: 'span', props: { 'data-testid': 'select-value', ...props, children: placeholder } })
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => ({ type: 'input', props: { 'data-testid': 'input', ...props } })
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: (props: any) => ({ type: 'hr', props: { 'data-testid': 'separator', ...props } })
}))

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, ...props }: any) => ({ type: 'div', props: { 'data-testid': 'scroll-area', ...props, children } })
}))

// 📡 Import Tailwind CSS mocks
import './tailwind-mock'

// Mock additional UI components for ModalAgregarItemCotizacionProveedor
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange, ...props }: any) => 
    open ? { type: 'div', props: { 'data-testid': 'dialog', role: 'dialog', ...props, children } } : null,
  DialogContent: ({ children, ...props }: any) => 
    ({ type: 'div', props: { 'data-testid': 'dialog-content', ...props, children } }),
  DialogHeader: ({ children, ...props }: any) => 
    ({ type: 'div', props: { 'data-testid': 'dialog-header', ...props, children } }),
  DialogTitle: ({ children, ...props }: any) => 
    ({ type: 'h2', props: { 'data-testid': 'dialog-title', ...props, children } }),
  DialogDescription: ({ children, ...props }: any) => 
    ({ type: 'p', props: { 'data-testid': 'dialog-description', ...props, children } }),
  DialogFooter: ({ children, ...props }: any) => 
    ({ type: 'div', props: { 'data-testid': 'dialog-footer', ...props, children } })
}))

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, disabled, ...props }: any) => ({
    type: 'input',
    props: {
      'data-testid': 'checkbox',
      type: 'checkbox',
      checked,
      onChange: (e: any) => onCheckedChange?.(e.target.checked),
      disabled,
      role: 'checkbox',
      ...props
    }
  })
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Search: ({ ...props }: any) => ({ type: 'svg', props: { 'data-testid': 'search-icon', ...props } }),
  Package: ({ ...props }: any) => ({ type: 'svg', props: { 'data-testid': 'package-icon', ...props } }),
  CheckCircle2: ({ ...props }: any) => ({ type: 'svg', props: { 'data-testid': 'check-circle-icon', ...props } }),
  Plus: ({ ...props }: any) => ({ type: 'svg', props: { 'data-testid': 'plus-icon', ...props } }),
  Minus: ({ ...props }: any) => ({ type: 'svg', props: { 'data-testid': 'minus-icon', ...props } }),
  Loader2: ({ ...props }: any) => ({ type: 'svg', props: { 'data-testid': 'loader-icon', ...props } }),
  X: ({ ...props }: any) => ({ type: 'svg', props: { 'data-testid': 'x-icon', ...props } }),
  // Iconos adicionales para fechas
  Calendar: ({ ...props }: any) => ({ type: 'svg', props: { 'data-testid': 'calendar-icon', ...props } }),
  Clock: ({ ...props }: any) => ({ type: 'svg', props: { 'data-testid': 'clock-icon', ...props } }),
  Timer: ({ ...props }: any) => ({ type: 'svg', props: { 'data-testid': 'timer-icon', ...props } }),
  AlertTriangle: ({ ...props }: any) => ({ type: 'svg', props: { 'data-testid': 'alert-triangle-icon', ...props } }),
  CheckCircle: ({ ...props }: any) => ({ type: 'svg', props: { 'data-testid': 'check-circle-icon', ...props } }),
  Send: ({ ...props }: any) => ({ type: 'svg', props: { 'data-testid': 'send-icon', ...props } }),
  FileCheck: ({ ...props }: any) => ({ type: 'svg', props: { 'data-testid': 'file-check-icon', ...props } }),
  Truck: ({ ...props }: any) => ({ type: 'svg', props: { 'data-testid': 'truck-icon', ...props } }),
  DollarSign: ({ ...props }: any) => ({ type: 'svg', props: { 'data-testid': 'dollar-sign-icon', ...props } })
}))

// Mock any CSS module imports - handled by vitest config

// Mock environment variables
process.env.NODE_ENV = 'test'