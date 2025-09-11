/**
 * @fileoverview Tests for TypeScript type fixes in listas-equipo conversiones route
 * @description Verifies that null handling and enum corrections work properly
 * @author GYS Team
 * @date 2024
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/listas-equipo/conversiones/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

// 🧪 Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    listaEquipo: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    listaEquipoItem: {
      update: jest.fn()
    },
    pedidoEquipo: {
      findFirst: jest.fn(),
      create: jest.fn()
    },
    $transaction: jest.fn()
  }
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

jest.mock('@/lib/utils/costoCalculations', () => ({
  calcularCostoItem: jest.fn((item) => {
    return item.precioElegido || item.costoElegido || 100
  })
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('Listas Equipo Conversiones - Type Fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User' }
    } as any)
  })

  describe('GET /api/listas-equipo/conversiones', () => {
    it('should handle null cantidadPedida values correctly', async () => {
      // ✅ Mock data with null cantidadPedida
      const mockListas = [{
        id: 'lista-1',
        codigo: 'LST-001',
        nombre: 'Lista Test',
        estado: 'aprobado',
        prioridad: 'alta',
        fechaLimite: new Date(),
        presupuestoEstimado: 1000,
        proyecto: { id: 'proj-1', nombre: 'Proyecto Test', codigo: 'PROJ-001' },
        responsable: { id: 'user-1', nombre: 'Test User' },
        items: [
          {
            id: 'item-1',
            cantidad: 10,
            cantidadPedida: null, // 🔍 Testing null handling
            precioElegido: 50,
            catalogoEquipo: {
              id: 'cat-1',
              codigo: 'CAT-001',
              descripcion: 'Equipo Test',
              unidad: {
                nombre: 'und'
              },
              precioVenta: 60
            },
            cotizacionSeleccionada: {
             id: 'cot-1',
             precioUnitario: 45,
             tiempoEntrega: '10 días',
             cotizacion: {
               proveedor: {
                 nombre: 'Proveedor Test'
               }
             }
           }
          },
          {
            id: 'item-2',
            cantidad: 5,
            cantidadPedida: 2, // 🔍 Testing normal value
            precioElegido: 30,
            catalogoEquipo: {
              id: 'cat-2',
              codigo: 'CAT-002',
              descripcion: 'Equipo Test 2',
              unidad: {
                nombre: 'und'
              },
              precioVenta: 35
            },
            cotizacionSeleccionada: null
          }
        ]
      }]

      mockPrisma.listaEquipo.findMany.mockResolvedValue(mockListas as any)

      const request = new NextRequest('http://localhost:3000/api/listas-equipo/conversiones')
      const response = await GET(request)
      const data = await response.json()

      // ✅ Verify response structure
      expect(response.status).toBe(200)
      expect(data.conversiones).toHaveLength(1)
      
      const conversion = data.conversiones[0]
      expect(conversion.itemsPendientes).toBe(2) // Both items should be pending (null treated as 0)
      expect(conversion.puedeConvertir).toBe(true)
    })

    it('should use correct EstadoListaEquipo enum values', async () => {
      const mockListas = [{
        id: 'lista-1',
        codigo: 'LST-001',
        nombre: 'Lista Test',
        estado: 'por_revisar', // ✅ Valid enum value
        prioridad: 'media',
        fechaLimite: new Date(),
        presupuestoEstimado: 1000,
        proyecto: { id: 'proj-1', nombre: 'Proyecto Test', codigo: 'PROJ-001' },
        responsable: { id: 'user-1', nombre: 'Test User' },
        items: []
      }]

      mockPrisma.listaEquipo.findMany.mockResolvedValue(mockListas as any)

      const request = new NextRequest('http://localhost:3000/api/listas-equipo/conversiones')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversiones[0].puedeConvertir).toBe(true) // Should allow conversion for 'por_revisar'
    })

    it('should block conversion for invalid states', async () => {
      const mockListas = [{
        id: 'lista-1',
        codigo: 'LST-001',
        nombre: 'Lista Test',
        estado: 'borrador', // ❌ Should block conversion
        prioridad: 'media',
        fechaLimite: new Date(),
        presupuestoEstimado: 1000,
        proyecto: { id: 'proj-1', nombre: 'Proyecto Test', codigo: 'PROJ-001' },
        responsable: { id: 'user-1', nombre: 'Test User' },
        items: [{
          id: 'item-1',
          cantidad: 10,
          cantidadPedida: 0,
          precioElegido: 50,
          catalogoEquipo: { id: 'cat-1', codigo: 'CAT-001', descripcion: 'Test', unidad: { nombre: 'und' } },
          cotizacionSeleccionada: null
        }]
      }]

      mockPrisma.listaEquipo.findMany.mockResolvedValue(mockListas as any)

      const request = new NextRequest('http://localhost:3000/api/listas-equipo/conversiones')
      const response = await GET(request)
      const data = await response.json()

      expect(data.conversiones[0].puedeConvertir).toBe(false)
      expect(data.conversiones[0].motivoBloqueo).toContain('Lista debe estar aprobada')
    })
  })

  describe('POST /api/listas-equipo/conversiones', () => {
    it('should handle null catalogoEquipo in conversion', async () => {
      const mockLista = {
        id: 'lista-1',
        codigo: 'LST-001',
        proyectoId: 'proj-1',
        proyecto: { codigo: 'PROJ-001' },
        items: [{
          id: 'item-1',
          cantidad: 10,
          cantidadPedida: 0,
          catalogoEquipo: null, // 🔍 Testing null catalogoEquipo
          cotizacionSeleccionada: {
             tiempoEntrega: '15 días',
             cotizacion: {
               proveedor: {
                 nombre: 'Test Provider'
               }
             }
           }
        }]
      }

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          listaEquipo: {
            findUnique: jest.fn().mockResolvedValue(mockLista),
            update: jest.fn()
          },
          pedidoEquipo: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'pedido-1', codigo: 'PED-PROJ-001-001' })
          },
          listaEquipoItem: {
            update: jest.fn()
          }
        }
        return await callback(tx)
      })

      mockPrisma.$transaction.mockImplementation(mockTransaction)

      const requestBody = {
        listaId: 'lista-1',
        items: [{ itemId: 'item-1', cantidadAConvertir: 5 }],
        fechaNecesaria: new Date().toISOString(),
        prioridad: 'media'
      }

      const request = new NextRequest('http://localhost:3000/api/listas-equipo/conversiones', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const data = await response.json()

      // ✅ Should handle gracefully when catalogoEquipo is null
      expect(response.status).toBe(200)
      expect(data.message).toContain('exitosamente')
    })

    it('should use default values when catalogoEquipo fields are missing', async () => {
      const mockLista = {
        id: 'lista-1',
        codigo: 'LST-001',
        proyectoId: 'proj-1',
        proyecto: { codigo: 'PROJ-001' },
        items: [{
          id: 'item-1',
          cantidad: 10,
          cantidadPedida: 0,
          catalogoEquipo: {
            id: 'cat-1',
            codigo: null, // 🔍 Testing null codigo
            descripcion: undefined, // 🔍 Testing undefined descripcion
            unidad: { nombre: '' }, // 🔍 Testing empty unidad
          },
          cotizacionSeleccionada: {
             tiempoEntrega: '15 días',
             cotizacion: {
               proveedor: {
                 nombre: 'Test Provider'
               }
             }
           }
        }]
      }

      let capturedItemData: any
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          listaEquipo: {
            findUnique: jest.fn().mockResolvedValue(mockLista),
            update: jest.fn()
          },
          pedidoEquipo: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((data) => {
              capturedItemData = data.data.items.create[0]
              return Promise.resolve({ id: 'pedido-1', codigo: 'PED-PROJ-001-001' })
            })
          },
          listaEquipoItem: {
            update: jest.fn()
          }
        }
        return await callback(tx)
      })

      mockPrisma.$transaction.mockImplementation(mockTransaction)

      const requestBody = {
        listaId: 'lista-1',
        items: [{ itemId: 'item-1', cantidadAConvertir: 5 }],
        fechaNecesaria: new Date().toISOString(),
        prioridad: 'media'
      }

      const request = new NextRequest('http://localhost:3000/api/listas-equipo/conversiones', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      await POST(request)

      // ✅ Verify default values are used
      expect(capturedItemData.codigo).toBe('SIN-CODIGO')
      expect(capturedItemData.descripcion).toBe('Sin descripción')
      expect(capturedItemData.unidad).toBe('und')
     })

    it('should handle null cantidadPedida in conversion calculation', async () => {
      const mockLista = {
        id: 'lista-1',
        codigo: 'LST-001',
        proyectoId: 'proj-1',
        proyecto: { codigo: 'PROJ-001' },
        items: [{
          id: 'item-1',
          cantidad: 10,
          cantidadPedida: null, // 🔍 Testing null handling
          catalogoEquipo: {
            codigo: 'CAT-001',
            descripcion: 'Equipo Test',
            unidad: {
              nombre: 'und'
            }
          },
          cotizacionSeleccionada: {
            tiempoEntrega: '15 días',
            cotizacion: {
              proveedor: {
                nombre: 'Test Provider'
              }
            }
          }
        }]
      }

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          listaEquipo: {
            findUnique: jest.fn().mockResolvedValue(mockLista),
            update: jest.fn()
          },
          pedidoEquipo: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'pedido-1', codigo: 'PED-PROJ-001-001' })
          },
          listaEquipoItem: {
            update: jest.fn()
          }
        }
        return await callback(tx)
      })

      mockPrisma.$transaction.mockImplementation(mockTransaction)

      const requestBody = {
        listaId: 'lista-1',
        items: [{ itemId: 'item-1', cantidadAConvertir: 5 }],
        fechaNecesaria: new Date().toISOString(),
        prioridad: 'media'
      }

      const request = new NextRequest('http://localhost:3000/api/listas-equipo/conversiones', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('exitosamente')
      
      // ✅ Verify transaction was called
      expect(mockTransaction).toHaveBeenCalled()
    })

    it('should use correct EstadoPedidoEquipoItem enum value', async () => {
      const mockLista = {
        id: 'lista-1',
        codigo: 'LST-001',
        proyectoId: 'proj-1',
        proyecto: { codigo: 'PROJ-001' },
        items: [{
          id: 'item-1',
          cantidad: 10,
          cantidadPedida: 0,
          catalogoEquipo: {
            codigo: 'CAT-001',
            descripcion: 'Equipo Test',
            unidad: {
              nombre: 'und'
            }
          },
          cotizacionSeleccionada: {
            tiempoEntrega: 15,
            proveedor: {
              nombre: 'Test Provider'
            }
          }
        }]
      }

      let capturedItemData: any
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          listaEquipo: {
            findUnique: jest.fn().mockResolvedValue(mockLista),
            update: jest.fn()
          },
          pedidoEquipo: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((data) => {
              capturedItemData = data.data.items.create[0]
              return Promise.resolve({ id: 'pedido-1', codigo: 'PED-PROJ-001-001' })
            })
          },
          listaEquipoItem: {
            update: jest.fn()
          }
        }
        return await callback(tx)
      })

      mockPrisma.$transaction.mockImplementation(mockTransaction)

      const requestBody = {
        listaId: 'lista-1',
        items: [{ itemId: 'item-1', cantidadAConvertir: 5 }],
        fechaNecesaria: new Date().toISOString(),
        prioridad: 'media'
      }

      const request = new NextRequest('http://localhost:3000/api/listas-equipo/conversiones', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      await POST(request)

      // ✅ Verify correct enum value is used
      expect(capturedItemData.estado).toBe('borrador') // Should use valid enum value
    })

    it('should use correct EstadoListaEquipo enum values for final state', async () => {
      const mockLista = {
        id: 'lista-1',
        codigo: 'LST-001',
        proyectoId: 'proj-1',
        proyecto: { codigo: 'PROJ-001' },
        items: [{
          id: 'item-1',
          cantidad: 10,
          cantidadPedida: 5, // Partially converted
          catalogoEquipo: {
            codigo: 'CAT-001',
            descripcion: 'Equipo Test',
            unidad: {
              nombre: 'und'
            }
          },
          cotizacionSeleccionada: {
            tiempoEntrega: 15,
            proveedor: {
              nombre: 'Test Provider'
            }
          }
        }]
      }

      let capturedListaUpdate: any
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          listaEquipo: {
            findUnique: jest.fn().mockResolvedValue(mockLista),
            update: jest.fn().mockImplementation((data) => {
              capturedListaUpdate = data.data
              return Promise.resolve({})
            })
          },
          pedidoEquipo: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'pedido-1', codigo: 'PED-PROJ-001-001' })
          },
          listaEquipoItem: {
            update: jest.fn()
          }
        }
        return await callback(tx)
      })

      mockPrisma.$transaction.mockImplementation(mockTransaction)

      const requestBody = {
        listaId: 'lista-1',
        items: [{ itemId: 'item-1', cantidadAConvertir: 3 }], // Partial conversion
        fechaNecesaria: new Date().toISOString(),
        prioridad: 'media'
      }

      const request = new NextRequest('http://localhost:3000/api/listas-equipo/conversiones', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      await POST(request)

      // ✅ Verify correct enum value is used for partial conversion
      expect(capturedListaUpdate.estado).toBe('en_proceso') // Should use valid enum value
    })
  })
})

// 🏃‍♂️ Run command: npm test src/__tests__/api/listas-equipo-conversiones-type-fixes.test.ts
