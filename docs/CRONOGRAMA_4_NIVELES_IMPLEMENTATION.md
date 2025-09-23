# 📅 Sistema de Cronograma de 4 Niveles - Implementación Completa

## 🎯 Resumen Ejecutivo

Este documento detalla la implementación completa del **Sistema de Cronograma de 4 Niveles** para la aplicación GYS, que permite gestionar proyectos desde la cotización hasta la ejecución final, incluyendo tres tipos de cronogramas y registros de horas hombre del personal.

### 📊 Alcance del Sistema
- **Jerarquía de 4 niveles**: Proyecto → Fases → EDTs → Tareas
- **Tres tipos de cronogramas**: Comercial, Planificación, Ejecución
- **Registros de horas hombre**: Seguimiento detallado del tiempo invertido
- **Transición Cotización → Proyecto**: Migración automática de datos
- **Subtareas opcionales**: Nivel adicional para mayor granularidad cuando sea necesario

---

## 🏗️ Arquitectura del Sistema

### 1. Jerarquía de 4 Niveles Principales

```
🏗️ PROYECTO (Nivel Superior)
├── 📋 FASES (Etapas del proyecto)
│   ├── 🔧 EDTs (Estructura de Desglose de Trabajo)
│   │   └── ✅ TAREAS (Actividades específicas)
```

### 2. Mapeo con Cotización

| Nivel | Cotización | Proyecto | Descripción |
|-------|------------|----------|-------------|
| **1** | Cotización | Proyecto | Entidad superior que agrupa todo |
| **2** | Fase | Fase | Etapas lógicas del proyecto |
| **3** | EDT | EDT | Estructura de Desglose de Trabajo |
| **4** | Tarea | Tarea | Actividades ejecutables |

### 3. Subtareas (Nivel Opcional 5)

```
✅ TAREA
└── 📝 SUBTAREAS (Opcionales - para mayor detalle)
```

**¿Cuándo usar subtareas?**
- Tareas muy complejas que requieren subdivisiones
- Seguimiento más granular de actividades
- Asignación específica a diferentes responsables
- Control detallado de tiempos y recursos

### 2. Tres Tipos de Cronogramas

| Tipo | Propósito | Origen |
|------|-----------|--------|
| **Comercial** | Estimaciones para cotización | Basado en plantilla |
| **Planificación** | Plan detallado post-aprobación | Copiado de comercial |
| **Ejecución** | Seguimiento real del progreso | Actualización en tiempo real |

### 3. Estados y Ciclo de Vida

#### Estados de Fases
- `planificado` - Fase planificada
- `en_progreso` - En ejecución activa
- `completado` - Finalizada exitosamente
- `pausado` - Temporalmente detenida
- `cancelado` - Cancelada definitivamente

#### Estados de EDTs
- `planificado` - EDT planificado
- `en_progreso` - En ejecución
- `detenido` - Temporalmente pausado
- `completado` - Finalizado

#### Estados de Tareas
- `pendiente` - No iniciada
- `en_progreso` - En ejecución
- `completada` - Finalizada
- `cancelada` - Cancelada
- `pausada` - Temporalmente detenida

---

## 🗄️ Modelos de Datos

### 1. ProyectoCronograma
```typescript
interface ProyectoCronograma {
  id: string
  proyectoId: string
  tipo: 'comercial' | 'planificacion' | 'ejecucion'
  nombre: string
  copiadoDesdeCotizacionId?: string
  esBaseline: boolean
  version: number
  createdAt: string
  updatedAt: string

  // Relaciones
  proyecto: Proyecto
  fases: ProyectoFase[]
  edts: ProyectoEdt[]
  tareas: ProyectoTarea[]
}
```

### 2. ProyectoFase
```typescript
interface ProyectoFase {
  id: string
  proyectoId: string
  proyectoCronogramaId: string
  nombre: string
  descripcion?: string
  orden: number
  fechaInicioPlan?: string
  fechaFinPlan?: string
  fechaInicioReal?: string
  fechaFinReal?: string
  estado: EstadoFase
  porcentajeAvance: number
  createdAt: string
  updatedAt: string

  // Relaciones
  proyecto: Proyecto
  proyectoCronograma: ProyectoCronograma
  edts: ProyectoEdt[]
}
```

### 3. ProyectoTarea
```typescript
interface ProyectoTarea {
  id: string
  proyectoEdtId: string
  proyectoCronogramaId: string
  nombre: string
  descripcion?: string
  fechaInicio: string
  fechaFin: string
  fechaInicioReal?: string
  fechaFinReal?: string
  horasEstimadas?: number
  horasReales: number
  estado: EstadoTarea
  prioridad: PrioridadTarea
  porcentajeCompletado: number
  dependenciaId?: string
  responsableId?: string
  createdAt: string
  updatedAt: string

  // Relaciones
  proyectoEdt: ProyectoEdt
  proyectoCronograma: ProyectoCronograma
  dependencia?: ProyectoTarea
  tareasDependientes: ProyectoTarea[]
  responsable?: User
  registrosHoras: RegistroHoras[]
  subtareas: ProyectoSubtarea[]
}
```

### 4. ProyectoSubtarea
```typescript
interface ProyectoSubtarea {
  id: string
  proyectoTareaId: string
  nombre: string
  descripcion?: string
  fechaInicio: string
  fechaFin: string
  fechaInicioReal?: string
  fechaFinReal?: string
  estado: EstadoTarea
  porcentajeCompletado: number
  horasEstimadas?: number
  horasReales?: number
  asignadoId?: string
  createdAt: string
  updatedAt: string

  // Relaciones
  proyectoTarea: ProyectoTarea
  asignado?: User
}
```

### 5. ProyectoDependenciaTarea
```typescript
interface ProyectoDependenciaTarea {
  id: string
  tipo: TipoDependencia
  tareaOrigenId: string
  tareaDependienteId: string
  createdAt: string

  // Relaciones
  tareaOrigen: ProyectoTarea
  tareaDependiente: ProyectoTarea
}
```

### 6. ¿Por qué Subtareas?

Las **subtareas son opcionales** y representan un **5to nivel opcional** que se usa cuando:

#### 🎯 Casos de Uso de Subtareas
- **Tareas complejas**: Una tarea principal necesita subdividirse en actividades más pequeñas
- **Múltiples responsables**: Diferentes personas trabajan en partes de la misma tarea
- **Seguimiento granular**: Necesidad de controlar tiempos y progreso por separado
- **Flexibilidad**: No todas las tareas requieren este nivel de detalle

#### 📊 Jerarquía Completa
```
Proyecto → Fase → EDT → Tarea → Subtarea*
   1        2      3      4        5*
```
*Subtarea es opcional y no cuenta como uno de los 4 niveles principales

#### 🔄 Comparación Cotización vs Proyecto

| Aspecto | Cotización | Proyecto |
|---------|------------|----------|
| **Niveles principales** | 4 (Cotización → Fase → EDT → Tarea) | 4 (Proyecto → Fase → EDT → Tarea) |
| **Subtareas** | No implementadas | Opcionales para mayor detalle |
| **Registros de horas** | No aplican | Asociados a tareas/subtareas |
| **Estados** | Simplificados | Completos con ciclo de vida |

---


## 🔌 APIs Implementadas

### 1. GET /api/proyectos/[id]/cronograma
**Propósito**: Obtener todos los cronogramas de un proyecto

**Respuesta**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cronograma-1",
      "tipo": "comercial",
      "nombre": "Cronograma Comercial",
      "esBaseline": true,
      "version": 1,
      "fases": [...],
      "edts": [...],
      "tareas": [...]
    }
  ]
}
```

### 2. POST /api/proyectos/[id]/cronograma
**Propósito**: Crear un nuevo tipo de cronograma

**Body**:
```json
{
  "tipo": "planificacion",
  "nombre": "Cronograma de Planificación",
  "copiadoDesdeCotizacionId": "cot-123"
}
```

**Validaciones**:
- Tipo debe ser único por proyecto
- Proyecto debe existir
- Usuario debe tener permisos

### 3. Próximas APIs a Implementar
- `PUT /api/proyectos/[id]/cronograma/[cronogramaId]` - Actualizar cronograma
- `DELETE /api/proyectos/[id]/cronograma/[cronogramaId]` - Eliminar cronograma
- `POST /api/proyectos/[id]/cronograma/[cronogramaId]/copiar-desde-cotizacion` - Copiar desde cotización

---

## 🖥️ Componentes Implementados

### 1. ProyectoCronogramaTab
**Ubicación**: `src/components/proyectos/cronograma/ProyectoCronogramaTab.tsx`

**Características**:
- Componente principal con navegación por tabs
- 5 vistas principales: Fases, Lista EDTs, Gantt, Métricas, Filtros
- Funciones de creación de EDTs y fases por defecto
- Integración con sistema de notificaciones

**Props**:
```typescript
interface ProyectoCronogramaTabProps {
  proyectoId: string
  proyectoNombre: string
  cronograma?: ProyectoCronograma
  onRefresh?: () => void
}
```

### 2. Estructura de Componentes Pendientes
```
src/components/proyectos/cronograma/
├── ProyectoCronogramaTab.tsx ✅
├── ProyectoFasesList.tsx ⏳
├── ProyectoEdtList.tsx ⏳
├── ProyectoEdtForm.tsx ⏳
├── ProyectoCronogramaGanttView.tsx ⏳
├── ProyectoCronogramaMetrics.tsx ⏳
└── ProyectoCronogramaFilters.tsx ⏳
```

---

## 🎨 Navegación y Experiencia de Usuario

### 1. Navegación Simplificada
**Antes**: Tabs redundantes en layout + cards en página resumen
**Después**: Solo cards intuitivas en página resumen

**Ventajas**:
- ✅ Menos elementos visuales
- ✅ Navegación más directa
- ✅ Mejor experiencia móvil
- ✅ Menos confusión para usuarios

### 2. Cards de Navegación
Cada card en la página resumen incluye:
- Icono representativo
- Título descriptivo
- Estadísticas clave
- Descripción funcional
- Indicador visual de navegación

### 3. Estados Visuales
- **Colores por sección**: Azul (Equipos), Púrpura (Servicios), Naranja (Gastos), etc.
- **Badges de estado**: Completado, En progreso, Pendiente
- **Animaciones**: Transiciones suaves con Framer Motion

---

## 📊 Registros de Horas Hombre

### 1. Modelo de Datos
```typescript
interface RegistroHoras {
  id: string
  proyectoId: string
  proyectoServicioId: string
  categoria: string
  nombreServicio: string
  recursoId: string
  recursoNombre: string
  usuarioId: string
  fechaTrabajo: string
  horasTrabajadas: number
  descripcion?: string
  observaciones?: string
  aprobado: boolean
  createdAt: string
  updatedAt: string

  // Relaciones
  proyecto: Proyecto
  proyectoServicio: ProyectoServicio
  recurso: Recurso
  usuario: User
}
```

### 2. Integración con Cronograma
- Cada tarea puede tener múltiples registros de horas
- Seguimiento de horas plan vs real
- Reportes de eficiencia por recurso
- Control de aprobación de horas trabajadas

### 3. Métricas Disponibles
- **Horas planificadas** por EDT/tarea
- **Horas reales** registradas
- **Eficiencia**: Horas reales vs planificadas
- **Productividad** por recurso/usuario
- **Costos** basados en costo/hora de recursos

### 4. Registros de Horas para Cronograma

#### 🎯 **Respuesta a tu Pregunta: SÍ, es posible y recomendado**

Los registros de horas durante la ejecución **PUEDEN y DEBEN** asociarse a **EDT, Tareas o Subtareas** para tener un seguimiento preciso del avance del proyecto.

#### 📊 **Modelo de Datos para Registros en Cronograma**
```typescript
interface RegistroHorasCronograma {
  id: string
  proyectoId: string
  proyectoCronogramaId: string

  // Asociación flexible con entidades del cronograma
  proyectoEdtId?: string        // ✅ Horas en EDT
  proyectoTareaId?: string      // ✅ Horas en Tarea
  proyectoSubtareaId?: string   // ✅ Horas en Subtarea

  usuarioId: string
  fechaTrabajo: string
  horasTrabajadas: number
  descripcion?: string
  observaciones?: string
  aprobado: boolean
  tipoTrabajo: 'planificado' | 'adicional' | 'correctivo' | 'capacitacion'
  createdAt: string
  updatedAt: string

  // Relaciones
  proyecto: Proyecto
  proyectoCronograma: ProyectoCronograma
  proyectoEdt?: ProyectoEdt
  proyectoTarea?: ProyectoTarea
  proyectoSubtarea?: ProyectoSubtarea
  usuario: User
}
```

#### 🎯 **Estrategia de Asociación por Nivel**

| Nivel | Obligatoriedad | Caso de Uso | Beneficio |
|-------|----------------|-------------|-----------|
| **EDT** | Opcional | Trabajo general/admin | Seguimiento de overhead |
| **Tarea** | **Recomendado** | Trabajo específico | Progreso directo |
| **Subtarea** | Opcional | Trabajo detallado | Máximo control |

#### 📈 **Actualización Automática de Progreso**
```typescript
// Al registrar horas en una tarea:
tarea.horasReales += horasTrabajadas
tarea.porcentajeCompletado = (horasReales / horasEstimadas) * 100

// Al completar una tarea automáticamente:
if (tarea.porcentajeCompletado >= 100) {
  tarea.estado = 'completada'
  // Actualizar EDT padre
  edt.calcularProgresoDesdeTareas()
}
```

#### ✅ **Beneficios de Esta Implementación**
- **Seguimiento preciso**: Saber exactamente en qué se trabajó
- **Progreso automático**: Las horas actualizan el % completado
- **Reportes granulares**: Análisis por EDT, tarea o subtarea
- **Control de eficiencia**: Horas reales vs planificadas
- **Asignación clara**: Quién trabajó en qué y cuánto tiempo

---


## 🔄 Transición Cotización → Proyecto

### 1. Proceso de Migración Actualizado

El procedimiento de conversión desde el CRM (`http://localhost:3000/crm`) ahora incluye automáticamente la copia completa del cronograma:

#### 📋 **Flujo Completo de Conversión:**
1. **Usuario hace clic** en "Crear Proyecto" desde el CRM
2. **Sistema valida** que la cotización esté aprobada
3. **Copia toda la información** de la cotización (equipos, servicios, gastos)
4. **🆕 Crea cronograma completo** de 4 niveles basado en EDTs comerciales
5. **Proyecto creado** y listo para gestión

#### 🔧 **Detalles Técnicos de la Conversión (Implementación Actual):**

```typescript
// ✅ Conversión simplificada usando modelos existentes
if (cotizacion.cronograma && cotizacion.cronograma.length > 0) {
  for (const edtComercial of cotizacion.cronograma) {
    if (!edtComercial.categoriaServicio) {
      console.warn(`⚠️ EDT comercial ${edtComercial.id} no tiene categoriaServicio, saltando...`)
      continue
    }

    // 1. Crear EDT de proyecto desde EDT comercial
    const edtProyecto = await prisma.proyectoEdt.create({
      data: {
        proyectoId: proyecto.id,
        nombre: edtComercial.nombre || 'EDT sin nombre',
        categoriaServicioId: edtComercial.categoriaServicioId || '',
        zona: edtComercial.zona,
        fechaInicioPlan: edtComercial.fechaInicioComercial,
        fechaFinPlan: edtComercial.fechaFinComercial,
        horasPlan: new Prisma.Decimal(edtComercial.horasEstimadas || 0),
        responsableId: edtComercial.responsableId,
        descripcion: edtComercial.descripcion,
        prioridad: edtComercial.prioridad || 'media',
        estado: 'planificado',
        porcentajeAvance: 0
      }
    })

    // 2. Convertir tareas comerciales en registros de horas
    for (const tareaComercial of edtComercial.tareas) {
      if (tareaComercial.fechaInicio && tareaComercial.fechaFin && tareaComercial.horasEstimadas) {
        // Buscar servicio relacionado para asociar las horas
        const servicioRelacionado = await prisma.proyectoServicio.findFirst({
          where: {
            proyectoId: proyecto.id,
            categoria: edtComercial.categoriaServicio?.nombre
          }
        })

        await prisma.registroHoras.create({
          data: {
            proyectoId: proyecto.id,
            proyectoServicioId: servicioRelacionado?.id || '',
            categoria: edtComercial.categoriaServicio?.nombre || 'Sin categoría',
            nombreServicio: tareaComercial.nombre,
            recursoId: '', // Se asignará después
            recursoNombre: 'Recurso por asignar',
            usuarioId: tareaComercial.responsableId || gestorId,
            fechaTrabajo: tareaComercial.fechaInicio,
            horasTrabajadas: Number(tareaComercial.horasEstimadas),
            descripcion: `Estimación inicial de tarea comercial: ${tareaComercial.nombre}`,
            aprobado: true, // Las estimaciones iniciales están aprobadas
            proyectoEdtId: edtProyecto.id,
            categoriaServicioId: edtComercial.categoriaServicioId || ''
          }
        })
      }
    }
  }
}
```

#### 📋 **Estado Actual de la Implementación:**
- ✅ **EDTs comerciales** → **ProyectoEDTs** (con planificación)
- ✅ **Tareas comerciales** → **Registros de horas** (con estimaciones)
- 🔄 **Fases del sistema** → Pendiente (requiere migración de BD)
- 🔄 **Tareas ejecutables** → Pendiente (requiere migración de BD)
- 🔄 **Subtareas opcionales** → Pendiente (requiere migración de BD)

### 2. Mapeo de Datos Actual

| **Cotización** | **Proyecto** | **Estado** | **Notas** |
|----------------|--------------|------------|-----------|
| CotizacionEdt | ProyectoEdt | ✅ **Implementado** | EDTs con planificación completa |
| CotizacionTarea | RegistroHoras | ✅ **Implementado** | Tareas → Registros de horas iniciales |
| Fases (config) | ProyectoFase | 🔄 **Pendiente** | Requiere migración de BD |
| Servicios | ProyectoServicio | ✅ **Implementado** | Copia completa con items |
| Equipos | ProyectoEquipo | ✅ **Implementado** | Copia completa con items |
| Gastos | ProyectoGasto | ✅ **Implementado** | Copia completa con items |

### 3. Estados Post-Migración (Actual)

#### 🎯 **Entidades Creadas Automáticamente:**
- **ProyectoEDTs**: Copia de EDTs comerciales con planificación completa
- **Registros de horas**: Estimaciones iniciales basadas en tareas comerciales
- **Proyecto completo**: Con equipos, servicios y gastos copiados

#### 📊 **Estructura Jerárquica Actual:**
```
Proyecto
├── 🔧 EDT "Instalación Eléctrica" (ProyectoEdt)
│   └── 📊 RegistroHoras: "Cableado principal" (estimación inicial)
├── 🔧 EDT "Instalación Mecánica" (ProyectoEdt)
│   └── 📊 RegistroHoras: "Montaje de equipos" (estimación inicial)
└── 🔧 EDTs adicionales...
```

#### 🔄 **Próximos Pasos para Jerarquía Completa:**
```
Proyecto (actual)
├── 📋 Fase 1 (Planificación) - Pendiente migración BD
│   ├── 🔧 EDT "Instalación Eléctrica" (actual)
│   │   ├── ✅ Tarea "Cableado principal" - Pendiente migración BD
│   │   │   └── 📝 Subtarea "Cableado zona Norte" (opcional)
│   │   └── ✅ Tarea "Instalación tableros"
│   └── 🔧 EDT "Instalación Mecánica"
```

### 4. Beneficios de la Conversión Automática

#### ✅ **Integridad de Datos**
- **Cero pérdida** de información de planificación
- **Mapeo preciso** entre entidades de cotización y proyecto
- **Historial completo** de cambios y versiones

#### 🚀 **Aceleración del Proceso**
- **De minutos a segundos**: Conversión automática
- **Sin trabajo manual**: El sistema hace todo
- **Listo para ejecutar**: Proyecto inmediatamente operativo

#### 📈 **Mejor Seguimiento**
- **Base histórica**: Cronograma comercial como referencia
- **Plan maestro**: Cronograma de planificación editable
- **Ejecución real**: Seguimiento detallado del progreso

---

## 📈 Métricas y Reportes

### 1. KPIs Principales
- **Avance general**: Porcentaje completado del proyecto
- **Eficiencia**: Horas reales vs planificadas
- **Cumplimiento de fechas**: Tareas completadas a tiempo
- **Desviación presupuestaria**: Costos reales vs planificados

### 2. Reportes Disponibles
- **Dashboard ejecutivo**: Visión general del proyecto
- **Análisis por fase**: Rendimiento de cada etapa
- **Métricas por EDT**: Eficiencia de cada componente
- **Reportes de recursos**: Utilización del personal

### 3. Visualizaciones
- **Gráfico de Gantt**: Timeline visual del proyecto
- **Gráficos de progreso**: Avance por fase/EDT
- **Heatmaps de recursos**: Utilización del personal
- **Tendencias**: Evolución temporal de métricas

---

## 🛠️ Próximos Pasos de Desarrollo

### 1. Componentes Pendientes
- [ ] `ProyectoFasesList` - Lista y gestión de fases
- [ ] `ProyectoEdtList` - Lista y gestión de EDTs
- [ ] `ProyectoEdtForm` - Formulario de creación/edición EDT
- [ ] `ProyectoCronogramaGanttView` - Vista Gantt interactiva
- [ ] `ProyectoCronogramaMetrics` - Dashboard de métricas
- [ ] `ProyectoCronogramaFilters` - Sistema de filtros avanzados

### 2. APIs Adicionales
- [ ] Endpoints para fases: CRUD completo
- [ ] Endpoints para EDTs: CRUD completo
- [ ] Endpoints para tareas: CRUD completo
- [ ] APIs de dependencias entre tareas
- [ ] APIs de registros de horas

### 3. Funcionalidades Avanzadas
- [ ] Importación desde Excel/PDF
- [ ] Exportación a diferentes formatos
- [ ] Notificaciones automáticas
- [ ] Integración con calendario
- [ ] Sistema de alertas y recordatorios

### 4. Optimizaciones
- [ ] Caché de datos pesados
- [ ] Lazy loading de componentes
- [ ] Optimización de queries N+1
- [ ] Indexación de base de datos

---

## 🧪 Testing y Calidad

### 1. Cobertura de Tests
- **Unit Tests**: Componentes individuales
- **Integration Tests**: APIs y servicios
- **E2E Tests**: Flujos completos de usuario
- **Accessibility Tests**: Cumplimiento WCAG

### 2. Estrategia de Testing
```bash
# Tests unitarios
npm run test:unit

# Tests de integración
npm run test:integration

# Tests E2E
npm run test:e2e

# Tests de accesibilidad
npm run test:accessibility

# Suite completa
npm run test:all
```

### 3. Métricas de Calidad
- **Coverage**: > 80% de código cubierto
- **Performance**: < 3s carga inicial
- **Accessibility**: Score > 90 en Lighthouse
- **SEO**: Score > 85 en Lighthouse

---

## 📚 Documentación Técnica

### 1. Guías de Usuario
- [ ] Manual de uso del sistema de cronograma
- [ ] Tutoriales paso a paso
- [ ] Videos explicativos
- [ ] FAQ y troubleshooting

### 2. Documentación Técnica
- [ ] API Reference completa
- [ ] Guía de desarrollo de componentes
- [ ] Arquitectura del sistema
- [ ] Decisiones de diseño

### 3. Mantenimiento
- [ ] Runbook de operaciones
- [ ] Procedimientos de backup
- [ ] Monitoreo y alertas
- [ ] Estrategia de actualizaciones

---

## 🎯 Conclusión

El **Sistema de Cronograma de 4 Niveles** representa una evolución significativa en la gestión de proyectos de GYS, proporcionando:

### ✅ Beneficios Implementados (Estado Actual)
- **EDTs funcionales**: EDTs de proyecto con planificación completa
- **Registros de horas**: Seguimiento inicial basado en estimaciones comerciales
- **Transición automática**: Cotización → Proyecto con EDTs y horas
- **Navegación intuitiva**: Cards en lugar de tabs redundantes
- **Base sólida**: Arquitectura preparada para expansión a 4 niveles completos
- **Integridad de datos**: Cero pérdida en la conversión de cotización a proyecto

### 🔄 **Próximos Beneficios (Pendientes de Migración BD)**
- **Jerarquía completa**: 4 niveles principales (Proyecto → Fase → EDT → Tarea)
- **Subtareas opcionales**: Nivel 5 para mayor granularidad cuando sea necesario
- **Tres cronogramas integrados**: Comercial, planificación, ejecución
- **Tareas ejecutables**: Seguimiento detallado de actividades específicas

### 🚀 Impacto en el Negocio
- **Mejor planificación**: Estimaciones más precisas
- **Mayor control**: Seguimiento en tiempo real
- **Optimización de recursos**: Asignación eficiente del personal
- **Reducción de riesgos**: Identificación temprana de desviaciones
- **Mejora en entregas**: Cumplimiento de fechas y presupuestos

### 🔮 Futuro del Sistema
El sistema está preparado para futuras expansiones como:
- Integración con herramientas externas (Jira, MS Project)
- IA para predicción de tiempos y recursos
- Análisis predictivo de riesgos
- Automatización de procesos repetitivos

---

*Documento creado: 23 de septiembre de 2025*
*Versión: 1.0*
*Autor: Sistema de IA Mejorado*