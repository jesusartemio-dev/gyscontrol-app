// ===================================================
// 📁 Archivo: jest.setup.js
// 📌 Descripción: Configuración inicial para Jest y React Testing Library
// 📌 Características: Setup de mocks y configuraciones globales
// ✍️ Autor: Sistema de IA
// 📅 Actualizado: 2025-01-27
// ===================================================

import '@testing-library/jest-dom'

// Mock CSS imports
jest.mock('tailwindcss/tailwind.css', () => ({}), { virtual: true })

// Extend Jest matchers
expect.extend(require('@testing-library/jest-dom/matchers'))

// ✅ Mock shadcn/ui components globally
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }) => 
    open ? <div role="dialog" data-testid="modal">{children}</div> : <div>{children}</div>,
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
  DialogTrigger: ({ children, asChild }) => asChild ? children : <div>{children}</div>,
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className, ...props }) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/input', () => ({
  Input: ({ id, type, value, onChange, placeholder, className, ...props }) => (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  ),
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }) => <label htmlFor={htmlFor}>{children}</label>,
}))

jest.mock('lucide-react', () => ({
  FolderPlus: ({ className }) => <svg className={className} data-testid="folder-plus-icon" />,
  // Add other icons as needed
  ChevronDown: ({ className }) => <svg className={className} data-testid="chevron-down-icon" />,
  Search: ({ className }) => <svg className={className} data-testid="search-icon" />,
  Plus: ({ className }) => <svg className={className} data-testid="plus-icon" />,
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn()
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  }
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  }
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin',
      },
    },
    status: 'authenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}))

// Mock Sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  Toaster: () => null,
}))

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    form: ({ children, ...props }) => <form {...props}>{children}</form>,
    section: ({ children, ...props }) => <section {...props}>{children}</section>,
    article: ({ children, ...props }) => <article {...props}>{children}</article>,
    header: ({ children, ...props }) => <header {...props}>{children}</header>,
    main: ({ children, ...props }) => <main {...props}>{children}</main>,
  },
  AnimatePresence: ({ children }) => children,
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Trash2: () => <div data-testid="trash-2-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Building: () => <div data-testid="building-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  PauseCircle: () => <div data-testid="pause-circle-icon" />,
  Grid: () => <div data-testid="grid-icon" />,
  List: () => <div data-testid="list-icon" />,
  SortAsc: () => <div data-testid="sort-asc-icon" />,
  X: () => <div data-testid="x-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  Check: () => <div data-testid="check-icon" />,
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() { return null }
  disconnect() { return null }
  unobserve() { return null }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() { return null }
  disconnect() { return null }
  unobserve() { return null }
}

// Mock environment variables
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.DATABASE_URL = 'test-database-url'