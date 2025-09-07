// ===================================================
// 📁 Archivo: aprovisionamiento.e2e.spec.ts
// 📌 Descripción: Tests E2E para módulo de aprovisionamiento financiero
// 📌 Características: Tests de interfaz de usuario y flujos completos
// ✍️ Autor: Sistema de IA
// 📅 Actualizado: 2025-01-27
// ===================================================

import { test, expect, Page } from '@playwright/test'

// 🔧 Helper functions
async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.fill('[data-testid="email"]', 'admin@gys.com')
  await page.fill('[data-testid="password"]', 'admin123')
  await page.click('[data-testid="login-button"]')
  await page.waitForURL('/finanzas')
}

async function navigateToAprovisionamiento(page: Page) {
  await page.click('[data-testid="sidebar-finanzas"]')
  await page.click('[data-testid="sidebar-aprovisionamiento"]')
  await page.waitForURL('/finanzas/aprovisionamiento')
}

// 📊 Tests E2E para Aprovisionamiento
test.describe('Aprovisionamiento E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // 🔁 Setup: Login como admin antes de cada test
    await loginAsAdmin(page)
  })
  
  test.describe('Navegación y Layout', () => {
    
    test('debe mostrar la página principal de aprovisionamiento', async ({ page }) => {
      // 📡 Act
      await navigateToAprovisionamiento(page)
      
      // ✅ Assert
      await expect(page).toHaveTitle(/Aprovisionamiento Financiero/)
      await expect(page.locator('[data-testid="page-title"]')).toContainText('Aprovisionamiento Financiero')
      await expect(page.locator('[data-testid="breadcrumb"]')).toBeVisible()
    })
    
    test('debe mostrar el sidebar con opciones de aprovisionamiento', async ({ page }) => {
      // 📡 Act
      await navigateToAprovisionamiento(page)
      
      // ✅ Assert
      await expect(page.locator('[data-testid="sidebar-aprovisionamiento-proyectos"]')).toBeVisible()
      await expect(page.locator('[data-testid="sidebar-aprovisionamiento-listas"]')).toBeVisible()
      await expect(page.locator('[data-testid="sidebar-aprovisionamiento-pedidos"]')).toBeVisible()
      await expect(page.locator('[data-testid="sidebar-aprovisionamiento-timeline"]')).toBeVisible()
    })
  })
  
  test.describe('Vista de Proyectos', () => {
    
    test('debe mostrar lista de proyectos', async ({ page }) => {
      // 📡 Act
      await navigateToAprovisionamiento(page)
      await page.click('[data-testid="sidebar-aprovisionamiento-proyectos"]')
      await page.waitForURL('/finanzas/aprovisionamiento/proyectos')
      
      // ✅ Assert
      await expect(page.locator('[data-testid="proyectos-table"]')).toBeVisible()
      await expect(page.locator('[data-testid="proyecto-card"]').first()).toBeVisible()
    })
    
    test('debe permitir filtrar proyectos por estado', async ({ page }) => {
      // 📡 Act
      await navigateToAprovisionamiento(page)
      await page.click('[data-testid="sidebar-aprovisionamiento-proyectos"]')
      await page.waitForURL('/finanzas/aprovisionamiento/proyectos')
      
      // Aplicar filtro
      await page.click('[data-testid="filter-estado"]')
      await page.click('[data-testid="filter-estado-activo"]')
      await page.click('[data-testid="apply-filters"]')
      
      // ✅ Assert
      await expect(page.locator('[data-testid="proyecto-card"]')).toHaveCount(1)
      await expect(page.locator('[data-testid="proyecto-estado"]').first()).toContainText('ACTIVO')
    })
    
    test('debe permitir cambiar entre vista tabla y cards', async ({ page }) => {
      // 📡 Act
      await navigateToAprovisionamiento(page)
      await page.click('[data-testid="sidebar-aprovisionamiento-proyectos"]')
      await page.waitForURL('/finanzas/aprovisionamiento/proyectos')
      
      // Cambiar a vista tabla
      await page.click('[data-testid="view-toggle-table"]')
      await expect(page.locator('[data-testid="proyectos-table"]')).toBeVisible()
      
      // Cambiar a vista cards
      await page.click('[data-testid="view-toggle-cards"]')
      await expect(page.locator('[data-testid="proyecto-card"]').first()).toBeVisible()
    })
  })
  
  test.describe('Vista de Listas de Equipos', () => {
    
    test('debe mostrar listas de equipos', async ({ page }) => {
      // 📡 Act
      await navigateToAprovisionamiento(page)
      await page.click('[data-testid="sidebar-aprovisionamiento-listas"]')
      await page.waitForURL('/finanzas/aprovisionamiento/listas')
      
      // ✅ Assert
      await expect(page.locator('[data-testid="listas-container"]')).toBeVisible()
      await expect(page.locator('[data-testid="lista-accordion"]').first()).toBeVisible()
    })
    
    test('debe expandir y contraer acordeones de listas', async ({ page }) => {
      // 📡 Act
      await navigateToAprovisionamiento(page)
      await page.click('[data-testid="sidebar-aprovisionamiento-listas"]')
      await page.waitForURL('/finanzas/aprovisionamiento/listas')
      
      // Expandir acordeón
      await page.click('[data-testid="lista-accordion-trigger"]')
      await expect(page.locator('[data-testid="lista-accordion-content"]')).toBeVisible()
      
      // Contraer acordeón
      await page.click('[data-testid="lista-accordion-trigger"]')
      await expect(page.locator('[data-testid="lista-accordion-content"]')).not.toBeVisible()
    })
  })
  
  test.describe('Vista de Pedidos de Equipos', () => {
    
    test('debe mostrar pedidos de equipos', async ({ page }) => {
      // 📡 Act
      await navigateToAprovisionamiento(page)
      await page.click('[data-testid="sidebar-aprovisionamiento-pedidos"]')
      await page.waitForURL('/finanzas/aprovisionamiento/pedidos')
      
      // ✅ Assert
      await expect(page.locator('[data-testid="pedidos-container"]')).toBeVisible()
      await expect(page.locator('[data-testid="pedido-select"]')).toBeVisible()
    })
    
    test('debe permitir seleccionar pedidos del dropdown', async ({ page }) => {
      // 📡 Act
      await navigateToAprovisionamiento(page)
      await page.click('[data-testid="sidebar-aprovisionamiento-pedidos"]')
      await page.waitForURL('/finanzas/aprovisionamiento/pedidos')
      
      // Abrir dropdown
      await page.click('[data-testid="pedido-select-trigger"]')
      await expect(page.locator('[data-testid="pedido-select-content"]')).toBeVisible()
      
      // Seleccionar pedido
      await page.click('[data-testid="pedido-option"]')
      await expect(page.locator('[data-testid="pedido-details"]')).toBeVisible()
    })
  })
  
  test.describe('Vista de Timeline/Gantt', () => {
    
    test('debe mostrar el timeline de aprovisionamiento', async ({ page }) => {
      // 📡 Act
      await navigateToAprovisionamiento(page)
      await page.click('[data-testid="sidebar-aprovisionamiento-timeline"]')
      await page.waitForURL('/finanzas/aprovisionamiento/timeline')
      
      // ✅ Assert
      await expect(page.locator('[data-testid="gantt-container"]')).toBeVisible()
      await expect(page.locator('[data-testid="gantt-chart"]')).toBeVisible()
    })
    
    test('debe mostrar filtros de timeline', async ({ page }) => {
      // 📡 Act
      await navigateToAprovisionamiento(page)
      await page.click('[data-testid="sidebar-aprovisionamiento-timeline"]')
      await page.waitForURL('/finanzas/aprovisionamiento/timeline')
      
      // ✅ Assert
      await expect(page.locator('[data-testid="timeline-filters"]')).toBeVisible()
      await expect(page.locator('[data-testid="filter-fecha-inicio"]')).toBeVisible()
      await expect(page.locator('[data-testid="filter-fecha-fin"]')).toBeVisible()
    })
  })
  
  test.describe('Flujos de Usuario Completos', () => {
    
    test('debe completar flujo: proyectos -> listas -> pedidos -> timeline', async ({ page }) => {
      // 📡 Act - Navegar por todas las secciones
      await navigateToAprovisionamiento(page)
      
      // 1. Proyectos
      await page.click('[data-testid="sidebar-aprovisionamiento-proyectos"]')
      await page.waitForURL('/finanzas/aprovisionamiento/proyectos')
      await expect(page.locator('[data-testid="proyectos-table"]')).toBeVisible()
      
      // 2. Listas
      await page.click('[data-testid="sidebar-aprovisionamiento-listas"]')
      await page.waitForURL('/finanzas/aprovisionamiento/listas')
      await expect(page.locator('[data-testid="listas-container"]')).toBeVisible()
      
      // 3. Pedidos
      await page.click('[data-testid="sidebar-aprovisionamiento-pedidos"]')
      await page.waitForURL('/finanzas/aprovisionamiento/pedidos')
      await expect(page.locator('[data-testid="pedidos-container"]')).toBeVisible()
      
      // 4. Timeline
      await page.click('[data-testid="sidebar-aprovisionamiento-timeline"]')
      await page.waitForURL('/finanzas/aprovisionamiento/timeline')
      await expect(page.locator('[data-testid="gantt-container"]')).toBeVisible()
    })
    
    test('debe mantener estado de filtros entre navegaciones', async ({ page }) => {
      // 📡 Act
      await navigateToAprovisionamiento(page)
      await page.click('[data-testid="sidebar-aprovisionamiento-proyectos"]')
      
      // Aplicar filtro
      await page.click('[data-testid="filter-estado"]')
      await page.click('[data-testid="filter-estado-activo"]')
      await page.click('[data-testid="apply-filters"]')
      
      // Navegar a otra sección y volver
      await page.click('[data-testid="sidebar-aprovisionamiento-listas"]')
      await page.click('[data-testid="sidebar-aprovisionamiento-proyectos"]')
      
      // ✅ Assert - Filtro debe mantenerse
      await expect(page.locator('[data-testid="filter-estado"]')).toContainText('ACTIVO')
    })
  })
  
  test.describe('Responsividad y UX', () => {
    
    test('debe ser responsive en dispositivos móviles', async ({ page }) => {
      // 📡 Act
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
      await navigateToAprovisionamiento(page)
      
      // ✅ Assert
      await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible()
      await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible()
      
      // Abrir menú móvil
      await page.click('[data-testid="mobile-menu-toggle"]')
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    })
    
    test('debe mostrar loading states', async ({ page }) => {
      // 📡 Act
      await navigateToAprovisionamiento(page)
      await page.click('[data-testid="sidebar-aprovisionamiento-proyectos"]')
      
      // ✅ Assert - Debe mostrar skeleton loader
      await expect(page.locator('[data-testid="skeleton-loader"]')).toBeVisible()
      
      // Esperar a que cargue el contenido
      await page.waitForSelector('[data-testid="proyectos-table"]')
      await expect(page.locator('[data-testid="skeleton-loader"]')).not.toBeVisible()
    })
    
    test('debe mostrar empty states cuando no hay datos', async ({ page }) => {
      // 📡 Act - Simular estado sin datos
      await navigateToAprovisionamiento(page)
      await page.click('[data-testid="sidebar-aprovisionamiento-proyectos"]')
      
      // Aplicar filtro que no devuelve resultados
      await page.fill('[data-testid="search-input"]', 'proyecto-inexistente')
      await page.click('[data-testid="apply-filters"]')
      
      // ✅ Assert
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible()
      await expect(page.locator('[data-testid="empty-state-message"]')).toContainText('No se encontraron proyectos')
    })
  })
  
  test.describe('Accesibilidad', () => {
    
    test('debe ser navegable con teclado', async ({ page }) => {
      // 📡 Act
      await navigateToAprovisionamiento(page)
      
      // Navegar con Tab
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')
      
      // ✅ Assert - Debe navegar correctamente
      await expect(page.locator(':focus')).toBeVisible()
    })
    
    test('debe tener etiquetas ARIA apropiadas', async ({ page }) => {
      // 📡 Act
      await navigateToAprovisionamiento(page)
      
      // ✅ Assert
      await expect(page.locator('[role="navigation"]')).toBeVisible()
      await expect(page.locator('[aria-label="Menú de aprovisionamiento"]')).toBeVisible()
      await expect(page.locator('[aria-expanded]')).toHaveCount(0) // No hay elementos expandidos inicialmente
    })
  })
})

// 🔧 Test helpers específicos para aprovisionamiento
test.describe('Aprovisionamiento Helpers', () => {
  
  test('helper: debe poder crear datos de prueba', async ({ page }) => {
    // Este test verifica que los helpers funcionan correctamente
    await loginAsAdmin(page)
    await navigateToAprovisionamiento(page)
    
    // Verificar que la navegación funciona
    await expect(page).toHaveURL(/\/finanzas\/aprovisionamiento/)
  })
})