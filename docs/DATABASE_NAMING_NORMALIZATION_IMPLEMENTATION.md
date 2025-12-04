# 🚀 **IMPLEMENTACIÓN COMPLETA: NORMALIZACIÓN DE NOMENCLATURA**

*Plan exhaustivo para alinear base de datos y código con convenciones oficiales*

## 📋 **RESUMEN EJECUTIVO**

Este documento detalla la implementación completa para normalizar toda la base de datos y código del proyecto GYS Control, alineando con las convenciones híbridas oficiales: **PascalCase** (modelos Prisma) → **snake_case** (tablas PostgreSQL) → **camelCase** (campos y relaciones).

**Estado**: Desarrollo - Datos no importantes
**Timeline**: 4 días de implementación
**Objetivo**: 100% consistencia con convenciones documentadas

---

## 🗄️ **FASE 1: CAMBIOS EN BASE DE DATOS**

### 1.1 Análisis de Inconsistencias Actuales

**Problemas identificados:**
- Campos con snake_case en lugar de camelCase
- Relaciones con nombres inconsistentes
- Tablas ya correctas (snake_case)
- Modelos ya correctos (PascalCase)

**Campos que requieren cambio:**
```prisma
// ❌ ACTUALMENTE INCORRECTO
model User {
  proyecto_actividad ProyectoActividad[]  // snake_case ❌
  proyectoEdtsResponsable ProyectoEdt[]   // PascalCase ❌
}

// ✅ DEBE SER
model User {
  proyectoActividad ProyectoActividad[]   // camelCase ✅
  proyectoEdtsResponsable ProyectoEdt[]   // camelCase ✅
}
```

### 1.2 Actualización del Schema de Prisma

**Archivo:** `prisma/schema.prisma`

```prisma
// 🔧 CAMBIOS PRINCIPALES EN MODELOS

model User {
  // ❌ ANTES
  proyecto_actividad ProyectoActividad[]
  proyectoEdtsResponsable ProyectoEdt[]

  // ✅ DESPUÉS
  proyectoActividad ProyectoActividad[]
  proyectoEdtsResponsable ProyectoEdt[]
}

model ProyectoActividad {
  // ❌ ANTES
  proyecto_edt ProyectoEdt @relation(fields: [proyectoEdtId], references: [id])

  // ✅ DESPUÉS (ya correcto - sin cambios)
  proyectoEdt ProyectoEdt @relation(fields: [proyectoEdtId], references: [id])
}
```

### 1.3 Generación de Migración

```bash
# Crear migración para renombrar columnas
npx prisma migrate dev --name normalize_field_names_to_camelcase

# Aplicar migración (seguro - desarrollo sin datos importantes)
npx prisma db push

# Regenerar cliente Prisma
npx prisma generate
```

---

## 🔌 **FASE 2: ACTUALIZACIÓN DE APIs**

### 2.1 Rutas API Principales

**Archivo:** `src/app/api/proyectos/[id]/actividades/route.ts`

```typescript
// ❌ ANTES
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actividades = await prisma.proyectoActividad.findMany({
      where: { proyectoId: params.id },
      include: {
        proyecto_edt: true,  // ❌ snake_case
        proyectoTareas: true
      }
    })
    return NextResponse.json(actividades)
  } catch (error) {
    console.error('Error obteniendo actividades:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ✅ DESPUÉS
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actividades = await prisma.proyectoActividad.findMany({
      where: { proyectoId: params.id },
      include: {
        proyectoEdt: true,   // ✅ camelCase
        proyectoTareas: true
      }
    })
    return NextResponse.json(actividades)
  } catch (error) {
    console.error('Error obteniendo actividades:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
```

**Archivo:** `src/app/api/proyectos/[id]/actividades/[actividadId]/route.ts`

```typescript
// ❌ ANTES
export async function PUT(request: NextRequest, { params }: { params: { id: string; actividadId: string } }) {
  try {
    const body = await request.json()
    const actividad = await prisma.proyectoActividad.update({
      where: { id: params.actividadId },
      data: {
        ...body,
        proyecto_edt_id: body.proyecto_edt_id  // ❌ snake_case
      },
      include: {
        proyecto_edt: true  // ❌ snake_case
      }
    })
    return NextResponse.json(actividad)
  } catch (error) {
    return NextResponse.json({ error: 'Error actualizando actividad' }, { status: 500 })
  }
}

// ✅ DESPUÉS
export async function PUT(request: NextRequest, { params }: { params: { id: string; actividadId: string } }) {
  try {
    const body = await request.json()
    const actividad = await prisma.proyectoActividad.update({
      where: { id: params.actividadId },
      data: {
        ...body,
        proyectoEdtId: body.proyectoEdtId  // ✅ camelCase
      },
      include: {
        proyectoEdt: true  // ✅ camelCase
      }
    })
    return NextResponse.json(actividad)
  } catch (error) {
    return NextResponse.json({ error: 'Error actualizando actividad' }, { status: 500 })
  }
}
```

### 2.2 Validadores y Payloads

**Archivo:** `src/lib/validators/proyecto.ts`

```typescript
// ❌ ANTES
export const createProyectoActividadSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  proyecto_edt_id: z.string().min(1, 'EDT requerido'),  // ❌ snake_case
  horasEstimadas: z.number().positive().optional()
})

export interface ProyectoActividad {
  id: string
  nombre: string
  proyecto_edt?: ProyectoEdt  // ❌ snake_case
  proyectoTareas: ProyectoTarea[]
}

// ✅ DESPUÉS
export const createProyectoActividadSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  proyectoEdtId: z.string().min(1, 'EDT requerido'),   // ✅ camelCase
  horasEstimadas: z.number().positive().optional()
})

export interface ProyectoActividad {
  id: string
  nombre: string
  proyectoEdt?: ProyectoEdt   // ✅ camelCase
  proyectoTareas: ProyectoTarea[]
}
```

---

## 🛠️ **FASE 3: ACTUALIZACIÓN DE SERVICIOS**

### 3.1 Servicio de Cronograma

**Archivo:** `src/lib/services/cronogramaService.ts`

```typescript
// ❌ ANTES
export class CronogramaService {
  async getActividades(proyectoId: string) {
    return await prisma.proyectoActividad.findMany({
      where: { proyectoId },
      include: {
        proyecto_edt: true,  // ❌ snake_case
        proyectoTareas: true
      }
    })
  }

  async createActividad(proyectoId: string, data: CreateProyectoActividadPayload) {
    return await prisma.proyectoActividad.create({
      data: {
        ...data,
        proyectoId,
        proyecto_edt_id: data.proyecto_edt_id  // ❌ snake_case
      },
      include: {
        proyecto_edt: true  // ❌ snake_case
      }
    })
  }
}

// ✅ DESPUÉS
export class CronogramaService {
  async getActividades(proyectoId: string) {
    return await prisma.proyectoActividad.findMany({
      where: { proyectoId },
      include: {
        proyectoEdt: true,   // ✅ camelCase
        proyectoTareas: true
      }
    })
  }

  async createActividad(proyectoId: string, data: CreateProyectoActividadPayload) {
    return await prisma.proyectoActividad.create({
      data: {
        ...data,
        proyectoId,
        proyectoEdtId: data.proyectoEdtId  // ✅ camelCase
      },
      include: {
        proyectoEdt: true  // ✅ camelCase
      }
    })
  }
}
```

### 3.2 Servicio de Generación Automática

**Archivo:** `src/lib/services/cronogramaAutoGenerationService.ts`

```typescript
// ❌ ANTES
export class CronogramaAutoGenerationService {
  async generarActividades(servicios: CotizacionServicio[], edts: ProyectoEdt[]) {
    const actividades = []

    for (const servicio of servicios) {
      const actividad = await prisma.proyectoActividad.create({
        data: {
          nombre: servicio.nombre,
          proyecto_edt_id: this.findEdtCorrespondiente(servicio, edts).id,  // ❌
          horasEstimadas: servicio.horaTotal
        }
      })
      actividades.push(actividad)
    }

    return actividades
  }
}

// ✅ DESPUÉS
export class CronogramaAutoGenerationService {
  async generarActividades(servicios: CotizacionServicio[], edts: ProyectoEdt[]) {
    const actividades = []

    for (const servicio of servicios) {
      const actividad = await prisma.proyectoActividad.create({
        data: {
          nombre: servicio.nombre,
          proyectoEdtId: this.findEdtCorrespondiente(servicio, edts).id,   // ✅
          horasEstimadas: servicio.horaTotal
        }
      })
      actividades.push(actividad)
    }

    return actividades
  }
}
```

---

## 📝 **FASE 4: TIPOS TYPESCRIPT**

### 4.1 Interfaces de Proyecto

**Archivo:** `src/types/proyecto.ts`

```typescript
// ❌ ANTES
export interface ProyectoActividad {
  id: string
  nombre: string
  descripcion?: string
  proyecto_edt?: ProyectoEdt  // ❌ snake_case
  proyectoTareas: ProyectoTarea[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateProyectoActividadPayload {
  nombre: string
  descripcion?: string
  proyecto_edt_id: string     // ❌ snake_case
  horasEstimadas?: number
}

// ✅ DESPUÉS
export interface ProyectoActividad {
  id: string
  nombre: string
  descripcion?: string
  proyectoEdt?: ProyectoEdt   // ✅ camelCase
  proyectoTareas: ProyectoTarea[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateProyectoActividadPayload {
  nombre: string
  descripcion?: string
  proyectoEdtId: string       // ✅ camelCase
  horasEstimadas?: number
}
```

### 4.2 Tipos de API

**Archivo:** `src/types/api.ts`

```typescript
// ❌ ANTES
export interface ApiResponse<T> {
  data: T
  proyecto_edt?: ProyectoEdt  // ❌
  message?: string
}

// ✅ DESPUÉS
export interface ApiResponse<T> {
  data: T
  proyectoEdt?: ProyectoEdt   // ✅
  message?: string
}
```

---

## 🖥️ **FASE 5: COMPONENTES FRONTEND**

### 5.1 Componente de Lista de Actividades

**Archivo:** `src/components/proyectos/cronograma/ProyectoActividadList.tsx`

```typescript
// ❌ ANTES
interface ProyectoActividadListProps {
  proyectoId: string
  proyecto_edt_id?: string  // ❌ snake_case
}

export function ProyectoActividadList({ proyectoId, proyecto_edt_id }: ProyectoActividadListProps) {
  const [actividades, setActividades] = useState<ProyectoActividad[]>([])

  useEffect(() => {
    loadActividades()
  }, [proyectoId, proyecto_edt_id])

  const loadActividades = async () => {
    try {
      const url = proyecto_edt_id
        ? `/api/proyectos/${proyectoId}/actividades?edtId=${proyecto_edt_id}`
        : `/api/proyectos/${proyectoId}/actividades`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setActividades(data)
      }
    } catch (error) {
      console.error('Error cargando actividades:', error)
    }
  }

  return (
    <div className="space-y-4">
      {actividades.map(actividad => (
        <div key={actividad.id} className="border rounded-lg p-4">
          <h3 className="font-medium">{actividad.nombre}</h3>
          <p className="text-sm text-gray-600">
            EDT: {actividad.proyecto_edt?.nombre}  {/* ❌ snake_case */}
          </p>
        </div>
      ))}
    </div>
  )
}

// ✅ DESPUÉS
interface ProyectoActividadListProps {
  proyectoId: string
  proyectoEdtId?: string   // ✅ camelCase
}

export function ProyectoActividadList({ proyectoId, proyectoEdtId }: ProyectoActividadListProps) {
  const [actividades, setActividades] = useState<ProyectoActividad[]>([])

  useEffect(() => {
    loadActividades()
  }, [proyectoId, proyectoEdtId])

  const loadActividades = async () => {
    try {
      const url = proyectoEdtId
        ? `/api/proyectos/${proyectoId}/actividades?edtId=${proyectoEdtId}`
        : `/api/proyectos/${proyectoId}/actividades`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setActividades(data)
      }
    } catch (error) {
      console.error('Error cargando actividades:', error)
    }
  }

  return (
    <div className="space-y-4">
      {actividades.map(actividad => (
        <div key={actividad.id} className="border rounded-lg p-4">
          <h3 className="font-medium">{actividad.nombre}</h3>
          <p className="text-sm text-gray-600">
            EDT: {actividad.proyectoEdt?.nombre}  {/* ✅ camelCase */}
          </p>
        </div>
      ))}
    </div>
  )
}
```

### 5.2 Formulario de Actividad

**Archivo:** `src/components/proyectos/cronograma/ProyectoActividadForm.tsx`

```typescript
// ❌ ANTES
interface ProyectoActividadFormProps {
  proyectoId: string
  proyecto_edt_id: string      // ❌ snake_case
  onSubmit: (data: CreateProyectoActividadPayload) => void
  onCancel: () => void
}

export function ProyectoActividadForm({
  proyectoId,
  proyecto_edt_id,             // ❌ snake_case
  onSubmit,
  onCancel
}: ProyectoActividadFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    proyecto_edt_id,            // ❌ snake_case
    horasEstimadas: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload: CreateProyectoActividadPayload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion || undefined,
      proyecto_edt_id: formData.proyecto_edt_id,  // ❌ snake_case
      horasEstimadas: formData.horasEstimadas ? parseFloat(formData.horasEstimadas) : undefined
    }

    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          EDT Asociado
        </label>
        <p className="text-sm text-gray-500">
          EDT ID: {proyecto_edt_id}  {/* ❌ snake_case */}
        </p>
      </div>
    </form>
  )
}

// ✅ DESPUÉS
interface ProyectoActividadFormProps {
  proyectoId: string
  proyectoEdtId: string        // ✅ camelCase
  onSubmit: (data: CreateProyectoActividadPayload) => void
  onCancel: () => void
}

export function ProyectoActividadForm({
  proyectoId,
  proyectoEdtId,               // ✅ camelCase
  onSubmit,
  onCancel
}: ProyectoActividadFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    proyectoEdtId,              // ✅ camelCase
    horasEstimadas: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload: CreateProyectoActividadPayload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion || undefined,
      proyectoEdtId: formData.proyectoEdtId,  // ✅ camelCase
      horasEstimadas: formData.horasEstimadas ? parseFloat(formData.horasEstimadas) : undefined
    }

    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          EDT Asociado
        </label>
        <p className="text-sm text-gray-500">
          EDT ID: {proyectoEdtId}  {/* ✅ camelCase */}
        </p>
      </div>
    </form>
  )
}
```

### 5.3 Hook Personalizado

**Archivo:** `src/hooks/useProyecto.ts`

```typescript
// ❌ ANTES
export function useProyecto(proyectoId: string) {
  const [actividades, setActividades] = useState<ProyectoActividad[]>([])

  useEffect(() => {
    fetchActividades()
  }, [proyectoId])

  const fetchActividades = async () => {
    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/actividades`)
      const data = await response.json()
      setActividades(data.map((act: any) => ({
        ...act,
        proyecto_edt: act.proyecto_edt  // ❌ snake_case
      })))
    } catch (error) {
      console.error('Error fetching actividades:', error)
    }
  }

  return { actividades, fetchActividades }
}

// ✅ DESPUÉS
export function useProyecto(proyectoId: string) {
  const [actividades, setActividades] = useState<ProyectoActividad[]>([])

  useEffect(() => {
    fetchActividades()
  }, [proyectoId])

  const fetchActividades = async () => {
    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/actividades`)
      const data = await response.json()
      setActividades(data.map((act: any) => ({
        ...act,
        proyectoEdt: act.proyectoEdt  // ✅ camelCase
      })))
    } catch (error) {
      console.error('Error fetching actividades:', error)
    }
  }

  return { actividades, fetchActividades }
}
```

---

## 📄 **FASE 6: PÁGINAS Y MODALES**

### 6.1 Página de Cronograma

**Archivo:** `src/app/proyectos/[id]/cronograma/page.tsx`

```typescript
// ❌ ANTES
interface CronogramaPageProps {
  params: { id: string }
}

export default function CronogramaPage({ params }: CronogramaPageProps) {
  const [actividades, setActividades] = useState<ProyectoActividad[]>([])

  useEffect(() => {
    loadActividades()
  }, [])

  const loadActividades = async () => {
    const response = await fetch(`/api/proyectos/${params.id}/actividades`)
    const data = await response.json()
    setActividades(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cronograma del Proyecto</h1>
      </div>

      <div className="grid gap-4">
        {actividades.map(actividad => (
          <ProyectoActividadCard
            key={actividad.id}
            actividad={actividad}
            proyecto_edt={actividad.proyecto_edt}  // ❌ snake_case
          />
        ))}
      </div>
    </div>
  )
}

// ✅ DESPUÉS
interface CronogramaPageProps {
  params: { id: string }
}

export default function CronogramaPage({ params }: CronogramaPageProps) {
  const [actividades, setActividades] = useState<ProyectoActividad[]>([])

  useEffect(() => {
    loadActividades()
  }, [])

  const loadActividades = async () => {
    const response = await fetch(`/api/proyectos/${params.id}/actividades`)
    const data = await response.json()
    setActividades(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cronograma del Proyecto</h1>
      </div>

      <div className="grid gap-4">
        {actividades.map(actividad => (
          <ProyectoActividadCard
            key={actividad.id}
            actividad={actividad}
            proyectoEdt={actividad.proyectoEdt}  // ✅ camelCase
          />
        ))}
      </div>
    </div>
  )
}
```

### 6.2 Modal de Actividad

**Archivo:** `src/components/proyectos/ProyectoActividadModal.tsx`

```typescript
// ❌ ANTES
interface ProyectoActividadModalProps {
  isOpen: boolean
  actividad?: ProyectoActividad
  proyecto_edt_id: string      // ❌ snake_case
  onSave: (data: CreateProyectoActividadPayload) => void
  onClose: () => void
}

export function ProyectoActividadModal({
  isOpen,
  actividad,
  proyecto_edt_id,             // ❌ snake_case
  onSave,
  onClose
}: ProyectoActividadModalProps) {
  const [formData, setFormData] = useState({
    nombre: actividad?.nombre || '',
    descripcion: actividad?.descripcion || '',
    proyecto_edt_id,            // ❌ snake_case
    horasEstimadas: actividad?.horasEstimadas?.toString() || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload: CreateProyectoActividadPayload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion || undefined,
      proyecto_edt_id: formData.proyecto_edt_id,  // ❌ snake_case
      horasEstimadas: formData.horasEstimadas ? parseFloat(formData.horasEstimadas) : undefined
    }

    onSave(payload)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actividad ? 'Editar' : 'Crear'} Actividad
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              EDT Asociado
            </label>
            <p className="text-sm text-gray-500">
              EDT ID: {proyecto_edt_id}  {/* ❌ snake_case */}
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ✅ DESPUÉS
interface ProyectoActividadModalProps {
  isOpen: boolean
  actividad?: ProyectoActividad
  proyectoEdtId: string        // ✅ camelCase
  onSave: (data: CreateProyectoActividadPayload) => void
  onClose: () => void
}

export function ProyectoActividadModal({
  isOpen,
  actividad,
  proyectoEdtId,               // ✅ camelCase
  onSave,
  onClose
}: ProyectoActividadModalProps) {
  const [formData, setFormData] = useState({
    nombre: actividad?.nombre || '',
    descripcion: actividad?.descripcion || '',
    proyectoEdtId,              // ✅ camelCase
    horasEstimadas: actividad?.horasEstimadas?.toString() || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload: CreateProyectoActividadPayload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion || undefined,
      proyectoEdtId: formData.proyectoEdtId,  // ✅ camelCase
      horasEstimadas: formData.horasEstimadas ? parseFloat(formData.horasEstimadas) : undefined
    }

    onSave(payload)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actividad ? 'Editar' : 'Crear'} Actividad
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              EDT Asociado
            </label>
            <p className="text-sm text-gray-500">
              EDT ID: {proyectoEdtId}  {/* ✅ camelCase */}
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 🧪 **FASE 7: TESTING**

### 7.1 Tests Unitarios

**Archivo:** `src/__tests__/services/cronogramaService.test.ts`

```typescript
// ❌ ANTES
describe('CronogramaService', () => {
  describe('createActividad', () => {
    it('should create actividad with valid data', async () => {
      const mockData = {
        nombre: 'Actividad Test',
        proyecto_edt_id: 'edt-123',  // ❌ snake_case
        horasEstimadas: 10
      }

      const result = await cronogramaService.createActividad('project-123', mockData)

      expect(result).toHaveProperty('id')
      expect(result.proyecto_edt_id).toBe('edt-123')  // ❌ snake_case
    })
  })
})

// ✅ DESPUÉS
describe('CronogramaService', () => {
  describe('createActividad', () => {
    it('should create actividad with valid data', async () => {
      const mockData = {
        nombre: 'Actividad Test',
        proyectoEdtId: 'edt-123',   // ✅ camelCase
        horasEstimadas: 10
      }

      const result = await cronogramaService.createActividad('project-123', mockData)

      expect(result).toHaveProperty('id')
      expect(result.proyectoEdtId).toBe('edt-123')  // ✅ camelCase
    })
  })
})
```

### 7.2 Tests de Integración

**Archivo:** `src/__tests__/integration/proyecto-cronograma.test.ts`

```typescript
// ❌ ANTES
describe('Proyecto Cronograma Integration', () => {
  it('should create actividad linked to EDT', async () => {
    const edt = await createTestEdt()
    const actividadData = {
      nombre: 'Test Actividad',
      proyecto_edt_id: edt.id  // ❌ snake_case
    }

    const actividad = await request(app)
      .post(`/api/proyectos/${proyectoId}/actividades`)
      .send(actividadData)
      .expect(201)

    expect(actividad.body.proyecto_edt_id).toBe(edt.id)  // ❌ snake_case
  })
})

// ✅ DESPUÉS
describe('Proyecto Cronograma Integration', () => {
  it('should create actividad linked to EDT', async () => {
    const edt = await createTestEdt()
    const actividadData = {
      nombre: 'Test Actividad',
      proyectoEdtId: edt.id   // ✅ camelCase
    }

    const actividad = await request(app)
      .post(`/api/proyectos/${proyectoId}/actividades`)
      .send(actividadData)
      .expect(201)

    expect(actividad.body.proyectoEdtId).toBe(edt.id)  // ✅ camelCase
  })
})
```

---

## 📋 **FASE 8: EJECUCIÓN Y VALIDACIÓN**

### Checklist de Implementación por Día:

#### **Día 1: Base de Datos**
- [ ] Actualizar schema de Prisma (normalizar campos a camelCase)
- [ ] Generar migración: `npx prisma migrate dev --name normalize_naming_conventions`
- [ ] Aplicar migración: `npx prisma db push`
- [ ] Regenerar cliente: `npx prisma generate`
- [ ] Verificar estructura BD con pgAdmin/DBeaver

#### **Día 2: Backend (APIs + Servicios + Tipos)**
- [ ] Actualizar rutas API (`/api/proyectos/[id]/actividades/`)
- [ ] Actualizar servicios (`cronogramaService.ts`, `cronogramaAutoGenerationService.ts`)
- [ ] Actualizar validadores (`src/lib/validators/proyecto.ts`)
- [ ] Actualizar tipos TypeScript (`src/types/proyecto.ts`, `src/types/api.ts`)
- [ ] Ejecutar tests backend: `npm test -- --testPathPattern=services`

#### **Día 3: Frontend (Componentes + Páginas)**
- [ ] Actualizar componentes (`ProyectoActividadList.tsx`, `ProyectoActividadForm.tsx`)
- [ ] Actualizar hooks (`useProyecto.ts`)
- [ ] Actualizar páginas (`/proyectos/[id]/cronograma/page.tsx`)
- [ ] Actualizar modales (`ProyectoActividadModal.tsx`)
- [ ] Ejecutar tests frontend: `npm test -- --testPathPattern=components`

#### **Día 4: Testing y Validación Final**
- [ ] Ejecutar suite completa: `npm test`
- [ ] Validar linting: `npm run lint`
- [ ] Build de producción: `npm run build`
- [ ] Testing E2E manual (crear actividad, verificar EDT)
- [ ] Verificar consistencia 100% con convenciones

### Comandos de Validación:

```bash
# Verificar estructura BD
npx prisma db pull
npx prisma studio

# Ejecutar tests
npm test
npm run test:e2e

# Validar build
npm run build
npm run type-check

# Verificar linting
npm run lint
npm run lint:fix
```

### Scripts de Validación Automática:

**Archivo:** `scripts/validate-naming-conventions.js`
```javascript
// Script para validar consistencia de nomenclatura
const fs = require('fs')
const path = require('path')

function validateNamingConventions() {
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma')
  const schema = fs.readFileSync(schemaPath, 'utf8')

  const issues = []

  // Validar campos en snake_case (deben ser camelCase)
  const snakeCaseFields = schema.match(/\b[a-z]+_[a-z]+\b/g) || []
  snakeCaseFields.forEach(field => {
    if (!field.includes('_') || field.startsWith('@@map')) return
    issues.push(`Campo en snake_case encontrado: ${field}`)
  })

  // Validar modelos en PascalCase
  const modelMatches = schema.match(/model\s+(\w+)\s*{/g) || []
  modelMatches.forEach(match => {
    const modelName = match.replace('model', '').replace('{', '').trim()
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(modelName)) {
      issues.push(`Modelo no sigue PascalCase: ${modelName}`)
    }
  })

  if (issues.length > 0) {
    console.error('❌ Issues encontrados:')
    issues.forEach(issue => console.error(`  - ${issue}`))
    process.exit(1)
  } else {
    console.log('✅ Todas las convenciones de nomenclatura son correctas')
  }
}

validateNamingConventions()
```

---

## 🎯 **CRITERIOS DE ÉXITO**

### Validación Final:
- ✅ **Schema de Prisma**: Todos los campos en camelCase, modelos en PascalCase, tablas en snake_case
- ✅ **Base de Datos**: Columnas renombradas correctamente, sin errores de FK
- ✅ **APIs**: Todas las rutas funcionando, payloads correctos
- ✅ **Servicios**: Lógica actualizada, métodos funcionando
- ✅ **Frontend**: Componentes renderizando correctamente, formularios funcionando
- ✅ **Tests**: Suite completa pasando (unitarios + integración)
- ✅ **Build**: Producción compilando sin errores
- ✅ **Consistencia**: 100% alineado con `DATABASE_NAMING_CONVENTIONS.md`

### Métricas de Éxito:
- **0 errores** en compilación TypeScript
- **0 warnings** en ESLint
- **100% tests** pasando
- **0 inconsistencias** en nomenclatura
- **Build exitoso** en producción

---

## 🚨 **PLAN DE ROLLBACK**

Si algo sale mal durante la implementación:

### Rollback de Base de Datos:
```bash
# Revertir migración
npx prisma migrate reset

# Restaurar schema anterior
git checkout HEAD~1 prisma/schema.prisma
npx prisma generate
```

### Rollback de Código:
```bash
# Revertir todos los cambios
git reset --hard HEAD~4  # 4 commits de implementación
git push --force-with-lease
```

---

## 📞 **SOPORTE POST-IMPLEMENTACIÓN**

### Monitoreo:
- Logs de error en producción
- Métricas de performance
- Feedback de usuarios
- Alertas automáticas

### Mantenimiento:
- Validación semanal con script automático
- Code reviews con checklist de convenciones
- Documentación actualizada

---

**📅 Timeline**: 4 días de implementación
**👥 Responsable**: Equipo de Desarrollo
**🎯 Estado**: Listo para implementación
**✅ Versión**: 1.0 - Normalización Completa