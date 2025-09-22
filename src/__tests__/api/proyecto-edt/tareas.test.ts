// ===================================================
// 📁 Archivo: tareas.test.ts
// 📌 Ubicación: src/__tests__/api/proyecto-edt/
// 🔧 Descripción: Tests para APIs de ProyectoTarea
//
// 🧠 Uso: Validar funcionamiento de CRUD de tareas
// ✍️ Autor: Sistema GYS - Testing Cronograma 4 Niveles
// 📅 Última actualización: 2025-09-22
// ===================================================

import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/proyecto-edt/[id]/tareas/route'
import { GET as GET_INDIVIDUAL, PUT, DELETE } from '@/app/api/proyecto-edt/[id]/tareas/[tareaId]/route'
import { prisma } from '@/lib/prisma'
import { createTestData } from '@/__tests__/setup'

// ✅ Mock de auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'admin'
    }
  }))
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {}
}))

describe('/api/proyecto-edt/[id]/tareas', () => {
  let testProyecto: any
  let testEdt: any
  let testTarea: any

  beforeAll(async () => {
    // Crear datos de prueba
    const testData = await createTestData()
    testProyecto = testData.proyecto
    testEdt = testData.edt
  })

  afterAll(async () => {
    // Limpiar datos de prueba
    await prisma.proyectoTarea.deleteMany()
    await prisma.proyectoEdt.deleteMany()
    await prisma.proyectoFase.deleteMany()
    await prisma.proyecto.deleteMany()
  })

  describe('GET /api/proyecto-edt/[id]/tareas', () => {
    it('✅ should return empty array when no tasks exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/proyecto-edt/test-edt-id/tareas')
      const response = await GET(request, { params: { id: testEdt.id } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
    })

    it('✅ should return tasks when they exist', async () => {
      // Crear tarea de prueba
      const tarea = await prisma.proyectoTarea.create({
        data: {
          proyectoEdtId: testEdt.id,
          nombre: 'Tarea de Prueba',
          descripcion: 'Descripción de prueba',
          fechaInicio: new Date('2025-01-01'),
          fechaFin: new Date('2025-01-15'),
          horasEstimadas: 40,
          estado: 'pendiente',
          prioridad: 'media'
        }
      })

      const request = new NextRequest('http://localhost:3000/api/proyecto-edt/test-edt-id/tareas')
      const response = await GET(request, { params: { id: testEdt.id } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].id).toBe(tarea.id)
      expect(data.data[0].nombre).toBe('Tarea de Prueba')

      // Limpiar
      await prisma.proyectoTarea.delete({ where: { id: tarea.id } })
    })
  })

  describe('POST /api/proyecto-edt/[id]/tareas', () => {
    it('✅ should create a new task', async () => {
      const taskData = {
        nombre: 'Nueva Tarea',
        descripcion: 'Descripción de la nueva tarea',
        fechaInicio: '2025-01-01',
        fechaFin: '2025-01-15',
        horasEstimadas: 20,
        prioridad: 'alta'
      }

      const request = new NextRequest('http://localhost:3000/api/proyecto-edt/test-edt-id/tareas', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request, { params: { id: testEdt.id } })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.nombre).toBe('Nueva Tarea')
      expect(data.data.proyectoEdtId).toBe(testEdt.id)

      // Verificar que se creó en BD
      const createdTask = await prisma.proyectoTarea.findUnique({
        where: { id: data.data.id }
      })
      expect(createdTask).toBeTruthy()
      expect(createdTask?.nombre).toBe('Nueva Tarea')

      // Limpiar
      await prisma.proyectoTarea.delete({ where: { id: data.data.id } })
    })

    it('❌ should reject invalid data', async () => {
      const invalidData = {
        // nombre faltante
        descripcion: 'Sin nombre',
        fechaInicio: '2025-01-01',
        fechaFin: '2025-01-15'
      }

      const request = new NextRequest('http://localhost:3000/api/proyecto-edt/test-edt-id/tareas', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request, { params: { id: testEdt.id } })
      expect(response.status).toBe(400)
    })
  })

  describe('Individual task operations', () => {
    beforeEach(async () => {
      testTarea = await prisma.proyectoTarea.create({
        data: {
          proyectoEdtId: testEdt.id,
          nombre: 'Tarea Individual',
          descripcion: 'Para tests individuales',
          fechaInicio: new Date('2025-01-01'),
          fechaFin: new Date('2025-01-15'),
          horasEstimadas: 30,
          estado: 'pendiente',
          prioridad: 'media'
        }
      })
    })

    afterEach(async () => {
      if (testTarea) {
        await prisma.proyectoTarea.delete({ where: { id: testTarea.id } }).catch(() => {})
        testTarea = null
      }
    })

    it('✅ GET individual task should return task data', async () => {
      const request = new NextRequest(`http://localhost:3000/api/proyecto-edt/${testEdt.id}/tareas/${testTarea.id}`)
      const response = await GET_INDIVIDUAL(request, {
        params: { id: testEdt.id, tareaId: testTarea.id }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(testTarea.id)
      expect(data.data.nombre).toBe('Tarea Individual')
    })

    it('✅ PUT should update task', async () => {
      const updateData = {
        nombre: 'Tarea Actualizada',
        descripcion: 'Descripción actualizada',
        estado: 'en_progreso',
        porcentajeCompletado: 50
      }

      const request = new NextRequest(`http://localhost:3000/api/proyecto-edt/${testEdt.id}/tareas/${testTarea.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PUT(request, {
        params: { id: testEdt.id, tareaId: testTarea.id }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.nombre).toBe('Tarea Actualizada')
      expect(data.data.estado).toBe('en_progreso')
      expect(data.data.porcentajeCompletado).toBe(50)
    })

    it('✅ DELETE should remove task', async () => {
      const request = new NextRequest(`http://localhost:3000/api/proyecto-edt/${testEdt.id}/tareas/${testTarea.id}`, {
        method: 'DELETE'
      })

      const response = await DELETE(request, {
        params: { id: testEdt.id, tareaId: testTarea.id }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)

      // Verificar que se eliminó
      const deletedTask = await prisma.proyectoTarea.findUnique({
        where: { id: testTarea.id }
      })
      expect(deletedTask).toBeNull()

      // Evitar cleanup en afterEach
      testTarea = null
    })
  })
})