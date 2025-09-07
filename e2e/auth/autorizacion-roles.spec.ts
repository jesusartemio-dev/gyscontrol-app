/**
 * 🔐 Test E2E - Autorización por Roles
 * 
 * Verifica que cada rol de usuario tenga acceso únicamente a las funcionalidades
 * permitidas según la matriz de permisos del sistema GYS.
 * 
 * @author TRAE - Agente Senior Fullstack
 * @version 1.0.0
 */

import { test, expect, Page } from '@playwright/test'
import { loginAs, createTestData, cleanupTestData, navigateAndWait } from '../helpers/test-helpers'

// 🎭 Configuración de tests
test.describe('Autorización por Roles', () => {
  let testData: any
  
  // 🏗️ Setup antes de todos los tests
  test.beforeAll(async () => {
    testData = await createTestData()
  })
  
  // 🧹 Cleanup después de todos los tests
  test.afterAll(async () => {
    await cleanupTestData(testData)
  })
  
  // 👑 ADMIN - Acceso completo a todo el sistema
  test.describe('Rol ADMIN', () => {
    test('Debe tener acceso completo a todas las funcionalidades', async ({ page }) => {
      await loginAs(page, 'admin')
      
      // ✅ Verificar acceso a todas las secciones principales
      const secciones = [
        { url: '/dashboard', titulo: 'Dashboard' },
        { url: '/proyectos', titulo: 'Proyectos' },
        { url: '/proyectos/pedidos-equipo', titulo: 'Pedidos de Equipo' },
        { url: '/aprovisionamiento', titulo: 'Aprovisionamiento' },
        { url: '/aprovisionamiento/ordenes-compra', titulo: 'Órdenes de Compra' },
        { url: '/aprovisionamiento/recepciones', titulo: 'Recepciones' },
        { url: '/aprovisionamiento/pagos', titulo: 'Pagos' },
        { url: '/catalogo/equipos', titulo: 'Catálogo de Equipos' },
        { url: '/catalogo/proveedores', titulo: 'Proveedores' },
        { url: '/admin/usuarios', titulo: 'Usuarios' },
        { url: '/admin/configuracion', titulo: 'Configuración' }
      ]
      
      for (const seccion of secciones) {
        await test.step(`Acceso a ${seccion.titulo}`, async () => {
          await navigateAndWait(page, seccion.url)
          await expect(page.locator('h1')).toContainText(seccion.titulo)
          await expect(page.locator('[data-testid="error-unauthorized"]')).not.toBeVisible()
        })
      }
    })
    
    test('Debe poder realizar todas las acciones CRUD', async ({ page }) => {
      await loginAs(page, 'admin')
      
      // ✅ Verificar botones de acción disponibles
      const accionesCRUD = [
        { url: '/proyectos', botones: ['btn-nuevo-proyecto', 'btn-editar', 'btn-eliminar'] },
        { url: '/aprovisionamiento/ordenes-compra', botones: ['btn-nueva-orden', 'btn-aprobar', 'btn-rechazar'] },
        { url: '/catalogo/proveedores', botones: ['btn-nuevo-proveedor', 'btn-editar', 'btn-eliminar'] },
        { url: '/admin/usuarios', botones: ['btn-nuevo-usuario', 'btn-editar', 'btn-desactivar'] }
      ]
      
      for (const accion of accionesCRUD) {
        await test.step(`CRUD en ${accion.url}`, async () => {
          await navigateAndWait(page, accion.url)
          
          for (const boton of accion.botones) {
            await expect(page.locator(`[data-testid="${boton}"]`).first()).toBeVisible()
          }
        })
      }
    })
  })
  
  // 👔 GERENTE - Acceso de supervisión y aprobación
  test.describe('Rol GERENTE', () => {
    test('Debe tener acceso a supervisión y aprobaciones', async ({ page }) => {
      await loginAs(page, 'gerente')
      
      // ✅ Secciones permitidas
      const seccionesPermitidas = [
        { url: '/dashboard', titulo: 'Dashboard' },
        { url: '/proyectos', titulo: 'Proyectos' },
        { url: '/proyectos/pedidos-equipo', titulo: 'Pedidos de Equipo' },
        { url: '/aprovisionamiento', titulo: 'Aprovisionamiento' },
        { url: '/aprovisionamiento/ordenes-compra', titulo: 'Órdenes de Compra' },
        { url: '/aprovisionamiento/recepciones', titulo: 'Recepciones' },
        { url: '/aprovisionamiento/pagos', titulo: 'Pagos' },
        { url: '/catalogo/equipos', titulo: 'Catálogo de Equipos' },
        { url: '/catalogo/proveedores', titulo: 'Proveedores' }
      ]
      
      for (const seccion of seccionesPermitidas) {
        await test.step(`Acceso permitido: ${seccion.titulo}`, async () => {
          await navigateAndWait(page, seccion.url)
          await expect(page.locator('h1')).toContainText(seccion.titulo)
          await expect(page.locator('[data-testid="error-unauthorized"]')).not.toBeVisible()
        })
      }
    })
    
    test('NO debe tener acceso a administración del sistema', async ({ page }) => {
      await loginAs(page, 'gerente')
      
      // ❌ Secciones restringidas
      const seccionesRestringidas = [
        '/admin/usuarios',
        '/admin/configuracion',
        '/admin/logs',
        '/admin/backups'
      ]
      
      for (const url of seccionesRestringidas) {
        await test.step(`Acceso denegado: ${url}`, async () => {
          await page.goto(url)
          await expect(page.locator('[data-testid="error-unauthorized"]')).toBeVisible()
        })
      }
    })
    
    test('Debe poder aprobar órdenes de compra', async ({ page }) => {
      await loginAs(page, 'gerente')
      await navigateAndWait(page, '/aprovisionamiento/ordenes-compra')
      
      // ✅ Verificar botones de aprobación
      await expect(page.locator('[data-testid="btn-aprobar"]').first()).toBeVisible()
      await expect(page.locator('[data-testid="btn-rechazar"]').first()).toBeVisible()
    })
  })
  
  // 💼 COMERCIAL - Gestión de proyectos y pedidos
  test.describe('Rol COMERCIAL', () => {
    test('Debe tener acceso a proyectos y pedidos', async ({ page }) => {
      await loginAs(page, 'comercial')
      
      // ✅ Secciones permitidas
      const seccionesPermitidas = [
        { url: '/dashboard', titulo: 'Dashboard' },
        { url: '/proyectos', titulo: 'Proyectos' },
        { url: '/proyectos/pedidos-equipo', titulo: 'Pedidos de Equipo' },
        { url: '/catalogo/equipos', titulo: 'Catálogo de Equipos' },
        { url: '/catalogo/proveedores', titulo: 'Proveedores' }
      ]
      
      for (const seccion of seccionesPermitidas) {
        await test.step(`Acceso permitido: ${seccion.titulo}`, async () => {
          await navigateAndWait(page, seccion.url)
          await expect(page.locator('h1')).toContainText(seccion.titulo)
          await expect(page.locator('[data-testid="error-unauthorized"]')).not.toBeVisible()
        })
      }
    })
    
    test('NO debe tener acceso a aprovisionamiento operativo', async ({ page }) => {
      await loginAs(page, 'comercial')
      
      // ❌ Secciones restringidas
      const seccionesRestringidas = [
        '/aprovisionamiento/recepciones',
        '/aprovisionamiento/pagos'
      ]
      
      for (const url of seccionesRestringidas) {
        await test.step(`Acceso denegado: ${url}`, async () => {
          await page.goto(url)
          await expect(page.locator('[data-testid="error-unauthorized"]')).toBeVisible()
        })
      }
    })
    
    test('Debe poder crear pedidos y órdenes de compra', async ({ page }) => {
      await loginAs(page, 'comercial')
      
      // ✅ Crear pedidos
      await navigateAndWait(page, '/proyectos/pedidos-equipo')
      await expect(page.locator('[data-testid="btn-nuevo-pedido"]')).toBeVisible()
      
      // ✅ Crear órdenes (solo lectura de aprobadas)
      await navigateAndWait(page, '/aprovisionamiento/ordenes-compra')
      await expect(page.locator('[data-testid="btn-nueva-orden"]')).toBeVisible()
      
      // ❌ No debe poder aprobar
      await expect(page.locator('[data-testid="btn-aprobar"]')).not.toBeVisible()
    })
  })
  
  // 🚛 LOGISTICO - Gestión de recepciones y entregas
  test.describe('Rol LOGISTICO', () => {
    test('Debe tener acceso a recepciones y logística', async ({ page }) => {
      await loginAs(page, 'logistico')
      
      // ✅ Secciones permitidas
      const seccionesPermitidas = [
        { url: '/dashboard', titulo: 'Dashboard' },
        { url: '/aprovisionamiento/recepciones', titulo: 'Recepciones' },
        { url: '/catalogo/equipos', titulo: 'Catálogo de Equipos' }
      ]
      
      for (const seccion of seccionesPermitidas) {
        await test.step(`Acceso permitido: ${seccion.titulo}`, async () => {
          await navigateAndWait(page, seccion.url)
          await expect(page.locator('h1')).toContainText(seccion.titulo)
          await expect(page.locator('[data-testid="error-unauthorized"]')).not.toBeVisible()
        })
      }
    })
    
    test('Debe tener acceso de solo lectura a órdenes de compra', async ({ page }) => {
      await loginAs(page, 'logistico')
      await navigateAndWait(page, '/aprovisionamiento/ordenes-compra')
      
      // ✅ Puede ver órdenes
      await expect(page.locator('h1')).toContainText('Órdenes de Compra')
      
      // ❌ No puede crear o modificar
      await expect(page.locator('[data-testid="btn-nueva-orden"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="btn-aprobar"]')).not.toBeVisible()
    })
    
    test('NO debe tener acceso a finanzas ni administración', async ({ page }) => {
      await loginAs(page, 'logistico')
      
      // ❌ Secciones restringidas
      const seccionesRestringidas = [
        '/aprovisionamiento/pagos',
        '/proyectos',
        '/admin/usuarios',
        '/admin/configuracion'
      ]
      
      for (const url of seccionesRestringidas) {
        await test.step(`Acceso denegado: ${url}`, async () => {
          await page.goto(url)
          await expect(page.locator('[data-testid="error-unauthorized"]')).toBeVisible()
        })
      }
    })
    
    test('Debe poder gestionar recepciones completamente', async ({ page }) => {
      await loginAs(page, 'logistico')
      await navigateAndWait(page, '/aprovisionamiento/recepciones')
      
      // ✅ Verificar acciones de recepción
      await expect(page.locator('[data-testid="btn-nueva-recepcion"]')).toBeVisible()
      await expect(page.locator('[data-testid="btn-completar"]').first()).toBeVisible()
      await expect(page.locator('[data-testid="btn-cancelar"]').first()).toBeVisible()
    })
  })
  
  // 💰 GESTOR - Gestión de pagos y finanzas
  test.describe('Rol GESTOR', () => {
    test('Debe tener acceso a pagos y finanzas', async ({ page }) => {
      await loginAs(page, 'gestor')
      
      // ✅ Secciones permitidas
      const seccionesPermitidas = [
        { url: '/dashboard', titulo: 'Dashboard' },
        { url: '/aprovisionamiento/pagos', titulo: 'Pagos' }
      ]
      
      for (const seccion of seccionesPermitidas) {
        await test.step(`Acceso permitido: ${seccion.titulo}`, async () => {
          await navigateAndWait(page, seccion.url)
          await expect(page.locator('h1')).toContainText(seccion.titulo)
          await expect(page.locator('[data-testid="error-unauthorized"]')).not.toBeVisible()
        })
      }
    })
    
    test('Debe tener acceso de solo lectura a órdenes y recepciones', async ({ page }) => {
      await loginAs(page, 'gestor')
      
      // ✅ Solo lectura a órdenes
      await navigateAndWait(page, '/aprovisionamiento/ordenes-compra')
      await expect(page.locator('h1')).toContainText('Órdenes de Compra')
      await expect(page.locator('[data-testid="btn-nueva-orden"]')).not.toBeVisible()
      
      // ✅ Solo lectura a recepciones
      await navigateAndWait(page, '/aprovisionamiento/recepciones')
      await expect(page.locator('h1')).toContainText('Recepciones')
      await expect(page.locator('[data-testid="btn-nueva-recepcion"]')).not.toBeVisible()
    })
    
    test('NO debe tener acceso a proyectos ni administración', async ({ page }) => {
      await loginAs(page, 'gestor')
      
      // ❌ Secciones restringidas
      const seccionesRestringidas = [
        '/proyectos',
        '/proyectos/pedidos-equipo',
        '/admin/usuarios',
        '/admin/configuracion'
      ]
      
      for (const url of seccionesRestringidas) {
        await test.step(`Acceso denegado: ${url}`, async () => {
          await page.goto(url)
          await expect(page.locator('[data-testid="error-unauthorized"]')).toBeVisible()
        })
      }
    })
    
    test('Debe poder gestionar pagos completamente', async ({ page }) => {
      await loginAs(page, 'gestor')
      await navigateAndWait(page, '/aprovisionamiento/pagos')
      
      // ✅ Verificar acciones de pago
      await expect(page.locator('[data-testid="btn-nuevo-pago"]')).toBeVisible()
      await expect(page.locator('[data-testid="btn-procesar"]').first()).toBeVisible()
      await expect(page.locator('[data-testid="btn-cancelar"]').first()).toBeVisible()
    })
  })
  
  // 🔄 Tests de transición entre roles
  test.describe('Transiciones entre Roles', () => {
    test('Cambio de sesión debe actualizar permisos correctamente', async ({ page }) => {
      // 🔐 Iniciar como comercial
      await loginAs(page, 'comercial')
      await navigateAndWait(page, '/aprovisionamiento/pagos')
      await expect(page.locator('[data-testid="error-unauthorized"]')).toBeVisible()
      
      // 🔄 Cambiar a gestor
      await loginAs(page, 'gestor')
      await navigateAndWait(page, '/aprovisionamiento/pagos')
      await expect(page.locator('h1')).toContainText('Pagos')
      await expect(page.locator('[data-testid="error-unauthorized"]')).not.toBeVisible()
      
      // 🔄 Cambiar a logístico
      await loginAs(page, 'logistico')
      await navigateAndWait(page, '/aprovisionamiento/pagos')
      await expect(page.locator('[data-testid="error-unauthorized"]')).toBeVisible()
    })
  })
  
  // 🛡️ Tests de seguridad adicionales
  test.describe('Seguridad de Endpoints', () => {
    test('APIs deben respetar autorización por roles', async ({ page }) => {
      await loginAs(page, 'comercial')
      
      // 🔍 Interceptar llamadas API
      const apiCalls: string[] = []
      
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          apiCalls.push(`${response.request().method()} ${response.url()} - ${response.status()}`)
        }
      })
      
      // 🚫 Intentar acceder a endpoint restringido
      await page.goto('/aprovisionamiento/pagos')
      
      // ✅ Verificar que las APIs devuelven 403/401 para recursos no autorizados
      const unauthorizedCalls = apiCalls.filter(call => 
        call.includes('pagos') && (call.includes('403') || call.includes('401'))
      )
      
      expect(unauthorizedCalls.length).toBeGreaterThan(0)
    })
    
    test('Navegación directa a URLs debe ser bloqueada', async ({ page }) => {
      await loginAs(page, 'logistico')
      
      // 🚫 URLs que logístico no debe poder acceder
      const urlsRestringidas = [
        '/admin/usuarios',
        '/proyectos/nuevo',
        '/aprovisionamiento/pagos/nuevo'
      ]
      
      for (const url of urlsRestringidas) {
        await test.step(`Bloquear acceso directo: ${url}`, async () => {
          await page.goto(url)
          
          // ✅ Debe mostrar error o redirigir
          const hasError = await page.locator('[data-testid="error-unauthorized"]').isVisible()
          const isRedirected = !page.url().includes(url)
          
          expect(hasError || isRedirected).toBeTruthy()
        })
      }
    })
  })
})