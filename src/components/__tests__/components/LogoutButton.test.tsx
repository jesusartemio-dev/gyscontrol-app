import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { signOut } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import LogoutButton from '../../LogoutButton'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}))

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
  },
}))

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
  },
  writable: true,
})

const mockSignOut = signOut as jest.MockedFunction<typeof signOut>
const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>

describe('LogoutButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders logout button with default props', () => {
    render(<LogoutButton />)
    
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Cerrar sesión')
  })

  it('shows icon when showIcon is true', () => {
    render(<LogoutButton showIcon={true} />)
    
    const button = screen.getByRole('button')
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('hides icon when showIcon is false', () => {
    render(<LogoutButton showIcon={false} />)
    
    const button = screen.getByRole('button')
    expect(button.querySelector('svg')).not.toBeInTheDocument()
  })

  it('opens confirmation dialog when clicked', async () => {
    render(<LogoutButton />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('¿Deseas cerrar sesión?')).toBeInTheDocument()
    })
  })

  it('closes dialog when cancel is clicked', async () => {
    render(<LogoutButton />)
    
    // Open dialog
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('¿Deseas cerrar sesión?')).toBeInTheDocument()
    })
    
    // Click cancel
    const cancelButton = screen.getByText('Cancelar')
    fireEvent.click(cancelButton)
    
    await waitFor(() => {
      expect(screen.queryByText('¿Deseas cerrar sesión?')).not.toBeInTheDocument()
    })
  })

  it('calls signOut when logout is confirmed', async () => {
    mockSignOut.mockResolvedValueOnce(undefined as any)
    
    render(<LogoutButton />)
    
    // Open dialog
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('¿Deseas cerrar sesión?')).toBeInTheDocument()
    })
    
    // Click logout
    const logoutButton = screen.getAllByText('Cerrar sesión')[1] // Second one is in dialog
    fireEvent.click(logoutButton)
    
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({
        callbackUrl: '/login',
        redirect: true
      })
    })
  })

  it('handles signOut error gracefully', async () => {
    const error = new Error('SignOut failed')
    mockSignOut.mockRejectedValueOnce(error)
    
    render(<LogoutButton />)
    
    // Open dialog
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('¿Deseas cerrar sesión?')).toBeInTheDocument()
    })
    
    // Click logout
    const logoutButton = screen.getAllByText('Cerrar sesión')[1]
    fireEvent.click(logoutButton)
    
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error al cerrar sesión. Intenta nuevamente.')
      expect(window.location.href).toBe('/login')
    })
  })

  it('shows loading state during logout', async () => {
    // Mock signOut to be slow
    mockSignOut.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<LogoutButton />)
    
    // Open dialog
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('¿Deseas cerrar sesión?')).toBeInTheDocument()
    })
    
    // Click logout
    const logoutButton = screen.getAllByText('Cerrar sesión')[1]
    fireEvent.click(logoutButton)
    
    // Check loading state
    await waitFor(() => {
      expect(screen.getByText('Cerrando...')).toBeInTheDocument()
    })
  })

  it('disables buttons during loading', async () => {
    mockSignOut.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<LogoutButton />)
    
    // Open dialog
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('¿Deseas cerrar sesión?')).toBeInTheDocument()
    })
    
    // Click logout
    const logoutButton = screen.getAllByText('Cerrar sesión')[1]
    fireEvent.click(logoutButton)
    
    // Check buttons are disabled
    await waitFor(() => {
      const cancelButton = screen.getByText('Cancelar')
      const confirmButton = screen.getByText('Cerrando...')
      
      expect(cancelButton).toBeDisabled()
      expect(confirmButton).toBeDisabled()
    })
  })
})
