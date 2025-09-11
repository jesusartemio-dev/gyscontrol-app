/**
 * 🧪 Tests E2E - Flujo de Gestión de Entregas
 * 
 * @description Tests end-to-end para el flujo completo de gestión de entregas
 * @author TRAE - Agente Senior Fullstack
 * @date 2025-01-27
 * @version 1.0.0
 */

import { test, expect, Page } from '@playwright/test';
import { EstadoEntregaItem } from '@/types/modelos';

// 🔧 Configuración de tests
test.describe('Flujo de Gestión de Entregas E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // 📡 Configurar viewport para desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // 🔐 Login como usuario ADMIN
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@gys.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    
    // ✅ Verificar login exitoso
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test.afterEach(async () => {
    await page.close();
  });

  // ✅ Test flujo completo de creación de entrega
  test('debe crear una nueva entrega completa', async () => {
    // 🔁 Navegar a entregas
    await page.click('[data-testid="sidebar-entregas"]');
    await expect(page).toHaveURL('/entregas');
    await expect(page.locator('h1')).toContainText('Gestión de Entregas');

    // 🔁 Hacer clic en crear nueva entrega
    await page.click('[data-testid="crear-entrega-button"]');
    await expect(page.locator('[data-testid="entrega-form"]')).toBeVisible();

    // 🔁 Llenar formulario de entrega
    await page.fill('[data-testid="entrega-titulo"]', 'Entrega Test E2E');
    await page.fill('[data-testid="entrega-descripcion"]', 'Descripción de prueba para entrega E2E');
    
    // Seleccionar proyecto
    await page.click('[data-testid="proyecto-select"]');
    await page.click('[data-testid="proyecto-option-1"]');
    
    // Seleccionar cliente
    await page.click('[data-testid="cliente-select"]');
    await page.click('[data-testid="cliente-option-1"]');
    
    // Configurar fechas
    await page.fill('[data-testid="fecha-inicio"]', '2025-02-01');
    await page.fill('[data-testid="fecha-entrega"]', '2025-02-15');
    
    // Agregar items
    await page.click('[data-testid="agregar-item-button"]');
    await page.fill('[data-testid="item-nombre-0"]', 'Item Test 1');
    await page.fill('[data-testid="item-cantidad-0"]', '5');
    await page.fill('[data-testid="item-descripcion-0"]', 'Descripción del item de prueba');
    
    // Agregar segundo item
    await page.click('[data-testid="agregar-item-button"]');
    await page.fill('[data-testid="item-nombre-1"]', 'Item Test 2');
    await page.fill('[data-testid="item-cantidad-1"]', '3');
    
    // 🔁 Guardar entrega
    await page.click('[data-testid="guardar-entrega-button"]');
    
    // ✅ Verificar creación exitosa
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Entrega creada correctamente');
    await expect(page).toHaveURL(/\/entregas\/[a-zA-Z0-9-]+/);
    
    // ✅ Verificar datos en vista detalle
    await expect(page.locator('[data-testid="entrega-titulo"]')).toContainText('Entrega Test E2E');
    await expect(page.locator('[data-testid="entrega-estado"]')).toContainText('Pendiente');
    await expect(page.locator('[data-testid="items-count"]')).toContainText('2 items');
  });

  // ✅ Test flujo de actualización de estado
  test('debe actualizar estado de entrega paso a paso', async () => {
    // 🔁 Navegar a entrega existente
    await page.goto('/entregas/entrega-test-1');
    await expect(page.locator('[data-testid="entrega-titulo"]')).toBeVisible();

    // 🔁 Cambiar estado a "En Proceso"
    await page.click('[data-testid="cambiar-estado-button"]');
    await page.click('[data-testid="estado-en-proceso"]');
    await page.fill('[data-testid="comentario-cambio"]', 'Iniciando proceso de entrega');
    await page.click('[data-testid="confirmar-cambio-button"]');
    
    // ✅ Verificar cambio de estado
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Estado actualizado');
    await expect(page.locator('[data-testid="entrega-estado"]')).toContainText('En Proceso');
    
    // ✅ Verificar timeline de trazabilidad
    await expect(page.locator('[data-testid="timeline-evento-0"]')).toContainText('Estado cambiado a En Proceso');
    await expect(page.locator('[data-testid="timeline-comentario-0"]')).toContainText('Iniciando proceso de entrega');

    // 🔁 Actualizar progreso de items
    await page.click('[data-testid="item-0-checkbox"]');
    await page.fill('[data-testid="item-0-comentario"]', 'Item completado correctamente');
    await page.click('[data-testid="actualizar-item-button"]');
    
    // ✅ Verificar actualización de item
    await expect(page.locator('[data-testid="item-0-estado"]')).toContainText('Completado');
    await expect(page.locator('[data-testid="progreso-entrega"]')).toContainText('50%');

    // 🔁 Completar todos los items
    await page.click('[data-testid="item-1-checkbox"]');
    await page.click('[data-testid="actualizar-item-button"]');
    
    // 🔁 Cambiar estado a "Entregado"
    await page.click('[data-testid="cambiar-estado-button"]');
    await page.click('[data-testid="estado-entregado"]');
    await page.fill('[data-testid="comentario-cambio"]', 'Entrega completada exitosamente');
    await page.click('[data-testid="confirmar-cambio-button"]');
    
    // ✅ Verificar entrega completada
    await expect(page.locator('[data-testid="entrega-estado"]')).toContainText('Entregado');
    await expect(page.locator('[data-testid="progreso-entrega"]')).toContainText('100%');
    await expect(page.locator('[data-testid="fecha-completado"]')).toBeVisible();
  });

  // ✅ Test flujo de búsqueda y filtrado
  test('debe filtrar y buscar entregas correctamente', async () => {
    // 🔁 Navegar a lista de entregas
    await page.goto('/entregas');
    await expect(page.locator('[data-testid="entregas-table"]')).toBeVisible();

    // 🔁 Buscar por texto
    await page.fill('[data-testid="search-input"]', 'Entrega Test');
    await page.waitForTimeout(500); // Debounce
    
    // ✅ Verificar resultados de búsqueda
    await expect(page.locator('[data-testid="table-row"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="table-row-0"]')).toContainText('Entrega Test');

    // 🔁 Limpiar búsqueda
    await page.fill('[data-testid="search-input"]', '');
    await page.waitForTimeout(500);
    
    // 🔁 Filtrar por estado
    await page.click('[data-testid="filter-estado"]');
    await page.click('[data-testid="estado-pendiente"]');
    
    // ✅ Verificar filtro por estado
    const rows = page.locator('[data-testid="table-row"]');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).locator('[data-testid="estado-badge"]')).toContainText('Pendiente');
    }

    // 🔁 Filtrar por proyecto
    await page.click('[data-testid="filter-proyecto"]');
    await page.click('[data-testid="proyecto-alpha"]');
    
    // ✅ Verificar filtro combinado
    await expect(page.locator('[data-testid="results-count"]')).toContainText('entregas encontradas');
    
    // 🔁 Limpiar filtros
    await page.click('[data-testid="clear-filters-button"]');
    
    // ✅ Verificar que se muestran todas las entregas
    await expect(page.locator('[data-testid="table-row"]')).toHaveCount(10); // Asumiendo 10 por página
  });

  // ✅ Test flujo de exportación
  test('debe exportar entregas a PDF correctamente', async () => {
    // 🔁 Navegar a entregas
    await page.goto('/entregas');
    
    // 🔁 Seleccionar entregas para exportar
    await page.click('[data-testid="select-all-checkbox"]');
    
    // 🔁 Abrir menú de exportación
    await page.click('[data-testid="export-button"]');
    await page.click('[data-testid="export-pdf-option"]');
    
    // ✅ Verificar inicio de exportación
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="toast-info"]')).toContainText('Generando reporte PDF');
    
    // ✅ Esperar completación de exportación
    await expect(page.locator('[data-testid="download-link"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Reporte generado correctamente');
    
    // 🔁 Verificar descarga
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-link"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/entregas-.*\.pdf/);
  });

  // ✅ Test flujo de trazabilidad
  test('debe mostrar trazabilidad completa de entrega', async () => {
    // 🔁 Navegar a entrega con historial
    await page.goto('/entregas/entrega-con-historial');
    
    // 🔁 Abrir panel de trazabilidad
    await page.click('[data-testid="trazabilidad-tab"]');
    await expect(page.locator('[data-testid="timeline-container"]')).toBeVisible();
    
    // ✅ Verificar eventos de trazabilidad
    await expect(page.locator('[data-testid="timeline-evento"]')).toHaveCount(5);
    
    // Verificar orden cronológico
    const eventos = page.locator('[data-testid="timeline-evento"]');
    await expect(eventos.nth(0)).toContainText('Entrega creada');
    await expect(eventos.nth(1)).toContainText('Estado cambiado a En Proceso');
    await expect(eventos.nth(2)).toContainText('Item completado');
    await expect(eventos.nth(3)).toContainText('Todos los items completados');
    await expect(eventos.nth(4)).toContainText('Estado cambiado a Entregado');
    
    // ✅ Verificar detalles de eventos
    await page.click('[data-testid="evento-1-details"]');
    await expect(page.locator('[data-testid="evento-1-usuario"]')).toContainText('Juan Pérez');
    await expect(page.locator('[data-testid="evento-1-fecha"]')).toBeVisible();
    await expect(page.locator('[data-testid="evento-1-comentario"]')).toBeVisible();
    
    // 🔁 Filtrar eventos por tipo
    await page.click('[data-testid="filter-eventos"]');
    await page.click('[data-testid="solo-cambios-estado"]');
    
    // ✅ Verificar filtro de eventos
    await expect(page.locator('[data-testid="timeline-evento"]')).toHaveCount(3);
    
    // 🔁 Exportar timeline
    await page.click('[data-testid="export-timeline-button"]');
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Timeline exportado');
  });

  // ✅ Test flujo de notificaciones
  test('debe mostrar notificaciones de entregas', async () => {
    // 🔁 Navegar a dashboard
    await page.goto('/dashboard');
    
    // ✅ Verificar notificaciones en header
    await expect(page.locator('[data-testid="notifications-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="notifications-count"]')).toContainText('3');
    
    // 🔁 Abrir panel de notificaciones
    await page.click('[data-testid="notifications-button"]');
    await expect(page.locator('[data-testid="notifications-panel"]')).toBeVisible();
    
    // ✅ Verificar tipos de notificaciones
    await expect(page.locator('[data-testid="notification-entrega-retrasada"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-entrega-completada"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-nueva-entrega"]')).toBeVisible();
    
    // 🔁 Marcar notificación como leída
    await page.click('[data-testid="notification-0-read"]');
    await expect(page.locator('[data-testid="notifications-count"]')).toContainText('2');
    
    // 🔁 Navegar desde notificación
    await page.click('[data-testid="notification-1-link"]');
    await expect(page).toHaveURL(/\/entregas\/[a-zA-Z0-9-]+/);
  });

  // ✅ Test flujo responsive móvil
  test('debe funcionar correctamente en dispositivos móviles', async () => {
    // 📱 Configurar viewport móvil
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 🔁 Navegar a entregas
    await page.goto('/entregas');
    
    // ✅ Verificar menú hamburguesa
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-sidebar"]')).toBeVisible();
    
    // ✅ Verificar vista de tarjetas en móvil
    await expect(page.locator('[data-testid="entregas-cards"]')).toBeVisible();
    await expect(page.locator('[data-testid="entregas-table"]')).not.toBeVisible();
    
    // 🔁 Abrir filtros móviles
    await page.click('[data-testid="mobile-filters-button"]');
    await expect(page.locator('[data-testid="mobile-filters-panel"]')).toBeVisible();
    
    // 🔁 Aplicar filtro en móvil
    await page.click('[data-testid="mobile-filter-estado"]');
    await page.click('[data-testid="estado-pendiente"]');
    await page.click('[data-testid="apply-filters-button"]');
    
    // ✅ Verificar filtro aplicado
    await expect(page.locator('[data-testid="active-filters"]')).toContainText('Estado: Pendiente');
    
    // 🔁 Crear entrega en móvil
    await page.click('[data-testid="mobile-fab-button"]');
    await expect(page.locator('[data-testid="mobile-entrega-form"]')).toBeVisible();
    
    // ✅ Verificar formulario adaptado para móvil
    await expect(page.locator('[data-testid="form-steps"]')).toBeVisible();
    await expect(page.locator('[data-testid="step-1-active"]')).toBeVisible();
  });

  // ✅ Test performance y carga
  test('debe cargar entregas con buen rendimiento', async () => {
    const startTime = Date.now();
    
    // 🔁 Navegar a entregas
    await page.goto('/entregas');
    
    // ✅ Verificar carga inicial rápida
    await expect(page.locator('[data-testid="entregas-skeleton"]')).toBeVisible();
    await expect(page.locator('[data-testid="entregas-table"]')).toBeVisible({ timeout: 3000 });
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Menos de 3 segundos
    
    // ✅ Verificar lazy loading de imágenes
    await page.scroll('[data-testid="entregas-table"]', { scrollTop: 1000 });
    await expect(page.locator('[data-testid="lazy-image-loaded"]')).toBeVisible();
    
    // ✅ Verificar paginación eficiente
    const paginationStart = Date.now();
    await page.click('[data-testid="next-page-button"]');
    await expect(page.locator('[data-testid="page-2-content"]')).toBeVisible({ timeout: 2000 });
    
    const paginationTime = Date.now() - paginationStart;
    expect(paginationTime).toBeLessThan(2000); // Menos de 2 segundos
  });

  // ✅ Test accesibilidad
  test('debe cumplir estándares de accesibilidad', async () => {
    // 🔁 Navegar a entregas
    await page.goto('/entregas');
    
    // ✅ Verificar navegación por teclado
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="filter-estado"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="crear-entrega-button"]')).toBeFocused();
    
    // ✅ Verificar etiquetas ARIA
    await expect(page.locator('[data-testid="entregas-table"]')).toHaveAttribute('aria-label', 'Tabla de entregas');
    await expect(page.locator('[data-testid="search-input"]')).toHaveAttribute('aria-label', 'Buscar entregas');
    
    // ✅ Verificar contraste de colores (simulado)
    const backgroundColor = await page.locator('[data-testid="entrega-card"]').evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    const textColor = await page.locator('[data-testid="entrega-title"]').evaluate(
      el => getComputedStyle(el).color
    );
    
    // Verificar que los colores no sean iguales (contraste básico)
    expect(backgroundColor).not.toBe(textColor);
    
    // ✅ Verificar lectores de pantalla
    await expect(page.locator('[role="status"]')).toContainText('10 entregas cargadas');
    
    // 🔁 Cambiar estado y verificar anuncio
    await page.click('[data-testid="table-row-0"]');
    await page.click('[data-testid="cambiar-estado-button"]');
    await page.click('[data-testid="estado-en-proceso"]');
    await page.click('[data-testid="confirmar-cambio-button"]');
    
    await expect(page.locator('[role="status"]')).toContainText('Estado actualizado a En Proceso');
  });

  // ✅ Test manejo de errores
  test('debe manejar errores de red correctamente', async () => {
    // 🔧 Simular error de red
    await page.route('**/api/entregas', route => {
      route.abort('failed');
    });
    
    // 🔁 Navegar a entregas
    await page.goto('/entregas');
    
    // ✅ Verificar mensaje de error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Error al cargar entregas');
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // 🔧 Restaurar conexión
    await page.unroute('**/api/entregas');
    
    // 🔁 Reintentar carga
    await page.click('[data-testid="retry-button"]');
    
    // ✅ Verificar recuperación
    await expect(page.locator('[data-testid="entregas-table"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
  });

  // ✅ Test flujo offline
  test('debe funcionar parcialmente sin conexión', async () => {
    // 🔁 Cargar datos inicialmente
    await page.goto('/entregas');
    await expect(page.locator('[data-testid="entregas-table"]')).toBeVisible();
    
    // 🔧 Simular pérdida de conexión
    await page.context().setOffline(true);
    
    // 🔁 Intentar crear nueva entrega
    await page.click('[data-testid="crear-entrega-button"]');
    await page.fill('[data-testid="entrega-titulo"]', 'Entrega Offline');
    await page.click('[data-testid="guardar-entrega-button"]');
    
    // ✅ Verificar mensaje de offline
    await expect(page.locator('[data-testid="offline-message"]')).toContainText('Sin conexión');
    await expect(page.locator('[data-testid="offline-queue"]')).toContainText('1 acción pendiente');
    
    // 🔧 Restaurar conexión
    await page.context().setOffline(false);
    
    // 🔁 Sincronizar cambios
    await page.click('[data-testid="sync-button"]');
    
    // ✅ Verificar sincronización
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Cambios sincronizados');
    await expect(page.locator('[data-testid="offline-queue"]')).toContainText('0 acciones pendientes');
  });
});
