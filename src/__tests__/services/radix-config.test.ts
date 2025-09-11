/**
 * 🧪 Tests para radix-config.ts
 * 
 * Verifica que la configuración de Radix UI funcione correctamente
 * y prevenga conflictos de aria-hidden.
 */

import {
  RADIX_CONFIG,
  DROPDOWN_MENU_CONFIG,
  DIALOG_CONFIG,
  createSafeRadixProps,
  cleanupAriaHiddenConflicts
} from '@/lib/radix-config'

// 🔧 Mock del DOM para testing
Object.defineProperty(global, 'document', {
  value: {
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
    },
    createElement: jest.fn(() => ({
      setAttribute: jest.fn(),
      removeAttribute: jest.fn(),
      getAttribute: jest.fn(),
      contains: jest.fn(),
      querySelectorAll: jest.fn(() => []),
    })),
    querySelectorAll: jest.fn(() => []),
    activeElement: null,
  },
  writable: true,
})

// 🔧 Mock de MutationObserver
class MockMutationObserver {
  constructor(public callback: MutationCallback) {}
  observe = jest.fn()
  disconnect = jest.fn()
}

Object.defineProperty(global, 'MutationObserver', {
  value: MockMutationObserver,
  writable: true,
})

describe('radix-config', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('RADIX_CONFIG', () => {
    it('should have correct default configuration', () => {
      expect(RADIX_CONFIG.preventAriaHiddenOnFocus).toBe(true)
      expect(RADIX_CONFIG.preferInert).toBe(true)
      // En entorno de testing, container puede ser undefined
      expect(RADIX_CONFIG.portal).toHaveProperty('container')
    })
  })

  describe('DROPDOWN_MENU_CONFIG', () => {
    it('should have portal configuration', () => {
      expect(DROPDOWN_MENU_CONFIG.portal).toBeDefined()
      // En entorno de testing, container puede ser undefined
      expect(DROPDOWN_MENU_CONFIG.portal).toHaveProperty('container')
    })

    it('should have content configuration with focus handlers', () => {
      expect(DROPDOWN_MENU_CONFIG.content.onOpenAutoFocus).toBeInstanceOf(Function)
      expect(DROPDOWN_MENU_CONFIG.content.onCloseAutoFocus).toBeInstanceOf(Function)
    })

    it('should prevent default on focus events', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
      } as unknown as Event

      DROPDOWN_MENU_CONFIG.content.onOpenAutoFocus(mockEvent)
      expect(mockEvent.preventDefault).toHaveBeenCalled()

      DROPDOWN_MENU_CONFIG.content.onCloseAutoFocus(mockEvent)
      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })
  })

  describe('DIALOG_CONFIG', () => {
    it('should have portal configuration', () => {
      expect(DIALOG_CONFIG.portal).toBeDefined()
      // En entorno de testing, container puede ser undefined
      expect(DIALOG_CONFIG.portal).toHaveProperty('container')
    })

    it('should have content configuration with focus handler', () => {
      expect(DIALOG_CONFIG.content.onOpenAutoFocus).toBeInstanceOf(Function)
    })

    it('should prevent focus on elements with aria-hidden ancestor', () => {
      const mockElement = {
        closest: jest.fn(() => true), // Simula que tiene un ancestro con aria-hidden
      }
      
      const mockEvent = {
        preventDefault: jest.fn(),
        target: mockElement,
      } as unknown as Event

      DIALOG_CONFIG.content.onOpenAutoFocus(mockEvent)
      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })

    it('should allow focus on elements without aria-hidden ancestor', () => {
      const mockElement = {
        closest: jest.fn(() => false), // No tiene ancestro con aria-hidden
      }
      
      const mockEvent = {
        preventDefault: jest.fn(),
        target: mockElement,
      } as unknown as Event

      DIALOG_CONFIG.content.onOpenAutoFocus(mockEvent)
      expect(mockEvent.preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('createSafeRadixProps', () => {
    it('should return props with container configuration', () => {
      const inputProps = {
        className: 'test-class',
        onClick: jest.fn(),
      }

      const result = createSafeRadixProps(inputProps)

      expect(result).toEqual({
        ...inputProps,
        container: RADIX_CONFIG.portal.container,
      })
    })

    it('should not override existing container prop', () => {
      const customContainer = document.createElement('div')
      const inputProps = {
        className: 'test-class',
        container: customContainer,
      }

      const result = createSafeRadixProps(inputProps)

      expect(result.container).toBe(customContainer)
    })
  })

  describe('cleanupAriaHiddenConflicts', () => {
    it('should remove aria-hidden from elements with focused descendants', () => {
      const mockFocusedElement = {
        removeAttribute: jest.fn(),
        inert: false,
      }

      const mockElement = {
        querySelectorAll: jest.fn(() => [mockFocusedElement]),
        contains: jest.fn(() => true),
        removeAttribute: jest.fn(),
        inert: false,
      }

      // Mock document.querySelectorAll to return our test element
      ;(document.querySelectorAll as jest.Mock).mockReturnValue([mockElement])
      
      // Mock document.activeElement
      Object.defineProperty(document, 'activeElement', {
        value: mockFocusedElement,
        writable: true,
      })

      cleanupAriaHiddenConflicts()

      expect(mockElement.removeAttribute).toHaveBeenCalledWith('aria-hidden')
    })

    it('should set inert property when available', () => {
      const mockFocusedElement = {
        removeAttribute: jest.fn(),
      }

      const mockElement = {
        querySelectorAll: jest.fn(() => [mockFocusedElement]),
        contains: jest.fn(() => true),
        removeAttribute: jest.fn(),
        inert: false,
      }

      ;(document.querySelectorAll as jest.Mock).mockReturnValue([mockElement])
      
      Object.defineProperty(document, 'activeElement', {
        value: mockFocusedElement,
        writable: true,
      })

      cleanupAriaHiddenConflicts()

      expect(mockElement.inert).toBe(true)
    })

    it('should not modify elements without focused descendants', () => {
      const mockElement = {
        querySelectorAll: jest.fn(() => []),
        contains: jest.fn(() => false),
        removeAttribute: jest.fn(),
      }

      ;(document.querySelectorAll as jest.Mock).mockReturnValue([mockElement])

      cleanupAriaHiddenConflicts()

      expect(mockElement.removeAttribute).not.toHaveBeenCalled()
    })
  })
})
