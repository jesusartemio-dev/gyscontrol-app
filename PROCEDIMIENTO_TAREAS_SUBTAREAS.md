# 📋 Procedimiento de Implementación: Sistema de Tareas y Subtareas

## 🎯 Objetivo
Implementar un sistema completo de gestión de tareas y subtareas para el seguimiento de horas hombre en proyectos, con capacidades para integración de diagramas de Gantt.

---

## 🏗️ FASE 1: Definir Modelos Prisma

### 📝 Descripción
Crear los modelos de base de datos necesarios para el sistema de tareas y subtareas.

### 🎯 Objetivos
- Definir estructura de datos para tareas y subtareas
- Establecer relaciones con modelos existentes
- Configurar enums para estados y prioridades

### 📋 Tareas
1. **Modelo Tarea**
   - Campos: id, nombre, descripción, fechaInicio, fechaFin, estado, prioridad
   - Relaciones: ProyectoServicio, Usuario (responsable), Subtareas

2. **Modelo Subtarea**
   - Campos: id, nombre, descripción, fechaInicio, fechaFin, estado, horasEstimadas, horasReales
   - Relaciones: Tarea padre, Usuario asignado

3. **Modelo DependenciaTarea**
   - Campos: id, tareaOrigenId, tareaDependienteId, tipo
   - Relación: Tareas (origen y dependiente)

4. **Modelo AsignacionRecurso**
   - Campos: id, tareaId, usuarioId, rol, horasAsignadas
   - Relaciones: Tarea, Usuario

5. **Modelo RegistroProgreso**
   - Campos: id, tareaId, usuarioId, fecha, horasTrabajadas, descripcion, porcentajeCompletado
   - Relaciones: Tarea, Usuario

6. **Enums**
   - EstadoTarea: pendiente, en_proceso, completada, pausada, cancelada
   - PrioridadTarea: baja, media, alta, critica
   - TipoDependencia: finish_to_start, start_to_start, finish_to_finish, start_to_finish

### 📁 Archivos a Modificar
- `prisma/schema.prisma`

### ✅ Criterios de Aceptación
- [ ] Modelos definidos correctamente
- [ ] Relaciones establecidas con `@relation` y `onDelete: Cascade`
- [ ] Enums creados
- [ ] Migración generada sin errores

---

## 🏗️ FASE 2: Crear Tipos TypeScript

### 📝 Descripción
Definir interfaces y tipos TypeScript para el sistema de tareas.

### 🎯 Objetivos
- Crear interfaces para todos los modelos
- Definir tipos para payloads de API
- Establecer tipos para componentes UI

### 📋 Tareas
1. **Interfaces en modelos.ts**
   - Tarea, Subtarea, DependenciaTarea
   - AsignacionRecurso, RegistroProgreso
   - Tipos con relaciones incluidas

2. **Payloads en payloads.ts**
   - CreateTareaPayload, UpdateTareaPayload
   - CreateSubtareaPayload, UpdateSubtareaPayload
   - RegistroProgresoPayload

3. **Tipos para UI**
   - TareaWithSubtareas, TareaGanttData
   - FiltrosTarea, OrdenTarea

### 📁 Archivos a Crear/Modificar
- `src/types/modelos.ts`
- `src/types/payloads.ts`

### ✅ Criterios de Aceptación
- [ ] Interfaces definidas para todos los modelos
- [ ] Payloads para operaciones CRUD
- [ ] Tipos exportados correctamente
- [ ] Sin errores de TypeScript

---

## 🏗️ FASE 3: Implementar APIs REST

### 📝 Descripción
Crear endpoints REST para operaciones CRUD de tareas y subtareas.

### 🎯 Objetivos
- Implementar CRUD completo para tareas
- Implementar CRUD completo para subtareas
- Crear endpoints especializados para Gantt

### 📋 Tareas
1. **API Tareas**
   - `GET /api/tareas` - Listar tareas con filtros
   - `POST /api/tareas` - Crear tarea
   - `GET /api/tareas/[id]` - Obtener tarea específica
   - `PUT /api/tareas/[id]` - Actualizar tarea
   - `DELETE /api/tareas/[id]` - Eliminar tarea

2. **API Subtareas**
   - `GET /api/subtareas` - Listar subtareas
   - `POST /api/subtareas` - Crear subtarea
   - `PUT /api/subtareas/[id]` - Actualizar subtarea
   - `DELETE /api/subtareas/[id]` - Eliminar subtarea

3. **API Especializada**
   - `GET /api/tareas/gantt/[proyectoId]` - Datos para Gantt
   - `POST /api/tareas/progreso` - Registrar progreso
   - `GET /api/tareas/dependencias/[id]` - Obtener dependencias

### 📁 Archivos a Crear
- `src/app/api/tareas/route.ts`
- `src/app/api/tareas/[id]/route.ts`
- `src/app/api/subtareas/route.ts`
- `src/app/api/subtareas/[id]/route.ts`
- `src/app/api/tareas/gantt/[proyectoId]/route.ts`
- `src/app/api/tareas/progreso/route.ts`

### ✅ Criterios de Aceptación
- [ ] Todos los endpoints implementados
- [ ] Validación con Zod en cada endpoint
- [ ] Manejo de errores consistente
- [ ] Respuestas JSON estandarizadas
- [ ] Autorización por roles implementada

---

## 🏗️ FASE 4: Desarrollar Servicios de Negocio

### 📝 Descripción
Implementar la lógica de negocio para la gestión de tareas y subtareas.

### 🎯 Objetivos
- Crear servicios para operaciones complejas
- Implementar lógica de dependencias
- Desarrollar cálculos de progreso

### 📋 Tareas
1. **Servicio TareaService**
   - `getTareas()`, `createTarea()`, `updateTarea()`, `deleteTarea()`
   - `getTareasConSubtareas()`, `getTareasGantt()`
   - `calcularProgreso()`, `validarDependencias()`

2. **Servicio SubtareaService**
   - `getSubtareas()`, `createSubtarea()`, `updateSubtarea()`
   - `registrarProgreso()`, `calcularHorasReales()`

3. **Servicio DependenciaService**
   - `crearDependencia()`, `eliminarDependencia()`
   - `validarDependenciaCircular()`, `obtenerRutaCritica()`

### 📁 Archivos a Crear
- `src/lib/services/tareaService.ts`
- `src/lib/services/subtareaService.ts`
- `src/lib/services/dependenciaService.ts`

### ✅ Criterios de Aceptación
- [ ] Servicios implementados con manejo de errores
- [ ] Lógica de negocio encapsulada
- [ ] Funciones reutilizables
- [ ] Validaciones de integridad de datos

---

## 🏗️ FASE 5: Crear Componentes UI

### 📝 Descripción
Desarrollar componentes React para la interfaz de usuario del sistema de tareas.

### 🎯 Objetivos
- Crear componentes reutilizables
- Implementar diseño responsive
- Aplicar mejores prácticas UX/UI

### 📋 Tareas
1. **Componentes de Lista**
   - `TareaList` - Lista de tareas con filtros
   - `SubtareaAccordion` - Accordion de subtareas
   - `TareaCard` - Card individual de tarea

2. **Componentes de Formulario**
   - `TareaForm` - Formulario crear/editar tarea
   - `SubtareaForm` - Formulario crear/editar subtarea
   - `ProgresoForm` - Formulario registro de progreso

3. **Componentes Especializados**
   - `GanttChart` - Diagrama de Gantt básico
   - `DependenciaManager` - Gestor de dependencias
   - `RecursoAssigner` - Asignador de recursos

4. **Componentes de Estado**
   - `EstadoBadge` - Badge de estado
   - `PrioridadIndicator` - Indicador de prioridad
   - `ProgresoBar` - Barra de progreso

### 📁 Archivos a Crear
- `src/components/proyectos/tareas/TareaList.tsx`
- `src/components/proyectos/tareas/TareaForm.tsx`
- `src/components/proyectos/tareas/SubtareaAccordion.tsx`
- `src/components/proyectos/tareas/GanttChart.tsx`
- `src/components/proyectos/tareas/EstadoBadge.tsx`

### ✅ Criterios de Aceptación
- [ ] Componentes responsive implementados
- [ ] Validación de formularios con React Hook Form + Zod
- [ ] Estados de carga y error manejados
- [ ] Animaciones con Framer Motion
- [ ] Accesibilidad implementada

---

## 🏗️ FASE 6: Implementar Páginas y Navegación

### 📝 Descripción
Crear las páginas principales del sistema de tareas y configurar la navegación.

### 🎯 Objetivos
- Implementar páginas principales
- Configurar rutas anidadas
- Establecer breadcrumbs

### 📋 Tareas
1. **Páginas Principales**
   - `/proyectos/[id]/tareas` - Lista de tareas del proyecto
   - `/proyectos/[id]/tareas/[tareaId]` - Detalle de tarea
   - `/proyectos/[id]/tareas/nueva` - Crear nueva tarea
   - `/proyectos/[id]/tareas/gantt` - Vista Gantt

2. **Layouts**
   - Layout específico para tareas
   - Breadcrumb navigation
   - Sidebar contextual

### 📁 Archivos a Crear
- `src/app/proyectos/[id]/tareas/page.tsx`
- `src/app/proyectos/[id]/tareas/[tareaId]/page.tsx`
- `src/app/proyectos/[id]/tareas/nueva/page.tsx`
- `src/app/proyectos/[id]/tareas/gantt/page.tsx`
- `src/app/proyectos/[id]/tareas/layout.tsx`

### ✅ Criterios de Aceptación
- [ ] Páginas implementadas con Server Components
- [ ] Navegación fluida entre vistas
- [ ] Breadcrumbs funcionales
- [ ] Loading states implementados

---

## 🏗️ FASE 7: Configurar Rutas y Autorización

### 📝 Descripción
Configurar el sistema de navegación y permisos para el módulo de tareas.

### 🎯 Objetivos
- Agregar rutas al sidebar
- Configurar permisos por rol
- Implementar middleware de autorización

### 📋 Tareas
1. **Configuración Sidebar**
   - Agregar sección "Tareas" en proyectos
   - Configurar iconos y rutas
   - Establecer permisos por rol

2. **Middleware**
   - Validar acceso a rutas de tareas
   - Verificar permisos de proyecto
   - Implementar redirecciones

### 📁 Archivos a Modificar
- `src/components/Sidebar.tsx`
- `src/middleware.ts`
- `src/lib/auth.ts`

### ✅ Criterios de Aceptación
- [ ] Rutas visibles según rol de usuario
- [ ] Middleware de autorización funcional
- [ ] Redirecciones apropiadas
- [ ] Iconos y navegación intuitiva

---

## 🏗️ FASE 8: Crear Tests Unitarios e Integración

### 📝 Descripción
Implementar suite completa de tests para garantizar la calidad del código.

### 🎯 Objetivos
- Crear tests unitarios para servicios
- Implementar tests de componentes
- Desarrollar tests de integración API

### 📋 Tareas
1. **Tests de Servicios (Server)**
   - `tareaService.test.ts`
   - `subtareaService.test.ts`
   - `dependenciaService.test.ts`

2. **Tests de APIs (Server)**
   - `tareas/route.test.ts`
   - `subtareas/route.test.ts`
   - Tests de endpoints especializados

3. **Tests de Componentes (Client)**
   - `TareaList.test.tsx`
   - `TareaForm.test.tsx`
   - `GanttChart.test.tsx`

4. **Tests de Hooks (Client)**
   - `useTareas.test.ts`
   - `useGantt.test.ts`

### 📁 Archivos a Crear
- `src/__tests__/services/tareaService.test.ts`
- `src/__tests__/api/tareas/route.test.ts`
- `src/components/proyectos/tareas/__tests__/TareaList.test.tsx`
- `src/hooks/__tests__/useTareas.test.ts`

### ✅ Criterios de Aceptación
- [ ] Cobertura ≥90% statements
- [ ] Cobertura ≥85% branches
- [ ] Cobertura ≥90% functions
- [ ] Tests pasan en CI/CD
- [ ] Mocks apropiados para Prisma y NextAuth

---

## 📊 Resumen de Entregables

### 🗃️ Base de Datos
- 5 nuevos modelos Prisma
- 3 enums para estados y tipos
- Relaciones con modelos existentes

### 🔌 APIs
- 6 endpoints REST principales
- 3 endpoints especializados
- Validación completa con Zod

### 🧩 Servicios
- 3 servicios de negocio
- Lógica de dependencias
- Cálculos de progreso

### 🎨 Componentes UI
- 10+ componentes React
- Diseño responsive
- Animaciones y accesibilidad

### 📱 Páginas
- 4 páginas principales
- Layout especializado
- Navegación integrada

### 🧪 Testing
- 15+ archivos de test
- Cobertura >90%
- Tests client y server

---

## 🚀 Comandos de Ejecución

```bash
# Generar migración de base de datos
npx prisma migrate dev --name add-tareas-system

# Generar cliente Prisma
npx prisma generate

# Ejecutar tests
npm run test:client  # Tests de componentes y hooks
npm run test:server  # Tests de servicios y APIs
npm run test:ci      # Todos los tests con cobertura

# Desarrollo
npm run dev
```

---

## 📋 Checklist General

- [ ] **FASE 1**: Modelos Prisma definidos
- [ ] **FASE 2**: Tipos TypeScript creados
- [ ] **FASE 3**: APIs REST implementadas
- [ ] **FASE 4**: Servicios de negocio desarrollados
- [ ] **FASE 5**: Componentes UI creados
- [ ] **FASE 6**: Páginas y navegación implementadas
- [ ] **FASE 7**: Rutas y autorización configuradas
- [ ] **FASE 8**: Tests unitarios e integración completados

---

## 🎯 Próximos Pasos Sugeridos

1. **Integración Gantt Avanzada**: Implementar biblioteca especializada como `@gantt-task-react/gantt-task-react`
2. **Notificaciones**: Sistema de notificaciones para cambios de estado
3. **Reportes**: Dashboards de productividad y métricas
4. **Mobile**: Optimización para dispositivos móviles
5. **Tiempo Real**: WebSockets para colaboración en tiempo real

---

*Documento generado siguiendo el FLUJO_GYS y estándares enterprise del Sistema GYS*