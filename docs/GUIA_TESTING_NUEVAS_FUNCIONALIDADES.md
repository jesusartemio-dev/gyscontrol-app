# 🧪 Guía de Testing - Nuevas Funcionalidades de Gestión de Equipos

## 📋 Información General

**Proyecto:** Sistema de Gestión y Servicios (GYS)  
**Versión:** 1.0.0  
**Fecha:** Septiembre 2025  
**Autor:** Kilo Code - Agente Senior Fullstack  
**Funcionalidades:** Gestión de Equipos de Proyecto, Creación de Listas Técnicas  

---

## 🎯 Resumen Ejecutivo

Esta guía establece la estrategia de testing específica para las nuevas funcionalidades implementadas en el módulo de gestión de equipos de proyecto. Incluye testing unitario, integración y E2E para garantizar la calidad de las siguientes características:

- Gestión de grupos de equipos desde cotizaciones comerciales
- Creación de listas técnicas múltiples e inteligentes
- Seguimiento de progreso de ítems de equipos
- Vistas de tabla y tarjetas para equipos
- Gestión de ítems individuales dentro de grupos

---

## 🏗️ Funcionalidades Implementadas

### 1. Gestión de Equipos de Proyecto
- **Página Principal:** `/proyectos/[id]/equipos`
- **Componentes:** `EquiposTableView`, `EquiposCardView`, `ProyectoEquipoAccordion`
- **API:** `/api/proyecto-equipo/*`
- **Servicios:** `proyectoEquipo.ts`

### 2. Creación de Listas Técnicas
- **Modal:** `CrearListaMultipleModal`
- **Funcionalidad:** Distribución de ítems en listas técnicas
- **API:** `/api/lista-equipo/from-proyecto-equipo/distribuir`

### 3. Seguimiento de Progreso
- **Estados:** `en_lista`, `reemplazado`, `pendiente`
- **Métricas:** Progreso por grupo, costo total, ítems completados

---

## 🛠️ Stack de Testing

### Herramientas Utilizadas
- **Jest + RTL** para testing unitario de componentes
- **Playwright** para testing E2E
- **MSW** para mocking de APIs
- **Jest** para testing de servicios y APIs

### Configuración Específica
```javascript
// jest.config.js - Configuración para nuevos componentes
testMatch: [
  'src/components/proyectos/equipos/**/*.test.{js,jsx,ts,tsx}',
  'src/lib/services/proyectoEquipo.test.ts',
  'src/app/api/proyecto-equipo/**/*.test.ts'
]
```

---

## 🧪 Testing Unitario

### Setup para Componentes de Equipos

```typescript
// src/__tests__/setup/equipos.setup.ts
import '@testing-library/jest-dom';
import { server } from '../mocks/server';

// Mock de servicios de equipos
jest.mock('@/lib/services/proyectoEquipo', () => ({
  getProyectoEquipos: jest.fn(),
  getProyectoEquipoById: jest.fn(),
}));

// Mock de componentes relacionados
jest.mock('@/components/proyectos/equipos/CrearListaMultipleModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: any) => isOpen ? <div data-testid="modal">Modal</div> : null
}));
```

### Ejemplos de Tests Unitarios

#### Testing del Accordion de Equipos

```typescript
// src/components/proyectos/equipos/ProyectoEquipoAccordion.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProyectoEquipoAccordion from './ProyectoEquipoAccordion';

const mockEquipo = {
  id: 'equipo-1',
  nombre: 'Grupo de Equipos Eléctricos',
  descripcion: 'Equipos eléctricos principales',
  responsable: { id: 'user-1', name: 'Juan Pérez' },
  subtotalCliente: 15000,
  subtotalInterno: 12000,
  items: [
    {
      id: 'item-1',
      descripcion: 'Transformador 100KVA',
      cantidad: 2,
      precioCliente: 5000,
      estado: 'pendiente',
      categoria: 'ELECTRICO'
    },
    {
      id: 'item-2',
      descripcion: 'Cable de cobre 4mm',
      cantidad: 100,
      precioCliente: 50,
      estado: 'en_lista',
      categoria: 'ELECTRICO'
    }
  ]
};

describe('ProyectoEquipoAccordion', () => {
  const mockProps = {
    equipo: mockEquipo,
    onItemChange: jest.fn(),
    onUpdatedNombre: jest.fn(),
    onDeletedGrupo: jest.fn(),
    onChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderizado Inicial', () => {
    it('debe mostrar el nombre del grupo de equipos', () => {
      render(<ProyectoEquipoAccordion {...mockProps} />);
      expect(screen.getByText('Grupo de Equipos Eléctricos')).toBeInTheDocument();
    });

    it('debe calcular y mostrar estadísticas correctas', () => {
      render(<ProyectoEquipoAccordion {...mockProps} />);

      expect(screen.getByText('2 ítems')).toBeInTheDocument();
      expect(screen.getByText('$15,000.00')).toBeInTheDocument();
      expect(screen.getByText('1/2 completados')).toBeInTheDocument();
    });

    it('debe mostrar el badge de progreso correcto', () => {
      render(<ProyectoEquipoAccordion {...mockProps} />);
      expect(screen.getByText('En progreso')).toBeInTheDocument();
    });
  });

  describe('Interacciones del Usuario', () => {
    it('debe expandir/colapsar al hacer click en el trigger', async () => {
      const user = userEvent.setup();
      render(<ProyectoEquipoAccordion {...mockProps} />);

      const trigger = screen.getByRole('button', { name: /Grupo de Equipos Eléctricos/ });

      // Inicialmente colapsado
      expect(screen.queryByText('Detalles del Grupo')).not.toBeInTheDocument();

      // Expandir
      await user.click(trigger);
      expect(screen.getByText('Detalles del Grupo')).toBeInTheDocument();

      // Colapsar
      await user.click(trigger);
      expect(screen.queryByText('Detalles del Grupo')).not.toBeInTheDocument();
    });

    it('debe mostrar botones de acción al expandir', async () => {
      const user = userEvent.setup();
      render(<ProyectoEquipoAccordion {...mockProps} />);

      await user.click(screen.getByRole('button', { name: /Grupo de Equipos Eléctricos/ }));

      expect(screen.getByText('Crear Lista Múltiple')).toBeInTheDocument();
      expect(screen.getByText('Crear Lista Inteligente')).toBeInTheDocument();
    });
  });

  describe('Cálculos de Progreso', () => {
    it('debe calcular progreso correctamente', () => {
      render(<ProyectoEquipoAccordion {...mockProps} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50'); // 1 de 2 completados = 50%
    });

    it('debe mostrar progreso 0% cuando no hay ítems completados', () => {
      const equipoSinCompletados = {
        ...mockEquipo,
        items: mockEquipo.items.map(item => ({ ...item, estado: 'pendiente' }))
      };

      render(<ProyectoEquipoAccordion {...mockProps} equipo={equipoSinCompletados} />);

      expect(screen.getByText('Sin iniciar')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('debe mostrar progreso 100% cuando todos los ítems están completados', () => {
      const equipoCompletado = {
        ...mockEquipo,
        items: mockEquipo.items.map(item => ({ ...item, estado: 'en_lista' }))
      };

      render(<ProyectoEquipoAccordion {...mockProps} equipo={equipoCompletado} />);

      expect(screen.getByText('Completado')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });
});
```

#### Testing del Modal de Creación de Listas

```typescript
// src/components/proyectos/equipos/CrearListaMultipleModal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CrearListaMultipleModal from './CrearListaMultipleModal';

const mockProyectoEquipo = {
  id: 'equipo-1',
  nombre: 'Grupo de Equipos Eléctricos',
  items: [
    {
      id: 'item-1',
      descripcion: 'Transformador 100KVA',
      codigo: 'TRF-100',
      cantidad: 2,
      precioCliente: 5000,
      categoria: 'ELECTRICO',
      unidad: 'UND'
    },
    {
      id: 'item-2',
      descripcion: 'Cable de cobre 4mm',
      codigo: 'CAB-4MM',
      cantidad: 100,
      precioCliente: 50,
      categoria: 'ELECTRICO',
      unidad: 'MTS'
    }
  ]
};

describe('CrearListaMultipleModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    proyectoEquipo: mockProyectoEquipo,
    proyectoId: 'proyecto-1',
    onDistribucionCompletada: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderizado Inicial', () => {
    it('debe mostrar el título del modal', () => {
      render(<CrearListaMultipleModal {...mockProps} />);
      expect(screen.getByText('Crear Lista Múltiple')).toBeInTheDocument();
    });

    it('debe cargar y mostrar items disponibles', async () => {
      render(<CrearListaMultipleModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Transformador 100KVA')).toBeInTheDocument();
        expect(screen.getByText('Cable de cobre 4mm')).toBeInTheDocument();
      });
    });

    it('debe mostrar estadísticas iniciales', () => {
      render(<CrearListaMultipleModal {...mockProps} />);
      expect(screen.getByText('2 disponibles')).toBeInTheDocument();
      expect(screen.getByText('0 seleccionados')).toBeInTheDocument();
    });
  });

  describe('Selección de Items', () => {
    it('debe permitir seleccionar items individualmente', async () => {
      const user = userEvent.setup();
      render(<CrearListaMultipleModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Transformador 100KVA')).toBeInTheDocument();
      });

      const checkbox = screen.getAllByRole('checkbox')[0];
      await user.click(checkbox);

      expect(screen.getByText('1 seleccionados')).toBeInTheDocument();
    });

    it('debe permitir seleccionar todos los items', async () => {
      const user = userEvent.setup();
      render(<CrearListaMultipleModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Transformador 100KVA')).toBeInTheDocument();
      });

      const selectAllButton = screen.getByText('Todos');
      await user.click(selectAllButton);

      expect(screen.getByText('2 seleccionados')).toBeInTheDocument();
    });

    it('debe permitir deseleccionar todos los items', async () => {
      const user = userEvent.setup();
      render(<CrearListaMultipleModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Transformador 100KVA')).toBeInTheDocument();
      });

      // Seleccionar todos primero
      await user.click(screen.getByText('Todos'));
      expect(screen.getByText('2 seleccionados')).toBeInTheDocument();

      // Deseleccionar todos
      const deselectAllButton = screen.getByRole('button', { name: /X/ });
      await user.click(deselectAllButton);

      expect(screen.getByText('0 seleccionados')).toBeInTheDocument();
    });
  });

  describe('Filtros y Búsqueda', () => {
    it('debe filtrar items por búsqueda de texto', async () => {
      const user = userEvent.setup();
      render(<CrearListaMultipleModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Transformador 100KVA')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Buscar por código, descripción, categoría...');
      await user.type(searchInput, 'Transformador');

      expect(screen.getByText('Transformador 100KVA')).toBeInTheDocument();
      expect(screen.queryByText('Cable de cobre 4mm')).not.toBeInTheDocument();
    });

    it('debe filtrar items por categoría', async () => {
      const user = userEvent.setup();
      render(<CrearListaMultipleModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Transformador 100KVA')).toBeInTheDocument();
      });

      // Asumiendo que hay un select de categoría
      const categorySelect = screen.getByRole('combobox', { name: /Categoría/ });
      await user.click(categorySelect);
      await user.click(screen.getByText('Eléctrico'));

      // Ambos items deberían estar visibles (ambos son eléctricos)
      expect(screen.getByText('Transformador 100KVA')).toBeInTheDocument();
      expect(screen.getByText('Cable de cobre 4mm')).toBeInTheDocument();
    });
  });

  describe('Agrupación por Categoría', () => {
    it('debe mostrar items agrupados por categoría cuando está activado', async () => {
      const user = userEvent.setup();
      render(<CrearListaMultipleModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Transformador 100KVA')).toBeInTheDocument();
      });

      const groupButton = screen.getByText('Agrupar');
      await user.click(groupButton);

      expect(screen.getByText('Eléctrico')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Badge con cantidad
    });
  });

  describe('Creación de Lista', () => {
    it('debe validar que se ingrese un nombre', async () => {
      const user = userEvent.setup();
      render(<CrearListaMultipleModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Transformador 100KVA')).toBeInTheDocument();
      });

      // Seleccionar un item
      const checkbox = screen.getAllByRole('checkbox')[0];
      await user.click(checkbox);

      // Limpiar el nombre
      const nameInput = screen.getByLabelText('Nombre *');
      await user.clear(nameInput);

      // Intentar crear lista
      const createButton = screen.getByText('Crear Lista (1)');
      await user.click(createButton);

      expect(screen.getByText('El nombre de la lista es obligatorio')).toBeInTheDocument();
    });

    it('debe crear lista exitosamente con items seleccionados', async () => {
      const user = userEvent.setup();
      render(<CrearListaMultipleModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Transformador 100KVA')).toBeInTheDocument();
      });

      // Seleccionar item
      const checkbox = screen.getAllByRole('checkbox')[0];
      await user.click(checkbox);

      // Verificar que el botón esté habilitado
      const createButton = screen.getByText('Crear Lista (1)');
      expect(createButton).not.toBeDisabled();

      // Mock de la API
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'lista-1', nombre: 'Lista de Equipos Eléctricos' })
        })
      );

      await user.click(createButton);

      expect(mockProps.onDistribucionCompletada).toHaveBeenCalledWith('lista-1');
    });
  });
});
```

---

## 🔗 Testing de Integración

### Testing de APIs de Proyecto-Equipo

```typescript
// src/__tests__/api/proyecto-equipo/[id].test.ts
import { GET } from '@/app/api/proyecto-equipo/[id]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

// Mocks
jest.mock('next-auth');
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('/api/proyecto-equipo/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock session por defecto
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: 'ADMIN'
      }
    });
  });

  describe('GET /api/proyecto-equipo/[id]', () => {
    it('debe retornar equipo con datos relacionados', async () => {
      // Mock Prisma
      const mockEquipo = {
        id: 'equipo-1',
        nombre: 'Grupo de Equipos Eléctricos',
        responsable: { id: 'user-1', name: 'Juan Pérez' },
        items: [
          {
            id: 'item-1',
            descripcion: 'Transformador 100KVA',
            catalogoEquipo: { id: 'cat-1', nombre: 'Transformador' },
            lista: null,
            listaEquipoSeleccionado: null,
            listaEquipos: []
          }
        ]
      };

      global.mockPrisma.proyectoEquipo.findUnique.mockResolvedValue(mockEquipo);

      const request = new NextRequest('http://localhost:3000/api/proyecto-equipo/equipo-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'equipo-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockEquipo);
      expect(global.mockPrisma.proyectoEquipo.findUnique).toHaveBeenCalledWith({
        where: { id: 'equipo-1' },
        include: {
          responsable: true,
          items: {
            include: {
              catalogoEquipo: true,
              lista: true,
              listaEquipoSeleccionado: true,
              listaEquipos: true
            }
          }
        }
      });
    });

    it('debe retornar 404 si el equipo no existe', async () => {
      global.mockPrisma.proyectoEquipo.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/proyecto-equipo/equipo-inexistente');
      const response = await GET(request, { params: Promise.resolve({ id: 'equipo-inexistente' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Equipo no encontrado');
    });

    it('debe requerir autenticación', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/proyecto-equipo/equipo-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'equipo-1' }) });

      expect(response.status).toBe(401);
    });
  });
});
```

### Testing de Servicios

```typescript
// src/__tests__/services/proyectoEquipo.test.ts
import {
  getProyectoEquipos,
  getProyectoEquipoById
} from '@/lib/services/proyectoEquipo';

// Mock fetch
global.fetch = jest.fn();

describe('ProyectoEquipo Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProyectoEquipos', () => {
    it('debe obtener equipos de un proyecto', async () => {
      const mockEquipos = [
        {
          id: 'equipo-1',
          nombre: 'Grupo Eléctrico',
          items: []
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEquipos)
      });

      const resultado = await getProyectoEquipos('proyecto-1');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/proyecto-equipo/from-proyecto/proyecto-1',
        { cache: 'no-store' }
      );
      expect(resultado).toEqual(mockEquipos);
    });

    it('debe retornar array vacío en caso de error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const resultado = await getProyectoEquipos('proyecto-1');

      expect(resultado).toEqual([]);
    });
  });

  describe('getProyectoEquipoById', () => {
    it('debe obtener un equipo específico por ID', async () => {
      const mockEquipo = {
        id: 'equipo-1',
        nombre: 'Grupo Eléctrico',
        items: []
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEquipo)
      });

      const resultado = await getProyectoEquipoById('equipo-1');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/proyecto-equipo/equipo-1',
        { cache: 'no-store' }
      );
      expect(resultado).toEqual(mockEquipo);
    });

    it('debe retornar null en caso de error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const resultado = await getProyectoEquipoById('equipo-1');

      expect(resultado).toBeNull();
    });
  });
});
```

---

## 🎭 Testing E2E

### Configuración Playwright para Equipos

```typescript
// src/__tests__/e2e/equipos-flow.test.ts
import { test, expect, Page } from '@playwright/test';

// Page Object Model para Equipos
class EquiposPage {
  constructor(private page: Page) {}

  async goto(proyectoId: string) {
    await this.page.goto(`/proyectos/${proyectoId}/equipos`);
  }

  async waitForLoad() {
    await this.page.waitForSelector('[data-testid="equipos-container"]');
  }

  async getStatsCards() {
    return {
      grupos: await this.page.textContent('[data-testid="stat-grupos"]'),
      items: await this.page.textContent('[data-testid="stat-items"]'),
      costo: await this.page.textContent('[data-testid="stat-costo"]'),
      progreso: await this.page.textContent('[data-testid="stat-progreso"]')
    };
  }

  async switchToTableView() {
    await this.page.click('[data-testid="view-table"]');
  }

  async switchToCardView() {
    await this.page.click('[data-testid="view-card"]');
  }

  async expandEquipoAccordion(equipoNombre: string) {
    await this.page.click(`[data-testid="accordion-${equipoNombre}"]`);
  }

  async openCrearListaModal(equipoNombre: string) {
    await this.page.click(`[data-testid="accordion-${equipoNombre}"]`);
    await this.page.click('[data-testid="btn-crear-lista-multiple"]');
  }

  async selectItemsInModal(items: string[]) {
    for (const item of items) {
      await this.page.check(`[data-testid="item-${item}"] input[type="checkbox"]`);
    }
  }

  async createLista(nombre: string) {
    await this.page.fill('[data-testid="input-nombre-lista"]', nombre);
    await this.page.click('[data-testid="btn-crear-lista"]');
  }
}

test.describe('Flujo de Gestión de Equipos', () => {
  let equiposPage: EquiposPage;

  test.beforeEach(async ({ page }) => {
    equiposPage = new EquiposPage(page);

    // Login como usuario con permisos
    await page.goto('/auth/signin');
    await page.fill('[data-testid="input-email"]', 'admin@gys.com');
    await page.fill('[data-testid="input-password"]', 'password123');
    await page.click('[data-testid="btn-signin"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('debe cargar la página de equipos correctamente', async ({ page }) => {
    await equiposPage.goto('proyecto-1');
    await equiposPage.waitForLoad();

    // Verificar título
    await expect(page.locator('h1')).toContainText('Equipos del Proyecto');

    // Verificar estadísticas
    const stats = await equiposPage.getStatsCards();
    expect(stats.grupos).toBeDefined();
    expect(stats.items).toBeDefined();
    expect(stats.costo).toBeDefined();
    expect(stats.progreso).toBeDefined();
  });

  test('debe alternar entre vistas tabla y tarjetas', async ({ page }) => {
    await equiposPage.goto('proyecto-1');
    await equiposPage.waitForLoad();

    // Vista tabla por defecto
    await expect(page.locator('[data-testid="equipos-table"]')).toBeVisible();

    // Cambiar a vista tarjetas
    await equiposPage.switchToCardView();
    await expect(page.locator('[data-testid="equipos-cards"]')).toBeVisible();

    // Cambiar de vuelta a tabla
    await equiposPage.switchToTableView();
    await expect(page.locator('[data-testid="equipos-table"]')).toBeVisible();
  });

  test('debe mostrar detalles de grupo de equipos al expandir', async ({ page }) => {
    await equiposPage.goto('proyecto-1');
    await equiposPage.waitForLoad();

    await equiposPage.expandEquipoAccordion('Grupo de Equipos Eléctricos');

    // Verificar que se muestran detalles
    await expect(page.locator('[data-testid="detalles-grupo"]')).toBeVisible();
    await expect(page.locator('[data-testid="barra-progreso"]')).toBeVisible();
    await expect(page.locator('[data-testid="btn-crear-lista-multiple"]')).toBeVisible();
  });

  test('debe crear lista técnica múltiple exitosamente', async ({ page }) => {
    await equiposPage.goto('proyecto-1');
    await equiposPage.waitForLoad();

    // Abrir modal de crear lista
    await equiposPage.openCrearListaModal('Grupo de Equipos Eléctricos');

    // Verificar modal abierto
    await expect(page.locator('[data-testid="modal-crear-lista"]')).toBeVisible();

    // Seleccionar items
    await equiposPage.selectItemsInModal(['item-1', 'item-2']);

    // Crear lista
    await equiposPage.createLista('Lista de Equipos Eléctricos');

    // Verificar navegación a la lista creada
    await expect(page).toHaveURL(/\/proyectos\/proyecto-1\/equipos\/listas\/.+/);

    // Verificar toast de éxito
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Lista creada exitosamente');
  });

  test('debe filtrar items en el modal de crear lista', async ({ page }) => {
    await equiposPage.goto('proyecto-1');
    await equiposPage.waitForLoad();

    await equiposPage.openCrearListaModal('Grupo de Equipos Eléctricos');

    // Buscar por texto
    await page.fill('[data-testid="input-buscar"]', 'Transformador');
    await expect(page.locator('[data-testid="item-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="item-2"]')).not.toBeVisible();

    // Limpiar búsqueda
    await page.fill('[data-testid="input-buscar"]', '');
    await expect(page.locator('[data-testid="item-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="item-2"]')).toBeVisible();
  });

  test('debe validar creación de lista sin nombre', async ({ page }) => {
    await equiposPage.goto('proyecto-1');
    await equiposPage.waitForLoad();

    await equiposPage.openCrearListaModal('Grupo de Equipos Eléctricos');

    // Seleccionar items pero no ingresar nombre
    await equiposPage.selectItemsInModal(['item-1']);
    await page.fill('[data-testid="input-nombre-lista"]', '');

    // Intentar crear
    await page.click('[data-testid="btn-crear-lista"]');

    // Verificar mensaje de error
    await expect(page.locator('[data-testid="error-nombre"]')).toContainText('obligatorio');
  });

  test('debe manejar errores de red graciosamente', async ({ page }) => {
    await equiposPage.goto('proyecto-1');
    await equiposPage.waitForLoad();

    // Simular error de red
    await page.route('**/api/proyecto-equipo/**', route => route.abort());

    await equiposPage.openCrearListaModal('Grupo de Equipos Eléctricos');

    // Verificar mensaje de error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('debe ser responsive en móvil', async ({ page }) => {
    // Cambiar a viewport móvil
    await page.setViewportSize({ width: 375, height: 667 });

    await equiposPage.goto('proyecto-1');
    await equiposPage.waitForLoad();

    // Verificar que los elementos se adaptan
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Verificar que las estadísticas están en una columna
    const statsContainer = page.locator('[data-testid="stats-container"]');
    const boundingBox = await statsContainer.boundingBox();
    expect(boundingBox?.width).toBeLessThan(400);
  });
});
```

---

## 📊 Scripts de Testing

### Comandos para Ejecutar Tests

```json
{
  "scripts": {
    "test:equipos": "jest --testPathPattern=equipos",
    "test:equipos:watch": "jest --testPathPattern=equipos --watch",
    "test:equipos:coverage": "jest --testPathPattern=equipos --coverage",
    "test:e2e:equipos": "playwright test equipos-flow.test.ts",
    "test:e2e:equipos:ui": "playwright test equipos-flow.test.ts --ui"
  }
}
```

### Cobertura Esperada

```javascript
// jest.config.js - Cobertura específica para equipos
coverageThreshold: {
  './src/components/proyectos/equipos/': {
    statements: 95,
    branches: 90,
    functions: 95,
    lines: 95
  },
  './src/lib/services/proyectoEquipo.ts': {
    statements: 95,
    branches: 90,
    functions: 95,
    lines: 95
  }
}
```

---

## 🎯 Checklist de Testing

### Pre-commit Checklist
- [ ] ✅ Tests unitarios de componentes pasan
- [ ] ✅ Tests de servicios pasan
- [ ] ✅ Cobertura >90% en módulos de equipos
- [ ] ✅ Linting sin errores en archivos nuevos
- [ ] ✅ TypeScript sin errores de tipo

### Pre-deployment Checklist
- [ ] ✅ Tests E2E de flujo de equipos pasan
- [ ] ✅ Tests de creación de listas pasan
- [ ] ✅ Tests responsive en móvil/tablet pasan
- [ ] ✅ Tests de accesibilidad pasan
- [ ] ✅ Tests de performance dentro de SLA

### Casos de Prueba Críticos
- [ ] ✅ Carga de página de equipos
- [ ] ✅ Cambio entre vistas tabla/tarjetas
- [ ] ✅ Expansión de accordions
- [ ] ✅ Creación de listas múltiples
- [ ] ✅ Filtrado y búsqueda de items
- [ ] ✅ Validaciones de formulario
- [ ] ✅ Manejo de errores de red
- [ ] ✅ Persistencia de datos

---

## 🚨 Troubleshooting

### Problemas Comunes

#### Error: "Items no se cargan en el modal"
```typescript
// Verificar que la API retorna datos correctos
console.log('Items disponibles:', itemsDisponibles);

// Verificar que el proyectoEquipo tiene items
console.log('Items en proyectoEquipo:', proyectoEquipo.items);
```

#### Error: "No se puede crear lista"
```typescript
// Verificar permisos de usuario
console.log('Usuario actual:', session?.user);

// Verificar que hay items seleccionados
console.log('Items seleccionados:', itemsSeleccionados);

// Verificar payload de API
console.log('Payload:', payload);
```

#### Error: "Progreso no se calcula correctamente"
```typescript
// Verificar estados de items
console.log('Estados de items:', equipo.items?.map(item => item.estado));

// Verificar cálculo manual
const completados = items.filter(item => item.estado === 'en_lista' || item.estado === 'reemplazado');
console.log('Items completados:', completados.length);
```

---

## 📚 Referencias

### Documentación Relacionada
- [GUIA_TESTING.md](../GUIA_TESTING.md) - Guía general de testing
- [FLUJO_TRABAJO_GYS.md](../FLUJO_TRABAJO_GYS.md) - Flujo de trabajo del sistema
- [ESTRUCTURA_PROYECTO.md](../ESTRUCTURA_PROYECTO.md) - Estructura del proyecto

### APIs Utilizadas
- `GET /api/proyecto-equipo/from-proyecto/:id` - Obtener equipos de proyecto
- `GET /api/proyecto-equipo/:id` - Obtener equipo específico
- `POST /api/lista-equipo/from-proyecto-equipo/distribuir` - Crear lista técnica

---

**Autor:** Kilo Code - Agente Senior Fullstack  
**Fecha:** Septiembre 2025  
**Versión:** 1.0.0