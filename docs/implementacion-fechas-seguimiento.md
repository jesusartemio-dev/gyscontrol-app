# 📋 Implementación de Fechas de Seguimiento para ListaEquipo

## 🎯 Objetivo
Implementar un sistema completo de seguimiento de fechas para las listas de equipos, permitiendo rastrear automáticamente el progreso a través de diferentes estados del flujo de aprovisionamiento.

## 📊 Campos de Fecha Implementados

| Campo | Descripción | Tipo | Automático |
|-------|-------------|------|------------|
| `fechaNecesaria` | Fecha límite requerida por el proyecto | `DateTime?` | ❌ Manual |
| `fechaEnvioRevision` | Cuando se envía a revisión | `DateTime?` | ✅ Auto |
| `fechaValidacion` | Cuando se valida técnicamente | `DateTime?` | ✅ Auto |
| `fechaAprobacionRevision` | Cuando se aprueba la revisión | `DateTime?` | ✅ Auto |
| `fechaEnvioLogistica` | Cuando se envía a logística | `DateTime?` | ✅ Auto |
| `fechaInicioCotizacion` | Cuando inicia cotización | `DateTime?` | ✅ Auto |
| `fechaFinCotizacion` | Cuando termina cotización | `DateTime?` | ✅ Auto |
| `fechaAprobacionFinal` | Cuando se aprueba finalmente | `DateTime?` | ✅ Auto |

## 🏗️ Pasos de Implementación

### 1. ✅ Modelo de Base de Datos (Prisma)

**Archivo:** `prisma/schema.prisma`

```prisma
model ListaEquipo {
  // ... campos existentes
  
  // 📅 Campos de seguimiento de fechas
  fechaNecesaria           DateTime? // Fecha límite requerida
  fechaEnvioRevision       DateTime? // Auto: estado -> enviado_revision
  fechaValidacion          DateTime? // Auto: estado -> por_aprobar
  fechaAprobacionRevision  DateTime? // Auto: estado -> aprobado
  fechaEnvioLogistica      DateTime? // Auto: estado -> enviado_logistica
  fechaInicioCotizacion    DateTime? // Auto: estado -> en_cotizacion
  fechaFinCotizacion       DateTime? // Auto: estado -> cotizado
  fechaAprobacionFinal     DateTime? // Auto: estado -> aprobado_final
}
```

**Comando de migración:**
```bash
npx prisma migrate dev --name add_fecha_seguimiento_lista_equipo
```

### 2. ✅ Tipos TypeScript

**Archivo:** `src/types/modelos.ts`

```typescript
export interface ListaEquipo {
  // ... campos existentes
  
  // 📅 Fechas de seguimiento
  fechaNecesaria?: Date | null
  fechaEnvioRevision?: Date | null
  fechaValidacion?: Date | null
  fechaAprobacionRevision?: Date | null
  fechaEnvioLogistica?: Date | null
  fechaInicioCotizacion?: Date | null
  fechaFinCotizacion?: Date | null
  fechaAprobacionFinal?: Date | null
}
```

**Archivo:** `src/types/payloads.ts`

```typescript
export interface ListaEquipoPayload {
  // ... campos existentes
  fechaNecesaria?: string // Solo este campo es editable manualmente
}

export interface ListaEquipoUpdatePayload {
  // ... campos existentes
  fechaNecesaria?: string
}
```

### 3. ✅ API Routes con Lógica Automática

**Archivo:** `src/app/api/lista-equipo/route.ts`

```typescript
// Agregar fechaNecesaria al schema de validación
const listaEquipoSchema = z.object({
  // ... campos existentes
  fechaNecesaria: z.string().optional()
})

// En el POST, incluir fechaNecesaria
const nuevaLista = await prisma.listaEquipo.create({
  data: {
    // ... otros campos
    fechaNecesaria: validatedData.fechaNecesaria ? new Date(validatedData.fechaNecesaria) : null
  }
})
```

**Archivo:** `src/app/api/lista-equipo/[id]/route.ts`

```typescript
// Lógica automática de fechas basada en cambios de estado
const updateData: any = { ...validatedData }

// 📅 Lógica automática de fechas según estado
if (validatedData.estado && validatedData.estado !== listaActual.estado) {
  const now = new Date()
  
  switch (validatedData.estado) {
    case 'enviado_revision':
      updateData.fechaEnvioRevision = now
      break
    case 'por_aprobar':
      updateData.fechaValidacion = now
      break
    case 'aprobado':
      updateData.fechaAprobacionRevision = now
      break
    case 'enviado_logistica':
      updateData.fechaEnvioLogistica = now
      break
    case 'en_cotizacion':
      updateData.fechaInicioCotizacion = now
      break
    case 'cotizado':
      updateData.fechaFinCotizacion = now
      break
    case 'aprobado_final':
      updateData.fechaAprobacionFinal = now
      break
  }
}

// Convertir fechaNecesaria si viene como string
if (validatedData.fechaNecesaria) {
  updateData.fechaNecesaria = new Date(validatedData.fechaNecesaria)
}
```

### 4. ✅ Servicios con Funciones de Utilidad

**Archivo:** `src/lib/services/listaEquipo.ts`

```typescript
// 📅 Actualizar solo fecha necesaria
export async function updateFechaNecesaria(id: string, fechaNecesaria: Date): Promise<ListaEquipo> {
  const response = await fetch(`/api/lista-equipo/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fechaNecesaria: fechaNecesaria.toISOString() })
  })
  
  if (!response.ok) throw new Error('Error al actualizar fecha necesaria')
  return response.json()
}

// 📊 Generar timeline de fechas
export function getTimelineFechas(lista: ListaEquipo) {
  const timeline = []
  
  // Fecha de creación
  timeline.push({
    fecha: lista.createdAt,
    estado: 'creado',
    descripcion: 'Lista creada',
    completado: true,
    esLimite: false
  })
  
  // Fechas automáticas según estado
  if (lista.fechaEnvioRevision) {
    timeline.push({
      fecha: lista.fechaEnvioRevision,
      estado: 'enviado_revision',
      descripcion: 'Enviado a revisión',
      completado: true,
      esLimite: false
    })
  }
  
  // ... más fechas según el patrón
  
  // Fecha límite
  if (lista.fechaNecesaria) {
    timeline.push({
      fecha: lista.fechaNecesaria,
      estado: 'fecha_limite',
      descripcion: 'Fecha límite requerida',
      completado: false,
      esLimite: true
    })
  }
  
  return timeline.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
}

// ⏰ Calcular días restantes
export function calcularDiasRestantes(fechaNecesaria?: Date | null): number | null {
  if (!fechaNecesaria) return null
  
  const hoy = new Date()
  const fecha = new Date(fechaNecesaria)
  const diffTime = fecha.getTime() - hoy.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// 🚨 Determinar estado de urgencia
export function getEstadoTiempo(diasRestantes: number | null): 'critico' | 'urgente' | 'normal' | null {
  if (diasRestantes === null) return null
  
  if (diasRestantes < 0) return 'critico' // Vencido
  if (diasRestantes <= 3) return 'critico' // Crítico
  if (diasRestantes <= 7) return 'urgente' // Urgente
  return 'normal' // Normal
}
```

### 5. ✅ Componente de Formulario

**Archivo:** `src/components/equipos/ListaEquipoForm.tsx`

```typescript
// Estado para fecha necesaria
const [fechaNecesaria, setFechaNecesaria] = useState<string>('')

// Validación
const validateForm = (): boolean => {
  // ... validaciones existentes
  
  // Validar fecha necesaria no esté en el pasado
  if (fechaNecesaria) {
    const fecha = new Date(fechaNecesaria)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    
    if (fecha < hoy) {
      toast.error('La fecha necesaria no puede ser anterior a hoy')
      return false
    }
  }
  
  return true
}

// Envío del formulario
const handleSubmit = async (e: React.FormEvent) => {
  // ... lógica existente
  
  const nuevaLista = await createListaEquipo({
    // ... otros campos
    fechaNecesaria: fechaNecesaria || undefined
  })
}

// JSX del campo
<div className="space-y-2">
  <Label htmlFor="fechaNecesaria">Fecha Necesaria (Opcional)</Label>
  <Input
    id="fechaNecesaria"
    type="date"
    value={fechaNecesaria}
    onChange={(e) => setFechaNecesaria(e.target.value)}
    min={new Date().toISOString().split('T')[0]}
    className="w-full"
  />
  <p className="text-xs text-gray-500">
    Fecha límite para completar esta lista de equipos
  </p>
</div>
```

### 6. ✅ Componente Timeline Visual

**Archivo:** `src/components/equipos/ListaEquipoTimeline.tsx`

```typescript
'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// ... más imports

export default function ListaEquipoTimeline({ lista, className }: Props) {
  const timeline = getTimelineFechas(lista)
  const diasRestantes = calcularDiasRestantes(lista.fechaNecesaria)
  const estadoTiempo = getEstadoTiempo(diasRestantes)

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline de Seguimiento
          </CardTitle>
          {/* Badge de estado de tiempo */}
        </div>
      </CardHeader>
      <CardContent>
        {/* Timeline visual con animaciones */}
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
          
          <div className="space-y-6">
            {timeline.map((item, index) => (
              <motion.div
                key={`${item.estado}-${item.fecha}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex items-start gap-4"
              >
                {/* Dot con estado visual */}
                {/* Contenido del hito */}
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

## 🎨 Mejoras UX/UI Implementadas

### ✨ Características Visuales
- **Timeline interactivo** con animaciones Framer Motion
- **Estados de urgencia** con colores semafóricos (verde/naranja/rojo)
- **Badges dinámicos** para mostrar días restantes
- **Iconografía contextual** para cada tipo de fecha
- **Responsive design** adaptable a móviles

### 🚨 Indicadores de Estado
- **Normal**: > 7 días restantes (verde)
- **Urgente**: 4-7 días restantes (naranja)
- **Crítico**: ≤ 3 días o vencido (rojo)

### 📱 Componentes Reutilizables
- `ListaEquipoTimeline`: Timeline visual completo
- `FechaEstadoBadge`: Badge de estado de tiempo
- `TimelineItem`: Item individual del timeline

## 🧪 Testing Recomendado

### Unit Tests
```typescript
// Servicios
describe('listaEquipo services', () => {
  test('calcularDiasRestantes - fecha futura', () => {
    const fecha = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // +5 días
    expect(calcularDiasRestantes(fecha)).toBe(5)
  })
  
  test('getEstadoTiempo - crítico', () => {
    expect(getEstadoTiempo(2)).toBe('critico')
  })
})

// API
describe('/api/lista-equipo/[id] PUT', () => {
  test('actualiza fechaEnvioRevision automáticamente', async () => {
    // Mock y test de cambio de estado
  })
})
```

### Integration Tests
```typescript
// Componentes
describe('ListaEquipoTimeline', () => {
  test('muestra timeline correctamente', () => {
    render(<ListaEquipoTimeline lista={mockLista} />)
    expect(screen.getByText('Timeline de Seguimiento')).toBeInTheDocument()
  })
})
```

## 🚀 Próximos Pasos

### Pendientes de Implementación
1. **Componentes de visualización** en dashboards
2. **Integración en dashboards** de aprovisionamiento financiero
3. **Notificaciones automáticas** por fechas críticas
4. **Reportes de seguimiento** con métricas de tiempo
5. **Tests completos** para toda la funcionalidad

### Mejoras Futuras
- **Notificaciones push** para fechas críticas
- **Integración con calendario** (Google Calendar, Outlook)
- **Métricas de performance** por proyecto
- **Alertas automáticas** por email/Slack
- **Dashboard ejecutivo** con KPIs de tiempo

## 📋 Checklist de Implementación

- [x] ✅ Migración Prisma con nuevos campos
- [x] ✅ Tipos TypeScript actualizados
- [x] ✅ API routes con lógica automática
- [x] ✅ Servicios con funciones de utilidad
- [x] ✅ Formulario con campo fechaNecesaria
- [x] ✅ Componente Timeline visual
- [ ] ⏳ Integración en dashboards
- [ ] ⏳ Tests unitarios e integración
- [ ] ⏳ Documentación de usuario
- [ ] ⏳ Deployment y validación

---

**📝 Notas Técnicas:**
- Todas las fechas automáticas se actualizan en el backend al cambiar estado
- Solo `fechaNecesaria` es editable manualmente por el usuario
- El timeline se genera dinámicamente basado en fechas existentes
- Los estados de urgencia se calculan en tiempo real
- Compatible con el flujo GYS existente sin breaking changes

**🎯 Impacto Esperado:**
- ⏰ **Mejor control de tiempos** en aprovisionamiento
- 📊 **Visibilidad completa** del progreso de listas
- 🚨 **Alertas tempranas** para fechas críticas
- 📈 **Métricas de performance** por proyecto
- 🎨 **Experiencia de usuario** mejorada significativamente