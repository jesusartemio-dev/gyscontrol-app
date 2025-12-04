/**
 * 🧪 Tests para APIs de Cronograma de 5 Niveles
 *
 * Tests de integración para validar las APIs de EDTs y actividades (sin zonas).
 *
 * @author GYS Team
 * @version 5.0.0 - Sistema Simplificado
 */

import { NextRequest } from 'next/server'
import { POST as createEdt, GET as getEdts } from '@/app/api/cotizaciones/[id]/edts/route'
import { POST as createActividad } from '@/app/api/cotizaciones/[id]/actividades/route'

// ✅ Tests simplificados sin mocks complejos de base de datos
// Estos tests verifican que las rutas existen y manejan errores correctamente

// Mock de Next.js context
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    user: { id: 'test-user-id', email: 'test@example.com', role: 'admin' }
  }))
}))

const TEST_COTIZACION_ID = 'test-cotizacion-id'

describe('/api/cotizaciones/[id]/edts', () => {
  beforeEach(async () => {
    // ✅ Tests de API no necesitan limpiar base de datos directamente
    // Los mocks se resetean automáticamente en setup global
  })

  describe('POST /api/cotizaciones/[id]/edts', () => {
    it('✅ should validate required fields', async () => {
      // ✅ Test de validación: enviar datos sin nombre requerido
      const requestData = {
        cotizacionServicioId: 'test-servicio-id',
        // nombre faltante - debería fallar validación
        fechaInicioComercial: '2025-01-01'
      }

      const request = new NextRequest(
        `http://localhost:3000/api/cotizaciones/${TEST_COTIZACION_ID}/edts`,
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' }
        }
      )

      const response = await createEdt(request, { params: Promise.resolve({ id: TEST_COTIZACION_ID }) })
      const result = await response.json()

      // ✅ Debería fallar por validación de datos
      expect(response.status).toBe(400)
      expect(result.error).toBeDefined()
    })

    it('❌ should fail with invalid data', async () => {
      const requestData = {
        // Datos inválidos - falta nombre requerido
        fechaInicioComercial: '2025-01-01'
      }

      const request = new NextRequest(
        `http://localhost:3000/api/cotizaciones/${TEST_COTIZACION_ID}/edts`,
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' }
        }
      )

      const response = await createEdt(request, { params: Promise.resolve({ id: TEST_COTIZACION_ID }) })
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('GET /api/cotizaciones/[id]/edts', () => {
    it('✅ should return EDTs list', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/cotizaciones/${TEST_COTIZACION_ID}/edts`
      )

      const response = await getEdts(request, { params: Promise.resolve({ id: TEST_COTIZACION_ID }) })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
    })
  })
})

describe('/api/cotizaciones/[id]/actividades', () => {
  describe('POST /api/cotizaciones/[id]/actividades', () => {
    it('✅ should validate required EDT field', async () => {
      // ✅ Test de validación: enviar datos sin cotizacionEdtId requerido
      const requestData = {
        // cotizacionEdtId faltante - debería fallar validación
        nombre: 'Actividad de prueba',
        fechaInicioComercial: '2025-01-01',
        fechaFinComercial: '2025-01-05',
        horasEstimadas: 8
      }

      const request = new NextRequest(
        `http://localhost:3000/api/cotizaciones/${TEST_COTIZACION_ID}/actividades`,
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' }
        }
      )

      const response = await createActividad(request, { params: Promise.resolve({ id: TEST_COTIZACION_ID }) })
      const result = await response.json()

      // ✅ Debería fallar por validación de datos (EDT requerido)
      expect(response.status).toBe(400)
      expect(result.error).toBeDefined()
    })
  })
})
