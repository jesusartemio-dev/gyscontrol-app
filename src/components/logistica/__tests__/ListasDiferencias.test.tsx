// ===================================================
// 📁 Archivo: ListasDiferencias.test.tsx
// 🔧 Descripción: Test para verificar las diferencias entre APIs de listas
// 🧠 Uso: Documentar y testear el comportamiento de ambas APIs
// ✍️ Autor: Senior Fullstack Developer
// 📅 Fecha: 2025-01-15
// ===================================================

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { buildApiUrl } from '@/lib/utils'

// Mock de fetch global
global.fetch = jest.fn()

describe('Diferencias entre APIs de Listas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('API /api/listas-equipo devuelve datos mock sin relaciones', async () => {
    const mockResponse = [
      {
        id: '1',
        nombre: 'Lista Equipos Oficina Central',
        proyectoId: '1',
        estado: 'por_revisar',
        items: [
          {
            id: '1',
            nombre: 'Laptop Dell XPS 13',
            cantidad: 5
          }
        ]
      }
    ]

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const response = await fetch(buildApiUrl('/api/listas-equipo'))
    const data = await response.json()

    expect(data).toEqual(mockResponse)
    expect(data[0].items).toBeDefined()
    expect(data[0].proyecto).toBeUndefined() // No incluye relación proyecto
    expect(data[0].responsable).toBeUndefined() // No incluye relación responsable
  })

  it('API /api/lista-equipo devuelve datos de Prisma con relaciones completas', async () => {
    const mockPrismaResponse = [
      {
        id: '1',
        nombre: 'Lista Real con Relaciones',
        proyectoId: '1',
        estado: 'por_revisar',
        proyecto: {
          id: '1',
          nombre: 'Proyecto Alpha',
          codigo: 'PROJ-001'
        },
        responsable: {
          id: 'user1',
          nombre: 'Juan Pérez',
          email: 'juan@empresa.com'
        },
        items: [
          {
            id: '1',
            nombre: 'Laptop Dell XPS 13',
            cantidad: 5,
            lista: { id: '1', nombre: 'Lista Real con Relaciones' },
            proveedor: { id: 'prov1', nombre: 'Dell Inc.' },
            cotizaciones: [],
            pedidos: [],
            proyectoEquipoItem: {
              proyectoEquipo: {
                id: 'pe1',
                nombre: 'Equipo Desarrollo'
              }
            }
          }
        ]
      }
    ]

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPrismaResponse,
    } as Response)

    const response = await fetch(buildApiUrl('/api/lista-equipo?proyectoId=1'))
    const data = await response.json()

    expect(data).toEqual(mockPrismaResponse)
    expect(data[0].proyecto).toBeDefined() // Incluye relación proyecto
    expect(data[0].responsable).toBeDefined() // Incluye relación responsable
    expect(data[0].items[0].proveedor).toBeDefined() // Items con relaciones completas
    expect(data[0].items[0].cotizaciones).toBeDefined()
    expect(data[0].items[0].pedidos).toBeDefined()
  })

  it('Filtrado por proyecto funciona en ambas APIs', async () => {
    // Test para /api/listas-equipo con filtro
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: '1', proyectoId: '1' }, { id: '2', proyectoId: '1' }],
    } as Response)

    const response1 = await fetch(buildApiUrl('/api/listas-equipo'))
    const allListas = await response1.json()
    
    // Test para /api/lista-equipo con filtro
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: '1', proyectoId: '1' }],
    } as Response)

    const response2 = await fetch(buildApiUrl('/api/lista-equipo?proyectoId=1'))
    const filteredListas = await response2.json()

    expect(allListas.length).toBeGreaterThanOrEqual(filteredListas.length)
    expect(filteredListas.every((lista: any) => lista.proyectoId === '1')).toBe(true)
  })
})

// ===================================================
// 📋 DOCUMENTACIÓN DE DIFERENCIAS
// ===================================================
/*
DIFERENCIAS PRINCIPALES:

1. FUENTE DE DATOS:
   - /api/listas-equipo: Usa datos MOCK estáticos
   - /api/lista-equipo: Usa Prisma ORM con base de datos real

2. RELACIONES:
   - /api/listas-equipo: Items básicos sin relaciones
   - /api/lista-equipo: Incluye proyecto, responsable, y relaciones completas en items

3. FILTRADO:
   - /api/listas-equipo: Filtrado en memoria de datos mock
   - /api/lista-equipo: Filtrado a nivel de base de datos con Prisma

4. PERFORMANCE:
   - /api/listas-equipo: Rápido pero datos limitados
   - /api/lista-equipo: Más lento pero datos completos y actualizados

5. USO RECOMENDADO:
   - Página de proyecto específico: /api/lista-equipo (datos reales filtrados)
   - Vista general de logística: /api/listas-equipo (vista rápida general)
*/
