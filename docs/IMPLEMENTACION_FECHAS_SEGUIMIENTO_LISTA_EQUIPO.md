# 📅 Implementación de Fechas de Seguimiento - ListaEquipo

## 🎯 Objetivo
Agregar campos de fecha de seguimiento al modelo `ListaEquipo` para mejorar el tracking del flujo de trabajo y la integración con el sistema de aprovisionamiento financiero.

## 📋 Campos de Fecha Propuestos

### Nuevos Campos en `ListaEquipo`
```prisma
fechaNecesaria          DateTime?  // Fecha límite para completar la lista
fechaEnvioRevision      DateTime?  // Transición: borrador → por_validar
fechaValidacion         DateTime?  // Transición: por_validar → por_aprobar
fechaAprobacionRevision DateTime?  // Transición: por_aprobar → aprobada
fechaEnvioLogistica     DateTime?  // Transición: aprobada → enviada_logistica
fechaInicioCotizacion   DateTime?  // Inicio del proceso de cotización
fechaFinCotizacion      DateTime?  // Fin del proceso de cotización
fechaAprobacionFinal    DateTime?  // Aprobación final para pedidos
```

### Mapeo Estado → Fecha
- `borrador` → `fechaEnvioRevision` (al cambiar estado)
- `por_validar` → `fechaValidacion` (al cambiar estado)
- `por_aprobar` → `fechaAprobacionRevision` (al cambiar estado)
- `aprobada` → `fechaEnvioLogistica` (al cambiar estado)
- `enviada_logistica` → tracking en logística

---

## 🚀 Plan de Implementación

### Paso 1: Migración de Base de Datos

#### 1.1 Actualizar Schema Prisma
**Archivo:** `prisma/schema.prisma`

```prisma
model ListaEquipo {
  // ... campos existentes ...
  
  // ✅ Nuevos campos de fecha
  fechaNecesaria          DateTime?
  fechaEnvioRevision      DateTime?
  fechaValidacion         DateTime?
  fechaAprobacionRevision DateTime?
  fechaEnvioLogistica     DateTime?
  fechaInicioCotizacion   DateTime?
  fechaFinCotizacion      DateTime?
  fechaAprobacionFinal    DateTime?
  
  // ... resto del modelo ...
}
```

#### 1.2 Generar y Ejecutar Migración
```bash
npx prisma migrate dev --name add_fecha_seguimiento_lista_equipo
npx prisma generate
```

### Paso 2: Actualizar Tipos TypeScript

#### 2.1 Modelos Base
**Archivo:** `src/types/modelos.ts`

```typescript
export interface ListaEquipo {
  // ... campos existentes ...
  
  // ✅ Nuevos campos de fecha
  fechaNecesaria?: Date;
  fechaEnvioRevision?: Date;
  fechaValidacion?: Date;
  fechaAprobacionRevision?: Date;
  fechaEnvioLogistica?: Date;
  fechaInicioCotizacion?: Date;
  fechaFinCotizacion?: Date;
  fechaAprobacionFinal?: Date;
}
```

#### 2.2 Payloads de API
**Archivo:** `src/types/payloads.ts`

```typescript
export interface ListaEquipoCreatePayload {
  // ... campos existentes ...
  fechaNecesaria?: string; // ISO string
}

export interface ListaEquipoUpdatePayload {
  // ... campos existentes ...
  fechaNecesaria?: string;
  // Las demás fechas se actualizan automáticamente por el backend
}
```

### Paso 3: Modificar APIs

#### 3.1 API Route Principal
**Archivo:** `src/app/api/listas-equipo/route.ts`

```typescript
// ✅ En función POST (crear)
if (payload.fechaNecesaria) {
  data.fechaNecesaria = new Date(payload.fechaNecesaria);
}

// ✅ En función PUT (actualizar)
if (payload.fechaNecesaria !== undefined) {
  data.fechaNecesaria = payload.fechaNecesaria ? new Date(payload.fechaNecesaria) : null;
}
```

#### 3.2 API Route Individual
**Archivo:** `src/app/api/listas-equipo/[id]/route.ts`

```typescript
// ✅ Agregar lógica de fechas automáticas en cambios de estado
if (payload.estado && payload.estado !== listaActual.estado) {
  const now = new Date();
  
  switch (payload.estado) {
    case 'por_validar':
      data.fechaEnvioRevision = now;
      break;
    case 'por_aprobar':
      data.fechaValidacion = now;
      break;
    case 'aprobada':
      data.fechaAprobacionRevision = now;
      break;
    case 'enviada_logistica':
      data.fechaEnvioLogistica = now;
      break;
  }
}
```

### Paso 4: Actualizar Servicios

#### 4.1 Servicio ListaEquipo
**Archivo:** `src/lib/services/listaEquipo.ts`

```typescript
// ✅ Actualizar interfaces
export interface ListaEquipoMaster extends ListaEquipo {
  // ... campos existentes ...
  
  // Agregar campos de fecha en las consultas
}

// ✅ Actualizar función de creación
export async function createListaEquipo(payload: ListaEquipoCreatePayload) {
  const response = await fetch('/api/listas-equipo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      fechaNecesaria: payload.fechaNecesaria
    })
  });
  // ...
}
```

### Paso 5: Actualizar Componentes UI

#### 5.1 Formulario de Lista
**Archivo:** `src/components/equipos/ListaEquipoForm.tsx`

```typescript
// ✅ Agregar campo fechaNecesaria
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* ... campos existentes ... */}
  
  <div className="space-y-2">
    <Label htmlFor="fechaNecesaria">Fecha Necesaria</Label>
    <Input
      id="fechaNecesaria"
      type="date"
      {...register('fechaNecesaria')}
    />
    {errors.fechaNecesaria && (
      <p className="text-sm text-red-500">{errors.fechaNecesaria.message}</p>
    )}
  </div>
</div>
```

#### 5.2 Componente Timeline de Fechas
**Archivo:** `src/components/equipos/ListaEquipoTimeline.tsx`

```typescript
'use client';

import { ListaEquipo } from '@/types/modelos';
import { formatDate } from '@/lib/utils';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Props {
  lista: ListaEquipo;
}

export function ListaEquipoTimeline({ lista }: Props) {
  const timelineEvents = [
    {
      label: 'Creación',
      date: lista.createdAt,
      status: 'completed',
      icon: CheckCircle
    },
    {
      label: 'Envío a Revisión',
      date: lista.fechaEnvioRevision,
      status: lista.fechaEnvioRevision ? 'completed' : 'pending',
      icon: lista.fechaEnvioRevision ? CheckCircle : Clock
    },
    {
      label: 'Validación',
      date: lista.fechaValidacion,
      status: lista.fechaValidacion ? 'completed' : 'pending',
      icon: lista.fechaValidacion ? CheckCircle : Clock
    },
    {
      label: 'Aprobación',
      date: lista.fechaAprobacionRevision,
      status: lista.fechaAprobacionRevision ? 'completed' : 'pending',
      icon: lista.fechaAprobacionRevision ? CheckCircle : Clock
    },
    {
      label: 'Envío a Logística',
      date: lista.fechaEnvioLogistica,
      status: lista.fechaEnvioLogistica ? 'completed' : 'pending',
      icon: lista.fechaEnvioLogistica ? CheckCircle : Clock
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Timeline de Seguimiento</h3>
      <div className="space-y-3">
        {timelineEvents.map((event, index) => {
          const Icon = event.icon;
          return (
            <div key={index} className="flex items-center space-x-3">
              <Icon 
                className={`h-5 w-5 ${
                  event.status === 'completed' 
                    ? 'text-green-500' 
                    : 'text-gray-400'
                }`} 
              />
              <div className="flex-1">
                <p className="font-medium">{event.label}</p>
                <p className="text-sm text-gray-500">
                  {event.date ? formatDate(event.date) : 'Pendiente'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

#### 5.3 Actualizar Vista Detalle
**Archivo:** `src/components/proyectos/ListaEquipoDetailView.tsx`

```typescript
// ✅ Agregar timeline en la vista detalle
import { ListaEquipoTimeline } from '@/components/equipos/ListaEquipoTimeline';

// En el componente:
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    {/* ... contenido existente ... */}
  </div>
  
  <div className="space-y-6">
    {/* ... sidebar existente ... */}
    
    <Card>
      <CardContent className="p-6">
        <ListaEquipoTimeline lista={lista} />
      </CardContent>
    </Card>
  </div>
</div>
```

### Paso 6: Integración con Aprovisionamiento

#### 6.1 Actualizar Métricas Financieras
**Archivo:** `src/lib/services/aprovisionamientos.ts`

```typescript
// ✅ Incluir fechas en cálculos de métricas
export async function calcularMetricasAprovisionamiento(filtros: FiltrosAprovisionamientos) {
  // ... lógica existente ...
  
  // Agregar análisis de tiempos de proceso
  const tiemposPromedio = {
    validacion: calcularTiempoPromedio('fechaEnvioRevision', 'fechaValidacion'),
    aprobacion: calcularTiempoPromedio('fechaValidacion', 'fechaAprobacionRevision'),
    envioLogistica: calcularTiempoPromedio('fechaAprobacionRevision', 'fechaEnvioLogistica')
  };
  
  return {
    // ... métricas existentes ...
    tiemposPromedio
  };
}
```

### Paso 7: Validación con Zod

#### 7.1 Esquemas de Validación
**Archivo:** `src/lib/validators/listaEquipo.ts`

```typescript
import { z } from 'zod';

export const listaEquipoCreateSchema = z.object({
  // ... campos existentes ...
  fechaNecesaria: z.string().datetime().optional()
    .refine((date) => {
      if (!date) return true;
      return new Date(date) > new Date();
    }, {
      message: 'La fecha necesaria debe ser futura'
    })
});

export const listaEquipoUpdateSchema = z.object({
  // ... campos existentes ...
  fechaNecesaria: z.string().datetime().optional().nullable()
});
```

### Paso 8: Testing

#### 8.1 Tests de API
**Archivo:** `src/__tests__/api/listas-equipo-fechas.test.ts`

```typescript
describe('/api/listas-equipo - Fechas de Seguimiento', () => {
  test('debe crear lista con fechaNecesaria', async () => {
    const payload = {
      nombre: 'Lista Test',
      fechaNecesaria: '2024-12-31T23:59:59.000Z'
    };
    
    const response = await request(app)
      .post('/api/listas-equipo')
      .send(payload)
      .expect(201);
    
    expect(response.body.fechaNecesaria).toBe(payload.fechaNecesaria);
  });
  
  test('debe actualizar fechas automáticamente en cambios de estado', async () => {
    // ... test de cambios de estado ...
  });
});
```

#### 8.2 Tests de Componentes
**Archivo:** `src/__tests__/components/equipos/ListaEquipoTimeline.test.tsx`

```typescript
describe('ListaEquipoTimeline', () => {
  test('debe mostrar timeline correctamente', () => {
    const lista = {
      id: '1',
      createdAt: new Date('2024-01-01'),
      fechaEnvioRevision: new Date('2024-01-02'),
      fechaValidacion: new Date('2024-01-03'),
      // ...
    };
    
    render(<ListaEquipoTimeline lista={lista} />);
    
    expect(screen.getByText('Timeline de Seguimiento')).toBeInTheDocument();
    expect(screen.getByText('Creación')).toBeInTheDocument();
  });
});
```

---

## 🔄 Orden de Ejecución

### Fase 1: Base de Datos y Tipos
```bash
# 1. Actualizar schema Prisma
# 2. Generar migración
npx prisma migrate dev --name add_fecha_seguimiento_lista_equipo
npx prisma generate

# 3. Actualizar tipos TypeScript
# 4. Ejecutar tests de tipos
npm run type-check
```

### Fase 2: Backend (APIs y Servicios)
```bash
# 5. Actualizar API routes
# 6. Actualizar servicios
# 7. Actualizar validadores
# 8. Ejecutar tests de API
npm run test:api
```

### Fase 3: Frontend (Componentes y UI)
```bash
# 9. Actualizar formularios
# 10. Crear componente Timeline
# 11. Actualizar vistas detalle
# 12. Ejecutar tests de componentes
npm run test:components
```

### Fase 4: Integración y Testing Final
```bash
# 13. Integrar con aprovisionamiento
# 14. Tests de integración
npm run test:integration

# 15. Tests completos
npm run test

# 16. Build y verificación
npm run build
```

---

## 📊 Beneficios Esperados

### Para el Flujo de Trabajo
- ✅ **Tracking completo** del ciclo de vida de listas
- ✅ **Identificación de cuellos de botella** en el proceso
- ✅ **Métricas de tiempo** por etapa del flujo
- ✅ **Alertas automáticas** por fechas vencidas

### Para Aprovisionamiento Financiero
- ✅ **Proyecciones más precisas** basadas en fechas reales
- ✅ **Análisis de tendencias** de tiempo de proceso
- ✅ **Optimización de recursos** según patrones históricos
- ✅ **Reportes ejecutivos** con métricas de eficiencia

### Para UX/UI
- ✅ **Timeline visual** del progreso de listas
- ✅ **Indicadores de estado** más informativos
- ✅ **Dashboards mejorados** con datos temporales
- ✅ **Experiencia de usuario** más transparente

---

## 🚨 Consideraciones Importantes

### Migración de Datos Existentes
- Los campos nuevos serán `NULL` para registros existentes
- Considerar script de migración para poblar fechas históricas si es necesario

### Performance
- Indexar campos de fecha más consultados
- Optimizar queries que filtren por rangos de fechas

### Compatibilidad
- Mantener retrocompatibilidad en APIs
- Validar que componentes existentes no se rompan

### Testing
- Probar todos los flujos de cambio de estado
- Validar cálculos de métricas con datos reales
- Tests de performance con volúmenes grandes

---

**Documento creado siguiendo el FLUJO_GYS y estándares enterprise del proyecto.**