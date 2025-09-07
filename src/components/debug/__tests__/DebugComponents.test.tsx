import { render, screen, act } from '@testing-library/react'
import { useState } from 'react'
import { InfiniteLoopDetector, useRenderCounter } from '../InfiniteLoopDetector'
import { ComponentTracker, useRenderTracker } from '../ComponentTracker'
import { MotionDebugger, useAnimatePresenceDebug } from '../MotionDebugger'

// Mock console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
}

const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

beforeEach(() => {
  console.log = mockConsole.log
  console.warn = mockConsole.warn
  console.error = mockConsole.error
  mockConsole.log.mockClear()
  mockConsole.warn.mockClear()
  mockConsole.error.mockClear()
})

afterEach(() => {
  console.log = originalConsole.log
  console.warn = originalConsole.warn
  console.error = originalConsole.error
})

describe('Debug Components', () => {
  describe('InfiniteLoopDetector', () => {
    it('should detect excessive renders', () => {
      const TestComponent = () => {
        const [count, setCount] = useState(0)
        useRenderCounter('TestComponent', [count])
        
        // Simulate rapid re-renders
        if (count < 10) {
          setTimeout(() => setCount(c => c + 1), 1)
        }
        
        return (
          <InfiniteLoopDetector componentName="TestComponent">
            <div>Count: {count}</div>
          </InfiniteLoopDetector>
        )
      }
      
      render(<TestComponent />)
      
      // Should log render information
      expect(mockConsole.log).toHaveBeenCalled()
    })
  })
  
  describe('ComponentTracker', () => {
    it('should track component renders with props', () => {
      const TestComponent = () => {
        const [items, setItems] = useState([1, 2, 3])
        useRenderTracker('TestComponent', [items])
        
        return (
          <ComponentTracker 
            componentName="TestComponent" 
            props={{ itemsCount: items.length }}
          >
            <div>Items: {items.length}</div>
            <button onClick={() => setItems([...items, items.length + 1])}>
              Add Item
            </button>
          </ComponentTracker>
        )
      }
      
      render(<TestComponent />)
      
      // Should log component tracking information
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('ComponentTracker')
      )
    })
  })
  
  describe('MotionDebugger', () => {
    it('should detect motion render issues', () => {
      const TestComponent = () => {
        const [items, setItems] = useState([{ id: 1 }, { id: 2 }])
        useAnimatePresenceDebug('TestComponent', items)
        
        return (
          <MotionDebugger componentName="TestComponent">
            <div>
              {items.map(item => (
                <div key={item.id}>Item {item.id}</div>
              ))}
            </div>
          </MotionDebugger>
        )
      }
      
      render(<TestComponent />)
      
      // Should log motion debugging information
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Motion TestComponent')
      )
    })
    
    it('should detect duplicate keys', () => {
      const TestComponent = () => {
        const items = [{ id: 1 }, { id: 1 }] // Duplicate IDs
        useAnimatePresenceDebug('TestComponent', items)
        
        return (
          <MotionDebugger componentName="TestComponent">
            <div>
              {items.map((item, index) => (
                <div key={item.id}>Item {item.id}</div>
              ))}
            </div>
          </MotionDebugger>
        )
      }
      
      render(<TestComponent />)
      
      // Should warn about duplicate keys
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('duplicate keys')
      )
    })
  })
  
  describe('Integration Test', () => {
    it('should work together without conflicts', () => {
      const TestComponent = () => {
        const [count, setCount] = useState(0)
        const [items, setItems] = useState([{ id: 1 }])
        
        useRenderCounter('IntegrationTest', [count, items])
        useRenderTracker('IntegrationTest', [count, items])
        useAnimatePresenceDebug('IntegrationTest', items)
        
        return (
          <ComponentTracker 
            componentName="IntegrationTest" 
            props={{ count, itemsCount: items.length }}
          >
            <MotionDebugger componentName="IntegrationTest">
              <InfiniteLoopDetector componentName="IntegrationTest">
                <div>
                  <p>Count: {count}</p>
                  <p>Items: {items.length}</p>
                  <button onClick={() => setCount(c => c + 1)}>
                    Increment
                  </button>
                </div>
              </InfiniteLoopDetector>
            </MotionDebugger>
          </ComponentTracker>
        )
      }
      
      const { getByText } = render(<TestComponent />)
      
      // Should render without errors
      expect(getByText('Count: 0')).toBeInTheDocument()
      expect(getByText('Items: 1')).toBeInTheDocument()
      
      // Should have logged from all debug components
      expect(mockConsole.log).toHaveBeenCalled()
    })
  })
})

// Test helper functions
describe('Debug Helper Functions', () => {
  it('should provide stats and clear functions', async () => {
    const { getMotionStats, clearMotionStats } = await import('../MotionDebugger')
    const { getComponentStats, clearComponentStats } = await import('../ComponentTracker')
    
    // Test motion stats
    const motionStats = getMotionStats()
    expect(motionStats).toHaveProperty('renderCounts')
    expect(motionStats).toHaveProperty('errors')
    expect(motionStats).toHaveProperty('totalErrors')
    
    // Test component stats
    const componentStats = getComponentStats()
    expect(componentStats).toHaveProperty('renderCounts')
    expect(componentStats).toHaveProperty('renderTimes')
    
    // Test clear functions
    expect(() => clearMotionStats()).not.toThrow()
    expect(() => clearComponentStats()).not.toThrow()
  })
})