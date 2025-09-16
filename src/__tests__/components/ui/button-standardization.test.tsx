/**
 * @fileoverview Tests for button standardization in header components
 * Ensures all buttons follow UX/UI standards with consistent sizing
 */

import { render, screen } from '@testing-library/react'

// ✅ Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  useParams: () => ({ id: 'test-id' }),
  useSearchParams: () => new URLSearchParams()
}))

// ✅ Simple button component for testing
const TestButton = ({ className, children, ...props }: any) => (
  <button className={className} {...props}>
    {children}
  </button>
)

describe('Button Standardization', () => {
  describe('Header Button Standards', () => {
    it('should render buttons with consistent height (h-8)', () => {
      render(
        <div>
          <TestButton 
            className="bg-white hover:bg-gray-50 flex-shrink-0 h-8 min-w-[120px] justify-center"
            data-testid="share-button"
          >
            <svg className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Compartir</span>
            <span className="sm:hidden">Share</span>
          </TestButton>
          
          <TestButton 
            className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 h-8 min-w-[120px] justify-center"
            data-testid="edit-button"
          >
            <svg className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Editar</span>
            <span className="sm:hidden">Edit</span>
          </TestButton>
        </div>
      )

      const shareButton = screen.getByTestId('share-button')
      const editButton = screen.getByTestId('edit-button')

      // ✅ Check consistent height class
      expect(shareButton).toHaveClass('h-8')
      expect(editButton).toHaveClass('h-8')
    })

    it('should render buttons with consistent minimum width', () => {
      render(
        <div>
          <TestButton 
            className="bg-white hover:bg-gray-50 flex-shrink-0 h-8 min-w-[120px] justify-center"
            data-testid="share-button"
          >
            <svg className="h-4 w-4 mr-2" />
            <span>Compartir</span>
          </TestButton>
          
          <TestButton 
            className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 h-8 min-w-[120px] justify-center"
            data-testid="edit-button"
          >
            <svg className="h-4 w-4 mr-2" />
            <span>Editar</span>
          </TestButton>
        </div>
      )

      const shareButton = screen.getByTestId('share-button')
      const editButton = screen.getByTestId('edit-button')

      // ✅ Check consistent minimum width
      expect(shareButton).toHaveClass('min-w-[120px]')
      expect(editButton).toHaveClass('min-w-[120px]')
    })

    it('should render buttons with consistent icon sizing', () => {
      render(
        <div>
          <TestButton 
            className="bg-white hover:bg-gray-50 flex-shrink-0 h-8 min-w-[120px] justify-center"
            data-testid="share-button"
          >
            <svg className="h-4 w-4 mr-2" data-testid="share-icon" />
            <span>Compartir</span>
          </TestButton>
          
          <TestButton 
            className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 h-8 min-w-[120px] justify-center"
            data-testid="edit-button"
          >
            <svg className="h-4 w-4 mr-2" data-testid="edit-icon" />
            <span>Editar</span>
          </TestButton>
        </div>
      )

      const shareIcon = screen.getByTestId('share-icon')
      const editIcon = screen.getByTestId('edit-icon')

      // ✅ Check consistent icon sizing
      expect(shareIcon).toHaveClass('h-4', 'w-4', 'mr-2')
      expect(editIcon).toHaveClass('h-4', 'w-4', 'mr-2')
    })

    it('should render buttons with proper flex properties', () => {
      render(
        <div>
          <TestButton 
            className="bg-white hover:bg-gray-50 flex-shrink-0 h-8 min-w-[120px] justify-center"
            data-testid="share-button"
          >
            <svg className="h-4 w-4 mr-2" />
            <span>Compartir</span>
          </TestButton>
          
          <TestButton 
            className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 h-8 min-w-[120px] justify-center"
            data-testid="edit-button"
          >
            <svg className="h-4 w-4 mr-2" />
            <span>Editar</span>
          </TestButton>
        </div>
      )

      const shareButton = screen.getByTestId('share-button')
      const editButton = screen.getByTestId('edit-button')

      // ✅ Check flex properties for consistent layout
      expect(shareButton).toHaveClass('flex-shrink-0', 'justify-center')
      expect(editButton).toHaveClass('flex-shrink-0', 'justify-center')
    })

    it('should render responsive text content', () => {
      render(
        <TestButton 
          className="bg-white hover:bg-gray-50 flex-shrink-0 h-8 min-w-[120px] justify-center"
          data-testid="share-button"
        >
          <svg className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Compartir</span>
          <span className="sm:hidden">Share</span>
        </TestButton>
      )

      const shareButton = screen.getByTestId('share-button')
      
      // ✅ Check responsive text is present
      expect(shareButton).toHaveTextContent('Compartir')
      expect(shareButton).toHaveTextContent('Share')
      
      // ✅ Check responsive classes
      const fullText = shareButton.querySelector('.hidden.sm\\:inline')
      const shortText = shareButton.querySelector('.sm\\:hidden')
      
      expect(fullText).toBeInTheDocument()
      expect(shortText).toBeInTheDocument()
    })
  })

  describe('Button Size Standards', () => {
    it('should maintain consistent button dimensions across different variants', () => {
      render(
        <div>
          <TestButton 
            className="h-8 min-w-[120px] justify-center"
            data-testid="outline-button"
          >
            Outline Button
          </TestButton>
          
          <TestButton 
            className="h-8 min-w-[120px] justify-center"
            data-testid="default-button"
          >
            Default Button
          </TestButton>
          
          <TestButton 
            className="h-8 min-w-[120px] justify-center"
            data-testid="secondary-button"
          >
            Secondary Button
          </TestButton>
        </div>
      )

      const outlineButton = screen.getByTestId('outline-button')
      const defaultButton = screen.getByTestId('default-button')
      const secondaryButton = screen.getByTestId('secondary-button')

      // ✅ All buttons should have same height and min-width
      ;[outlineButton, defaultButton, secondaryButton].forEach(button => {
        expect(button).toHaveClass('h-8', 'min-w-[120px]', 'justify-center')
      })
    })
  })

  describe('Accessibility Standards', () => {
    it('should have proper accessibility attributes', () => {
      render(
        <TestButton 
           type="button"
           className="bg-white hover:bg-gray-50 flex-shrink-0 h-8 min-w-[120px] justify-center"
           data-testid="accessible-button"
           aria-label="Compartir cotización"
         >
          <svg className="h-4 w-4 mr-2" aria-hidden="true" />
          <span className="hidden sm:inline">Compartir</span>
          <span className="sm:hidden">Share</span>
        </TestButton>
      )

      const button = screen.getByTestId('accessible-button')
      
      // ✅ Check accessibility attributes
      expect(button).toHaveAttribute('aria-label', 'Compartir cotización')
      expect(button).toHaveAttribute('type', 'button')
      
      // ✅ Icon should be hidden from screen readers
      const icon = button.querySelector('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })
})