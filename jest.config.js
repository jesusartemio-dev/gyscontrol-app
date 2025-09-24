// Jest configuration without next/jest dependency
const path = require('path')

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    // Mock CSS imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Mock Tailwind CSS specifically
    'tailwindcss/tailwind.css': 'identity-obj-proxy',
    'tailwindcss': 'identity-obj-proxy'
  },
  testEnvironment: 'jest-environment-jsdom',

  // Add React preset for JSX support
  preset: null,
  
  // ✅ Test patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],
  
  // 📊 Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/app/api/**',
    '!src/lib/prisma.ts'
  ],
  
  // ✅ Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // 🔍 Specific thresholds for critical modules
    './src/lib/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/components/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // 📊 Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/'
  ],
  
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
          decorators: false,
          dynamicImport: false
        },
        transform: {
          react: {
            runtime: 'automatic'
          }
        }
      },
      module: {
        type: 'commonjs'
      }
    }]
  },
  
  transformIgnorePatterns: [
    '/node_modules/(?!(.*\\.mjs$|@testing-library|@tanstack))',
    '^.+\\.module\\.(css|sass|scss)$'
  ],
  
  // ✅ Test timeout
  testTimeout: 10000,
  
  // 📊 Projects for different test types
  projects: [
    {
      displayName: 'Unit Tests - Services',
      testMatch: [
        '<rootDir>/src/**/__tests__/services/**/*.test.{js,jsx,ts,tsx}'
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.services.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1',
        '^@/app/(.*)$': '<rootDir>/src/app/$1'
      },
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest', {
          jsc: {
            parser: {
              syntax: 'typescript',
              tsx: true
            },
            transform: {
              react: {
                runtime: 'automatic'
              }
            }
          },
          module: {
            type: 'commonjs'
          }
        }]
      }
    },
    {
      displayName: 'Unit Tests - Components',
      testMatch: [
        '<rootDir>/src/**/__tests__/components/**/*.test.{js,jsx,ts,tsx}',
        '<rootDir>/src/**/__tests__/app/**/*.test.{js,jsx,ts,tsx}'
      ],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1',
        '^@/app/(.*)$': '<rootDir>/src/app/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        'tailwindcss/tailwind.css': 'identity-obj-proxy',
        'tailwindcss': 'identity-obj-proxy'
      },
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest', {
          jsc: {
            parser: {
              syntax: 'typescript',
              tsx: true
            },
            transform: {
              react: {
                runtime: 'automatic'
              }
            }
          },
          module: {
            type: 'commonjs'
          }
        }]
       }
     },
     {
       displayName: 'Unit Tests - API',
      testMatch: [
        '<rootDir>/src/__tests__/api/**/*.{test,spec}.{js,jsx,ts,tsx}'
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.services.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1',
        '^@/app/(.*)$': '<rootDir>/src/app/$1'
      },
      transform: {
        '^.+\.(js|jsx|ts|tsx)$': ['@swc/jest', {
          jsc: {
            parser: {
              syntax: 'typescript',
              tsx: true
            },
            transform: {
              react: {
                runtime: 'automatic'
              }
            }
          },
          module: {
            type: 'commonjs'
          }
        }]
      }
    },
    {
      displayName: 'Integration Tests',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.integration.test.{js,jsx,ts,tsx}'
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.services.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1',
        '^@/app/(.*)$': '<rootDir>/src/app/$1'
      },
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest', {
          jsc: {
            parser: {
              syntax: 'typescript',
              tsx: true
            },
            transform: {
              react: {
                runtime: 'automatic'
              }
            }
          },
          module: {
            type: 'commonjs'
          }
        }]
      }
    },
    {
      displayName: 'Accessibility Tests',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.accessibility.test.{js,jsx,ts,tsx}'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.js',
        '<rootDir>/jest.accessibility.setup.js'
      ]
    }
  ],
  
  // ✅ Clear mocks
  clearMocks: true,
  restoreMocks: true,
  
  // 🔁 Verbose output
  verbose: true,
  
  // 📡 Max workers
  maxWorkers: '50%'
}

// Export Jest configuration directly
module.exports = customJestConfig