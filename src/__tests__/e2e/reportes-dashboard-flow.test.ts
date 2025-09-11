/**
 * 🧪 Tests E2E - Flujo de Reportes y Dashboard
 * 
 * @description Tests end-to-end para reportes, dashboard y analytics
 * @author TRAE - Agente Senior Fullstack
 * @date 2025-01-27
 * @version 1.0.0
 */

import { test, expect, Page } from '@playwright/test';
import { EstadoEntregaItem } from '@/types/modelos';

// 🔧 Configuración de tests
test.describe('Flujo de Reportes y Dashboard E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // 📡 Configurar viewport para desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // 🔐 Login como usuario GERENTE
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'gerente@gys.com');
    await page.fill('[data-testid="password-input"]', 'gerente123');
    await page.click('[data-testid="login-button"]');
    
    // ✅ Verificar login exitoso
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test.afterEach(async () => {
    await page.close();
  });

  // ✅ Test dashboard principal
  test('debe mostrar dashboard con métricas actualizadas', async () => {
    // ✅ Verificar carga del dashboard
    await expect(page.locator('[data-testid="dashboard-title"]')).toContainText('Dashboard GYS');
    await expect(page.locator('[data-testid="dashboard-skeleton"]')).not.toBeVisible({ timeout: 5000 });
    
    // ✅ Verificar métricas principales
    await expect(page.locator('[data-testid="metric-entregas-total"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-proyectos-activos"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-equipos-disponibles"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-rendimiento"]')).toBeVisible();
    
    // ✅ Verificar valores numéricos
    const entregasTotal = await page.locator('[data-testid="entregas-total-value"]').textContent();
    expect(parseInt(entregasTotal || '0')).toBeGreaterThan(0);
    
    const proyectosActivos = await page.locator('[data-testid="proyectos-activos-value"]').textContent();
    expect(parseInt(proyectosActivos || '0')).toBeGreaterThan(0);
    
    // ✅ Verificar gráficos
    await expect(page.locator('[data-testid="chart-entregas-mes"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-estados-entrega"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-rendimiento"]')).toBeVisible();
    
    // 🔁 Interactuar con gráfico
    await page.hover('[data-testid="chart-entregas-mes"]');
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
  });

  // ✅ Test filtros de dashboard
  test('debe filtrar dashboard por período y proyecto', async () => {
    // 🔁 Cambiar período de tiempo
    await page.click('[data-testid="period-selector"]');
    await page.click('[data-testid="period-90d"]');
    
    // ✅ Verificar actualización de datos
    await expect(page.locator('[data-testid="dashboard-skeleton"]')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-skeleton"]')).not.toBeVisible({ timeout: 5000 });
    
    // ✅ Verificar que los datos cambiaron
    await expect(page.locator('[data-testid="period-label"]')).toContainText('Últimos 90 días');
    
    // 🔁 Filtrar por proyecto
    await page.click('[data-testid="project-filter"]');
    await page.click('[data-testid="project-alpha"]');
    
    // ✅ Verificar filtro aplicado
    await expect(page.locator('[data-testid="active-filters"]')).toContainText('Proyecto Alpha');
    await expect(page.locator('[data-testid="dashboard-skeleton"]')).not.toBeVisible({ timeout: 5000 });
    
    // 🔁 Limpiar filtros
    await page.click('[data-testid="clear-filters"]');
    await expect(page.locator('[data-testid="active-filters"]')).not.toBeVisible();
  });

  // ✅ Test navegación desde dashboard
  test('debe navegar a detalles desde métricas del dashboard', async () => {
    // 🔁 Click en métrica de entregas
    await page.click('[data-testid="metric-entregas-detail"]');
    await expect(page).toHaveURL('/entregas');
    await expect(page.locator('h1')).toContainText('Gestión de Entregas');
    
    // 🔁 Volver al dashboard
    await page.click('[data-testid="sidebar-dashboard"]');
    await expect(page).toHaveURL('/dashboard');
    
    // 🔁 Click en métrica de proyectos
    await page.click('[data-testid="metric-proyectos-detail"]');
    await expect(page).toHaveURL('/proyectos');
    
    // 🔁 Volver al dashboard
    await page.goBack();
    await expect(page).toHaveURL('/dashboard');
  });

  // ✅ Test creación de reporte personalizado
  test('debe crear reporte personalizado de entregas', async () => {
    // 🔁 Navegar a reportes
    await page.click('[data-testid="sidebar-reportes"]');
    await expect(page).toHaveURL('/reportes');
    
    // 🔁 Crear nuevo reporte
    await page.click('[data-testid="crear-reporte-button"]');
    await expect(page.locator('[data-testid="reporte-form"]')).toBeVisible();
    
    // 🔁 Configurar reporte
    await page.fill('[data-testid="reporte-titulo"]', 'Reporte E2E Test');
    await page.fill('[data-testid="reporte-descripcion"]', 'Reporte de prueba para testing E2E');
    
    // Seleccionar tipo de reporte
    await page.click('[data-testid="tipo-reporte"]');
    await page.click('[data-testid="tipo-entregas"]');
    
    // Configurar rango de fechas
    await page.fill('[data-testid="fecha-inicio"]', '2025-01-01');
    await page.fill('[data-testid="fecha-fin"]', '2025-01-31');
    
    // Seleccionar proyectos
    await page.click('[data-testid="proyectos-selector"]');
    await page.click('[data-testid="proyecto-alpha-checkbox"]');
    await page.click('[data-testid="proyecto-beta-checkbox"]');
    await page.click('[data-testid="proyectos-selector"]'); // Cerrar dropdown
    
    // Configurar filtros avanzados
    await page.click('[data-testid="filtros-avanzados"]');
    await page.click('[data-testid="incluir-detalles-checkbox"]');
    await page.click('[data-testid="incluir-graficos-checkbox"]');
    
    // Seleccionar formato
    await page.click('[data-testid="formato-pdf"]');
    
    // 🔁 Generar reporte
    await page.click('[data-testid="generar-reporte-button"]');
    
    // ✅ Verificar inicio de generación
    await expect(page.locator('[data-testid="toast-info"]')).toContainText('Generando reporte');
    await expect(page).toHaveURL('/reportes');
    
    // ✅ Verificar reporte en lista
    await expect(page.locator('[data-testid="reporte-procesando"]')).toBeVisible();
    await expect(page.locator('[data-testid="reporte-titulo"]')).toContainText('Reporte E2E Test');
    
    // ✅ Esperar completación (simulada)
    await page.waitForTimeout(3000);
    await page.reload();
    
    await expect(page.locator('[data-testid="reporte-completado"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="download-button"]')).toBeVisible();
  });

  // ✅ Test descarga de reporte
  test('debe descargar reporte completado', async () => {
    // 🔁 Navegar a reportes
    await page.goto('/reportes');
    
    // 🔁 Buscar reporte completado
    await page.fill('[data-testid="search-reportes"]', 'Reporte Completado');
    await page.waitForTimeout(500);
    
    // ✅ Verificar reporte encontrado
    await expect(page.locator('[data-testid="reporte-completado"]')).toBeVisible();
    
    // 🔁 Descargar reporte
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-button"]');
    const download = await downloadPromise;
    
    // ✅ Verificar descarga
    expect(download.suggestedFilename()).toMatch(/reporte-.*\.pdf/);
    
    // ✅ Verificar toast de éxito
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Descarga iniciada');
  });

  // ✅ Test filtros de reportes
  test('debe filtrar reportes por tipo, estado y fecha', async () => {
    // 🔁 Navegar a reportes
    await page.goto('/reportes');
    
    // 🔁 Filtrar por tipo
    await page.click('[data-testid="filter-tipo"]');
    await page.click('[data-testid="tipo-entregas"]');
    
    // ✅ Verificar filtro aplicado
    const reportes = page.locator('[data-testid="reporte-item"]');
    const count = await reportes.count();
    
    for (let i = 0; i < count; i++) {
      await expect(reportes.nth(i).locator('[data-testid="tipo-badge"]')).toContainText('Entregas');
    }
    
    // 🔁 Filtrar por estado
    await page.click('[data-testid="filter-estado"]');
    await page.click('[data-testid="estado-completado"]');
    
    // ✅ Verificar filtro combinado
    for (let i = 0; i < await reportes.count(); i++) {
      await expect(reportes.nth(i).locator('[data-testid="estado-badge"]')).toContainText('Completado');
    }
    
    // 🔁 Filtrar por rango de fechas
    await page.fill('[data-testid="fecha-desde"]', '2025-01-01');
    await page.fill('[data-testid="fecha-hasta"]', '2025-01-31');
    await page.click('[data-testid="aplicar-filtros-fecha"]');
    
    // ✅ Verificar resultados filtrados
    await expect(page.locator('[data-testid="resultados-count"]')).toContainText('reportes encontrados');
    
    // 🔁 Limpiar filtros
    await page.click('[data-testid="limpiar-filtros"]');
    await expect(page.locator('[data-testid="filter-active"]')).not.toBeVisible();
  });

  // ✅ Test exportación masiva de reportes
  test('debe exportar múltiples reportes seleccionados', async () => {
    // 🔁 Navegar a reportes
    await page.goto('/reportes');
    
    // 🔁 Seleccionar múltiples reportes
    await page.click('[data-testid="select-reporte-1"]');
    await page.click('[data-testid="select-reporte-2"]');
    await page.click('[data-testid="select-reporte-3"]');
    
    // ✅ Verificar selección
    await expect(page.locator('[data-testid="selected-count"]')).toContainText('3 reportes seleccionados');
    
    // 🔁 Exportar seleccionados
    await page.click('[data-testid="export-selected"]');
    await page.click('[data-testid="export-zip"]');
    
    // ✅ Verificar inicio de exportación
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="toast-info"]')).toContainText('Preparando descarga');
    
    // ✅ Verificar descarga ZIP
    const downloadPromise = page.waitForEvent('download');
    await expect(page.locator('[data-testid="download-zip"]')).toBeVisible({ timeout: 10000 });
    await page.click('[data-testid="download-zip"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/reportes-.*\.zip/);
  });

  // ✅ Test análisis de trazabilidad
  test('debe mostrar análisis completo de trazabilidad', async () => {
    // 🔁 Navegar a trazabilidad
    await page.click('[data-testid="sidebar-trazabilidad"]');
    await expect(page).toHaveURL('/trazabilidad');
    
    // ✅ Verificar dashboard de trazabilidad
    await expect(page.locator('[data-testid="trazabilidad-title"]')).toContainText('Análisis de Trazabilidad');
    await expect(page.locator('[data-testid="timeline-global"]')).toBeVisible();
    
    // ✅ Verificar métricas de trazabilidad
    await expect(page.locator('[data-testid="eventos-total"]')).toBeVisible();
    await expect(page.locator('[data-testid="entregas-rastreadas"]')).toBeVisible();
    await expect(page.locator('[data-testid="tiempo-promedio"]')).toBeVisible();
    
    // 🔁 Filtrar por entrega específica
    await page.fill('[data-testid="buscar-entrega"]', 'ENT-001');
    await page.click('[data-testid="buscar-button"]');
    
    // ✅ Verificar timeline específico
    await expect(page.locator('[data-testid="timeline-entrega"]')).toBeVisible();
    await expect(page.locator('[data-testid="eventos-entrega"]')).toHaveCount(5);
    
    // 🔁 Ver detalles de evento
    await page.click('[data-testid="evento-detalle-0"]');
    await expect(page.locator('[data-testid="evento-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="evento-usuario"]')).toBeVisible();
    await expect(page.locator('[data-testid="evento-timestamp"]')).toBeVisible();
    await expect(page.locator('[data-testid="evento-detalles"]')).toBeVisible();
    
    // 🔁 Cerrar modal
    await page.click('[data-testid="cerrar-modal"]');
    await expect(page.locator('[data-testid="evento-modal"]')).not.toBeVisible();
  });

  // ✅ Test análisis de retrasos
  test('debe analizar y mostrar retrasos en entregas', async () => {
    // 🔁 Navegar a análisis de retrasos
    await page.goto('/trazabilidad/retrasos');
    
    // ✅ Verificar dashboard de retrasos
    await expect(page.locator('[data-testid="retrasos-title"]')).toContainText('Análisis de Retrasos');
    await expect(page.locator('[data-testid="chart-retrasos-mes"]')).toBeVisible();
    
    // ✅ Verificar métricas de retrasos
    await expect(page.locator('[data-testid="entregas-retrasadas"]')).toBeVisible();
    await expect(page.locator('[data-testid="retraso-promedio"]')).toBeVisible();
    await expect(page.locator('[data-testid="impacto-economico"]')).toBeVisible();
    
    // ✅ Verificar tabla de entregas retrasadas
    await expect(page.locator('[data-testid="tabla-retrasos"]')).toBeVisible();
    const filasRetrasos = page.locator('[data-testid="fila-retraso"]');
    const countRetrasos = await filasRetrasos.count();
    
    expect(countRetrasos).toBeGreaterThan(0);
    
    // 🔁 Ordenar por días de retraso
    await page.click('[data-testid="sort-dias-retraso"]');
    
    // ✅ Verificar ordenamiento
    const primerRetraso = await filasRetrasos.nth(0).locator('[data-testid="dias-retraso"]').textContent();
    const segundoRetraso = await filasRetrasos.nth(1).locator('[data-testid="dias-retraso"]').textContent();
    
    expect(parseInt(primerRetraso || '0')).toBeGreaterThanOrEqual(parseInt(segundoRetraso || '0'));
    
    // 🔁 Filtrar por causa de retraso
    await page.click('[data-testid="filter-causa"]');
    await page.click('[data-testid="causa-proveedor"]');
    
    // ✅ Verificar filtro aplicado
    for (let i = 0; i < await filasRetrasos.count(); i++) {
      await expect(filasRetrasos.nth(i).locator('[data-testid="causa-retraso"]')).toContainText('Proveedor');
    }
  });

  // ✅ Test comparativas entre proyectos
  test('debe mostrar comparativas de rendimiento entre proyectos', async () => {
    // 🔁 Navegar a comparativas
    await page.goto('/reportes/comparativas');
    
    // ✅ Verificar dashboard de comparativas
    await expect(page.locator('[data-testid="comparativas-title"]')).toContainText('Comparativa de Proyectos');
    
    // 🔁 Seleccionar proyectos para comparar
    await page.click('[data-testid="select-proyecto-1"]');
    await page.click('[data-testid="proyecto-alpha"]');
    
    await page.click('[data-testid="select-proyecto-2"]');
    await page.click('[data-testid="proyecto-beta"]');
    
    await page.click('[data-testid="comparar-button"]');
    
    // ✅ Verificar gráficos comparativos
    await expect(page.locator('[data-testid="chart-comparativo"]')).toBeVisible();
    await expect(page.locator('[data-testid="tabla-comparativa"]')).toBeVisible();
    
    // ✅ Verificar métricas comparativas
    await expect(page.locator('[data-testid="alpha-entregas"]')).toBeVisible();
    await expect(page.locator('[data-testid="beta-entregas"]')).toBeVisible();
    await expect(page.locator('[data-testid="alpha-eficiencia"]')).toBeVisible();
    await expect(page.locator('[data-testid="beta-eficiencia"]')).toBeVisible();
    
    // 🔁 Cambiar período de comparación
    await page.click('[data-testid="periodo-comparacion"]');
    await page.click('[data-testid="periodo-trimestre"]');
    
    // ✅ Verificar actualización de datos
    await expect(page.locator('[data-testid="loading-comparativa"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-comparativa"]')).not.toBeVisible({ timeout: 5000 });
    
    // 🔁 Exportar comparativa
    await page.click('[data-testid="export-comparativa"]');
    await page.click('[data-testid="export-pdf-comparativa"]');
    
    // ✅ Verificar exportación
    const downloadPromise = page.waitForEvent('download');
    await expect(page.locator('[data-testid="download-comparativa"]')).toBeVisible({ timeout: 10000 });
    await page.click('[data-testid="download-comparativa"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/comparativa-.*\.pdf/);
  });

  // ✅ Test dashboard responsive
  test('debe adaptar dashboard a dispositivos móviles', async () => {
    // 📱 Configurar viewport móvil
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 🔁 Navegar al dashboard
    await page.goto('/dashboard');
    
    // ✅ Verificar layout móvil
    await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-dashboard"]')).not.toBeVisible();
    
    // ✅ Verificar métricas apiladas
    await expect(page.locator('[data-testid="metrics-stack"]')).toBeVisible();
    
    // ✅ Verificar gráficos simplificados
    await expect(page.locator('[data-testid="simple-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="complex-chart"]')).not.toBeVisible();
    
    // 🔁 Deslizar para ver más métricas
    await page.swipe('[data-testid="metrics-carousel"]', { dx: -200, dy: 0 });
    await expect(page.locator('[data-testid="metric-2"]')).toBeVisible();
    
    // 🔁 Abrir filtros móviles
    await page.click('[data-testid="mobile-filters-button"]');
    await expect(page.locator('[data-testid="mobile-filters-panel"]')).toBeVisible();
    
    // 🔁 Aplicar filtro en móvil
    await page.click('[data-testid="mobile-period-filter"]');
    await page.click('[data-testid="period-7d"]');
    await page.click('[data-testid="apply-mobile-filters"]');
    
    // ✅ Verificar filtro aplicado
    await expect(page.locator('[data-testid="active-period"]')).toContainText('7 días');
  });

  // ✅ Test performance de dashboard
  test('debe cargar dashboard con buen rendimiento', async () => {
    const startTime = Date.now();
    
    // 🔁 Navegar al dashboard
    await page.goto('/dashboard');
    
    // ✅ Verificar carga progresiva
    await expect(page.locator('[data-testid="dashboard-skeleton"]')).toBeVisible();
    
    // Métricas básicas cargan primero
    await expect(page.locator('[data-testid="basic-metrics"]')).toBeVisible({ timeout: 2000 });
    
    // Gráficos cargan después
    await expect(page.locator('[data-testid="charts-container"]')).toBeVisible({ timeout: 5000 });
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // Menos de 5 segundos
    
    // ✅ Verificar lazy loading de gráficos
    await page.scroll('[data-testid="charts-container"]', { scrollTop: 500 });
    await expect(page.locator('[data-testid="lazy-chart"]')).toBeVisible();
    
    // ✅ Verificar actualización eficiente
    const updateStart = Date.now();
    await page.click('[data-testid="refresh-dashboard"]');
    await expect(page.locator('[data-testid="updating-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="updating-indicator"]')).not.toBeVisible({ timeout: 3000 });
    
    const updateTime = Date.now() - updateStart;
    expect(updateTime).toBeLessThan(3000); // Menos de 3 segundos
  });

  // ✅ Test accesibilidad en reportes
  test('debe cumplir estándares de accesibilidad en reportes', async () => {
    // 🔁 Navegar a reportes
    await page.goto('/reportes');
    
    // ✅ Verificar navegación por teclado
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="search-reportes"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="filter-tipo"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="crear-reporte-button"]')).toBeFocused();
    
    // ✅ Verificar etiquetas ARIA
    await expect(page.locator('[data-testid="reportes-table"]')).toHaveAttribute('aria-label', 'Tabla de reportes');
    await expect(page.locator('[data-testid="search-reportes"]')).toHaveAttribute('aria-label', 'Buscar reportes');
    
    // ✅ Verificar anuncios para lectores de pantalla
    await expect(page.locator('[role="status"]')).toContainText('reportes cargados');
    
    // 🔁 Crear reporte y verificar anuncio
    await page.click('[data-testid="crear-reporte-button"]');
    await expect(page.locator('[role="status"]')).toContainText('Formulario de nuevo reporte abierto');
    
    // ✅ Verificar formulario accesible
    await expect(page.locator('[data-testid="reporte-titulo"]')).toHaveAttribute('aria-required', 'true');
    await expect(page.locator('[data-testid="tipo-reporte"]')).toHaveAttribute('aria-expanded', 'false');
  });

  // ✅ Test manejo de errores en reportes
  test('debe manejar errores en generación de reportes', async () => {
    // 🔧 Simular error en API de reportes
    await page.route('**/api/reportes', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Error interno del servidor' })
        });
      } else {
        route.continue();
      }
    });
    
    // 🔁 Navegar a reportes
    await page.goto('/reportes');
    
    // 🔁 Intentar crear reporte
    await page.click('[data-testid="crear-reporte-button"]');
    await page.fill('[data-testid="reporte-titulo"]', 'Reporte Error Test');
    await page.click('[data-testid="tipo-entregas"]');
    await page.click('[data-testid="generar-reporte-button"]');
    
    // ✅ Verificar manejo de error
    await expect(page.locator('[data-testid="toast-error"]')).toContainText('Error al generar reporte');
    await expect(page.locator('[data-testid="error-details"]')).toContainText('Error interno del servidor');
    
    // ✅ Verificar opción de reintentar
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // 🔧 Restaurar API
    await page.unroute('**/api/reportes');
    
    // 🔁 Reintentar
    await page.click('[data-testid="retry-button"]');
    
    // ✅ Verificar éxito después de reintento
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Reporte creado correctamente');
  });

  // ✅ Test cache y optimización
  test('debe usar cache para mejorar rendimiento', async () => {
    // 🔁 Primera carga del dashboard
    const firstLoadStart = Date.now();
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="charts-container"]')).toBeVisible();
    const firstLoadTime = Date.now() - firstLoadStart;
    
    // 🔁 Navegar a otra página y volver
    await page.goto('/entregas');
    await page.goBack();
    
    // 🔁 Segunda carga (debería usar cache)
    const secondLoadStart = Date.now();
    await expect(page.locator('[data-testid="charts-container"]')).toBeVisible();
    const secondLoadTime = Date.now() - secondLoadStart;
    
    // ✅ Verificar que la segunda carga es más rápida
    expect(secondLoadTime).toBeLessThan(firstLoadTime * 0.7); // 30% más rápido
    
    // ✅ Verificar indicador de datos en cache
    await expect(page.locator('[data-testid="cache-indicator"]')).toBeVisible();
    
    // 🔁 Forzar actualización
    await page.click('[data-testid="force-refresh"]');
    await expect(page.locator('[data-testid="cache-indicator"]')).not.toBeVisible();
  });
});
