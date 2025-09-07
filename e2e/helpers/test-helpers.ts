/**
 * 🛠️ Helpers para Tests E2E
 * 
 * Funciones utilitarias para autenticación, creación de datos de prueba,
 * navegación y validaciones comunes en tests E2E.
 * 
 * @author TRAE - Agente Senior Fullstack
 * @version 1.0.0
 */

import { Page, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import path from 'path'

// 🗄️ Cliente Prisma para tests
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    }
  }
})

// 👥 Configuración de usuarios de prueba
const TEST_USERS = {
  admin: {
    email: 'admin@gys.com',
    password: 'Admin123!',
    role: 'admin',
    authFile: 'auth-admin.json'
  },
  gerente: {
    email: 'gerente@gys.com',
    password: 'Gerente123!',
    role: 'gerente',
    authFile: 'auth-gerente.json'
  },
  comercial: {
    email: 'comercial@gys.com',
    password: 'Comercial123!',
    role: 'comercial',
    authFile: 'auth-comercial.json'
  },
  logistico: {
    email: 'logistico@gys.com',
    password: 'Logistico123!',
    role: 'logistico',
    authFile: 'auth-logistico.json'
  },
  gestor: {
    email: 'gestor@gys.com',
    password: 'Gestor123!',
    role: 'gestor',
    authFile: 'auth-gestor.json'
  }
}

/**
 * 🔐 Realizar login como usuario específico
 */
export async function loginAs(page: Page, userType: keyof typeof TEST_USERS) {
  const user = TEST_USERS[userType]
  const authFile = path.join(__dirname, '..', user.authFile)
  
  try {
    // 🔄 Intentar usar sesión guardada
    await page.context().storageState({ path: authFile })
    await page.goto('/')
    
    // ✅ Verificar si ya está logueado
    const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible({ timeout: 3000 })
    if (isLoggedIn) {
      return
    }
  } catch (error) {
    // Sesión no válida, proceder con login manual
  }
  
  // 🔐 Login manual
  await page.goto('/auth/login')
  
  // 📝 Llenar formulario de login
  await page.fill('[data-testid="input-email"]', user.email)
  await page.fill('[data-testid="input-password"]', user.password)
  await page.click('[data-testid="btn-login"]')
  
  // ✅ Verificar login exitoso
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 10000 })
  
  // 💾 Guardar estado de autenticación
  await page.context().storageState({ path: authFile })
}

/**
 * 🏗️ Crear datos de prueba para tests
 */
export async function createTestData() {
  console.log('🏗️ Creando datos de prueba...')
  
  try {
    // 👥 Crear usuarios si no existen
    await createTestUsers()
    
    // 🏢 Crear proveedor de prueba
    const proveedor = await prisma.proveedor.upsert({
      where: { id: 'prov-test-001' },
      update: {},
      create: {
        id: 'prov-test-001',
        nombre: 'Proveedor Test E2E',
        ruc: '20123456789'
      }
    })
    
    // 🔧 Crear categoría de equipo
    const categoria = await prisma.categoriaEquipo.upsert({
      where: { id: 'cat-test-001' },
      update: {},
      create: {
        id: 'cat-test-001',
        nombre: 'MAQUINARIA_PESADA'
      }
    })

    // 🔧 Crear unidad
    const unidad = await prisma.unidad.upsert({
      where: { id: 'unidad-test-001' },
      update: {},
      create: {
        id: 'unidad-test-001',
        nombre: 'UNIDAD'
      }
    })

    // 🔧 Crear equipo de prueba
    const equipo = await prisma.catalogoEquipo.upsert({
      where: { id: 'equipo-test-001' },
      update: {},
      create: {
        id: 'equipo-test-001',
        categoriaId: categoria.id,
        unidadId: unidad.id,
        codigo: 'EXC-TEST-001',
        descripcion: 'Excavadora Test E2E',
        marca: 'Caterpillar',
        precioInterno: 150000,
        margen: 0.2,
        precioVenta: 180000,
        estado: 'ACTIVO'
      }
    })
    
    // 🏢 Crear cliente de prueba
    const cliente = await prisma.cliente.upsert({
      where: { id: 'cliente-test-001' },
      update: {},
      create: {
        id: 'cliente-test-001',
        nombre: 'Cliente Test E2E',
        ruc: '20123456789',
        direccion: 'Lima, Perú',
        telefono: '01-234-5678',
        correo: 'cliente@test.com'
      }
    })

    // 👥 Crear usuarios de prueba
    const comercial = await prisma.user.upsert({
      where: { id: 'user-comercial-test' },
      update: {},
      create: {
        id: 'user-comercial-test',
        email: 'comercial-test@gys.com',
        name: 'Comercial Test',
        password: 'TestPassword123!',
        role: 'comercial'
      }
    })

    const gestor = await prisma.user.upsert({
      where: { id: 'user-gestor-test' },
      update: {},
      create: {
        id: 'user-gestor-test',
        email: 'gestor-test@gys.com',
        name: 'Gestor Test',
        password: 'TestPassword123!',
        role: 'gestor'
      }
    })

    // 📋 Crear proyecto de prueba
    const proyecto = await prisma.proyecto.upsert({
      where: { id: 'proyecto-test-001' },
      update: {},
      create: {
        id: 'proyecto-test-001',
        clienteId: cliente.id,
        comercialId: comercial.id,
        gestorId: gestor.id,
        nombre: 'Proyecto Test E2E',
        codigo: 'PROJ-TEST-001',
        fechaInicio: new Date(),
        estado: 'activo'
      }
    })
    
    // 📦 Crear pedido de equipo
    const pedido = await prisma.pedidoEquipo.upsert({
      where: { id: 'pedido-test-001' },
      update: {},
      create: {
        id: 'pedido-test-001',
        proyectoId: proyecto.id,
        responsableId: comercial.id,
        codigo: 'PED-TEST-001',
        numeroSecuencia: 1,
        fechaNecesaria: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        estado: 'enviado'
      }
    })
    
    // ✅ Datos básicos creados - sistema simplificado sin aprovisionamiento
    
    console.log('✅ Datos de prueba creados exitosamente')
    
    return {
      proveedor,
      equipo,
      proyecto,
      pedido,
      cliente,
      comercial,
      gestor
    }
    
  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error)
    throw error
  }
}

/**
 * 👥 Crear usuarios de prueba
 */
async function createTestUsers() {
  const bcrypt = require('bcryptjs')
  
  for (const [key, userData] of Object.entries(TEST_USERS)) {
    const userId = `user-${key}-test`
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: userData.email,
        password: hashedPassword,
        name: `Usuario ${userData.role}`,
        role: userData.role as any,
        emailVerified: new Date()
      }
    })
  }
}

/**
 * 🧹 Limpiar datos de prueba
 */
export async function cleanupTestData(testData?: any) {
  console.log('🧹 Limpiando datos de prueba...')
  
  try {
    // Orden de limpieza respetando FK constraints - sistema simplificado
    const cleanupOrder = [
      { model: 'pedidoEquipo', condition: { id: { startsWith: 'pedido-test-' } } },
      { model: 'proyecto', condition: { id: { startsWith: 'proyecto-test-' } } },
      { model: 'catalogoEquipo', condition: { id: { startsWith: 'equipo-test-' } } },
      { model: 'cliente', condition: { id: { startsWith: 'cliente-test-' } } },
      { model: 'proveedor', condition: { id: { startsWith: 'prov-test-' } } },
      { model: 'categoriaEquipo', condition: { id: { startsWith: 'cat-test-' } } },
      { model: 'unidad', condition: { id: { startsWith: 'unidad-test-' } } }
    ]
    
    for (const { model, condition } of cleanupOrder) {
      try {
        const result = await (prisma as any)[model].deleteMany({
          where: condition
        })
        console.log(`🗑️ Eliminados ${result.count} registros de ${model}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.warn(`⚠️ Error eliminando ${model}:`, errorMessage)
      }
    }
    
    console.log('✅ Datos de prueba limpiados')
  } catch (error) {
    console.error('❌ Error limpiando datos de prueba:', error)
  }
}

/**
 * 🔍 Esperar a que un elemento sea visible
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000) {
  await expect(page.locator(selector)).toBeVisible({ timeout })
}

/**
 * 📝 Llenar formulario con datos
 */
export async function fillForm(page: Page, formData: Record<string, string>) {
  for (const [field, value] of Object.entries(formData)) {
    const selector = `[data-testid="${field}"]`
    const element = page.locator(selector)
    
    // Determinar tipo de elemento
    const tagName = await element.evaluate(el => el.tagName.toLowerCase())
    const inputType = await element.evaluate(el => el.getAttribute('type'))
    
    if (tagName === 'select') {
      await page.selectOption(selector, value)
    } else if (tagName === 'textarea') {
      await page.fill(selector, value)
    } else if (inputType === 'checkbox') {
      if (value === 'true') {
        await page.check(selector)
      } else {
        await page.uncheck(selector)
      }
    } else {
      await page.fill(selector, value)
    }
  }
}

/**
 * 📊 Verificar métricas en dashboard
 */
export async function verifyMetrics(page: Page, expectedMetrics: Record<string, string>) {
  for (const [metric, expectedValue] of Object.entries(expectedMetrics)) {
    const selector = `[data-testid="metrica-${metric}"]`
    await expect(page.locator(selector)).toContainText(expectedValue)
  }
}

/**
 * 🎭 Simular subida de archivo
 */
export async function uploadFile(page: Page, inputSelector: string, fileName: string, content: string, mimeType = 'application/pdf') {
  const fileInput = page.locator(inputSelector)
  await fileInput.setInputFiles({
    name: fileName,
    mimeType,
    buffer: Buffer.from(content)
  })
}

/**
 * ⏱️ Esperar y verificar toast de éxito
 */
export async function expectSuccessToast(page: Page, message?: string) {
  const toast = page.locator('[data-testid="toast-success"]')
  await expect(toast).toBeVisible({ timeout: 5000 })
  
  if (message) {
    await expect(toast).toContainText(message)
  }
}

/**
 * ❌ Esperar y verificar toast de error
 */
export async function expectErrorToast(page: Page, message?: string) {
  const toast = page.locator('[data-testid="toast-error"]')
  await expect(toast).toBeVisible({ timeout: 5000 })
  
  if (message) {
    await expect(toast).toContainText(message)
  }
}

/**
 * 🔄 Navegar y esperar carga completa
 */
export async function navigateAndWait(page: Page, url: string) {
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  await page.waitForLoadState('domcontentloaded')
}

/**
 * 📱 Verificar responsividad
 */
export async function testResponsiveness(page: Page, breakpoints = [1920, 1024, 768, 375]) {
  for (const width of breakpoints) {
    await page.setViewportSize({ width, height: 1080 })
    await page.waitForTimeout(500) // Esperar ajuste de layout
    
    // Verificar que no hay overflow horizontal
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(width + 20) // Margen de 20px
  }
}

/**
 * ♿ Verificar accesibilidad básica
 */
export async function checkBasicAccessibility(page: Page) {
  // Verificar que todos los botones tienen texto o aria-label
  const buttons = await page.locator('button').all()
  for (const button of buttons) {
    const text = await button.textContent()
    const ariaLabel = await button.getAttribute('aria-label')
    expect(text || ariaLabel).toBeTruthy()
  }
  
  // Verificar que todos los inputs tienen labels
  const inputs = await page.locator('input[type="text"], input[type="email"], input[type="password"], textarea').all()
  for (const input of inputs) {
    const id = await input.getAttribute('id')
    const ariaLabel = await input.getAttribute('aria-label')
    const placeholder = await input.getAttribute('placeholder')
    
    if (id) {
      const label = await page.locator(`label[for="${id}"]`).count()
      expect(label > 0 || ariaLabel || placeholder).toBeTruthy()
    } else {
      expect(ariaLabel || placeholder).toBeTruthy()
    }
  }
}

/**
 * 🎯 Verificar estado de carga
 */
export async function expectLoadingState(page: Page, isLoading = true) {
  const loader = page.locator('[data-testid="loading"], [data-testid="skeleton"], .animate-pulse')
  
  if (isLoading) {
    await expect(loader.first()).toBeVisible({ timeout: 2000 })
  } else {
    await expect(loader).not.toBeVisible({ timeout: 10000 })
  }
}

export { TEST_USERS, prisma }