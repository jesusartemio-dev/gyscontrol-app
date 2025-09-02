# 📦 Componentes de Pedidos de Equipos

Este directorio contiene los componentes relacionados con la gestión de pedidos de equipos en el sistema GYS.

## 🧩 Componentes Principales

### PedidoEquipoFilters

**Ubicación:** `src/components/equipos/PedidoEquipoFilters.tsx`

**Descripción:** Componente de filtros avanzados para pedidos de equipos.

**Características:**
- ✅ Filtro por texto (código, descripción, observación)
- ✅ Filtro por estado (borrador, enviado, atendido, parcial, entregado)
- ✅ Filtro por responsable (carga usuarios dinámicamente)
- ✅ Filtros avanzados por rango de fechas
- ✅ Resumen visual de filtros activos
- ✅ Botón para limpiar todos los filtros

**Props:**
```typescript
interface Props {
  filters: PedidoEquipoFiltersState
  onFiltersChange: (filters: PedidoEquipoFiltersState) => void
  onClearFilters: () => void
}
```

**Uso:**
```tsx
import PedidoEquipoFilters, { defaultFilters } from '@/components/equipos/PedidoEquipoFilters'

const [filters, setFilters] = useState(defaultFilters)

<PedidoEquipoFilters
  filters={filters}
  onFiltersChange={setFilters}
  onClearFilters={() => setFilters(defaultFilters)}
/>
```

### PedidoEquipoListWithFilters

**Ubicación:** `src/components/equipos/PedidoEquipoListWithFilters.tsx`

**Descripción:** Componente completo que combina filtros, estadísticas y lista de pedidos.

**Características:**
- ✅ Integración completa con filtros
- ✅ Estadísticas en tiempo real por estado
- ✅ Carga automática de datos con filtros
- ✅ Estados de carga y error
- ✅ Estado vacío con sugerencias
- ✅ Botón de actualización manual
- ✅ Soporte para filtrado por proyecto

**Props:**
```typescript
interface Props {
  proyectoId?: string // Opcional: filtra por proyecto específico
  onUpdate?: (id: string, payload: PedidoEquipoUpdatePayload) => void
  onDelete?: (id: string) => void
  onUpdateItem?: (id: string, payload: PedidoEquipoItemUpdatePayload) => void
  onDeleteItem?: (id: string) => void
}
```

**Uso:**
```tsx
import PedidoEquipoListWithFilters from '@/components/equipos/PedidoEquipoListWithFilters'

// Para todos los pedidos
<PedidoEquipoListWithFilters
  onUpdate={handleUpdate}
  onDelete={handleDelete}
  onUpdateItem={handleUpdateItem}
  onDeleteItem={handleDeleteItem}
/>

// Para pedidos de un proyecto específico
<PedidoEquipoListWithFilters
  proyectoId="proyecto-123"
  onUpdate={handleUpdate}
  onDelete={handleDelete}
  onUpdateItem={handleUpdateItem}
  onDeleteItem={handleDeleteItem}
/>
```

## 🔧 Servicios Actualizados

### pedidoEquipo.ts

Se agregó soporte para filtros avanzados:

```typescript
// Nueva interfaz para filtros
export interface PedidoEquipoFilters {
  proyectoId?: string
  estado?: string
  responsableId?: string
  fechaDesde?: string
  fechaHasta?: string
  searchText?: string
}

// Nueva función para obtener pedidos con filtros
export async function getAllPedidoEquipos(filters: PedidoEquipoFilters = {}): Promise<PedidoEquipo[] | null>
```

### user.ts

Nuevo servicio para obtener usuarios:

```typescript
export async function getUsers(): Promise<User[] | null>
export async function getUserById(id: string): Promise<User | null>
```

## 🎯 API Actualizada

### GET /api/pedido-equipo

Se actualizó para soportar filtros avanzados:

**Parámetros de consulta:**
- `proyectoId`: Filtrar por proyecto
- `estado`: Filtrar por estado
- `responsableId`: Filtrar por responsable
- `fechaDesde`: Fecha desde (YYYY-MM-DD)
- `fechaHasta`: Fecha hasta (YYYY-MM-DD)
- `searchText`: Búsqueda en código, descripción y observación

**Ejemplo:**
```
GET /api/pedido-equipo?estado=enviado&responsableId=user123&searchText=urgente
```

## 📊 Estadísticas

El componente `PedidoEquipoListWithFilters` muestra estadísticas en tiempo real:

- **Total**: Número total de pedidos
- **Borradores**: Pedidos en estado borrador
- **Enviados**: Pedidos enviados
- **Atendidos**: Pedidos atendidos
- **Parciales**: Pedidos parcialmente entregados
- **Entregados**: Pedidos completamente entregados

## 🧪 Testing

Se incluyen tests completos para ambos componentes:

- `__tests__/PedidoEquipoFilters.test.tsx`
- `__tests__/PedidoEquipoListWithFilters.test.tsx`

**Ejecutar tests:**
```bash
npm test -- --testPathPattern=PedidoEquipo
```

## 🎨 Estilos y UX

### Filtros
- Diseño responsive con grid adaptativo
- Filtros básicos siempre visibles
- Filtros avanzados colapsables
- Resumen visual de filtros activos con chips de colores
- Botones de acción intuitivos

### Estadísticas
- Cards con iconos representativos
- Colores diferenciados por estado
- Layout responsive (2 columnas en móvil, 6 en desktop)

### Estados
- Loading con spinner animado
- Estado vacío con ilustración y sugerencias
- Manejo de errores con toast notifications

## 🔄 Flujo de Datos

1. **Inicialización**: Se cargan usuarios y pedidos iniciales
2. **Filtrado**: Los cambios en filtros disparan nueva consulta a la API
3. **Estadísticas**: Se calculan en tiempo real basadas en datos filtrados
4. **Acciones**: Las operaciones CRUD se manejan a través de callbacks
5. **Actualización**: Los datos se refrescan automáticamente tras operaciones

## 🚀 Mejoras Futuras

- [ ] Filtros por rango de fechas con calendario visual
- [ ] Exportación de datos filtrados a Excel
- [ ] Filtros guardados/favoritos
- [ ] Paginación para grandes volúmenes de datos
- [ ] Filtros por múltiples responsables
- [ ] Búsqueda avanzada con operadores lógicos
- [ ] Vista de tabla vs. vista de cards
- [ ] Ordenamiento personalizable

## 📝 Notas de Implementación

### Patrones Utilizados
- **Container/Presentational**: Separación clara entre lógica y presentación
- **Custom Hooks**: Para reutilización de lógica de filtros
- **Service Layer**: Servicios dedicados para API calls
- **TypeScript**: Tipado estricto para mayor seguridad

### Performance
- **Debouncing**: En filtros de texto para evitar consultas excesivas
- **Memoización**: Cálculo de estadísticas optimizado
- **Lazy Loading**: Carga de usuarios solo cuando es necesario

### Mantenibilidad
- **Componentes modulares**: Fácil reutilización y testing
- **Interfaces claras**: Contratos bien definidos
- **Documentación**: Comentarios y documentación completa
- **Tests**: Cobertura completa de funcionalidades

---

**Autor:** IA GYS + Jesús Artemio  
**Fecha:** 2025-01-27  
**Versión:** 1.0.0