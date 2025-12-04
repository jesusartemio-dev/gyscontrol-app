# 🚀 **GUÍA COMPLETA DE IMPLEMENTACIÓN: CRONOGRAMA DE 5 NIVELES**
*Sistema Unificado sin Zonas - Eliminación Completa del Nivel Zona*

## 📋 **RESUMEN EJECUTIVO**

Esta guía proporciona la **única fuente de verdad** para implementar el sistema de cronograma simplificado de 5 niveles, eliminando completamente el nivel "Zona" para reducir complejidad y mejorar la usabilidad.

### **Jerarquía Final (5 Niveles)**
```
🏢 PROYECTO → 📋 FASES → 🔧 EDTs → ⚙️ ACTIVIDADES → ✅ TAREAS
```

**Estado**: Sistema de pruebas (.env.local) - Se puede eliminar zonas completamente
**Objetivo**: Simplificar jerarquía manteniendo toda funcionalidad
**Timeline**: 2 semanas de implementación

---

## 🏗️ **ARQUITECTURA GENERAL**

### **Componentes del Sistema**
- **Base de Datos**: PostgreSQL con Prisma ORM
- **Backend**: Next.js API Routes
- **Frontend**: React + TypeScript + Tailwind CSS
- **Estado**: Zustand para gestión de estado
- **Validaciones**: Zod schemas
- **Testing**: Jest + React Testing Library

### **Jerarquía Simplificada**
| Nivel | Entidad | Descripción | Relación |
|-------|---------|-------------|----------|
| 1 | Proyecto | Contenedor principal | Raíz |
| 2 | ProyectoFase | Etapas del proyecto | proyectoId |
| 3 | ProyectoEdt | Estructura de desglose | proyectoFaseId |
| 4 | ProyectoActividad | Agrupaciones de trabajo | proyectoEdtId |
| 5 | ProyectoTarea | Unidades ejecutables | proyectoActividadId |

---

## 🗄️ **CAMBIOS EN BASE DE DATOS**

### **1. Schema de Prisma - Eliminación de ProyectoZona**

```prisma
// ❌ ELIMINAR COMPLETAMENTE
// model ProyectoZona {
//   id                String   @id @default(cuid())
//   nombre            String
//   descripcion       String?
//   fechaInicioPlan   DateTime?
//   fechaFinPlan      DateTime?
//   fechaInicioReal   DateTime?
//   fechaFinReal      DateTime?
//   estado            ProyectoEstado @default(planificado)
//   progreso          Float @default(0)
//   proyectoId        String
//   proyectoEdtId     String
//   orden             Int @default(0)
//   createdAt         DateTime @default(now())
//   updatedAt         DateTime @updatedAt

//   // Relations
//   proyecto          Proyecto @relation(fields: [proyectoId], references: [id], onDelete: Cascade)
//   proyectoEdt       ProyectoEdt @relation(fields: [proyectoEdtId], references: [id], onDelete: Cascade)
//   proyectoActividades ProyectoActividad[]
//   @@map("proyecto_zonas")
// }

// ✅ MODIFICAR ProyectoActividad
model ProyectoActividad {
  id                String   @id @default(cuid())
  nombre            String
  descripcion       String?
  fechaInicioPlan   DateTime?
  fechaFinPlan      DateTime?
  fechaInicioReal   DateTime?
  fechaFinReal      DateTime?
  estado            ProyectoEstado @default(planificado)
  progreso          Float @default(0)
  horasEstimadas    Float?
  horasReales       Float @default(0)
  prioridad         ProyectoPrioridad @default(media)
  proyectoId        String
  // ❌ REMOVER: proyectoZonaId     String?
  proyectoEdtId     String   // ✅ HACER OBLIGATORIO
  orden             Int @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  proyecto          Proyecto @relation(fields: [proyectoId], references: [id], onDelete: Cascade)
  // ❌ REMOVER: proyectoZona       ProyectoZona? @relation(fields: [proyectoZonaId], references: [id], onDelete: Cascade)
  proyectoEdt       ProyectoEdt @relation(fields: [proyectoEdtId], references: [id], onDelete: Cascade)
  proyectoTareas    ProyectoTarea[]
  @@map("proyecto_actividades")
}

// ✅ MODIFICAR ProyectoTarea (sin cambios mayores)
model ProyectoTarea {
  id                    String   @id @default(cuid())
  nombre                String
  descripcion           String?
  fechaInicioPlan       DateTime?
  fechaFinPlan          DateTime?
  fechaInicioReal       DateTime?
  fechaFinReal          DateTime?
  estado                ProyectoEstado @default(planificado)
  progreso              Float @default(0)
  horasEstimadas        Float?
  horasReales           Float @default(0)
  prioridad             ProyectoPrioridad @default(media)
  proyectoId            String
  proyectoActividadId   String
  responsableId         String?
  orden                 Int @default(0)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  proyecto              Proyecto @relation(fields: [proyectoId], references: [id], onDelete: Cascade)
  proyectoActividad     ProyectoActividad @relation(fields: [proyectoActividadId], references: [id], onDelete: Cascade)
  responsable           User? @relation(fields: [responsableId], references: [id])
  tareaDependenciasFrom ProyectoTareaDependencia[] @relation("TareaDependencias")
  tareaDependenciasTo   ProyectoTareaDependencia[] @relation("TareaDependenciasTo")
  @@map("proyecto_tareas")
}
```

### **2. Migración de Base de Datos**

```sql
-- migration_005_remove_zones.sql
BEGIN;

-- 1. Reasignar actividades de zonas a EDTs padre
UPDATE proyecto_actividades
SET proyecto_edt_id = (
  SELECT pz.proyecto_edt_id
  FROM proyecto_zonas pz
  WHERE pz.id = proyecto_actividades.proyecto_zona_id
)
WHERE proyecto_zona_id IS NOT NULL;

-- 2. Hacer proyecto_edt_id NOT NULL
ALTER TABLE proyecto_actividades
ALTER COLUMN proyecto_edt_id SET NOT NULL;

-- 3. Eliminar foreign key constraint
ALTER TABLE proyecto_actividades
DROP CONSTRAINT IF EXISTS proyecto_actividades_proyecto_zona_id_fkey;

-- 4. Eliminar columna proyecto_zona_id
ALTER TABLE proyecto_actividades
DROP COLUMN IF EXISTS proyecto_zona_id;

-- 5. Eliminar tabla proyecto_zonas
DROP TABLE IF EXISTS proyecto_zonas;

COMMIT;
```

### **3. Script de Rollback (por si acaso)**

```sql
-- rollback_005_remove_zones.sql
BEGIN;

-- Recrear tabla proyecto_zonas
CREATE TABLE proyecto_zonas (
  id                VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre            VARCHAR(255) NOT NULL,
  descripcion       TEXT,
  fecha_inicio_plan TIMESTAMP,
  fecha_fin_plan    TIMESTAMP,
  fecha_inicio_real TIMESTAMP,
  fecha_fin_real    TIMESTAMP,
  estado            proyecto_estado DEFAULT 'planificado',
  progreso          FLOAT DEFAULT 0,
  proyecto_id       VARCHAR(255) NOT NULL,
  proyecto_edt_id   VARCHAR(255) NOT NULL,
  orden             INTEGER DEFAULT 0,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- Recrear índices y constraints
ALTER TABLE proyecto_zonas
ADD CONSTRAINT proyecto_zonas_proyecto_id_fkey
FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE;

ALTER TABLE proyecto_zonas
ADD CONSTRAINT proyecto_zonas_proyecto_edt_id_fkey
FOREIGN KEY (proyecto_edt_id) REFERENCES proyecto_edts(id) ON DELETE CASCADE;

-- Agregar columna proyecto_zona_id a actividades
ALTER TABLE proyecto_actividades
ADD COLUMN proyecto_zona_id VARCHAR(255);

-- Hacer nullable proyecto_edt_id nuevamente
ALTER TABLE proyecto_actividades
ALTER COLUMN proyecto_edt_id DROP NOT NULL;

COMMIT;
```

---

## 🔌 **APIs - CAMBIOS COMPLETOS**

### **1. Eliminación de APIs de Zonas**

```typescript
// ❌ ELIMINAR COMPLETAMENTE estos archivos:
// src/app/api/proyectos/[id]/zonas/route.ts
// src/app/api/proyectos/[id]/zonas/[zonaId]/route.ts
```

### **2. Modificación de APIs de Actividades**

```typescript
// src/app/api/proyectos/[id]/actividades/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createActividadSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  fechaInicioPlan: z.string().datetime().optional(),
  fechaFinPlan: z.string().datetime().optional(),
  horasEstimadas: z.number().positive().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  proyectoEdtId: z.string().min(1), // ✅ OBLIGATORIO (sin zonaId)
  orden: z.number().default(0)
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validatedData = createActividadSchema.parse(body)

    // ✅ Verificar que EDT existe y pertenece al proyecto
    const edt = await prisma.proyectoEdt.findFirst({
      where: {
        id: validatedData.proyectoEdtId,
        proyectoId: params.id
      }
    })

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado o no pertenece al proyecto' },
        { status: 404 }
      )
    }

    // ✅ Crear actividad directamente bajo EDT
    const actividad = await prisma.proyectoActividad.create({
      data: {
        ...validatedData,
        proyectoId: params.id,
        // ❌ Sin proyectoZonaId
      },
      include: {
        proyectoEdt: true,
        proyectoTareas: true
      }
    })

    return NextResponse.json(actividad)
  } catch (error) {
    console.error('Error creando actividad:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const edtId = searchParams.get('edtId')

    const actividades = await prisma.proyectoActividad.findMany({
      where: {
        proyectoId: params.id,
        ...(edtId && { proyectoEdtId: edtId }) // ✅ Filtrar por EDT
      },
      include: {
        proyectoEdt: true, // ✅ Incluir EDT padre
        proyectoTareas: {
          include: {
            responsable: {
              select: { id: true, nombre: true, email: true }
            }
          }
        }
      },
      orderBy: { orden: 'asc' }
    })

    return NextResponse.json(actividades)
  } catch (error) {
    console.error('Error obteniendo actividades:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

### **3. Modificación de Payloads**

```typescript
// src/types/proyecto.ts

// ❌ ELIMINAR interfaces de zona
// export interface ProyectoZona { ... }
// export interface CreateProyectoZonaPayload { ... }

// ✅ MODIFICAR ProyectoActividad
export interface ProyectoActividad {
  id: string
  nombre: string
  descripcion?: string
  fechaInicioPlan?: Date
  fechaFinPlan?: Date
  fechaInicioReal?: Date
  fechaFinReal?: Date
  estado: ProyectoEstado
  progreso: number
  horasEstimadas?: number
  horasReales: number
  prioridad: ProyectoPrioridad
  proyectoId: string
  proyectoEdtId: string // ✅ OBLIGATORIO
  // ❌ REMOVER: proyectoZonaId?: string
  orden: number
  createdAt: Date
  updatedAt: Date
  proyectoEdt: ProyectoEdt
  proyectoTareas: ProyectoTarea[]
}

// ✅ MODIFICAR CreateProyectoActividadPayload
export interface CreateProyectoActividadPayload {
  nombre: string
  descripcion?: string
  fechaInicioPlan?: string
  fechaFinPlan?: string
  horasEstimadas?: number
  prioridad?: ProyectoPrioridad
  proyectoEdtId: string // ✅ OBLIGATORIO
  // ❌ REMOVER: proyectoZonaId?: string
  orden?: number
}
```

---

## 🧩 **SERVICIOS - ACTUALIZACIONES**

### **1. Servicio de Cronograma**

```typescript
// src/lib/services/cronogramaService.ts

export class CronogramaService {
  // ❌ ELIMINAR métodos de zonas
  // async createZona(...) { ... }
  // async updateZona(...) { ... }
  // async deleteZona(...) { ... }

  // ✅ MODIFICAR createActividad
  async createActividad(proyectoId: string, data: CreateProyectoActividadPayload) {
    // ✅ Validar EDT existe
    const edt = await prisma.proyectoEdt.findFirst({
      where: {
        id: data.proyectoEdtId,
        proyectoId
      }
    })

    if (!edt) {
      throw new Error('EDT no encontrado')
    }

    // ✅ Crear actividad directamente bajo EDT
    return await prisma.proyectoActividad.create({
      data: {
        ...data,
        proyectoId
        // ❌ Sin zona
      },
      include: {
        proyectoEdt: true,
        proyectoTareas: true
      }
    })
  }

  // ✅ MODIFICAR lógica de métricas
  async calcularMetricasProyecto(proyectoId: string) {
    const actividades = await prisma.proyectoActividad.findMany({
      where: { proyectoId },
      include: {
        proyectoTareas: true,
        proyectoEdt: true // ✅ EDT directo
      }
    })

    // ✅ Cálculos sin considerar zonas
    const totalActividades = actividades.length
    const actividadesCompletadas = actividades.filter(a => a.estado === 'completado').length
    const progresoGeneral = totalActividades > 0 ? (actividadesCompletadas / totalActividades) * 100 : 0

    return {
      totalActividades,
      actividadesCompletadas,
      progresoGeneral,
      actividadesPorEdt: this.agruparPorEdt(actividades) // ✅ Nuevo método
    }
  }

  // ✅ Nuevo método para agrupar por EDT
  private agruparPorEdt(actividades: ProyectoActividad[]) {
    return actividades.reduce((acc, actividad) => {
      const edtId = actividad.proyectoEdtId
      if (!acc[edtId]) {
        acc[edtId] = {
          edt: actividad.proyectoEdt,
          actividades: [],
          totalTareas: 0,
          tareasCompletadas: 0
        }
      }
      acc[edtId].actividades.push(actividad)
      acc[edtId].totalTareas += actividad.proyectoTareas.length
      acc[edtId].tareasCompletadas += actividad.proyectoTareas.filter(t => t.estado === 'completado').length
      return acc
    }, {} as Record<string, any>)
  }
}
```

### **2. Servicio de Generación Automática**

```typescript
// src/lib/services/cronogramaAutoGenerationService.ts

export class CronogramaAutoGenerationService {
  async generarDesdeCotizacion(cotizacionId: string, proyectoId: string) {
    // 1. ✅ Obtener servicios de cotización (sin cambios)

    // 2. ✅ Generar fases (sin cambios)

    // 3. ✅ Generar EDTs agrupados por categoría
    const edtsGenerados = await this.generarEdts(servicios, proyectoId)

    // 4. ❌ ELIMINAR generación de zonas

    // 5. ✅ MODIFICAR generación de actividades
    const actividadesGeneradas = await this.generarActividadesDirectas(servicios, edtsGenerados, proyectoId)

    // 6. ✅ Generar tareas (sin cambios)

    return {
      fases: fasesGeneradas,
      edts: edtsGenerados,
      actividades: actividadesGeneradas, // ✅ Directas bajo EDT
      tareas: tareasGeneradas
    }
  }

  // ✅ NUEVO método: generar actividades directamente bajo EDT
  private async generarActividadesDirectas(
    servicios: CotizacionServicio[],
    edts: ProyectoEdt[],
    proyectoId: string
  ) {
    const actividades = []

    for (const servicio of servicios) {
      // ✅ Encontrar EDT correspondiente por categoría
      const edtCorrespondiente = edts.find(edt =>
        edt.categoriaServicio === servicio.categoria.nombre
      )

      if (!edtCorrespondiente) continue

      // ✅ Crear actividad directamente bajo EDT
      const actividad = await prisma.proyectoActividad.create({
        data: {
          nombre: servicio.nombre,
          descripcion: servicio.descripcion,
          proyectoId,
          proyectoEdtId: edtCorrespondiente.id, // ✅ Directo a EDT
          horasEstimadas: servicio.items.reduce((sum, item) => sum + item.horaTotal, 0),
          estado: 'planificado',
          prioridad: 'media'
        }
      })

      actividades.push(actividad)
    }

    return actividades
  }
}
```

---

## 🖥️ **COMPONENTES FRONTEND**

### **1. Eliminación de Componentes de Zonas**

```typescript
// ❌ ELIMINAR COMPLETAMENTE estos archivos:
// src/components/proyectos/cronograma/ProyectoZonaList.tsx
// src/components/proyectos/cronograma/ProyectoZonaForm.tsx
// src/components/proyectos/cronograma/ProyectoZonaCard.tsx
```

### **2. Modificación de ProyectoActividadForm**

```typescript
// src/components/proyectos/cronograma/ProyectoActividadForm.tsx

interface ProyectoActividadFormProps {
  proyectoId: string
  proyectoEdtId: string // ✅ OBLIGATORIO
  // ❌ REMOVER: zonaId?: string
  onSubmit: (data: CreateProyectoActividadPayload) => void
  onCancel: () => void
}

export function ProyectoActividadForm({
  proyectoId,
  proyectoEdtId, // ✅ Siempre requerido
  onSubmit,
  onCancel
}: ProyectoActividadFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    fechaInicioPlan: '',
    fechaFinPlan: '',
    horasEstimadas: '',
    prioridad: 'media' as ProyectoPrioridad,
    proyectoEdtId // ✅ Pre-llenado
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload: CreateProyectoActividadPayload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion || undefined,
      fechaInicioPlan: formData.fechaInicioPlan || undefined,
      fechaFinPlan: formData.fechaFinPlan || undefined,
      horasEstimadas: formData.horasEstimadas ? parseFloat(formData.horasEstimadas) : undefined,
      prioridad: formData.prioridad,
      proyectoEdtId // ✅ Siempre incluido
    }

    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ✅ Formulario simplificado sin selección de zona */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Nombre de la Actividad
        </label>
        <input
          type="text"
          value={formData.nombre}
          onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Descripción
        </label>
        <textarea
          value={formData.descripcion}
          onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          rows={3}
        />
      </div>

      {/* ✅ Fechas y horas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Fecha Inicio Planificada
          </label>
          <input
            type="date"
            value={formData.fechaInicioPlan}
            onChange={(e) => setFormData(prev => ({ ...prev, fechaInicioPlan: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Fecha Fin Planificada
          </label>
          <input
            type="date"
            value={formData.fechaFinPlan}
            onChange={(e) => setFormData(prev => ({ ...prev, fechaFinPlan: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Horas Estimadas
          </label>
          <input
            type="number"
            step="0.5"
            value={formData.horasEstimadas}
            onChange={(e) => setFormData(prev => ({ ...prev, horasEstimadas: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Prioridad
          </label>
          <select
            value={formData.prioridad}
            onChange={(e) => setFormData(prev => ({ ...prev, prioridad: e.target.value as ProyectoPrioridad }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
        >
          Crear Actividad
        </button>
      </div>
    </form>
  )
}
```

### **3. Modificación de ProyectoActividadList**

```typescript
// src/components/proyectos/cronograma/ProyectoActividadList.tsx

interface ProyectoActividadListProps {
  proyectoId: string
  proyectoEdtId: string // ✅ OBLIGATORIO
  // ❌ REMOVER: zonaId?: string
}

export function ProyectoActividadList({
  proyectoId,
  proyectoEdtId
}: ProyectoActividadListProps) {
  const [actividades, setActividades] = useState<ProyectoActividad[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadActividades()
  }, [proyectoId, proyectoEdtId])

  const loadActividades = async () => {
    try {
      // ✅ Cargar actividades directamente del EDT
      const response = await fetch(`/api/proyectos/${proyectoId}/actividades?edtId=${proyectoEdtId}`)
      if (response.ok) {
        const data = await response.json()
        setActividades(data)
      }
    } catch (error) {
      console.error('Error cargando actividades:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateActividad = async (data: CreateProyectoActividadPayload) => {
    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/actividades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          proyectoEdtId // ✅ Siempre usar el EDT actual
        })
      })

      if (response.ok) {
        await loadActividades() // ✅ Recargar lista
      }
    } catch (error) {
      console.error('Error creando actividad:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-4">Cargando actividades...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Actividades</h3>
        <ProyectoActividadForm
          proyectoId={proyectoId}
          proyectoEdtId={proyectoEdtId} // ✅ EDT fijo
          onSubmit={handleCreateActividad}
          onCancel={() => {}} // ✅ Formulario modal o inline
        />
      </div>

      <div className="space-y-2">
        {actividades.map(actividad => (
          <ProyectoActividadCard
            key={actividad.id}
            actividad={actividad}
            onUpdate={loadActividades}
            onDelete={loadActividades}
          />
        ))}

        {actividades.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay actividades en este EDT.
            <br />
            Crea la primera actividad para comenzar.
          </div>
        )}
      </div>
    </div>
  )
}
```

### **4. Modificación de ProyectoCronogramaTab**

```typescript
// src/components/proyectos/cronograma/ProyectoCronogramaTab.tsx

export function ProyectoCronogramaTab({ proyecto }: ProyectoCronogramaTabProps) {
  const [activeTab, setActiveTab] = useState('fases')

  const tabs = [
    { id: 'fases', label: 'Fases', icon: FolderIcon },
    { id: 'edts', label: 'EDTs', icon: CogIcon },
    // ❌ REMOVER TAB de zonas
    { id: 'actividades', label: 'Actividades', icon: BoltIcon },
    { id: 'dependencias', label: 'Dependencias', icon: LinkIcon },
    { id: 'vista-gantt', label: 'Vista Gantt', icon: ChartBarIcon },
    { id: 'metricas', label: 'Métricas', icon: ChartPieIcon },
    { id: 'filtros', label: 'Filtros', icon: FilterIcon }
  ]

  return (
    <div className="space-y-6">
      {/* ✅ Header con métricas generales */}
      <ProyectoCronogramaMetrics proyectoId={proyecto.id} />

      {/* ✅ Tabs de navegación */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5 inline mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ✅ Contenido de tabs */}
      <div className="min-h-96">
        {activeTab === 'fases' && <ProyectoFasesList proyectoId={proyecto.id} />}
        {activeTab === 'edts' && <ProyectoEdtList proyectoId={proyecto.id} />}
        {/* ❌ REMOVER: zonas */}
        {activeTab === 'actividades' && <ProyectoActividadList proyectoId={proyecto.id} />}
        {activeTab === 'dependencias' && <ProyectoDependenciasVisual proyectoId={proyecto.id} />}
        {activeTab === 'vista-gantt' && <ProyectoGanttView proyectoId={proyecto.id} />}
        {activeTab === 'metricas' && <ProyectoCronogramaMetrics proyectoId={proyecto.id} detailed />}
        {activeTab === 'filtros' && <ProyectoCronogramaFilters proyectoId={proyecto.id} />}
      </div>
    </div>
  )
}
```

---

## 📄 **PÁGINAS - ACTUALIZACIONES**

### **1. Página de Configuración de Fases**

```typescript
// src/app/configuracion/fases/page.tsx
// ✅ Sin cambios mayores - fases siguen igual
```

### **2. Página de Proyecto EDTs**

```typescript
// src/app/proyectos/[id]/edt/[edtId]/page.tsx

interface EdtPageProps {
  params: { id: string; edtId: string }
}

export default function EdtPage({ params }: EdtPageProps) {
  return (
    <div className="space-y-6">
      <ProyectoEdtHeader proyectoId={params.id} edtId={params.edtId} />

      {/* ✅ EDT details */}
      <ProyectoEdtDetails proyectoId={params.id} edtId={params.edtId} />

      {/* ✅ Actividades directamente bajo EDT */}
      <ProyectoActividadList
        proyectoId={params.id}
        proyectoEdtId={params.edtId} // ✅ EDT directo
      />

      {/* ✅ Tareas de las actividades */}
      <ProyectoTareaList proyectoId={params.id} edtId={params.edtId} />
    </div>
  )
}
```

### **3. Página de Proyecto Cronograma**

```typescript
// src/app/proyectos/[id]/cronograma/page.tsx

interface CronogramaPageProps {
  params: { id: string }
}

export default function CronogramaPage({ params }: CronogramaPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cronograma del Proyecto</h1>
        <ProyectoCronogramaActions proyectoId={params.id} />
      </div>

      {/* ✅ Cronograma unificado de 5 niveles */}
      <ProyectoCronogramaTab proyectoId={params.id} />
    </div>
  )
}
```

---

## 🛠️ **UTILIDADES - ACTUALIZACIONES**

### **1. Validadores**

```typescript
// src/lib/validators/cronograma.ts

// ✅ MODIFICAR validaciones jerárquicas
export const cronogramaValidators = {
  actividad: z.object({
    nombre: z.string().min(1, 'Nombre requerido'),
    descripcion: z.string().optional(),
    fechaInicioPlan: z.string().datetime().optional(),
    fechaFinPlan: z.string().datetime().optional(),
    horasEstimadas: z.number().positive().optional(),
    prioridad: z.enum(['baja', 'media', 'alta', 'critica']),
    proyectoEdtId: z.string().min(1, 'EDT requerido'), // ✅ OBLIGATORIO
    // ❌ REMOVER: proyectoZonaId: z.string().optional()
  }),

  // ✅ Validar jerarquía de 5 niveles
  jerarquiaCompleta: (actividad: any) => {
    const errores = []

    if (!actividad.proyectoEdtId) {
      errores.push('Actividad debe tener EDT padre')
    }

    // ✅ Verificar EDT existe y pertenece al proyecto
    if (actividad.proyectoEdt && actividad.proyectoEdt.proyectoId !== actividad.proyectoId) {
      errores.push('EDT no pertenece al proyecto')
    }

    return errores
  }
}
```

### **2. Helpers de UI**

```typescript
// src/lib/utils/cronogramaHelpers.ts

// ✅ MODIFICAR helpers para 5 niveles
export const cronogramaHelpers = {
  // ✅ Calcular progreso por EDT (sin zonas)
  calcularProgresoEdt: (edt: ProyectoEdt & { actividades: ProyectoActividad[] }) => {
    if (edt.actividades.length === 0) return 0

    const totalActividades = edt.actividades.length
    const actividadesCompletadas = edt.actividades.filter(a => a.estado === 'completado').length

    return (actividadesCompletadas / totalActividades) * 100
  },

  // ✅ Agrupar actividades por EDT
  agruparActividadesPorEdt: (actividades: ProyectoActividad[]) => {
    return actividades.reduce((acc, actividad) => {
      const edtId = actividad.proyectoEdtId
      if (!acc[edtId]) {
        acc[edtId] = {
          edt: actividad.proyectoEdt,
          actividades: []
        }
      }
      acc[edtId].actividades.push(actividad)
      return acc
    }, {} as Record<string, { edt: ProyectoEdt; actividades: ProyectoActividad[] }>)
  },

  // ✅ Generar estructura de árbol de 5 niveles
  generarArbolCronograma: (proyecto: Proyecto) => {
    const arbol = {
      proyecto: proyecto,
      fases: proyecto.proyectoFases.map(fase => ({
        ...fase,
        edts: fase.proyectoEdts.map(edt => ({
          ...edt,
          actividades: edt.proyectoActividades.map(actividad => ({
            ...actividad,
            tareas: actividad.proyectoTareas
          }))
        }))
      }))
    }

    return arbol
  }
}
```

### **3. Constants y Config**

```typescript
// src/lib/constants/cronograma.ts

// ✅ MODIFICAR constantes para 5 niveles
export const CRONOGRAMA_CONFIG = {
  niveles: 5,
  jerarquia: ['proyecto', 'fase', 'edt', 'actividad', 'tarea'],
  iconos: {
    proyecto: '🏢',
    fase: '📋',
    edt: '🔧',
    actividad: '⚙️',
    tarea: '✅'
  },
  colores: {
    proyecto: 'bg-blue-100 text-blue-800',
    fase: 'bg-green-100 text-green-800',
    edt: 'bg-yellow-100 text-yellow-800',
    actividad: 'bg-purple-100 text-purple-800',
    tarea: 'bg-gray-100 text-gray-800'
  },
  // ✅ Estados sin zona
  estados: ['planificado', 'en_progreso', 'completado', 'pausado', 'cancelado'],
  prioridades: ['baja', 'media', 'alta', 'critica']
}
```

---

## ✅ **CHECKLIST DE IMPLEMENTACIÓN**

### **FASE 1: Base de Datos**
- [ ] Ejecutar migración `migration_005_remove_zones.sql`
- [ ] Verificar que no hay referencias huérfanas
- [ ] Probar rollback script
- [ ] Actualizar schema de Prisma
- [ ] Generar nuevo cliente Prisma

### **FASE 2: APIs**
- [ ] Eliminar archivos de zonas (`/api/proyectos/[id]/zonas/`)
- [ ] Modificar `ProyectoActividad` API para EDT obligatorio
- [ ] Actualizar payloads y tipos TypeScript
- [ ] Probar endpoints con Postman/Insomnia
- [ ] Actualizar documentación de API

### **FASE 3: Servicios**
- [ ] Modificar `CronogramaService` para eliminar zonas
- [ ] Actualizar `CronogramaAutoGenerationService`
- [ ] Cambiar lógica de métricas
- [ ] Probar generación automática desde cotizaciones
- [ ] Validar cálculos de progreso

### **FASE 4: Componentes Frontend**
- [ ] Eliminar componentes de zonas
- [ ] Modificar `ProyectoActividadForm` (sin zonaId)
- [ ] Actualizar `ProyectoActividadList`
- [ ] Modificar `ProyectoCronogramaTab` (remover tab zonas)
- [ ] Actualizar navegación y breadcrumbs

### **FASE 5: Páginas**
- [ ] Modificar página de EDTs para actividades directas
- [ ] Actualizar página de cronograma
- [ ] Verificar navegación funciona
- [ ] Probar creación de actividades

### **FASE 6: Utilidades**
- [ ] Actualizar validadores
- [ ] Modificar helpers
- [ ] Cambiar constantes
- [ ] Probar funciones auxiliares

### **FASE 7: Testing**
- [ ] Ejecutar tests unitarios
- [ ] Probar integración end-to-end
- [ ] Validar creación de cronogramas
- [ ] Probar generación automática
- [ ] Verificar métricas y reportes

### **FASE 8: Documentación**
- [ ] Actualizar README técnico
- [ ] Modificar guías de usuario
- [ ] Actualizar documentación de API
- [ ] Crear guía de migración
- [ ] Documentar cambios para usuarios

---

## 🧪 **TESTING PLAN**

### **Tests Unitarios**
```typescript
// src/__tests__/services/cronogramaService.test.ts
describe('CronogramaService - 5 Niveles', () => {
  it('should create actividad directly under EDT', async () => {
    // ✅ Test sin zona
  })

  it('should calculate metrics without zones', async () => {
    // ✅ Test métricas por EDT
  })
})
```

### **Tests de Integración**
```typescript
// src/__tests__/integration/cronograma-5-niveles.test.ts
describe('Cronograma 5 Niveles Integration', () => {
  it('should generate complete cronograma from cotizacion', async () => {
    // ✅ Test generación automática
  })

  it('should handle actividad creation under EDT', async () => {
    // ✅ Test creación directa
  })
})
```

### **Tests E2E**
```typescript
// e2e/cronograma-5-niveles.e2e.spec.ts
describe('Cronograma 5 Niveles E2E', () => {
  it('should create proyecto with 5-level cronograma', () => {
    // ✅ Test flujo completo
  })
})
```

---

## 🚀 **DESPLIEGUE Y MIGRACIÓN**

### **Plan de Despliegue**
1. **Backup completo** de base de datos
2. **Despliegue en staging** con feature flag
3. **Testing exhaustivo** en staging
4. **Migración de datos** en producción
5. **Monitoreo 24/7** post-despliegue

### **Rollback Plan**
1. **Script de rollback** preparado
2. **Restauración de backup** si es necesario
3. **Documentación clara** de vuelta atrás

### **Monitoreo Post-Despliegue**
- Logs de errores
- Métricas de performance
- Feedback de usuarios
- Alertas automáticas

---

## 📞 **SOPORTE Y MIGRACIÓN**

### **Guía de Migración para Usuarios**
1. **Proyectos existentes**: Funcionan sin cambios
2. **Nuevos proyectos**: Usan jerarquía de 5 niveles
3. **Cotizaciones**: Conversión automática sin zonas
4. **Reportes**: Compatibles con nueva estructura

### **Preguntas Frecuentes**
- **¿Qué pasa con zonas existentes?** Se eliminan en migración
- **¿Puedo recuperar zonas?** No, pero datos se preservan en backup
- **¿Cómo crear actividades ahora?** Directamente bajo EDT
- **¿Cambian los reportes?** No, se adaptan automáticamente

---

## 🎯 **VALIDACIÓN FINAL**

### **Checklist de Validación**
- [ ] Base de datos: Sin tabla `proyecto_zonas`
- [ ] APIs: Endpoints de zonas retornan 404
- [ ] Frontend: No hay referencias a zonas en UI
- [ ] Generación: Cronogramas se crean sin zonas
- [ ] Tests: Todos pasan
- [ ] Documentación: Actualizada

### **Criterios de Éxito**
- ✅ Sistema funciona con 5 niveles
- ✅ Usuarios pueden crear actividades bajo EDT
- ✅ Métricas se calculan correctamente
- ✅ Generación automática funciona
- ✅ Interfaz es más simple y clara

---

**📅 Fecha**: Octubre 2025
**👥 Autor**: Sistema de IA Mejorado
**🎯 Versión**: 5.0.0 - Sistema Simplificado de 5 Niveles
**✅ Estado**: Listo para implementación