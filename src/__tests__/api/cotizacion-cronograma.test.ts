/**
 * 🧪 Tests para APIs de Cronograma Comercial
 *
 * Tests de integración para validar las APIs de EDTs y tareas comerciales.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import { NextRequest } from 'next/server'
import { POST as createEdt, GET as getEdts } from '@/app/api/cotizacion/[id]/cronograma/route'
import { PUT as updateEdt, DELETE as deleteEdt } from '@/app/api/cotizacion/[id]/cronograma/[edtId]/route'
import { POST as createTarea } from '@/app/api/cotizacion/[id]/cronograma/[edtId]/tareas/route'
import { prisma } from '@/lib/prisma'

const TEST_COTIZACION_ID = 'test-cotizacion-id'
const TEST_EDT_ID = 'test-edt-id'

describe('/api/cotizacion/[id]/cronograma', () => {
  beforeEach(async () => {
    // Limpiar datos de prueba
    await prisma.cotizacionTarea.deleteMany()
    await prisma.cotizacionEdt.deleteMany()
  })

  describe('POST /api/cotizacion/[id]/cronograma', () => {
    it('✅ should create EDT comercial successfully', async () => {
      const requestData = {
        categoriaServicioId: 'test-categoria-id',
        zona: 'Zona de prueba',
        fechaInicioCom: '2025-01-01',
        fechaFinCom: '2025-01-31',
        horasCom: 40,
        descripcion: 'EDT de prueba'
      }

      const request = new NextRequest(
        `http://localhost:3000/api/cotizacion/${TEST_COTIZACION_ID}/cronograma`,
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' }
        }
      )

      const response = await createEdt(request, { params: { id: TEST_COTIZACION_ID } })
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('id')
      expect(result.data.categoriaServicioId).toBe(requestData.categoriaServicioId)
    })

    it('❌ should fail with invalid data', async () => {
      const requestData = {
        // Datos inválidos - falta categoriaServicioId requerido
        zona: 'Zona de prueba'
      }

      const request = new NextRequest(
        `http://localhost:3000/api/cotizacion/${TEST_COTIZACION_ID}/cronograma`,
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' }
        }
      )

      const response = await createEdt(request, { params: { id: TEST_COTIZACION_ID } })
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('GET /api/cotizacion/[id]/cronograma', () => {
    it('✅ should return EDTs list', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/cotizacion/${TEST_COTIZACION_ID}/cronograma`
      )

      const response = await getEdts(request, { params: { id: TEST_COTIZACION_ID } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
    })
  })

  describe('PUT /api/cotizacion/[id]/cronograma/[edtId]', () => {
    it('✅ should update EDT successfully', async () => {
      // Primero crear un EDT
      const createRequest = new NextRequest(
        `http://localhost:3000/api/cotizacion/${TEST_COTIZACION_ID}/cronograma`,
        {
          method: 'POST',
          body: JSON.stringify({
            categoriaServicioId: 'test-categoria-id',
            zona: 'Zona original'
          }),
          headers: { 'Content-Type': 'application/json' }
        }
      )

      const createResponse = await createEdt(createRequest, { params: { id: TEST_COTIZACION_ID } })
      const createResult = await createResponse.json()
      const edtId = createResult.data.id

      // Luego actualizarlo
      const updateData = {
        zona: 'Zona actualizada',
        descripcion: 'Descripción actualizada'
      }

      const updateRequest = new NextRequest(
        `http://localhost:3000/api/cotizacion/${TEST_COTIZACION_ID}/cronograma/${edtId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' }
        }
      )

      const updateResponse = await updateEdt(updateRequest, {
        params: { id: TEST_COTIZACION_ID, edtId }
      })
      const updateResult = await updateResponse.json()

      expect(updateResponse.status).toBe(200)
      expect(updateResult.success).toBe(true)
      expect(updateResult.data.zona).toBe(updateData.zona)
    })
  })

  describe('DELETE /api/cotizacion/[id]/cronograma/[edtId]', () => {
    it('✅ should delete EDT successfully', async () => {
      // Crear EDT primero
      const createRequest = new NextRequest(
        `http://localhost:3000/api/cotizacion/${TEST_COTIZACION_ID}/cronograma`,
        {
          method: 'POST',
          body: JSON.stringify({
            categoriaServicioId: 'test-categoria-id'
          }),
          headers: { 'Content-Type': 'application/json' }
        }
      )

      const createResponse = await createEdt(createRequest, { params: { id: TEST_COTIZACION_ID } })
      const createResult = await createResponse.json()
      const edtId = createResult.data.id

      // Eliminar EDT
      const deleteRequest = new NextRequest(
        `http://localhost:3000/api/cotizacion/${TEST_COTIZACION_ID}/cronograma/${edtId}`,
        { method: 'DELETE' }
      )

      const deleteResponse = await deleteEdt(deleteRequest, {
        params: { id: TEST_COTIZACION_ID, edtId }
      })
      const deleteResult = await deleteResponse.json()

      expect(deleteResponse.status).toBe(200)
      expect(deleteResult.success).toBe(true)
    })
  })
})

describe('/api/cotizacion/[id]/cronograma/[edtId]/tareas', () => {
  describe('POST /api/cotizacion/[id]/cronograma/[edtId]/tareas', () => {
    it('✅ should create tarea successfully', async () => {
      const requestData = {
        nombre: 'Tarea de prueba',
        fechaInicioCom: '2025-01-01',
        fechaFinCom: '2025-01-05',
        horasCom: 8,
        descripcion: 'Descripción de tarea de prueba'
      }

      const request = new NextRequest(
        `http://localhost:3000/api/cotizacion/${TEST_COTIZACION_ID}/cronograma/${TEST_EDT_ID}/tareas`,
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' }
        }
      )

      const response = await createTarea(request, {
        params: { id: TEST_COTIZACION_ID, edtId: TEST_EDT_ID }
      })
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.success).toBe(true)
      expect(result.data.nombre).toBe(requestData.nombre)
    })
  })
})