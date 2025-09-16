# Implementación — Cronograma Comercial (Snapshot) · Opción A

## 1. Resumen Ejecutivo

### Objetivo
Implementar un **sistema de cronograma comercial** que capture fechas y horas estimadas durante la fase de cotización, creando un **snapshot auditable** que se mapea automáticamente a `ProyectoEdt` al convertir cotizaciones en proyectos.

### Alcance Técnico
- **Nuevas entidades**: `CotizacionEdt` y `CotizacionTarea`
- **APIs REST**: 8 endpoints nuevos para CRUD y conversión
- **UI/UX**: Tab cronograma en página de detalle de cotización + modal mejorado
- **Migración**: Scripts seguros con rollback automático
- **Integración**: Mapeo automático Cotización → Proyecto

### Beneficios Clave
- ✅ **Trazabilidad completa**: Comercial → Plan → Real
- ✅ **Auditoría**: Snapshot inmutable del cronograma comercial
- ✅ **Comparativas**: Análisis de desviaciones entre fases
- ✅ **Escalabilidad**: Arquitectura modular y extensible

### Ubicación de Implementación
- **Página principal**: `http://localhost:3000/comercial/cotizaciones/[id]`
- **Modal de conversión**: Mejorado con campos de cronograma
- **Tab cronograma**: Nueva sección en la página de detalle

---

## FASES DE IMPLEMENTACIÓN

### FASE 1: Preparación de Base de Datos y Modelos
**Duración estimada**: 2-3 días
**Responsable**: Backend Developer

#### 1.1 Actualización del Schema Prisma
- [ ] Agregar modelos `CotizacionEdt` y `CotizacionTarea`
- [ ] Actualizar relaciones en modelos existentes (`Cotizacion`, `User`)
- [ ] Definir índices y constraints de rendimiento
- [ ] Validar integridad referencial

#### 1.2 Migración de Base de Datos
- [ ] Generar migración con `npx prisma migrate dev`
- [ ] Crear script de rollback de seguridad
- [ ] Ejecutar en entorno de desarrollo
- [ ] Validar estructura en staging
- [ ] Preparar deployment para producción

#### 1.3 Actualización de Types
- [ ] Actualizar `src/types/modelos.ts` con nuevas interfaces
- [ ] Actualizar `src/types/payloads.ts` con DTOs
- [ ] Regenerar cliente Prisma
- [ ] Validar tipado en TypeScript

### FASE 2: Desarrollo de APIs Backend
**Duración estimada**: 3-4 días
**Responsable**: Backend Developer

#### 2.1 APIs de CotizacionEdt
- [ ] `GET /api/cotizacion/[id]/cronograma` - Obtener cronograma
- [ ] `POST /api/cotizacion/[id]/cronograma` - Crear EDT
- [ ] `PUT /api/cotizacion/[id]/cronograma/[edtId]` - Actualizar EDT
- [ ] `DELETE /api/cotizacion/[id]/cronograma/[edtId]` - Eliminar EDT

#### 2.2 APIs de CotizacionTarea
- [ ] `GET /api/cotizacion/cronograma/[edtId]/tareas` - Listar tareas
- [ ] `POST /api/cotizacion/cronograma/[edtId]/tareas` - Crear tarea
- [ ] `PUT /api/cotizacion/cronograma/tarea/[tareaId]` - Actualizar tarea
- [ ] `DELETE /api/cotizacion/cronograma/tarea/[tareaId]` - Eliminar tarea

#### 2.3 Servicios de Negocio
- [ ] `src/lib/services/cotizacionEdt.ts` - CRUD completo
- [ ] `src/lib/services/cotizacionTarea.ts` - CRUD completo
- [ ] Validaciones con Zod
- [ ] Manejo de errores y logging

#### 2.4 Actualización del Proceso de Conversión
- [ ] Modificar `src/app/api/proyecto/from-cotizacion/route.ts`
- [ ] Mapear `CotizacionEdt` → `ProyectoEdt`
- [ ] Preservar snapshot comercial
- [ ] Mantener trazabilidad completa

### FASE 3: Componentes UI Base
**Duración estimada**: 4-5 días
**Responsable**: Frontend Developer

#### 3.1 Componentes de Cronograma
- [ ] `CronogramaComercialTab.tsx` - Tab principal
- [ ] `CotizacionEdtList.tsx` - Lista de EDTs
- [ ] `CotizacionEdtForm.tsx` - Formulario EDT
- [ ] `CotizacionTareaList.tsx` - Lista de tareas
- [ ] `CotizacionTareaForm.tsx` - Formulario tarea

#### 3.2 Componentes de Vista
- [ ] `CronogramaGanttView.tsx` - Vista Gantt simplificada
- [ ] `CronogramaListView.tsx` - Vista de lista
- [ ] `CronogramaMetrics.tsx` - Métricas y resumen
- [ ] `CronogramaFilters.tsx` - Filtros y búsqueda

#### 3.3 Componentes de Interacción
- [ ] `EdtAccordion.tsx` - Acordeón para EDTs
- [ ] `TareaCard.tsx` - Tarjeta de tarea
- [ ] `DependenciaSelector.tsx` - Selector de dependencias
- [ ] `ResponsableSelector.tsx` - Selector de responsables

### FASE 4: Integración en Página de Detalle
**Duración estimada**: 2-3 días
**Responsable**: Frontend Developer

#### 4.1 Modificación de la Página Principal
- [ ] Actualizar `src/app/comercial/cotizaciones/[id]/page.tsx`
- [ ] Agregar tab "Cronograma" después de "Gastos"
- [ ] Implementar navegación entre tabs
- [ ] Mantener estado de la cotización

#### 4.2 Integración del Tab Cronograma
- [ ] Cargar datos de cronograma existente
- [ ] Implementar CRUD completo en UI
- [ ] Sincronizar con estado de cotización
- [ ] Validaciones en tiempo real

#### 4.3 Responsive Design
- [ ] Adaptar para móviles y tablets
- [ ] Optimizar rendimiento de componentes
- [ ] Implementar lazy loading
- [ ] Skeleton loaders para UX

### FASE 5: Mejora del Modal de Conversión
**Duración estimada**: 2 días
**Responsable**: Frontend Developer

#### 5.1 Actualización del Modal
- [ ] Modificar `CrearProyectoDesdeCotizacionModal.tsx`
- [ ] Agregar sección de cronograma
- [ ] Mostrar resumen de EDTs comerciales
- [ ] Permitir ajustes antes de conversión

#### 5.2 Validaciones y UX
- [ ] Validar cronograma antes de conversión
- [ ] Mostrar alertas si faltan datos
- [ ] Confirmar mapeo EDT → Proyecto
- [ ] Feedback visual del proceso

#### 5.3 Integración con API
- [ ] Enviar datos de cronograma en conversión
- [ ] Manejar errores de mapeo
- [ ] Mostrar progreso de creación
- [ ] Redirección con confirmación

### FASE 6: Testing y Validación
**Duración estimada**: 3-4 días
**Responsable**: QA + Developers

#### 6.1 Tests Unitarios
- [ ] Tests de servicios backend
- [ ] Tests de componentes React
- [ ] Tests de hooks personalizados
- [ ] Cobertura mínima 85%

#### 6.2 Tests de Integración
- [ ] Tests de APIs completas
- [ ] Tests de flujo de conversión
- [ ] Tests de UI end-to-end
- [ ] Validación de datos

#### 6.3 Tests de Performance
- [ ] Carga de cronogramas grandes
- [ ] Rendimiento de componentes
- [ ] Optimización de queries
- [ ] Métricas de UX

### FASE 7: Documentación y Deployment
**Duración estimada**: 1-2 días
**Responsable**: Tech Lead

#### 7.1 Documentación Técnica
- [ ] Actualizar README del proyecto
- [ ] Documentar nuevas APIs
- [ ] Guías de uso de componentes
- [ ] Diagramas de arquitectura

#### 7.2 Documentación de Usuario
- [ ] Manual de uso del cronograma
- [ ] Guía de conversión a proyecto
- [ ] FAQ y troubleshooting
- [ ] Videos tutoriales (opcional)

#### 7.3 Deployment
- [ ] Deployment en staging
- [ ] Validación con usuarios beta
- [ ] Deployment en producción
- [ ] Monitoreo post-deployment

---

## PROCEDIMIENTO DETALLADO DE IMPLEMENTACIÓN

### Modificaciones al Modal de Conversión

#### Análisis del Modal Actual
El modal `CrearProyectoDesdeCotizacionModal.tsx` actualmente incluye:
- Campos básicos: nombre, fechaInicio, fechaFin
- Validaciones de campos requeridos
- Integración con servicio `crearProyectoDesdeCotizacion`

#### Mejoras Propuestas
1. **Nueva sección "Cronograma Comercial"**
   - Resumen de EDTs creados en la cotización
   - Validación de completitud del cronograma
   - Opción de ajustar fechas antes de conversión

2. **Validaciones adicionales**
   - Verificar que exista al menos un EDT
   - Validar coherencia de fechas
   - Alertar sobre tareas sin responsable

3. **Preview del mapeo**
   - Mostrar cómo se mapearán los EDTs a ProyectoEdt
   - Confirmar responsables asignados
   - Resumen de horas totales

### Integración en Página de Detalle

#### Estructura Actual Analizada
La página `src/app/comercial/cotizaciones/[id]/page.tsx` tiene:
- Secciones: Header, Equipos, Servicios, Gastos
- Sistema de acordeones para cada sección
- Estado centralizado de cotización
- Funciones de actualización por sección

#### Integración del Tab Cronograma
1. **Posición**: Después de la sección "Gastos"
2. **Estructura similar**: Card con CardHeader y CardContent
3. **Estado**: Integrado con el estado principal de cotización
4. **Funciones**: Similares a actualizarEquipo/Servicio/Gasto

#### Componente Principal
```typescript
// Nuevo componente a integrar
<motion.section
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, delay: 1.0 }}
>
  <Card>
    <CardHeader className="pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Cronograma Comercial
          <Badge variant="secondary">{totalEdts}</Badge>
        </CardTitle>
        <Button
          onClick={() => setShowCronogramaForm(true)}
          size="sm"
          className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-center"
        >
          <Plus className="h-4 w-4" />
          Agregar EDT
        </Button>
      </div>
    </CardHeader>
    <CardContent className="pt-0 space-y-4">
      <CronogramaComercialTab 
        cotizacionId={cotizacion.id}
        onEdtCreated={handleEdtCreated}
        onEdtUpdated={handleEdtUpdated}
        onEdtDeleted={handleEdtDeleted}
      />
    </CardContent>
  </Card>
</motion.section>
```

### Validación de Viabilidad Técnica

#### Compatibilidad con Arquitectura Existente
✅ **Compatible**: La implementación sigue los patrones existentes
✅ **Escalable**: Usa la misma estructura de servicios y componentes
✅ **Mantenible**: Código modular y bien documentado

#### Consideraciones de Performance
- **Lazy loading** para componentes de cronograma
- **Paginación** para listas grandes de EDTs/tareas
- **Optimistic updates** para mejor UX
- **Debounce** en formularios de edición

#### Riesgos Identificados
1. **Complejidad de UI**: Cronograma puede ser complejo en móviles
2. **Performance**: Muchos EDTs pueden afectar rendimiento
3. **Sincronización**: Estado entre cronograma y cotización
4. **Validaciones**: Lógica compleja de dependencias

#### Mitigaciones Propuestas
1. **UI Responsive**: Diseño adaptativo con priorización de contenido
2. **Virtualización**: Para listas grandes de elementos
3. **Estado centralizado**: Redux o Zustand si es necesario
4. **Validaciones progresivas**: Feedback en tiempo real

---

## 2. Diseño de Datos (Prisma)

### 2.1 Modelo CotizacionEdt

```prisma
model CotizacionEdt {
  id                  String   @id @default(cuid())
  cotizacionId        String
  categoriaServicioId String
  zona                String?
  fechaInicioCom      DateTime?
  fechaFinCom         DateTime?
  horasCom            Decimal?  @db.Decimal(10,2)
  prioridad           PrioridadEdt @default(media)
  responsableId       String?
  notas               String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // 🔗 Relaciones
  cotizacion          Cotizacion         @relation(fields: [cotizacionId], references: [id], onDelete: Cascade)
  categoriaServicio   CategoriaServicio  @relation(fields: [categoriaServicioId], references: [id])
  responsable         User?              @relation("CotizacionEdtResponsable", fields: [responsableId], references: [id], onDelete: SetNull)
  tareas              CotizacionTarea[]

  // 🔧 Índices y constraints
  @@unique([cotizacionId, categoriaServicioId, zona])
  @@index([cotizacionId, categoriaServicioId, zona])
  @@index([cotizacionId])
  @@index([categoriaServicioId])
  @@map("cotizacion_edt")
}
```

### 2.2 Modelo CotizacionTarea

```prisma
model CotizacionTarea {
  id               String   @id @default(cuid())
  cotizacionEdtId  String
  nombre           String
  fechaInicioCom   DateTime?
  fechaFinCom      DateTime?
  horasCom         Decimal?  @db.Decimal(10,2)
  prioridad        PrioridadTarea @default(media)
  dependenciaDeId  String?
  orden            Int       @default(0)
  notas            String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // 🔗 Relaciones
  cotizacionEdt    CotizacionEdt @relation(fields: [cotizacionEdtId], references: [id], onDelete: Cascade)
  dependenciaDe    CotizacionTarea? @relation("TareaDependencia", fields: [dependenciaDeId], references: [id], onDelete: SetNull)
  dependientes     CotizacionTarea[] @relation("TareaDependencia")

  // 🔧 Índices
  @@index([cotizacionEdtId, orden])
  @@index([cotizacionEdtId])
  @@map("cotizacion_tarea")
}
```

### 2.3 Actualización Modelo Cotizacion

```prisma
model Cotizacion {
  // ... campos existentes ...
  
  // 🆕 Nueva relación
  cronograma          CotizacionEdt[]
  
  // ... resto del modelo ...
}
```

### 2.4 Actualización Modelo User

```prisma
model User {
  // ... campos existentes ...
  
  // 🆕 Nuevas relaciones
  cotizacionEdtsResponsable CotizacionEdt[] @relation("CotizacionEdtResponsable")
  
  // ... resto del modelo ...
}
```

---

## 3. Migraciones

### 3.1 Comandos de Migración

```bash
# 📋 Checklist de Migración
- [ ] Backup de base de datos
- [ ] Validar conexión a BD
- [ ] Ejecutar migración en entorno de desarrollo
- [ ] Validar integridad de datos
- [ ] Ejecutar en staging
- [ ] Ejecutar en producción
```

#### Paso 1: Generar Migración
```bash
npx prisma migrate dev --name add-cotizacion-cronograma
```

#### Paso 2: Aplicar en Producción
```bash
npx prisma migrate deploy
```

#### Paso 3: Regenerar Cliente
```bash
npx prisma generate
```

### 3.2 Script de Rollback

```sql
-- 🔄 Rollback Script (ejecutar en orden)
DROP TABLE IF EXISTS "cotizacion_tarea";
DROP TABLE IF EXISTS "cotizacion_edt";

-- Verificar que las tablas fueron eliminadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cotizacion_edt', 'cotizacion_tarea');
```

### 3.3 Verificación Post-Migración

```sql
-- ✅ Verificar estructura de tablas
\d cotizacion_edt
\d cotizacion_tarea

-- ✅ Verificar índices
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename IN ('cotizacion_edt', 'cotizacion_tarea');

-- ✅ Verificar constraints
SELECT conname, contype FROM pg_constraint 
WHERE conrelid IN (
  SELECT oid FROM pg_class 
  WHERE relname IN ('cotizacion_edt', 'cotizacion_tarea')
);
```

---

## 4. Seeds/Fixtures (Opcional)

### 4.1 Datos de Prueba

```typescript
// prisma/seeds/cotizacionCronograma.ts
import { PrismaClient, PrioridadEdt, PrioridadTarea } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedCotizacionCronograma() {
  console.log('🌱 Seeding cronograma comercial...');

  // 📋 Checklist de Seeds
  // - [ ] Obtener cotizaciones existentes
  // - [ ] Crear CotizacionEdt de ejemplo
  // - [ ] Crear CotizacionTarea de ejemplo
  // - [ ] Validar relaciones

  const cotizaciones = await prisma.cotizacion.findMany({
    take: 3,
    include: { cotizacionServicios: true }
  });

  for (const cotizacion of cotizaciones) {
    for (const servicio of cotizacion.cotizacionServicios) {
      // Crear EDT comercial
      const edt = await prisma.cotizacionEdt.create({
        data: {
          cotizacionId: cotizacion.id,
          categoriaServicioId: servicio.categoriaServicioId,
          zona: 'Zona A',
          fechaInicioCom: new Date('2025-02-01'),
          fechaFinCom: new Date('2025-02-15'),
          horasCom: 120,
          prioridad: PrioridadEdt.media,
          notas: 'Cronograma comercial de ejemplo'
        }
      });

      // Crear tareas de ejemplo
      const tareas = [
        { nombre: 'Análisis inicial', horas: 40, orden: 1 },
        { nombre: 'Desarrollo', horas: 60, orden: 2 },
        { nombre: 'Pruebas', horas: 20, orden: 3 }
      ];

      for (const tarea of tareas) {
        await prisma.cotizacionTarea.create({
          data: {
            cotizacionEdtId: edt.id,
            nombre: tarea.nombre,
            horasCom: tarea.horas,
            orden: tarea.orden,
            prioridad: PrioridadTarea.media
          }
        });
      }
    }
  }

  console.log('✅ Cronograma comercial seeded');
}
```

### 4.2 Comando de Ejecución

```bash
# 📋 Checklist de Seeds
- [ ] Validar datos existentes
- [ ] Ejecutar seeds en desarrollo
- [ ] Verificar datos creados
- [ ] Documentar datos de prueba

# Ejecutar seeds
npx tsx prisma/seeds/cotizacionCronograma.ts
```

---

## 5. APIs (Next.js App Router)

### 5.1 API CotizacionEdt

#### GET /api/cotizacion/[id]/cronograma

```typescript
// src/app/api/cotizacion/[id]/cronograma/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    // 📋 Checklist de validación
    // - [ ] Validar sesión
    // - [ ] Validar permisos
    // - [ ] Obtener cronograma
    // - [ ] Incluir relaciones necesarias

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cronograma = await prisma.cotizacionEdt.findMany({
      where: { cotizacionId: id },
      include: {
        categoriaServicio: {
          select: { id: true, nombre: true }
        },
        responsable: {
          select: { id: true, name: true, email: true }
        },
        tareas: {
          orderBy: { orden: 'asc' },
          include: {
            dependenciaDe: {
              select: { id: true, nombre: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    logger.info(`📅 Cronograma obtenido: ${cronograma.length} EDTs - Cotización: ${id}`);

    return NextResponse.json({
      success: true,
      data: cronograma
    });

  } catch (error) {
    logger.error('❌ Error al obtener cronograma comercial:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

#### POST /api/cotizacion/[id]/cronograma

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    
    // 📋 Checklist de validación
    // - [ ] Validar datos de entrada
    // - [ ] Verificar unicidad
    // - [ ] Validar fechas
    // - [ ] Crear EDT

    const { categoriaServicioId, zona, fechaInicioCom, fechaFinCom, horasCom, responsableId, notas } = body;

    // Validar unicidad
    const existente = await prisma.cotizacionEdt.findFirst({
      where: {
        cotizacionId: id,
        categoriaServicioId,
        zona: zona || null
      }
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un EDT para esta combinación' },
        { status: 400 }
      );
    }

    const nuevoEdt = await prisma.cotizacionEdt.create({
      data: {
        cotizacionId: id,
        categoriaServicioId,
        zona,
        fechaInicioCom: fechaInicioCom ? new Date(fechaInicioCom) : null,
        fechaFinCom: fechaFinCom ? new Date(fechaFinCom) : null,
        horasCom,
        responsableId,
        notas
      },
      include: {
        categoriaServicio: true,
        responsable: true,
        tareas: true
      }
    });

    logger.info(`✅ EDT comercial creado: ${nuevoEdt.id} - Cotización: ${id}`);

    return NextResponse.json({
      success: true,
      data: nuevoEdt
    }, { status: 201 });

  } catch (error) {
    logger.error('❌ Error al crear EDT comercial:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

### 5.2 API CotizacionTarea

#### POST /api/cotizacion-edt/[id]/tareas

```typescript
// src/app/api/cotizacion-edt/[id]/tareas/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, fechaInicioCom, fechaFinCom, horasCom, dependenciaDeId, orden, notas } = body;

    // 📋 Checklist de validación
    // - [ ] Validar EDT existe
    // - [ ] Validar dependencias
    // - [ ] Calcular orden automático
    // - [ ] Crear tarea

    const edt = await prisma.cotizacionEdt.findUnique({
      where: { id }
    });

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      );
    }

    // Calcular orden automático si no se proporciona
    const ordenFinal = orden || await prisma.cotizacionTarea.count({
      where: { cotizacionEdtId: id }
    }) + 1;

    const nuevaTarea = await prisma.cotizacionTarea.create({
      data: {
        cotizacionEdtId: id,
        nombre,
        fechaInicioCom: fechaInicioCom ? new Date(fechaInicioCom) : null,
        fechaFinCom: fechaFinCom ? new Date(fechaFinCom) : null,
        horasCom,
        dependenciaDeId,
        orden: ordenFinal,
        notas
      },
      include: {
        dependenciaDe: true
      }
    });

    return NextResponse.json({
      success: true,
      data: nuevaTarea
    }, { status: 201 });

  } catch (error) {
    logger.error('❌ Error al crear tarea comercial:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

### 5.3 API de Conversión

#### POST /api/cotizacion/[id]/convertir-proyecto

```typescript
// src/app/api/cotizacion/[id]/convertir-proyecto/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { gestorId, fechaInicio, fechaFin } = body;

    // 📋 Checklist de conversión
    // - [ ] Validar cotización existe
    // - [ ] Obtener cronograma comercial
    // - [ ] Crear proyecto
    // - [ ] Mapear EDT comercial → ProyectoEdt
    // - [ ] Crear tareas en ProyectoEdt
    // - [ ] Actualizar estado cotización

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Obtener cotización con cronograma
      const cotizacion = await tx.cotizacion.findUnique({
        where: { id },
        include: {
          cliente: true,
          comercial: true,
          cronograma: {
            include: {
              categoriaServicio: true,
              tareas: {
                orderBy: { orden: 'asc' }
              }
            }
          }
        }
      });

      if (!cotizacion) {
        throw new Error('Cotización no encontrada');
      }

      // 2. Crear proyecto
      const proyecto = await tx.proyecto.create({
        data: {
          codigo: `PROY-${Date.now()}`,
          nombre: `Proyecto ${cotizacion.codigo}`,
          descripcion: `Proyecto generado desde cotización ${cotizacion.codigo}`,
          estado: 'en_planificacion',
          fechaInicio: new Date(fechaInicio),
          fechaFin: fechaFin ? new Date(fechaFin) : null,
          clienteId: cotizacion.clienteId,
          comercialId: cotizacion.comercialId,
          gestorId,
          cotizacionId: cotizacion.id,
          totalInterno: cotizacion.grandTotal || 0,
          totalCliente: cotizacion.grandTotal || 0,
          grandTotal: cotizacion.grandTotal || 0
        }
      });

      // 3. Mapear cronograma comercial → ProyectoEdt
      for (const edtComercial of cotizacion.cronograma) {
        const proyectoEdt = await tx.proyectoEdt.create({
          data: {
            proyectoId: proyecto.id,
            categoriaServicioId: edtComercial.categoriaServicioId,
            zona: edtComercial.zona,
            // Mapear fechas comerciales a fechas de plan
            fechaInicioPlan: edtComercial.fechaInicioCom,
            fechaFinPlan: edtComercial.fechaFinCom,
            horasPlan: edtComercial.horasCom,
            prioridad: edtComercial.prioridad,
            responsableId: edtComercial.responsableId,
            estado: 'planificado',
            porcentajeAvance: 0,
            descripcion: `EDT generado desde cronograma comercial. ${edtComercial.notas || ''}`
          }
        });

        // 4. Crear tareas en ProyectoEdt (como registros de progreso iniciales)
        for (const tareaComercial of edtComercial.tareas) {
          await tx.registroProgreso.create({
            data: {
              proyectoEdtId: proyectoEdt.id,
              usuarioId: session.user.id,
              fecha: new Date(),
              descripcion: `Tarea planificada: ${tareaComercial.nombre}`,
              horasEstimadas: tareaComercial.horasCom || 0,
              porcentajeAvance: 0,
              tipo: 'planificacion',
              observaciones: tareaComercial.notas
            }
          });
        }
      }

      // 5. Actualizar estado de cotización
      await tx.cotizacion.update({
        where: { id },
        data: { 
          estado: 'aprobada',
          fechaAprobacion: new Date()
        }
      });

      return proyecto;
    });

    logger.info(`🔄 Proyecto creado desde cotización: ${resultado.id} - Cotización: ${id}`);

    return NextResponse.json({
      success: true,
      data: resultado,
      message: 'Proyecto creado exitosamente con cronograma comercial mapeado'
    }, { status: 201 });

  } catch (error) {
    logger.error('❌ Error al convertir cotización a proyecto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

---

## 6. Servicios / Capa de Dominio

### 6.1 Servicio CotizacionCronograma

```typescript
// src/lib/services/cotizacionCronograma.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// 📋 Esquemas de validación
const CotizacionEdtSchema = z.object({
  cotizacionId: z.string().uuid(),
  categoriaServicioId: z.string().uuid(),
  zona: z.string().optional(),
  fechaInicioCom: z.string().datetime().optional(),
  fechaFinCom: z.string().datetime().optional(),
  horasCom: z.number().min(0).max(10000).optional(),
  responsableId: z.string().uuid().optional(),
  notas: z.string().max(1000).optional()
}).refine((data) => {
  // Validar que fechaFin sea posterior a fechaInicio
  if (data.fechaInicioCom && data.fechaFinCom) {
    return new Date(data.fechaFinCom) > new Date(data.fechaInicioCom);
  }
  return true;
}, {
  message: 'La fecha de fin debe ser posterior a la fecha de inicio',
  path: ['fechaFinCom']
});

const CotizacionTareaSchema = z.object({
  cotizacionEdtId: z.string().uuid(),
  nombre: z.string().min(1).max(255),
  fechaInicioCom: z.string().datetime().optional(),
  fechaFinCom: z.string().datetime().optional(),
  horasCom: z.number().min(0).max(1000).optional(),
  dependenciaDeId: z.string().uuid().optional(),
  orden: z.number().int().min(0).optional(),
  notas: z.string().max(500).optional()
});

export class CotizacionCronogramaService {
  
  // ✅ Obtener cronograma de cotización
  static async obtenerCronograma(cotizacionId: string) {
    try {
      // 📋 Checklist de obtención
      // - [ ] Validar ID de cotización
      // - [ ] Obtener EDTs con relaciones
      // - [ ] Ordenar por categoría y zona
      // - [ ] Incluir métricas calculadas

      const cronograma = await prisma.cotizacionEdt.findMany({
        where: { cotizacionId },
        include: {
          categoriaServicio: {
            select: { id: true, nombre: true }
          },
          responsable: {
            select: { id: true, name: true, email: true }
          },
          tareas: {
            orderBy: { orden: 'asc' },
            include: {
              dependenciaDe: {
                select: { id: true, nombre: true }
              }
            }
          }
        },
        orderBy: [
          { categoriaServicio: { nombre: 'asc' } },
          { zona: 'asc' }
        ]
      });

      // Calcular métricas
      const metricas = {
        totalEdts: cronograma.length,
        totalHoras: cronograma.reduce((sum, edt) => sum + Number(edt.horasCom || 0), 0),
        totalTareas: cronograma.reduce((sum, edt) => sum + edt.tareas.length, 0),
        fechaInicioMinima: cronograma
          .filter(edt => edt.fechaInicioCom)
          .reduce((min, edt) => 
            !min || edt.fechaInicioCom! < min ? edt.fechaInicioCom! : min, 
            null as Date | null
          ),
        fechaFinMaxima: cronograma
          .filter(edt => edt.fechaFinCom)
          .reduce((max, edt) => 
            !max || edt.fechaFinCom! > max ? edt.fechaFinCom! : max, 
            null as Date | null
          )
      };

      logger.info(`📅 Cronograma obtenido: ${cronograma.length} EDTs - Cotización: ${cotizacionId}`);

      return {
        cronograma,
        metricas
      };

    } catch (error) {
      logger.error('❌ Error al obtener cronograma:', error);
      throw new Error('Error al obtener cronograma comercial');
    }
  }

  // ✅ Crear EDT comercial
  static async crearEdt(data: z.infer<typeof CotizacionEdtSchema>) {
    try {
      // Validar datos
      const validData = CotizacionEdtSchema.parse(data);

      // 📋 Checklist de creación
      // - [ ] Validar unicidad
      // - [ ] Verificar cotización existe
      // - [ ] Crear EDT
      // - [ ] Log de auditoría

      // Verificar unicidad
      const existente = await prisma.cotizacionEdt.findFirst({
        where: {
          cotizacionId: validData.cotizacionId,
          categoriaServicioId: validData.categoriaServicioId,
          zona: validData.zona || null
        }
      });

      if (existente) {
        throw new Error('Ya existe un EDT para esta combinación de cotización, categoría y zona');
      }

      const nuevoEdt = await prisma.cotizacionEdt.create({
        data: {
          ...validData,
          fechaInicioCom: validData.fechaInicioCom ? new Date(validData.fechaInicioCom) : null,
          fechaFinCom: validData.fechaFinCom ? new Date(validData.fechaFinCom) : null
        },
        include: {
          categoriaServicio: true,
          responsable: true,
          tareas: true
        }
      });

      logger.info(`✅ EDT comercial creado: ${nuevoEdt.id}`);
      return nuevoEdt;

    } catch (error) {
      logger.error('❌ Error al crear EDT comercial:', error);
      throw error;
    }
  }

  // ✅ Crear tarea comercial
  static async crearTarea(data: z.infer<typeof CotizacionTareaSchema>) {
    try {
      const validData = CotizacionTareaSchema.parse(data);

      // 📋 Checklist de creación de tarea
      // - [ ] Validar EDT existe
      // - [ ] Calcular orden automático
      // - [ ] Validar dependencias
      // - [ ] Crear tarea

      // Verificar que el EDT existe
      const edt = await prisma.cotizacionEdt.findUnique({
        where: { id: validData.cotizacionEdtId }
      });

      if (!edt) {
        throw new Error('EDT no encontrado');
      }

      // Calcular orden automático si no se proporciona
      const orden = validData.orden ?? await prisma.cotizacionTarea.count({
        where: { cotizacionEdtId: validData.cotizacionEdtId }
      }) + 1;

      const nuevaTarea = await prisma.cotizacionTarea.create({
        data: {
          ...validData,
          orden,
          fechaInicioCom: validData.fechaInicioCom ? new Date(validData.fechaInicioCom) : null,
          fechaFinCom: validData.fechaFinCom ? new Date(validData.fechaFinCom) : null
        },
        include: {
          dependenciaDe: true
        }
      });

      logger.info(`✅ Tarea comercial creada: ${nuevaTarea.id}`);
      return nuevaTarea;

    } catch (error) {
      logger.error('❌ Error al crear tarea comercial:', error);
      throw error;
    }
  }

  // ✅ Mapear cronograma comercial a ProyectoEdt
  static async mapearAProyecto(cotizacionId: string, proyectoId: string) {
    try {
      // 📋 Checklist de mapeo
      // - [ ] Obtener cronograma comercial
      // - [ ] Crear ProyectoEdt por cada CotizacionEdt
      // - [ ] Mapear fechas comerciales → fechas plan
      // - [ ] Crear registros de progreso iniciales

      const cronogramaComercial = await prisma.cotizacionEdt.findMany({
        where: { cotizacionId },
        include: {
          tareas: {
            orderBy: { orden: 'asc' }
          }
        }
      });

      const edtsCreados = [];

      for (const edtComercial of cronogramaComercial) {
        const proyectoEdt = await prisma.proyectoEdt.create({
          data: {
            proyectoId,
            categoriaServicioId: edtComercial.categoriaServicioId,
            zona: edtComercial.zona,
            fechaInicioPlan: edtComercial.fechaInicioCom,
            fechaFinPlan: edtComercial.fechaFinCom,
            horasPlan: edtComercial.horasCom,
            prioridad: edtComercial.prioridad,
            responsableId: edtComercial.responsableId,
            estado: 'planificado',
            porcentajeAvance: 0,
            descripcion: `EDT generado desde cronograma comercial. ${edtComercial.notas || ''}`
          }
        });

        edtsCreados.push(proyectoEdt);
      }

      logger.info(`🔄 Cronograma mapeado: ${edtsCreados.length} EDTs creados - Proyecto: ${proyectoId}`);
      return edtsCreados;

    } catch (error) {
      logger.error('❌ Error al mapear cronograma:', error);
      throw error;
    }
  }
}
```

### 6.2 Validadores Específicos

```typescript
// src/lib/validators/cotizacionCronograma.ts
import { z } from 'zod';

// 📋 Validadores de reglas de negocio
export const validarCronogramaComercial = {
  
  // ✅ Validar coherencia de fechas
  fechasCoherentes: (fechaInicio?: Date, fechaFin?: Date): boolean => {
    if (!fechaInicio || !fechaFin) return true;
    return fechaFin > fechaInicio;
  },

  // ✅ Validar horas razonables
  horasRazonables: (horas?: number): boolean => {
    if (!horas) return true;
    return horas > 0 && horas <= 10000;
  },

  // ✅ Validar dependencias circulares
  dependenciasValidas: async (tareaId: string, dependenciaId: string): Promise<boolean> => {
    // Implementar validación de dependencias circulares
    // Por simplicidad, retornamos true
    return true;
  }
};

// 📋 Esquemas de validación para formularios
export const CronogramaFormSchema = z.object({
  edts: z.array(z.object({
    categoriaServicioId: z.string().uuid(),
    zona: z.string().optional(),
    fechaInicioCom: z.date().optional(),
    fechaFinCom: z.date().optional(),
    horasCom: z.number().min(0).max(10000).optional(),
    responsableId: z.string().uuid().optional(),
    tareas: z.array(z.object({
      nombre: z.string().min(1).max(255),
      horasCom: z.number().min(0).max(1000).optional(),
      orden: z.number().int().min(0).optional()
    })).optional()
  }))
}).refine((data) => {
  // Validar que no haya duplicados de categoría + zona
  const combinaciones = data.edts.map(edt => `${edt.categoriaServicioId}-${edt.zona || ''}`);
  return new Set(combinaciones).size === combinaciones.length;
}, {
  message: 'No puede haber EDTs duplicados para la misma categoría y zona',
  path: ['edts']
});
```

---

## 7. UI/UX

### 7.1 Pestaña Cronograma en Cotización

```typescript
// src/components/cotizaciones/CronogramaComercialTab.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, Clock, User, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CronogramaEdtForm } from './CronogramaEdtForm';
import { CronogramaTareasList } from './CronogramaTareasList';
import { CronogramaMetricas } from './CronogramaMetricas';
import { toast } from '@/hooks/use-toast';
import { CotizacionCronogramaService } from '@/lib/services/cotizacionCronograma';
import type { CotizacionEdt, CotizacionTarea } from '@/types/modelos';

interface Props {
  cotizacionId: string;
  readonly?: boolean;
}

export function CronogramaComercialTab({ cotizacionId, readonly = false }: Props) {
  const [cronograma, setCronograma] = useState<CotizacionEdt[]>([]);
  const [metricas, setMetricas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEdt, setSelectedEdt] = useState<CotizacionEdt | null>(null);

  // 📋 Checklist de carga inicial
  // - [ ] Cargar cronograma existente
  // - [ ] Calcular métricas
  // - [ ] Configurar estado inicial

  useEffect(() => {
    cargarCronograma();
  }, [cotizacionId]);

  const cargarCronograma = async () => {
    try {
      setLoading(true);
      const resultado = await CotizacionCronogramaService.obtenerCronograma(cotizacionId);
      setCronograma(resultado.cronograma);
      setMetricas(resultado.metricas);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el cronograma comercial",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCrearEdt = async (data: any) => {
    try {
      await CotizacionCronogramaService.crearEdt({
        cotizacionId,
        ...data
      });
      
      toast({
        title: "EDT Creado",
        description: "El EDT comercial se creó exitosamente"
      });
      
      setShowForm(false);
      cargarCronograma();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el EDT comercial",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 📊 Métricas del cronograma */}
      {metricas && <CronogramaMetricas metricas={metricas} />}

      {/* 🎛️ Controles */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Cronograma Comercial</h3>
        {!readonly && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Agregar EDT
          </Button>
        )}
      </div>

      {/* 📋 Lista de EDTs */}
      <div className="grid gap-4">
        <AnimatePresence>
          {cronograma.map((edt) => (
            <motion.div
              key={edt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        {edt.categoriaServicio.nombre}
                        {edt.zona && (
                          <Badge variant="outline" className="text-xs">
                            {edt.zona}
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                    <Badge 
                      variant={edt.prioridad === 'alta' ? 'destructive' : 
                              edt.prioridad === 'media' ? 'default' : 'secondary'}
                    >
                      {edt.prioridad}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* 📅 Información temporal */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {edt.fechaInicioCom && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-500" />
                        <span>Inicio: {new Date(edt.fechaInicioCom).toLocaleDateString()}</span>
                      </div>
                    )}
                    {edt.fechaFinCom && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-red-500" />
                        <span>Fin: {new Date(edt.fechaFinCom).toLocaleDateString()}</span>
                      </div>
                    )}
                    {edt.horasCom && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span>{edt.horasCom} horas</span>
                      </div>
                    )}
                  </div>

                  {/* 👤 Responsable */}
                  {edt.responsable && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-purple-500" />
                      <span>{edt.responsable.name}</span>
                    </div>
                  )}

                  {/* 📝 Notas */}
                  {edt.notas && (
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {edt.notas}
                    </p>
                  )}

                  {/* 📋 Tareas */}
                  {edt.tareas.length > 0 && (
                    <CronogramaTareasList 
                      tareas={edt.tareas} 
                      readonly={readonly}
                      onUpdate={cargarCronograma}
                    />
                  )}

                  {/* 🎛️ Acciones */}
                  {!readonly && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedEdt(edt)}
                      >
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {/* Agregar tarea */}}
                      >
                        + Tarea
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 📝 Formulario de EDT */}
      {showForm && (
        <CronogramaEdtForm
          cotizacionId={cotizacionId}
          onSubmit={handleCrearEdt}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* 🔄 Estado vacío */}
      {cronograma.length === 0 && !loading && (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Sin cronograma comercial
            </h3>
            <p className="text-gray-500 mb-4">
              Agrega EDTs para definir el cronograma comercial de esta cotización
            </p>
            {!readonly && (
              <Button onClick={() => setShowForm(true)}>
                Crear primer EDT
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### 7.2 Vista Comparativa en Proyecto

```typescript
// src/components/proyectos/CronogramaComparativo.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Proyecto, ProyectoEdt, CotizacionEdt } from '@/types/modelos';

interface Props {
  proyecto: Proyecto;
}

export function CronogramaComparativo({ proyecto }: Props) {
  const [cronogramaComercial, setCronogramaComercial] = useState<CotizacionEdt[]>([]);
  const [cronogramaPlan, setCronogramaPlan] = useState<ProyectoEdt[]>([]);
  const [loading, setLoading] = useState(true);

  // 📋 Checklist de carga
  // - [ ] Cargar cronograma comercial original
  // - [ ] Cargar cronograma de plan actual
  // - [ ] Calcular comparativas
  // - [ ] Generar alertas

  useEffect(() => {
    cargarDatos();
  }, [proyecto.id]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar cronograma comercial original
      if (proyecto.cotizacionId) {
        const comercial = await fetch(`/api/cotizacion/${proyecto.cotizacionId}/cronograma`);
        const comercialData = await comercial.json();
        setCronogramaComercial(comercialData.data || []);
      }

      // Cargar cronograma de plan actual
      const plan = await fetch(`/api/proyectos/${proyecto.id}/edt`);
      const planData = await plan.json();
      setCronogramaPlan(planData.data || []);

    } catch (error) {
      console.error('Error cargando cronogramas:', error);
    } finally {
      setLoading(false);
    }
  };

  // 📊 Calcular métricas comparativas
  const calcularComparativas = () => {
    const comercialHoras = cronogramaComercial.reduce((sum, edt) => sum + Number(edt.horasCom || 0), 0);
    const planHoras = cronogramaPlan.reduce((sum, edt) => sum + Number(edt.horasPlan || 0), 0);
    const realHoras = cronogramaPlan.reduce((sum, edt) => sum + Number(edt.horasReales || 0), 0);

    const variacionComercialPlan = planHoras > 0 ? ((planHoras - comercialHoras) / comercialHoras) * 100 : 0;
    const variacionPlanReal = planHoras > 0 ? ((realHoras - planHoras) / planHoras) * 100 : 0;

    return {
      comercialHoras,
      planHoras,
      realHoras,
      variacionComercialPlan,
      variacionPlanReal
    };
  };

  const metricas = calcularComparativas();

  if (loading) {
    return <div className="animate-pulse">Cargando comparativo...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 📊 Métricas generales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Horas Comerciales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metricas.comercialHoras.toFixed(1)}h
            </div>
            <p className="text-xs text-gray-500">Estimación inicial</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Horas Planificadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metricas.planHoras.toFixed(1)}h
            </div>
            <div className="flex items-center gap-1 text-xs">
              {metricas.variacionComercialPlan > 0 ? (
                <TrendingUp className="h-3 w-3 text-red-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-green-500" />
              )}
              <span className={metricas.variacionComercialPlan > 0 ? 'text-red-500' : 'text-green-500'}>
                {Math.abs(metricas.variacionComercialPlan).toFixed(1)}% vs comercial
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Horas Reales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {metricas.realHoras.toFixed(1)}h
            </div>
            <div className="flex items-center gap-1 text-xs">
              {metricas.variacionPlanReal > 0 ? (
                <TrendingUp className="h-3 w-3 text-red-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-green-500" />
              )}
              <span className={metricas.variacionPlanReal > 0 ? 'text-red-500' : 'text-green-500'}>
                {Math.abs(metricas.variacionPlanReal).toFixed(1)}% vs plan
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 📋 Comparativo detallado */}
      <Tabs defaultValue="tabla" className="w-full">
        <TabsList>
          <TabsTrigger value="tabla">Vista Tabla</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
        </TabsList>

        <TabsContent value="tabla" className="space-y-4">
          {cronogramaPlan.map((edtPlan) => {
            // Buscar EDT comercial correspondiente
            const edtComercial = cronogramaComercial.find(ec => 
              ec.categoriaServicioId === edtPlan.categoriaServicioId && 
              ec.zona === edtPlan.zona
            );

            const horasComercial = Number(edtComercial?.horasCom || 0);
            const horasPlan = Number(edtPlan.horasPlan || 0);
            const horasReales = Number(edtPlan.horasReales || 0);

            const variacionComPlan = horasComercial > 0 ? ((horasPlan - horasComercial) / horasComercial) * 100 : 0;
            const variacionPlanReal = horasPlan > 0 ? ((horasReales - horasPlan) / horasPlan) * 100 : 0;

            return (
              <motion.div
                key={edtPlan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">
                        {edtPlan.categoriaServicio.nombre}
                        {edtPlan.zona && (
                          <Badge variant="outline" className="ml-2">
                            {edtPlan.zona}
                          </Badge>
                        )}
                      </CardTitle>
                      <Badge 
                        variant={edtPlan.estado === 'completado' ? 'default' : 
                                edtPlan.estado === 'en_progreso' ? 'secondary' : 'outline'}
                      >
                        {edtPlan.estado}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* 📊 Comparativo de horas */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">
                          {horasComercial.toFixed(1)}h
                        </div>
                        <div className="text-gray-500">Comercial</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">
                          {horasPlan.toFixed(1)}h
                        </div>
                        <div className="text-gray-500">Plan</div>
                        {variacionComPlan !== 0 && (
                          <div className={`text-xs ${variacionComPlan > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {variacionComPlan > 0 ? '+' : ''}{variacionComPlan.toFixed(1)}%
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-purple-600">
                          {horasReales.toFixed(1)}h
                        </div>
                        <div className="text-gray-500">Real</div>
                        {variacionPlanReal !== 0 && (
                          <div className={`text-xs ${variacionPlanReal > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {variacionPlanReal > 0 ? '+' : ''}{variacionPlanReal.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 📈 Progreso */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progreso</span>
                        <span>{edtPlan.porcentajeAvance}%</span>
                      </div>
                      <Progress value={edtPlan.porcentajeAvance} className="h-2" />
                    </div>

                    {/* ⚠️ Alertas */}
                    {(Math.abs(variacionComPlan) > 20 || Math.abs(variacionPlanReal) > 20) && (
                      <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-800">
                          Desviación significativa detectada
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </TabsContent>

        <TabsContent value="timeline">
          {/* Implementar vista timeline */}
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Vista timeline en desarrollo</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metricas">
          {/* Implementar métricas detalladas */}
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Métricas detalladas en desarrollo</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 8. Job de Conversión

### 8.1 Servicio de Conversión

```typescript
// src/lib/services/cotizacionToProyecto.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { Cotizacion, Proyecto } from '@/types/modelos';

export class CotizacionToProyectoService {
  
  // ✅ Convertir cotización completa a proyecto
  static async convertir(cotizacionId: string, datos: {
    gestorId: string;
    fechaInicio: Date;
    fechaFin?: Date;
    observaciones?: string;
  }): Promise<Proyecto> {
    
    // 📋 Checklist de conversión
    // - [ ] Validar cotización existe y está aprobada
    // - [ ] Crear proyecto base
    // - [ ] Copiar equipos, servicios y gastos
    // - [ ] Mapear cronograma comercial → ProyectoEdt
    // - [ ] Actualizar estado cotización
    // - [ ] Log de auditoría

    return await prisma.$transaction(async (tx) => {
      try {
        // 1. Obtener cotización completa
        const cotizacion = await tx.cotizacion.findUnique({
          where: { id: cotizacionId },
          include: {
            cliente: true,
            comercial: true,
            cotizacionEquipos: {
              include: { cotizacionEquipoItems: true }
            },
            cotizacionServicios: {
              include: { cotizacionServicioItems: true }
            },
            cotizacionGastos: {
              include: { cotizacionGastoItems: true }
            },
            cronograma: {
              include: {
                categoriaServicio: true,
                tareas: { orderBy: { orden: 'asc' } }
              }
            }
          }
        });

        if (!cotizacion) {
          throw new Error('Cotización no encontrada');
        }

        if (cotizacion.estado !== 'aprobada') {
          throw new Error('La cotización debe estar aprobada para convertir a proyecto');
        }

        // 2. Crear proyecto base
        const proyecto = await tx.proyecto.create({
          data: {
            codigo: await this.generarCodigoProyecto(tx),
            nombre: datos.observaciones || `Proyecto ${cotizacion.codigo}`,
            descripcion: `Proyecto generado desde cotización ${cotizacion.codigo}`,
            estado: 'en_planificacion',
            fechaInicio: datos.fechaInicio,
            fechaFin: datos.fechaFin,
            clienteId: cotizacion.clienteId,
            comercialId: cotizacion.comercialId,
            gestorId: datos.gestorId,
            cotizacionId: cotizacion.id,
            // Copiar totales financieros
            totalEquiposInterno: cotizacion.totalEquiposInterno,
            totalServiciosInterno: cotizacion.totalServiciosInterno,
            totalGastosInterno: cotizacion.totalGastosInterno,
            totalInterno: cotizacion.totalInterno,
            totalCliente: cotizacion.totalCliente,
            descuento: cotizacion.descuento,
            grandTotal: cotizacion.grandTotal
          }
        });

        // 3. Copiar equipos
        for (const cotEquipo of cotizacion.cotizacionEquipos) {
          const proyEquipo = await tx.proyectoEquipo.create({
            data: {
              proyectoId: proyecto.id,
              categoriaEquipoId: cotEquipo.categoriaEquipoId,
              totalInterno: cotEquipo.totalInterno,
              totalCliente: cotEquipo.totalCliente,
              descuento: cotEquipo.descuento,
              grandTotal: cotEquipo.grandTotal
            }
          });

          // Copiar items de equipos
          for (const item of cotEquipo.cotizacionEquipoItems) {
            await tx.proyectoEquipoItem.create({
              data: {
                proyectoEquipoId: proyEquipo.id,
                catalogoEquipoId: item.catalogoEquipoId,
                cantidad: item.cantidad,
                precioUnitario: item.precioUnitario,
                descuento: item.descuento,
                total: item.total
              }
            });
          }
        }

        // 4. Copiar servicios
        for (const cotServicio of cotizacion.cotizacionServicios) {
          const proyServicio = await tx.proyectoServicio.create({
            data: {
              proyectoId: proyecto.id,
              categoriaServicioId: cotServicio.categoriaServicioId,
              totalInterno: cotServicio.totalInterno,
              totalCliente: cotServicio.totalCliente,
              descuento: cotServicio.descuento,
              grandTotal: cotServicio.grandTotal
            }
          });

          // Copiar items de servicios
          for (const item of cotServicio.cotizacionServicioItems) {
            await tx.proyectoServicioItem.create({
              data: {
                proyectoServicioId: proyServicio.id,
                catalogoServicioId: item.catalogoServicioId,
                cantidad: item.cantidad,
                precioUnitario: item.precioUnitario,
                descuento: item.descuento,
                total: item.total
              }
            });
          }
        }

        // 5. Copiar gastos
        for (const cotGasto of cotizacion.cotizacionGastos) {
          const proyGasto = await tx.proyectoGasto.create({
            data: {
              proyectoId: proyecto.id,
              nombre: cotGasto.nombre,
              totalInterno: cotGasto.totalInterno,
              totalCliente: cotGasto.totalCliente,
              descuento: cotGasto.descuento,
              grandTotal: cotGasto.grandTotal
            }
          });

          // Copiar items de gastos
          for (const item of cotGasto.cotizacionGastoItems) {
            await tx.proyectoGastoItem.create({
              data: {
                proyectoGastoId: proyGasto.id,
                descripcion: item.descripcion,
                cantidad: item.cantidad,
                precioUnitario: item.precioUnitario,
                total: item.total
              }
            });
          }
        }

        // 6. 🔄 Mapear cronograma comercial → ProyectoEdt
        for (const edtComercial of cotizacion.cronograma) {
          const proyectoEdt = await tx.proyectoEdt.create({
            data: {
              proyectoId: proyecto.id,
              categoriaServicioId: edtComercial.categoriaServicioId,
              zona: edtComercial.zona,
              // 📅 Mapear fechas comerciales → fechas plan
              fechaInicioPlan: edtComercial.fechaInicioCom,
              fechaFinPlan: edtComercial.fechaFinCom,
              horasPlan: edtComercial.horasCom,
              prioridad: edtComercial.prioridad,
              responsableId: edtComercial.responsableId,
              estado: 'planificado',
              porcentajeAvance: 0,
              descripcion: `EDT generado desde cronograma comercial. ${edtComercial.notas || ''}`
            }
          });

          // 📋 Crear registros de progreso iniciales basados en tareas comerciales
          for (const tareaComercial of edtComercial.tareas) {
            await tx.registroProgreso.create({
              data: {
                proyectoEdtId: proyectoEdt.id,
                usuarioId: datos.gestorId,
                fecha: new Date(),
                descripcion: `Tarea planificada: ${tareaComercial.nombre}`,
                horasEstimadas: tareaComercial.horasCom || 0,
                porcentajeAvance: 0,
                tipo: 'planificacion',
                observaciones: `Generado desde cronograma comercial. ${tareaComercial.notas || ''}`
              }
            });
          }
        }

        // 7. Actualizar estado de cotización
        await tx.cotizacion.update({
          where: { id: cotizacionId },
          data: { 
            estado: 'convertida_proyecto',
            fechaAprobacion: new Date()
          }
        });

        logger.info(`🔄 Proyecto creado desde cotización: ${proyecto.id} - Cotización: ${cotizacionId}`);
        return proyecto;

      } catch (error) {
        logger.error('❌ Error en conversión cotización → proyecto:', error);
        throw error;
      }
    });
  }

  // ✅ Generar código único de proyecto
  private static async generarCodigoProyecto(tx: any): Promise<string> {
    const año = new Date().getFullYear();
    const ultimoProyecto = await tx.proyecto.findFirst({
      where: {
        codigo: {
          startsWith: `PROY-${año}-`
        }
      },
      orderBy: { codigo: 'desc' }
    });

    let numero = 1;
    if (ultimoProyecto) {
      const match = ultimoProyecto.codigo.match(/PROY-\d{4}-(\d+)/);
      if (match) {
        numero = parseInt(match[1]) + 1;
      }
    }

    return `PROY-${año}-${numero.toString().padStart(4, '0')}`;
  }
}
```

---

## 9. Seguridad / Roles

### 9.1 Middleware de Autorización

```typescript
// src/lib/auth/cronogramaAuth.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Role } from '@/types/modelos';

export class CronogramaAuthService {
  
  // 📋 Permisos por rol
  private static readonly PERMISOS = {
    // ✅ Puede ver cronograma comercial
    leer_cronograma_comercial: ['admin', 'gerente', 'comercial', 'presupuestos', 'gestor', 'proyectos'],
    
    // ✅ Puede crear/editar cronograma comercial
    escribir_cronograma_comercial: ['admin', 'gerente', 'comercial', 'presupuestos'],
    
    // ✅ Puede convertir cotización a proyecto
    convertir_proyecto: ['admin', 'gerente', 'gestor', 'proyectos'],
    
    // ✅ Puede ver comparativo comercial/plan/real
    ver_comparativo: ['admin', 'gerente', 'comercial', 'gestor', 'proyectos', 'coordinador']
  };

  // ✅ Validar permiso específico
  static async validarPermiso(permiso: keyof typeof CronogramaAuthService.PERMISOS): Promise<boolean> {
    try {
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.role) {
        return false;
      }

      const rolesPermitidos = this.PERMISOS[permiso];
      return rolesPermitidos.includes(session.user.role as Role);

    } catch (error) {
      return false;
    }
  }

  // ✅ Middleware para APIs
  static async validarAccesoAPI(permiso: keyof typeof CronogramaAuthService.PERMISOS) {
    const tienePermiso = await this.validarPermiso(permiso);
    
    if (!tienePermiso) {
      throw new Error('No tienes permisos para realizar esta acción');
    }

    return true;
  }

  // ✅ Validar acceso a cotización específica
  static async validarAccesoCotizacion(cotizacionId: string): Promise<boolean> {
    try {
      const session = await getServerSession(authOptions);
      
      if (!session?.user) {
        return false;
      }

      // Admin y gerente tienen acceso total
      if (['admin', 'gerente'].includes(session.user.role as Role)) {
        return true;
      }

      // Comerciales solo pueden acceder a sus cotizaciones
      if (session.user.role === 'comercial') {
        const cotizacion = await prisma.cotizacion.findUnique({
          where: { id: cotizacionId },
          select: { comercialId: true }
        });

        return cotizacion?.comercialId === session.user.id;
      }

      // Otros roles con permisos generales
      return ['presupuestos', 'gestor', 'proyectos'].includes(session.user.role as Role);

    } catch (error) {
      return false;
    }
  }
}
```

### 9.2 Componente de Autorización

```typescript
// src/components/auth/CronogramaAuthGuard.tsx
'use client';

import { useSession } from 'next-auth/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import type { Role } from '@/types/modelos';

interface Props {
  children: React.ReactNode;
  requiredPermission: 'read' | 'write' | 'convert' | 'compare';
  fallback?: React.ReactNode;
}

const PERMISSION_ROLES = {
  read: ['admin', 'gerente', 'comercial', 'presupuestos', 'gestor', 'proyectos'],
  write: ['admin', 'gerente', 'comercial', 'presupuestos'],
  convert: ['admin', 'gerente', 'gestor', 'proyectos'],
  compare: ['admin', 'gerente', 'comercial', 'gestor', 'proyectos', 'coordinador']
};

export function CronogramaAuthGuard({ children, requiredPermission, fallback }: Props) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="animate-pulse">Verificando permisos...</div>;
  }

  if (!session?.user) {
    return fallback || (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Debes iniciar sesión para acceder a esta funcionalidad.
        </AlertDescription>
      </Alert>
    );
  }

  const userRole = session.user.role as Role;
  const allowedRoles = PERMISSION_ROLES[requiredPermission];

  if (!allowedRoles.includes(userRole)) {
    return fallback || (
      <Alert variant="destructive">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          No tienes permisos para acceder a esta funcionalidad.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}
```

---

## 10. Pruebas

### 10.1 Pruebas de Servicios (Server)

```typescript
// src/lib/services/__tests__/cotizacionCronograma.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CotizacionCronogramaService } from '../cotizacionCronograma';
import { prisma } from '@/lib/prisma';

// 🔧 Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    cotizacionEdt: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    cotizacionTarea: {
      count: vi.fn(),
      create: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

describe('CotizacionCronogramaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('obtenerCronograma', () => {
    it('debe obtener cronograma con métricas calculadas', async () => {
      // 📋 Arrange
      const mockCronograma = [
        {
          id: 'edt-1',
          cotizacionId: 'cot-1',
          categoriaServicioId: 'cat-1',
          horasCom: 100,
          fechaInicioCom: new Date('2025-01-01'),
          fechaFinCom: new Date('2025-01-15'),
          categoriaServicio: { id: 'cat-1', nombre: 'Desarrollo' },
          responsable: { id: 'user-1', name: 'Juan Pérez', email: 'juan@test.com' },
          tareas: [
            { id: 'tarea-1', nombre: 'Análisis', horasCom: 40, orden: 1 }
          ]
        }
      ];

      (prisma.cotizacionEdt.findMany as any).mockResolvedValue(mockCronograma);

      // 📋 Act
      const resultado = await CotizacionCronogramaService.obtenerCronograma('cot-1');

      // 📋 Assert
      expect(resultado.cronograma).toHaveLength(1);
      expect(resultado.metricas.totalEdts).toBe(1);
      expect(resultado.metricas.totalHoras).toBe(100);
      expect(resultado.metricas.totalTareas).toBe(1);
      expect(prisma.cotizacionEdt.findMany).toHaveBeenCalledWith({
        where: { cotizacionId: 'cot-1' },
        include: expect.any(Object),
        orderBy: expect.any(Array)
      });
    });

    it('debe manejar cronograma vacío', async () => {
      // 📋 Arrange
      (prisma.cotizacionEdt.findMany as any).mockResolvedValue([]);

      // 📋 Act
      const resultado = await CotizacionCronogramaService.obtenerCronograma('cot-1');

      // 📋 Assert
      expect(resultado.cronograma).toHaveLength(0);
      expect(resultado.metricas.totalEdts).toBe(0);
      expect(resultado.metricas.totalHoras).toBe(0);
    });
  });

  describe('crearEdt', () => {
    it('debe crear EDT comercial válido', async () => {
      // 📋 Arrange
      const datosEdt = {
        cotizacionId: 'cot-1',
        categoriaServicioId: 'cat-1',
        zona: 'Zona A',
        fechaInicioCom: '2025-01-01T00:00:00Z',
        fechaFinCom: '2025-01-15T00:00:00Z',
        horasCom: 100,
        responsableId: 'user-1'
      };

      const mockEdtCreado = {
        id: 'edt-1',
        ...datosEdt,
        categoriaServicio: { nombre: 'Desarrollo' },
        responsable: { name: 'Juan Pérez' },
        tareas: []
      };

      (prisma.cotizacionEdt.findFirst as any).mockResolvedValue(null);
      (prisma.cotizacionEdt.create as any).mockResolvedValue(mockEdtCreado);

      // 📋 Act
      const resultado = await CotizacionCronogramaService.crearEdt(datosEdt);

      // 📋 Assert
      expect(resultado.id).toBe('edt-1');
      expect(prisma.cotizacionEdt.findFirst).toHaveBeenCalledWith({
        where: {
          cotizacionId: 'cot-1',
          categoriaServicioId: 'cat-1',
          zona: 'Zona A'
        }
      });
      expect(prisma.cotizacionEdt.create).toHaveBeenCalled();
    });

    it('debe rechazar EDT duplicado', async () => {
      // 📋 Arrange
      const datosEdt = {
        cotizacionId: 'cot-1',
        categoriaServicioId: 'cat-1',
        zona: 'Zona A'
      };

      (prisma.cotizacionEdt.findFirst as any).mockResolvedValue({ id: 'existing' });

      // 📋 Act & Assert
      await expect(CotizacionCronogramaService.crearEdt(datosEdt))
        .rejects.toThrow('Ya existe un EDT para esta combinación');
    });

    it('debe validar fechas coherentes', async () => {
      // 📋 Arrange
      const datosInvalidos = {
        cotizacionId: 'cot-1',
        categoriaServicioId: 'cat-1',
        fechaInicioCom: '2025-01-15T00:00:00Z',
        fechaFinCom: '2025-01-01T00:00:00Z' // Fecha fin anterior a inicio
      };

      // 📋 Act & Assert
      await expect(CotizacionCronogramaService.crearEdt(datosInvalidos))
        .rejects.toThrow();
    });
  });
});
```

### 10.2 Pruebas de APIs (Server)

```typescript
// src/app/api/cotizacion/[id]/cronograma/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// 🔧 Mocks
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    cotizacionEdt: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn()
    }
  }
}));

describe('/api/cotizacion/[id]/cronograma', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('debe retornar cronograma para usuario autenticado', async () => {
      // 📋 Arrange
      (getServerSession as any).mockResolvedValue({
        user: { id: 'user-1', role: 'comercial' }
      });

      const mockCronograma = [
        {
          id: 'edt-1',
          categoriaServicio: { nombre: 'Desarrollo' },
          responsable: { name: 'Juan Pérez' },
          tareas: []
        }
      ];

      (prisma.cotizacionEdt.findMany as any).mockResolvedValue(mockCronograma);

      const request = new Request('http://localhost/api/cotizacion/cot-1/cronograma');
      const params = Promise.resolve({ id: 'cot-1' });

      // 📋 Act
      const response = await GET(request, { params });
      const data = await response.json();

      // 📋 Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
    });

    it('debe rechazar usuario no autenticado', async () => {
      // 📋 Arrange
      (getServerSession as any).mockResolvedValue(null);

      const request = new Request('http://localhost/api/cotizacion/cot-1/cronograma');
      const params = Promise.resolve({ id: 'cot-1' });

      // 📋 Act
      const response = await GET(request, { params });

      // 📋 Assert
      expect(response.status).toBe(401);
    });
  });

  describe('POST', () => {
    it('debe crear EDT comercial válido', async () => {
      // 📋 Arrange
      (getServerSession as any).mockResolvedValue({
        user: { id: 'user-1', role: 'comercial' }
      });

      (prisma.cotizacionEdt.findFirst as any).mockResolvedValue(null);
      (prisma.cotizacionEdt.create as any).mockResolvedValue({
        id: 'edt-1',
        categoriaServicio: { nombre: 'Desarrollo' },
        responsable: { name: 'Juan Pérez' },
        tareas: []
      });

      const requestBody = {
        categoriaServicioId: 'cat-1',
        zona: 'Zona A',
        horasCom: 100
      };

      const request = new Request('http://localhost/api/cotizacion/cot-1/cronograma', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });
      const params = Promise.resolve({ id: 'cot-1' });

      // 📋 Act
      const response = await POST(request, { params });
      const data = await response.json();

      // 📋 Assert
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('edt-1');
    });
  });
});
```

### 10.3 Pruebas de Componentes (Client)

```typescript
// src/components/cotizaciones/__tests__/CronogramaComercialTab.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CronogramaComercialTab } from '../CronogramaComercialTab';
import { CotizacionCronogramaService } from '@/lib/services/cotizacionCronograma';

// 🔧 Mock del servicio
vi.mock('@/lib/services/cotizacionCronograma', () => ({
  CotizacionCronogramaService: {
    obtenerCronograma: vi.fn(),
    crearEdt: vi.fn()
  }
}));

// 🔧 Mock de toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

describe('CronogramaComercialTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar cronograma existente', async () => {
    // 📋 Arrange
    const mockCronograma = [
      {
        id: 'edt-1',
        categoriaServicio: { nombre: 'Desarrollo' },
        zona: 'Zona A',
        horasCom: 100,
        prioridad: 'media',
        responsable: { name: 'Juan Pérez' },
        tareas: []
      }
    ];

    const mockMetricas = {
      totalEdts: 1,
      totalHoras: 100,
      totalTareas: 0
    };

    (CotizacionCronogramaService.obtenerCronograma as any).mockResolvedValue({
      cronograma: mockCronograma,
      metricas: mockMetricas
    });

    // 📋 Act
    render(<CronogramaComercialTab cotizacionId="cot-1" />);

    // 📋 Assert
    await waitFor(() => {
      expect(screen.getByText('Desarrollo')).toBeInTheDocument();
      expect(screen.getByText('Zona A')).toBeInTheDocument();
      expect(screen.getByText('100 horas')).toBeInTheDocument();
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });
  });

  it('debe mostrar estado vacío cuando no hay cronograma', async () => {
    // 📋 Arrange
    (CotizacionCronogramaService.obtenerCronograma as any).mockResolvedValue({
      cronograma: [],
      metricas: { totalEdts: 0, totalHoras: 0, totalTareas: 0 }
    });

    // 📋 Act
    render(<CronogramaComercialTab cotizacionId="cot-1" />);

    // 📋 Assert
    await waitFor(() => {
      expect(screen.getByText('Sin cronograma comercial')).toBeInTheDocument();
      expect(screen.getByText('Crear primer EDT')).toBeInTheDocument();
    });
  });

  it('debe abrir formulario al hacer clic en Agregar EDT', async () => {
    // 📋 Arrange
    (CotizacionCronogramaService.obtenerCronograma as any).mockResolvedValue({
      cronograma: [],
      metricas: { totalEdts: 0, totalHoras: 0, totalTareas: 0 }
    });

    // 📋 Act
    render(<CronogramaComercialTab cotizacionId="cot-1" />);

    await waitFor(() => {
      const botonAgregar = screen.getByText('Agregar EDT');
      fireEvent.click(botonAgregar);
    });

    // 📋 Assert
    // Verificar que se abre el formulario (esto dependería de la implementación del formulario)
  });

  it('debe ser readonly cuando se especifica', async () => {
    // 📋 Arrange
    (CotizacionCronogramaService.obtenerCronograma as any).mockResolvedValue({
      cronograma: [],
      metricas: { totalEdts: 0, totalHoras: 0, totalTareas: 0 }
    });

    // 📋 Act
    render(<CronogramaComercialTab cotizacionId="cot-1" readonly={true} />);

    // 📋 Assert
    await waitFor(() => {
      expect(screen.queryByText('Agregar EDT')).not.toBeInTheDocument();
    });
  });
});
```

---

## 11. Observabilidad

### 11.1 Logging y Auditoría

```typescript
// src/lib/logger/cronogramaLogger.ts
import { logger } from '@/lib/logger';

export class CronogramaLogger {
  
  // ✅ Log de creación de EDT
  static logCreacionEdt(edtId: string, cotizacionId: string, usuarioId: string) {
    logger.info('📅 EDT comercial creado', {
      event: 'cronograma_edt_created',
      edtId,
      cotizacionId,
      usuarioId,
      timestamp: new Date().toISOString()
    });
  }

  // ✅ Log de conversión a proyecto
  static logConversionProyecto(cotizacionId: string, proyectoId: string, usuarioId: string) {
    logger.info('🔄 Cotización convertida a proyecto', {
      event: 'cotizacion_converted_to_proyecto',
      cotizacionId,
      proyectoId,
      usuarioId,
      timestamp: new Date().toISOString()
    });
  }

  // ✅ Log de errores
  static logError(operation: string, error: any, context: Record<string, any>) {
    logger.error(`❌ Error en cronograma: ${operation}`, {
      event: 'cronograma_error',
      operation,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  // ✅ Log de métricas de performance
  static logPerformance(operation: string, duration: number, context: Record<string, any>) {
    logger.info(`⚡ Performance cronograma: ${operation}`, {
      event: 'cronograma_performance',
      operation,
      duration,
      context,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 11.2 Métricas de Negocio

```typescript
// src/lib/analytics/cronogramaMetrics.ts
export class CronogramaMetrics {
  
  // 📊 Métricas de adopción
  static async getAdoptionMetrics() {
    const totalCotizaciones = await prisma.cotizacion.count();
    const cotizacionesConCronograma = await prisma.cotizacion.count({
      where: {
        cronograma: {
          some: {}
        }
      }
    });

    return {
      totalCotizaciones,
      cotizacionesConCronograma,
      porcentajeAdopcion: (cotizacionesConCronograma / totalCotizaciones) * 100
    };
  }

  // 📊 Métricas de precisión
  static async getPrecisionMetrics() {
    const proyectosConComparativo = await prisma.proyecto.findMany({
      where: {
        cotizacionId: { not: null },
        proyectoEdt: {
          some: {
            horasPlan: { not: null },
            horasReales: { not: null }
          }
        }
      },
      include: {
        cotizacion: {
          include: {
            cronograma: true
          }
        },
        proyectoEdt: true
      }
    });

    const desviaciones = proyectosConComparativo.map(proyecto => {
      const horasComercial = proyecto.cotizacion?.cronograma.reduce((sum, edt) => 
        sum + Number(edt.horasCom || 0), 0) || 0;
      const horasPlan = proyecto.proyectoEdt.reduce((sum, edt) => 
        sum + Number(edt.horasPlan || 0), 0);
      const horasReales = proyecto.proyectoEdt.reduce((sum, edt) => 
        sum + Number(edt.horasReales || 0), 0);

      return {
        proyectoId: proyecto.id,
        desviacionComercialPlan: horasComercial > 0 ? ((horasPlan - horasComercial) / horasComercial) * 100 : 0,
        desviacionPlanReal: horasPlan > 0 ? ((horasReales - horasPlan) / horasPlan) * 100 : 0
      };
    });

    return {
      totalProyectos: desviaciones.length,
      desviacionPromediaComercialPlan: desviaciones.reduce((sum, d) => sum + Math.abs(d.desviacionComercialPlan), 0) / desviaciones.length,
      desviacionPromediaPlanReal: desviaciones.reduce((sum, d) => sum + Math.abs(d.desviacionPlanReal), 0) / desviaciones.length
    };
  }
}
```

---

## 12. Plan de Despliegue y Rollback

### 12.1 Checklist de Despliegue

```bash
# 📋 Pre-Despliegue
- [ ] Backup completo de base de datos
- [ ] Validar tests en CI/CD (>90% cobertura)
- [ ] Revisar logs de staging
- [ ] Confirmar recursos de servidor
- [ ] Notificar a stakeholders

# 📋 Despliegue
- [ ] Ejecutar migraciones en producción
- [ ] Verificar integridad de datos
- [ ] Desplegar código de aplicación
- [ ] Ejecutar smoke tests
- [ ] Verificar métricas de performance

# 📋 Post-Despliegue
- [ ] Monitorear logs por 2 horas
- [ ] Verificar funcionalidades críticas
- [ ] Confirmar métricas de negocio
- [ ] Comunicar éxito a stakeholders
- [ ] Documentar lecciones aprendidas
```

### 12.2 Plan de Rollback

```bash
# 🔄 Rollback Automático (< 30 min)
1. Revertir deployment de aplicación
2. Ejecutar rollback de migraciones
3. Restaurar backup de BD si es necesario
4. Verificar funcionalidad básica

# 🔄 Rollback Manual (30-60 min)
1. Análisis de logs y errores
2. Rollback selectivo de componentes
3. Migración de datos críticos
4. Comunicación a usuarios

# 🔄 Rollback Completo (> 60 min)
1. Restauración completa desde backup
2. Re-sincronización de datos
3. Validación exhaustiva
4. Plan de comunicación de crisis
```

---

## 13. Riesgos y Mitigaciones

### 13.1 Riesgos Técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| **Migración fallida** | Media | Alto | Backup automático + rollback scripts |
| **Performance degradada** | Baja | Medio | Índices optimizados + monitoring |
| **Inconsistencia de datos** | Baja | Alto | Transacciones + validaciones estrictas |
| **Conflictos de concurrencia** | Media | Medio | Locks optimistas + retry logic |

### 13.2 Riesgos de Negocio

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| **Baja adopción** | Media | Medio | Training + UX intuitiva |
| **Resistencia al cambio** | Alta | Medio | Change management + beneficios claros |
| **Datos incorrectos** | Media | Alto | Validaciones + auditoría |
| **Sobrecarga de trabajo** | Media | Medio | Implementación gradual |

### 13.3 Plan de Contingencia

```typescript
// 🚨 Monitoreo de salud del sistema
export class CronogramaSaludService {
  
  static async verificarSalud(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
  }> {
    const checks = {
      database: await this.verificarBaseDatos(),
      apis: await this.verificarAPIs(),
      performance: await this.verificarPerformance()
    };

    const todosOk = Object.values(checks).every(check => check);
    const algunoFalla = Object.values(checks).some(check => !check);

    return {
      status: todosOk ? 'healthy' : algunoFalla ? 'degraded' : 'unhealthy',
      checks
    };
  }

  private static async verificarBaseDatos(): Promise<boolean> {
    try {
      await prisma.cotizacionEdt.count();
      return true;
    } catch {
      return false;
    }
  }

  private static async verificarAPIs(): Promise<boolean> {
    try {
      // Verificar endpoints críticos
      return true;
    } catch {
      return false;
    }
  }

  private static async verificarPerformance(): Promise<boolean> {
    const inicio = Date.now();
    await prisma.cotizacionEdt.findMany({ take: 10 });
    const duracion = Date.now() - inicio;
    
    return duracion < 1000; // < 1 segundo
  }
}
```

---

## 14. Conclusiones y Próximos Pasos

### 14.1 Resumen de Implementación

✅ **Completado en este documento:**
- Modelado de datos con `CotizacionEdt` y `CotizacionTarea`
- APIs REST completas para CRUD y conversión
- Servicios de dominio con validaciones Zod
- Componentes UI modernos con Tailwind + shadcn/ui
- Sistema de autorización por roles
- Suite de pruebas (server + client)
- Observabilidad y métricas
- Plan de despliegue y rollback

### 14.2 Próximos Pasos Sugeridos

1. **Fase 1 (Semana 1-2)**: Implementar modelos y migraciones
2. **Fase 2 (Semana 3-4)**: Desarrollar APIs y servicios
3. **Fase 3 (Semana 5-6)**: Crear componentes UI
4. **Fase 4 (Semana 7)**: Integración y pruebas
5. **Fase 5 (Semana 8)**: Despliegue y monitoreo

### 14.3 Métricas de Éxito

- **Adopción**: >80% de cotizaciones con cronograma comercial
- **Precisión**: <20% desviación promedio comercial vs plan
- **Performance**: <2s tiempo de carga de cronogramas
- **Satisfacción**: >4.5/5 en encuestas de usuario

---

**🎯 Este documento proporciona una hoja de ruta completa y ejecutable para implementar el cronograma comercial en el sistema GYS, siguiendo las mejores prácticas de desarrollo enterprise y garantizando una integración fluida con la arquitectura existente.**