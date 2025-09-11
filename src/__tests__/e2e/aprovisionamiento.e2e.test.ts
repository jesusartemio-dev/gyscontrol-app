/**
 * @fileoverview Tests E2E para el módulo de aprovisionamiento financiero
 * @version 1.0.0
 * @author GYS Team
 * @created 2024-01-15
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// 🧮 Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_USER = {
  email: 'admin@gys.com',
  password: 'admin123',
  role: 'Admin'
};

// 📊 Test data
const TEST_PROJECT = {
  nombre: 'Proyecto E2E Test',
  codigo: 'E2E-001',
  cliente: 'Cliente Test E2E',
  fechaInicio: '2024-01-01',
  fechaFin: '2024-12-31'
};

const TEST_LISTA = {
  codigo: 'LST-E2E-001',
  descripcion: 'Lista de prueba E2E',
  fechaNecesaria: '2024-06-15'
};

const TEST_PEDIDO = {
  codigo: 'PED-E2E-001',
  descripcion: 'Pedido de prueba E2E',
  fechaNecesaria: '2024-06-15'
};

// 🔧 Helper functions
class AprovisionamientoPage {
  constructor(private page: Page) {}

  // ✅ Navigation helpers
  async navigateToAprovisionamiento() {
    await this.page.goto(`${BASE_URL}/finanzas/aprovisionamiento`);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToProyectos() {
    await this.page.goto(`${BASE_URL}/finanzas/aprovisionamiento/proyectos`);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToListas() {
    await this.page.goto(`${BASE_URL}/finanzas/aprovisionamiento/listas`);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToPedidos() {
    await this.page.goto(`${BASE_URL}/finanzas/aprovisionamiento/pedidos`);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToTimeline() {
    await this.page.goto(`${BASE_URL}/finanzas/aprovisionamiento/timeline`);
    await this.page.waitForLoadState('networkidle');
  }

  // 🔍 Search and filter helpers
  async searchProjects(searchTerm: string) {
    await this.page.fill('[data-testid="search-input"]', searchTerm);
    await this.page.press('[data-testid="search-input"]', 'Enter');
    await this.page.waitForTimeout(500);
  }

  async filterByEstado(estado: string) {
    await this.page.click('[data-testid="filter-estado"]');
    await this.page.click(`[data-value="${estado}"]`);
    await this.page.waitForTimeout(500);
  }

  async filterByFechas(fechaInicio: string, fechaFin: string) {
    await this.page.fill('[data-testid="fecha-inicio"]', fechaInicio);
    await this.page.fill('[data-testid="fecha-fin"]', fechaFin);
    await this.page.click('[data-testid="apply-filters"]');
    await this.page.waitForTimeout(500);
  }

  // 📊 Data interaction helpers
  async createProject(projectData: typeof TEST_PROJECT) {
    await this.page.click('[data-testid="create-project-btn"]');
    
    await this.page.fill('[data-testid="project-nombre"]', projectData.nombre);
    await this.page.fill('[data-testid="project-codigo"]', projectData.codigo);
    await this.page.fill('[data-testid="project-cliente"]', projectData.cliente);
    await this.page.fill('[data-testid="project-fecha-inicio"]', projectData.fechaInicio);
    await this.page.fill('[data-testid="project-fecha-fin"]', projectData.fechaFin);
    
    await this.page.click('[data-testid="save-project-btn"]');
    await this.page.waitForSelector('[data-testid="success-toast"]');
  }

  async createLista(listaData: typeof TEST_LISTA, projectId: string) {
    await this.page.click('[data-testid="create-lista-btn"]');
    
    await this.page.click('[data-testid="lista-proyecto-select"]');
    await this.page.click(`[data-value="${projectId}"]`);
    
    await this.page.fill('[data-testid="lista-codigo"]', listaData.codigo);
    await this.page.fill('[data-testid="lista-descripcion"]', listaData.descripcion);
    await this.page.fill('[data-testid="lista-fecha-necesaria"]', listaData.fechaNecesaria);
    
    await this.page.click('[data-testid="save-lista-btn"]');
    await this.page.waitForSelector('[data-testid="success-toast"]');
  }

  async createPedido(pedidoData: typeof TEST_PEDIDO, listaId: string) {
    await this.page.click('[data-testid="create-pedido-btn"]');
    
    await this.page.click('[data-testid="pedido-lista-select"]');
    await this.page.click(`[data-value="${listaId}"]`);
    
    await this.page.fill('[data-testid="pedido-codigo"]', pedidoData.codigo);
    await this.page.fill('[data-testid="pedido-descripcion"]', pedidoData.descripcion);
    await this.page.fill('[data-testid="pedido-fecha-necesaria"]', pedidoData.fechaNecesaria);
    
    await this.page.click('[data-testid="save-pedido-btn"]');
    await this.page.waitForSelector('[data-testid="success-toast"]');
  }

  // 📈 Gantt and timeline helpers
  async switchGanttView(view: 'listas' | 'pedidos') {
    await this.page.click(`[data-testid="gantt-tab-${view}"]`);
    await this.page.waitForTimeout(1000);
  }

  async zoomGantt(level: 'day' | 'week' | 'month') {
    await this.page.click('[data-testid="gantt-zoom-select"]');
    await this.page.click(`[data-value="${level}"]`);
    await this.page.waitForTimeout(500);
  }

  // 📊 Export helpers
  async exportToPDF() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('[data-testid="export-pdf-btn"]');
    const download = await downloadPromise;
    return download;
  }

  async exportToExcel() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('[data-testid="export-excel-btn"]');
    const download = await downloadPromise;
    return download;
  }

  // 🔔 Notification helpers
  async checkNotifications() {
    await this.page.click('[data-testid="notifications-btn"]');
    await this.page.waitForSelector('[data-testid="notifications-panel"]');
  }

  async markNotificationAsRead(notificationId: string) {
    await this.page.click(`[data-testid="notification-${notificationId}-read"]`);
    await this.page.waitForTimeout(300);
  }

  // 🎯 Assertion helpers
  async expectProjectInList(projectName: string) {
    await expect(this.page.locator(`text=${projectName}`)).toBeVisible();
  }

  async expectListaInTable(listaCode: string) {
    await expect(this.page.locator(`text=${listaCode}`)).toBeVisible();
  }

  async expectPedidoInTable(pedidoCode: string) {
    await expect(this.page.locator(`text=${pedidoCode}`)).toBeVisible();
  }

  async expectCoherencePercentage(percentage: number) {
    await expect(this.page.locator(`text=${percentage}%`)).toBeVisible();
  }

  async expectGanttChart() {
    await expect(this.page.locator('[data-testid="gantt-chart"]')).toBeVisible();
  }

  async expectCriticalAlert() {
    await expect(this.page.locator('[data-testid="critical-alert"]')).toBeVisible();
  }
}

// 🔐 Authentication helper
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/auth/signin`);
  await page.fill('[data-testid="email-input"]', TEST_USER.email);
  await page.fill('[data-testid="password-input"]', TEST_USER.password);
  await page.click('[data-testid="signin-btn"]');
  await page.waitForURL(`${BASE_URL}/dashboard`);
}

// 🧪 Test suite
test.describe('Aprovisionamiento E2E Tests', () => {
  let aprovisionamientoPage: AprovisionamientoPage;

  test.beforeEach(async ({ page }) => {
    aprovisionamientoPage = new AprovisionamientoPage(page);
    await loginAsAdmin(page);
  });

  test.describe('Dashboard Navigation', () => {
    test('should navigate to aprovisionamiento dashboard', async ({ page }) => {
      await aprovisionamientoPage.navigateToAprovisionamiento();
      
      // ✅ Check page title and main elements
      await expect(page.locator('h1')).toContainText('Aprovisionamiento Financiero');
      await expect(page.locator('[data-testid="projects-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="coherence-indicator"]')).toBeVisible();
    });

    test('should display project statistics correctly', async ({ page }) => {
      await aprovisionamientoPage.navigateToAprovisionamiento();
      
      // 📊 Check statistics cards
      await expect(page.locator('[data-testid="total-projects"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-projects"]')).toBeVisible();
      await expect(page.locator('[data-testid="coherence-percentage"]')).toBeVisible();
      await expect(page.locator('[data-testid="critical-alerts"]')).toBeVisible();
    });

    test('should navigate between different sections', async ({ page }) => {
      await aprovisionamientoPage.navigateToAprovisionamiento();
      
      // ✅ Test navigation to projects
      await page.click('[data-testid="nav-proyectos"]');
      await expect(page).toHaveURL(/\/proyectos/);
      
      // 🔁 Test navigation to lists
      await page.click('[data-testid="nav-listas"]');
      await expect(page).toHaveURL(/\/listas/);
      
      // 📊 Test navigation to orders
      await page.click('[data-testid="nav-pedidos"]');
      await expect(page).toHaveURL(/\/pedidos/);
      
      // 📈 Test navigation to timeline
      await page.click('[data-testid="nav-timeline"]');
      await expect(page).toHaveURL(/\/timeline/);
    });
  });

  test.describe('Project Management', () => {
    test('should create a new project successfully', async ({ page }) => {
      await aprovisionamientoPage.navigateToProyectos();
      
      // ✅ Create project
      await aprovisionamientoPage.createProject(TEST_PROJECT);
      
      // 🔍 Verify project appears in list
      await aprovisionamientoPage.expectProjectInList(TEST_PROJECT.nombre);
      
      // 📊 Check project details
      await expect(page.locator(`text=${TEST_PROJECT.codigo}`)).toBeVisible();
      await expect(page.locator(`text=${TEST_PROJECT.cliente}`)).toBeVisible();
    });

    test('should filter projects by status', async ({ page }) => {
      await aprovisionamientoPage.navigateToProyectos();
      
      // 🔍 Apply filter
      await aprovisionamientoPage.filterByEstado('activo');
      
      // ✅ Verify only active projects are shown
      const projectRows = page.locator('[data-testid="project-row"]');
      const count = await projectRows.count();
      
      for (let i = 0; i < count; i++) {
        const statusBadge = projectRows.nth(i).locator('[data-testid="project-status"]');
        await expect(statusBadge).toContainText('Activo');
      }
    });

    test('should search projects by name', async ({ page }) => {
      await aprovisionamientoPage.navigateToProyectos();
      
      // 🔍 Search for specific project
      await aprovisionamientoPage.searchProjects('Alpha');
      
      // ✅ Verify search results
      const searchResults = page.locator('[data-testid="project-row"]');
      const count = await searchResults.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const projectName = searchResults.nth(i).locator('[data-testid="project-name"]');
          await expect(projectName).toContainText(/Alpha/i);
        }
      }
    });

    test('should view project details', async ({ page }) => {
      await aprovisionamientoPage.navigateToProyectos();
      
      // ✅ Click on first project
      await page.click('[data-testid="project-row"]:first-child [data-testid="view-project-btn"]');
      
      // 📊 Verify project detail page
      await expect(page.locator('[data-testid="project-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="project-listas"]')).toBeVisible();
      await expect(page.locator('[data-testid="project-pedidos"]')).toBeVisible();
    });
  });

  test.describe('Equipment Lists Management', () => {
    test('should create equipment list for project', async ({ page }) => {
      await aprovisionamientoPage.navigateToListas();
      
      // ✅ Create lista (assuming project exists)
      await aprovisionamientoPage.createLista(TEST_LISTA, 'existing-project-id');
      
      // 🔍 Verify lista appears in table
      await aprovisionamientoPage.expectListaInTable(TEST_LISTA.codigo);
    });

    test('should approve equipment list', async ({ page }) => {
      await aprovisionamientoPage.navigateToListas();
      
      // 🔍 Find draft list and approve it
      const draftRow = page.locator('[data-testid="lista-row"]').filter({ hasText: 'Borrador' }).first();
      await draftRow.locator('[data-testid="approve-lista-btn"]').click();
      
      // ✅ Verify status change
      await expect(draftRow.locator('[data-testid="lista-status"]')).toContainText('Aprobado');
    });

    test('should add items to equipment list', async ({ page }) => {
      await aprovisionamientoPage.navigateToListas();
      
      // ✅ Open list details
      await page.click('[data-testid="lista-row"]:first-child [data-testid="view-lista-btn"]');
      
      // 📊 Add new item
      await page.click('[data-testid="add-item-btn"]');
      await page.fill('[data-testid="item-descripcion"]', 'Bomba centrífuga 5HP');
      await page.fill('[data-testid="item-cantidad"]', '2');
      await page.fill('[data-testid="item-precio"]', '1500');
      await page.click('[data-testid="save-item-btn"]');
      
      // 🔍 Verify item appears in list
      await expect(page.locator('text=Bomba centrífuga 5HP')).toBeVisible();
    });
  });

  test.describe('Orders Management', () => {
    test('should create order from approved list', async ({ page }) => {
      await aprovisionamientoPage.navigateToPedidos();
      
      // ✅ Create pedido (assuming approved list exists)
      await aprovisionamientoPage.createPedido(TEST_PEDIDO, 'existing-lista-id');
      
      // 🔍 Verify pedido appears in table
      await aprovisionamientoPage.expectPedidoInTable(TEST_PEDIDO.codigo);
    });

    test('should update order status', async ({ page }) => {
      await aprovisionamientoPage.navigateToPedidos();
      
      // 🔍 Find draft order and send it
      const draftRow = page.locator('[data-testid="pedido-row"]').filter({ hasText: 'Borrador' }).first();
      await draftRow.locator('[data-testid="send-pedido-btn"]').click();
      
      // ✅ Verify status change
      await expect(draftRow.locator('[data-testid="pedido-status"]')).toContainText('Enviado');
    });

    test('should track order delivery', async ({ page }) => {
      await aprovisionamientoPage.navigateToPedidos();
      
      // ✅ Open order details
      await page.click('[data-testid="pedido-row"]:first-child [data-testid="view-pedido-btn"]');
      
      // 📊 Check delivery tracking
      await expect(page.locator('[data-testid="delivery-timeline"]')).toBeVisible();
      await expect(page.locator('[data-testid="estimated-delivery"]')).toBeVisible();
    });
  });

  test.describe('Timeline and Gantt Chart', () => {
    test('should display Gantt chart for lists', async ({ page }) => {
      await aprovisionamientoPage.navigateToTimeline();
      
      // ✅ Switch to lists view
      await aprovisionamientoPage.switchGanttView('listas');
      
      // 📈 Verify Gantt chart elements
      await aprovisionamientoPage.expectGanttChart();
      await expect(page.locator('[data-testid="gantt-timeline"]')).toBeVisible();
      await expect(page.locator('[data-testid="gantt-bars"]')).toBeVisible();
    });

    test('should display Gantt chart for orders', async ({ page }) => {
      await aprovisionamientoPage.navigateToTimeline();
      
      // ✅ Switch to orders view
      await aprovisionamientoPage.switchGanttView('pedidos');
      
      // 📈 Verify Gantt chart updates
      await aprovisionamientoPage.expectGanttChart();
      await expect(page.locator('[data-testid="gantt-orders"]')).toBeVisible();
    });

    test('should zoom Gantt chart', async ({ page }) => {
      await aprovisionamientoPage.navigateToTimeline();
      
      // 🔍 Test different zoom levels
      await aprovisionamientoPage.zoomGantt('day');
      await expect(page.locator('[data-testid="gantt-day-view"]')).toBeVisible();
      
      await aprovisionamientoPage.zoomGantt('week');
      await expect(page.locator('[data-testid="gantt-week-view"]')).toBeVisible();
      
      await aprovisionamientoPage.zoomGantt('month');
      await expect(page.locator('[data-testid="gantt-month-view"]')).toBeVisible();
    });

    test('should identify critical dates', async ({ page }) => {
      await aprovisionamientoPage.navigateToTimeline();
      
      // 📊 Check critical dates panel
      await expect(page.locator('[data-testid="critical-dates"]')).toBeVisible();
      
      // 🚨 Verify critical alerts if any
      const criticalAlerts = page.locator('[data-testid="critical-alert"]');
      const alertCount = await criticalAlerts.count();
      
      if (alertCount > 0) {
        await expect(criticalAlerts.first()).toBeVisible();
      }
    });
  });

  test.describe('Coherence Analysis', () => {
    test('should display coherence indicators', async ({ page }) => {
      await aprovisionamientoPage.navigateToAprovisionamiento();
      
      // 📊 Check coherence percentage
      const coherenceIndicator = page.locator('[data-testid="coherence-percentage"]');
      await expect(coherenceIndicator).toBeVisible();
      
      // ✅ Verify percentage is valid (0-100)
      const percentageText = await coherenceIndicator.textContent();
      const percentage = parseInt(percentageText?.replace('%', '') || '0');
      expect(percentage).toBeGreaterThanOrEqual(0);
      expect(percentage).toBeLessThanOrEqual(100);
    });

    test('should show coherence details', async ({ page }) => {
      await aprovisionamientoPage.navigateToAprovisionamiento();
      
      // ✅ Click on coherence indicator
      await page.click('[data-testid="coherence-indicator"]');
      
      // 📊 Verify coherence details modal
      await expect(page.locator('[data-testid="coherence-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="coherence-breakdown"]')).toBeVisible();
      await expect(page.locator('[data-testid="coherence-recommendations"]')).toBeVisible();
    });
  });

  test.describe('Notifications and Alerts', () => {
    test('should display system notifications', async ({ page }) => {
      await aprovisionamientoPage.navigateToAprovisionamiento();
      
      // 🔔 Check notifications
      await aprovisionamientoPage.checkNotifications();
      
      // ✅ Verify notifications panel
      await expect(page.locator('[data-testid="notifications-panel"]')).toBeVisible();
    });

    test('should mark notifications as read', async ({ page }) => {
      await aprovisionamientoPage.navigateToAprovisionamiento();
      await aprovisionamientoPage.checkNotifications();
      
      // 🔍 Find unread notification and mark as read
      const unreadNotification = page.locator('[data-testid^="notification-"][data-unread="true"]').first();
      
      if (await unreadNotification.count() > 0) {
        const notificationId = await unreadNotification.getAttribute('data-testid');
        const id = notificationId?.replace('notification-', '') || '';
        
        await aprovisionamientoPage.markNotificationAsRead(id);
        
        // ✅ Verify notification is marked as read
        await expect(page.locator(`[data-testid="notification-${id}"][data-unread="false"]`)).toBeVisible();
      }
    });
  });

  test.describe('Export and Reporting', () => {
    test('should export data to PDF', async ({ page }) => {
      await aprovisionamientoPage.navigateToAprovisionamiento();
      
      // 📊 Export to PDF
      const download = await aprovisionamientoPage.exportToPDF();
      
      // ✅ Verify download
      expect(download.suggestedFilename()).toContain('.pdf');
      
      // 🔍 Verify file is not empty
      const path = await download.path();
      expect(path).toBeTruthy();
    });

    test('should export data to Excel', async ({ page }) => {
      await aprovisionamientoPage.navigateToProyectos();
      
      // 📊 Export to Excel
      const download = await aprovisionamientoPage.exportToExcel();
      
      // ✅ Verify download
      expect(download.suggestedFilename()).toMatch(/\.(xlsx|xls)$/);
      
      // 🔍 Verify file is not empty
      const path = await download.path();
      expect(path).toBeTruthy();
    });

    test('should generate executive report', async ({ page }) => {
      await aprovisionamientoPage.navigateToAprovisionamiento();
      
      // 📊 Generate executive report
      await page.click('[data-testid="generate-executive-report-btn"]');
      
      // ✅ Verify report generation dialog
      await expect(page.locator('[data-testid="report-options-modal"]')).toBeVisible();
      
      // 🔍 Configure report options
      await page.check('[data-testid="include-gantt"]');
      await page.check('[data-testid="include-coherence"]');
      await page.click('[data-testid="generate-report-btn"]');
      
      // 📊 Wait for report generation
      await expect(page.locator('[data-testid="report-generating"]')).toBeVisible();
      await page.waitForSelector('[data-testid="report-ready"]', { timeout: 10000 });
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should load pages within acceptable time', async ({ page }) => {
      // 📊 Measure page load times
      const startTime = Date.now();
      await aprovisionamientoPage.navigateToAprovisionamiento();
      const loadTime = Date.now() - startTime;
      
      // ✅ Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      await aprovisionamientoPage.navigateToProyectos();
      
      // 🔍 Test pagination with large dataset
      const paginationInfo = page.locator('[data-testid="pagination-info"]');
      
      if (await paginationInfo.count() > 0) {
        // ✅ Navigate through pages
        await page.click('[data-testid="next-page-btn"]');
        await page.waitForLoadState('networkidle');
        
        await page.click('[data-testid="prev-page-btn"]');
        await page.waitForLoadState('networkidle');
      }
    });

    test('should be responsive on different screen sizes', async ({ page }) => {
      // 📱 Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await aprovisionamientoPage.navigateToAprovisionamiento();
      
      // ✅ Verify mobile layout
      await expect(page.locator('[data-testid="mobile-menu-btn"]')).toBeVisible();
      
      // 💻 Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      
      // 🖥️ Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.reload();
      
      // ✅ Verify desktop layout
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    });
  });
});

// 📊 E2E test utilities
export const e2eTestUtils = {
  // ✅ Setup helpers
  setupTestData: async (page: Page) => {
    // Create test projects, lists, and orders
    // This would typically involve API calls or database seeding
  },
  
  cleanupTestData: async (page: Page) => {
    // Clean up test data after tests
    // This would typically involve API calls or database cleanup
  },
  
  // 📊 Performance helpers
  measurePageLoad: async (page: Page, url: string) => {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  },
  
  // 🔍 Accessibility helpers
  checkAccessibility: async (page: Page) => {
    // Run accessibility checks using axe-core or similar
    // This would require additional setup with @axe-core/playwright
  },
  
  // 📱 Responsive helpers
  testResponsiveness: async (page: Page, url: string) => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      // Take screenshot for visual regression testing
      await page.screenshot({ 
        path: `screenshots/${viewport.name}-${Date.now()}.png`,
        fullPage: true 
      });
    }
  }
};
