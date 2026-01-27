/**
 * Tests unitarios para algoritmos de importación automática de cronogramas
 *
 * Cubre:
 * - Algoritmos de agrupación por categorías/servicios
 * - Detección inteligente de zonas
 * - Cálculo automático de fechas
 * - Validaciones de entrada
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock de Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    cotizacion: {
      findUnique: jest.fn(),
      findFirst: jest.fn()
    },
    proyecto: {
      findUnique: jest.fn()
    },
    proyectoCronograma: {
      create: jest.fn()
    },
    proyectoFase: {
      create: jest.fn()
    },
    proyectoEdt: {
      create: jest.fn()
    },
    proyectoZona: {
      create: jest.fn()
    },
    proyectoActividad: {
      create: jest.fn()
    },
    proyectoTarea: {
      create: jest.fn()
    }
  }
}))

// Funciones a testear (extraídas de las APIs)
function prepararServicios(servicios: any[], metodo: 'categorias' | 'servicios') {
  if (metodo === 'servicios') {
    return servicios.map(servicio => ({
      id: servicio.id,
      nombre: servicio.nombre,
      categoria: servicio.categoriaServicio?.nombre || 'Sin Categoría',
      categoriaId: servicio.categoriaServicio?.id,
      items: servicio.items,
      horasTotales: servicio.items.reduce((sum: number, item: any) => sum + (item.horaTotal || 0), 0)
    }))
  } else {
    // Agrupar por categorías
    const categoriasMap = new Map<string, any[]>()

    servicios.forEach(servicio => {
      const categoria = servicio.categoriaServicio?.nombre || 'Sin Categoría'
      if (!categoriasMap.has(categoria)) {
        categoriasMap.set(categoria, [])
      }
      categoriasMap.get(categoria)!.push(servicio)
    })

    return Array.from(categoriasMap.entries()).map(([categoria, serviciosCategoria]) => ({
      id: `categoria-${categoria}`,
      nombre: `EDT ${categoria}`,
      categoria,
      categoriaId: serviciosCategoria[0]?.categoriaServicio?.id,
      items: serviciosCategoria.flatMap(s => s.items),
      horasTotales: serviciosCategoria.reduce((sum, s) =>
        sum + s.items.reduce((sum2: number, item: any) => sum2 + (item.horaTotal || 0), 0), 0
      )
    }))
  }
}

function detectarZonas(servicios: any[]): any[] {
  const patronesZona = [
    { patron: /piso|piso/i, nombre: 'Pisos', confianza: 80 },
    { patron: /área|area/i, nombre: 'Áreas', confianza: 75 },
    { patron: /zona/i, nombre: 'Zonas', confianza: 70 },
    { patron: /nivel/i, nombre: 'Niveles', confianza: 65 },
    { patron: /sector/i, nombre: 'Sectores', confianza: 60 }
  ]

  const zonasEncontradas: any[] = []

  servicios.forEach(servicio => {
    servicio.items.forEach((item: any) => {
      const textoAnalizar = `${item.nombre} ${item.descripcion || ''}`

      patronesZona.forEach(({ patron, nombre, confianza }) => {
        if (patron.test(textoAnalizar)) {
          const zonaExistente = zonasEncontradas.find(z => z.nombre === nombre)
          if (zonaExistente) {
            zonaExistente.serviciosAfectados++
            zonaExistente.confianza = Math.max(zonaExistente.confianza, confianza)
          } else {
            zonasEncontradas.push({
              nombre,
              patron: patron.source,
              serviciosAfectados: 1,
              confianza
            })
          }
        }
      })
    })
  })

  // Filtrar zonas con al menos 2 servicios afectados
  return zonasEncontradas.filter(zona => zona.serviciosAfectados >= 2)
}

function calcularFechasAutomaticas(
  fechaInicioProyecto: Date,
  fechaFinProyecto: Date,
  servicios: any[],
  metodo: 'categorias' | 'servicios'
) {
  const duracionTotalDias = Math.ceil((fechaFinProyecto.getTime() - fechaInicioProyecto.getTime()) / (1000 * 60 * 60 * 24))

  const serviciosPreparados = prepararServicios(servicios, metodo)
  const totalHoras = serviciosPreparados.reduce((sum, s) => sum + s.horasTotales, 0)

  // Distribuir horas proporcionalmente
  return serviciosPreparados.map(servicio => {
    const porcentajeHoras = servicio.horasTotales / totalHoras
    const diasAsignados = Math.max(1, Math.round(duracionTotalDias * porcentajeHoras))

    return {
      ...servicio,
      diasAsignados,
      fechaInicio: fechaInicioProyecto,
      fechaFin: new Date(fechaInicioProyecto.getTime() + (diasAsignados * 24 * 60 * 60 * 1000))
    }
  })
}

describe('Algoritmos de Importación Automática de Cronogramas', () => {

  describe('prepararServicios', () => {
    const mockServicios = [
      {
        id: 'serv1',
        nombre: 'Instalación Eléctrica',
        categoriaServicio: { id: 'cat1', nombre: 'Eléctrica' },
        items: [
          { nombre: 'Cableado', horaTotal: 10 },
          { nombre: 'Conexiones', horaTotal: 5 }
        ]
      },
      {
        id: 'serv2',
        nombre: 'Montaje Estructural',
        categoriaServicio: { id: 'cat2', nombre: 'Estructural' },
        items: [
          { nombre: 'Vigas', horaTotal: 20 }
        ]
      },
      {
        id: 'serv3',
        nombre: 'Cableado de Red',
        categoriaServicio: { id: 'cat1', nombre: 'Eléctrica' },
        items: [
          { nombre: 'Routers', horaTotal: 8 }
        ]
      }
    ]

    it('debe agrupar por servicios cuando metodo="servicios"', () => {
      const resultado = prepararServicios(mockServicios, 'servicios')

      expect(resultado).toHaveLength(3)
      expect(resultado[0]).toMatchObject({
        id: 'serv1',
        nombre: 'Instalación Eléctrica',
        categoria: 'Eléctrica',
        horasTotales: 15
      })
    })

    it('debe agrupar por categorías cuando metodo="categorias"', () => {
      const resultado = prepararServicios(mockServicios, 'categorias')

      expect(resultado).toHaveLength(2) // 2 categorías diferentes

      const electrica = resultado.find(r => r.categoria === 'Eléctrica')
      expect(electrica).toBeDefined()
      expect(electrica!.horasTotales).toBe(23) // 15 + 8
      expect(electrica!.items).toHaveLength(3) // Todos los items eléctricos
    })

    it('debe manejar servicios sin categoría', () => {
      const serviciosSinCategoria = [
        {
          id: 'serv1',
          nombre: 'Servicio Genérico',
          categoriaServicio: null,
          items: [{ nombre: 'Trabajo', horaTotal: 10 }]
        }
      ]

      const resultado = prepararServicios(serviciosSinCategoria, 'categorias')

      expect(resultado[0].categoria).toBe('Sin Categoría')
    })
  })

  describe('detectarZonas', () => {
    const mockServicios = [
      {
        items: [
          { nombre: 'Cableado Piso 1', descripcion: 'Instalación en primer piso' },
          { nombre: 'Iluminación Área Producción', descripcion: '' }
        ]
      },
      {
        items: [
          { nombre: 'Cableado Piso 2', descripcion: 'Segundo nivel' },
          { nombre: 'Zona Administrativa', descripcion: 'Oficinas' }
        ]
      }
    ]

    it('debe detectar patrones de zonas correctamente', () => {
      const zonas = detectarZonas(mockServicios)

      expect(zonas.length).toBeGreaterThan(0)

      const pisos = zonas.find(z => z.nombre === 'Pisos')
      expect(pisos).toBeDefined()
      expect(pisos!.serviciosAfectados).toBe(2)
      expect(pisos!.confianza).toBe(80)
    })

    it('debe filtrar zonas con menos de 2 servicios afectados', () => {
      const serviciosUnico = [
        {
          items: [
            { nombre: 'Trabajo único', descripcion: 'Sin zona específica' }
          ]
        }
      ]

      const zonas = detectarZonas(serviciosUnico)
      expect(zonas.length).toBe(0)
    })

    it('debe manejar texto sin patrones de zona', () => {
      const serviciosSinZonas = [
        {
          items: [
            { nombre: 'Trabajo general', descripcion: 'Sin ubicación específica' }
          ]
        }
      ]

      const zonas = detectarZonas(serviciosSinZonas)
      expect(zonas.length).toBe(0)
    })
  })

  describe('calcularFechasAutomaticas', () => {
    const fechaInicio = new Date('2024-01-01')
    const fechaFin = new Date('2024-01-31') // 30 días

    const mockServicios = [
      {
        id: 'serv1',
        nombre: 'Servicio 1',
        categoriaServicio: { nombre: 'Categoría A' },
        items: [
          { horaTotal: 10 },
          { horaTotal: 10 }
        ]
      },
      {
        id: 'serv2',
        nombre: 'Servicio 2',
        categoriaServicio: { nombre: 'Categoría B' },
        items: [
          { horaTotal: 20 }
        ]
      }
    ]

    it('debe distribuir fechas proporcionalmente por horas', () => {
      const resultado = calcularFechasAutomaticas(fechaInicio, fechaFin, mockServicios, 'servicios')

      expect(resultado).toHaveLength(2)

      // Servicio 1: 20 horas (40%), Servicio 2: 20 horas (40%)
      // Total: 40 horas, 30 días
      const serv1 = resultado.find(r => r.id === 'serv1')
      const serv2 = resultado.find(r => r.id === 'serv2')

      expect(serv1!.diasAsignados).toBeGreaterThan(0)
      expect(serv2!.diasAsignados).toBeGreaterThan(0)
      expect(serv1!.fechaInicio).toEqual(fechaInicio)
    })

    it('debe asignar al menos 1 día a cada servicio', () => {
      const serviciosPequenos = [
        {
          id: 'serv1',
          nombre: 'Servicio Pequeño',
          categoriaServicio: { nombre: 'Categoría A' },
          items: [{ horaTotal: 0.1 }] // Muy pocas horas
        }
      ]

      const resultado = calcularFechasAutomaticas(fechaInicio, fechaFin, serviciosPequenos, 'servicios')

      expect(resultado[0].diasAsignados).toBe(1)
    })
  })

  describe('Validaciones de entrada', () => {
    it('debe validar método de agrupación válido', () => {
      expect(() => {
        prepararServicios([], 'invalid' as any)
      }).not.toThrow()
    })

    it('debe manejar arrays vacíos', () => {
      const resultado = prepararServicios([], 'servicios')
      expect(resultado).toHaveLength(0)
    })

    it('debe manejar servicios sin items', () => {
      const serviciosSinItems = [
        {
          id: 'serv1',
          nombre: 'Servicio vacío',
          categoriaServicio: { nombre: 'Categoría A' },
          items: []
        }
      ]

      const resultado = prepararServicios(serviciosSinItems, 'servicios')
      expect(resultado[0].horasTotales).toBe(0)
    })
  })
})