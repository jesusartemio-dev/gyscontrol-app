# 📋 PLAN DE IMPLEMENTACIÓN: CRONOGRAMA DE 4 NIVELES EN PROYECTOS

## 🎯 **Contexto del Problema**

### **Estado Actual**
- ✅ **Cotizaciones:** Sistema de cronograma de 4 niveles funcionando correctamente
- ❌ **Proyectos:** Error 500 al acceder al TAB "Tipos" del cronograma
- ❌ **Conversión:** Cronograma comercial NO se crea al convertir cotización → proyecto

### **Causa Raíz**
Relaciones redundantes en el schema de Prisma causan ambigüedad en consultas:

```prisma
// ❌ RELACIONES PROBLEMÁTICAS
model ProyectoCronograma {
  edts     ProyectoEdt[]     // Redundante
  tareas   ProyectoTarea[]   // Redundante
}

model ProyectoEdt {
  proyectoCronograma ProyectoCronograma  // Redundante
  proyectoFase       ProyectoFase?       // Correcta
}

model ProyectoTarea {
  proyectoCronograma ProyectoCronograma  // Redundante
  proyectoEdt        ProyectoEdt         // Correcta
}
```

### **Objetivo**
Implementar sistema de cronograma de 4 niveles en proyectos con **3 tipos de cronograma**:
1. **Comercial** (copiado de cotización)
2. **Planificación** (creado manualmente)
3. **Ejecución** (para seguimiento real)

## 🏗️ **Arquitectura Final Deseada**

```
Proyecto
└── Cronogramas (ProyectoCronograma) [comercial, planificación, ejecución]
    └── Fases (ProyectoFase)
        └── EDTs (ProyectoEdt)
            └── Tareas (ProyectoTarea)
```

## 📅 **FASE 1: DIAGNÓSTICO Y ANÁLISIS (1-2 días)**

### **1.1 Verificar Estado Actual**
```bash
# Verificar tablas existentes
npx prisma db push --preview-feature

# Verificar datos existentes
npx prisma studio
```

### **1.2 Análisis de Impacto**
- [ ] **Componentes afectados:** `ProyectoCronogramaSelector`, `ProyectoEdtList`, APIs
- [ ] **Datos existentes:** Verificar EDTs y tareas huérfanas
- [ ] **Riesgos:** Pérdida de datos, componentes rotos

### **1.3 Backup de Seguridad**
```bash
# Backup de base de datos
pg_dump gys_db > backup_pre_cronograma_$(date +%Y%m%d).sql

# Backup de código
git tag backup-pre-cronograma-fix
```

## 🔧 **FASE 2: CORRECCIÓN DEL SCHEMA (2-3 días)**

### **2.1 Actualizar Prisma Schema**

#### **ProyectoCronograma - Simplificar**
```prisma
model ProyectoCronograma {
  id          String  @id @default(cuid())
  proyectoId  String
  tipo        String  // 'comercial', 'planificacion', 'ejecucion'
  nombre      String

  // ✅ SOLO esta relación
  fases ProyectoFase[]

  // ❌ REMOVER estas líneas:
  // edts   ProyectoEdt[]
  // tareas ProyectoTarea[]

  proyecto Proyecto @relation(fields: [proyectoId], references: [id], onDelete: Cascade)
  @@unique([proyectoId, tipo])
}
```

#### **ProyectoEdt - Corregir jerarquía**
```prisma
model ProyectoEdt {
  // ❌ REMOVER esta línea:
  // proyectoCronogramaId String

  // ✅ MANTENER esta línea:
  proyectoFaseId String?
  proyectoFase   ProyectoFase? @relation(fields: [proyectoFaseId], references: [id], onDelete: SetNull)

  // ✅ MANTENER relaciones correctas
  ProyectoTarea ProyectoTarea[]
  categoriaServicio CategoriaServicio @relation(fields: [categoriaServicioId], references: [id])
  responsable User? @relation("EdtResponsable", fields: [responsableId], references: [id])

  // ❌ REMOVER esta línea:
  // proyectoCronograma ProyectoCronograma @relation(fields: [proyectoCronogramaId], references: [id])
}
```

#### **ProyectoTarea - Corregir jerarquía**
```prisma
model ProyectoTarea {
  // ❌ REMOVER esta línea:
  // proyectoCronogramaId String

  // ✅ MANTENER esta línea:
  proyectoEdtId String
  proyectoEdt   ProyectoEdt @relation(fields: [proyectoEdtId], references: [id], onDelete: Cascade)

  // ❌ REMOVER esta línea:
  // proyectoCronograma ProyectoCronograma @relation(fields: [proyectoCronogramaId], references: [id])
}
```

### **2.2 Generar Migración**
```bash
npx prisma migrate dev --name fix-proyecto-cronograma-hierarchy
npx prisma generate
```

## 🗃️ **FASE 3: MIGRACIÓN DE DATOS (1-2 días)**

### **3.1 Script de Migración**
```typescript
// scripts/migrate-proyecto-cronograma.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateProyectoCronograma() {
  console.log('🚀 Iniciando migración de jerarquía de cronograma...')

  // 1. Obtener todos los EDTs existentes
  const edts = await prisma.proyectoEdt.findMany({
    include: {
      proyectoCronograma: {
        include: { fases: true }
      }
    }
  })

  console.log(`📊 Encontrados ${edts.length} EDTs para migrar`)

  let migrated = 0
  let skipped = 0

  for (const edt of edts) {
    // Si ya tiene fase asignada, continuar
    if (edt.proyectoFaseId) {
      skipped++
      continue
    }

    // Buscar fase correspondiente en el cronograma
    const fase = edt.proyectoCronograma?.fases?.[0]

    if (fase) {
      await prisma.proyectoEdt.update({
        where: { id: edt.id },
        data: { proyectoFaseId: fase.id }
      })
      migrated++
    } else {
      console.warn(`⚠️ EDT ${edt.id} no tiene fase correspondiente`)
    }
  }

  // 2. Limpiar tareas huérfanas (sin EDT)
  const tareasHuérfanas = await prisma.proyectoTarea.count({
    where: { proyectoEdtId: null }
  })

  if (tareasHuérfanas > 0) {
    console.log(`🧹 Eliminando ${tareasHuérfanas} tareas huérfanas...`)
    await prisma.proyectoTarea.deleteMany({
      where: { proyectoEdtId: null }
    })
  }

  console.log(`✅ Migración completada: ${migrated} EDTs migrados, ${skipped} ya migrados`)
}

migrateProyectoCronograma()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### **3.2 Ejecutar Migración**
```bash
# Ejecutar script
npx tsx scripts/migrate-proyecto-cronograma.ts

# Verificar resultados
npx prisma studio
```

## 🔌 **FASE 4: ACTUALIZACIÓN DE APIs (2-3 días)**

### **4.1 API de Cronograma - Simplificar**
```typescript
// src/app/api/proyectos/[id]/cronograma/route.ts
export async function GET(request, { params }) {
  const cronogramas = await prisma.proyectoCronograma.findMany({
    where: { proyectoId: params.id },
    include: {
      fases: {
        include: {
          edts: {
            include: {
              tareas: true,
              categoriaServicio: true,
              responsable: true
            }
          }
        }
      }
      // ✅ REMOVER edts y tareas del nivel superior
    },
    orderBy: { createdAt: 'asc' }
  })

  return NextResponse.json({ success: true, data: cronogramas })
}
```

### **4.2 API de Conversión - Ajustar**
```typescript
// src/app/api/proyecto/from-cotizacion/route.ts
async function convertirCronogramaComercial(cotizacion, proyecto) {
  console.log('📅 Convirtiendo cronograma comercial...')

  // 1. Crear cronograma comercial
  const cronogramaComercial = await prisma.proyectoCronograma.create({
    data: {
      proyectoId: proyecto.id,
      tipo: 'comercial',
      nombre: 'Cronograma Comercial',
      copiadoDesdeCotizacionId: cotizacion.id,
      esBaseline: true,
      version: 1
    }
  })

  // 2. Convertir fases
  for (const faseCot of cotizacion.fases || []) {
    const faseProy = await prisma.proyectoFase.create({
      data: {
        proyectoId: proyecto.id,
        proyectoCronogramaId: cronogramaComercial.id,
        nombre: faseCot.nombre,
        descripcion: faseCot.descripcion,
        orden: faseCot.orden,
        estado: 'planificado',
        porcentajeAvance: 0,
        fechaInicioPlan: faseCot.fechaInicioPlan,
        fechaFinPlan: faseCot.fechaFinPlan
      }
    })

    // 3. Convertir EDTs de la fase
    for (const edtCot of faseCot.edts || []) {
      const edtProy = await prisma.proyectoEdt.create({
        data: {
          proyectoId: proyecto.id,
          proyectoFaseId: faseProy.id, // ✅ Ahora pertenece a fase
          nombre: edtCot.nombre,
          categoriaServicioId: edtCot.categoriaServicioId,
          zona: edtCot.zona,
          fechaInicioPlan: edtCot.fechaInicioComercial,
          fechaFinPlan: edtCot.fechaFinComercial,
          horasPlan: edtCot.horasEstimadas,
          responsableId: edtCot.responsableId,
          descripcion: edtCot.descripcion,
          prioridad: edtCot.prioridad,
          estado: 'planificado',
          porcentajeAvance: 0
        }
      })

      // 4. Convertir tareas del EDT
      for (const tareaCot of edtCot.tareas || []) {
        await prisma.proyectoTarea.create({
          data: {
            proyectoEdtId: edtProy.id,
            nombre: tareaCot.nombre,
            descripcion: tareaCot.descripcion,
            fechaInicio: tareaCot.fechaInicio,
            fechaFin: tareaCot.fechaFin,
            horasEstimadas: tareaCot.horasEstimadas,
            prioridad: tareaCot.prioridad,
            responsableId: tareaCot.responsableId,
            estado: 'pendiente',
            porcentajeCompletado: 0
          }
        })
      }
    }
  }

  console.log('✅ Cronograma comercial convertido exitosamente')
  return cronogramaComercial
}
```

## 🖥️ **FASE 5: ACTUALIZACIÓN DE COMPONENTES (3-4 días)**

### **5.1 ProyectoCronogramaSelector - Adaptar**
```typescript
// src/components/proyectos/cronograma/ProyectoCronogramaSelector.tsx
function ProyectoCronogramaSelector({ proyectoId }) {
  const { data: cronogramas, isLoading } = useQuery({
    queryKey: ['cronogramas', proyectoId],
    queryFn: () => fetch(`/api/proyectos/${proyectoId}/cronograma`).then(r => r.json())
  })

  if (isLoading) return <div>Cargando cronogramas...</div>

  return (
    <div className="space-y-6">
      {/* Cronograma Comercial */}
      <CronogramaCard
        tipo="comercial"
        cronograma={cronogramas?.data?.find(c => c.tipo === 'comercial')}
        proyectoId={proyectoId}
      />

      {/* Cronograma de Planificación */}
      <CronogramaCard
        tipo="planificacion"
        cronograma={cronogramas?.data?.find(c => c.tipo === 'planificacion')}
        proyectoId={proyectoId}
      />

      {/* Cronograma de Ejecución */}
      <CronogramaCard
        tipo="ejecucion"
        cronograma={cronogramas?.data?.find(c => c.tipo === 'ejecucion')}
        proyectoId={proyectoId}
      />
    </div>
  )
}
```

### **5.2 ProyectoEdtList - Cambiar a faseId**
```typescript
// src/components/proyectos/cronograma/ProyectoEdtList.tsx
interface Props {
  faseId: string  // ✅ Cambiar de cronogramaId
}

function ProyectoEdtList({ faseId }: Props) {
  const { data: edts } = useQuery({
    queryKey: ['edts', faseId],
    queryFn: () => fetch(`/api/proyectos/fases/${faseId}/edts`).then(r => r.json())
  })

  // ✅ Resto del componente igual
}
```

### **5.3 Crear APIs faltantes**
```typescript
// src/app/api/proyectos/fases/[id]/edts/route.ts
export async function GET(request, { params }) {
  const edts = await prisma.proyectoEdt.findMany({
    where: { proyectoFaseId: params.id },
    include: {
      tareas: true,
      categoriaServicio: true,
      responsable: true
    }
  })

  return NextResponse.json({ success: true, data: edts })
}
```

## 🧪 **FASE 6: TESTING Y VALIDACIÓN (2-3 días)**

### **6.1 Pruebas de Conversión**
```typescript
// tests/conversion-cronograma.test.ts
describe('Conversión Cotización → Proyecto', () => {
  test('Cronograma comercial se crea correctamente', async () => {
    // 1. Crear cotización con cronograma
    const cotizacion = await createCotizacionWithCronograma()

    // 2. Convertir a proyecto
    const proyecto = await convertCotizacionToProyecto(cotizacion.id)

    // 3. Verificar cronograma creado
    const cronogramas = await prisma.proyectoCronograma.findMany({
      where: { proyectoId: proyecto.id }
    })

    expect(cronogramas).toHaveLength(1)
    expect(cronogramas[0].tipo).toBe('comercial')

    // 4. Verificar jerarquía completa
    const fases = await prisma.proyectoFase.findMany({
      where: { proyectoCronogramaId: cronogramas[0].id },
      include: {
        edts: {
          include: { tareas: true }
        }
      }
    })

    expect(fases.length).toBeGreaterThan(0)
    fases.forEach(fase => {
      expect(fase.edts.length).toBeGreaterThan(0)
      fase.edts.forEach(edt => {
        expect(edt.tareas.length).toBeGreaterThan(0)
      })
    })
  })
})
```

### **6.2 Pruebas de UI**
- [ ] **TAB "Tipos":** Carga sin errores 500
- [ ] **Crear cronograma:** Funciona para planificación y ejecución
- [ ] **Ver EDTs:** Se muestran agrupados por fases
- [ ] **Crear EDTs:** Se asignan correctamente a fases

### **6.3 Pruebas de Regresión**
- [ ] **Cotizaciones:** No se afectan
- [ ] **Otros módulos:** Funcionan normalmente
- [ ] **APIs existentes:** Responden correctamente

## 📊 **FASE 7: DESPLIEGUE Y MONITOREO (1 día)**

### **7.1 Checklist de Despliegue**
- [ ] **Base de datos:** Migración ejecutada en producción
- [ ] **APIs:** Todas responden correctamente
- [ ] **Componentes:** Cargan sin errores
- [ ] **Conversión:** Crea cronograma comercial

### **7.2 Monitoreo Post-Despliegue**
```typescript
// scripts/monitor-cronograma.ts
async function checkCronogramaHealth() {
  const proyectos = await prisma.proyecto.findMany({
    include: {
      cronogramas: {
        include: {
          fases: {
            include: {
              edts: {
                include: { tareas: true }
              }
            }
          }
        }
      }
    }
  })

  const report = proyectos.map(proyecto => ({
    proyecto: proyecto.nombre,
    cronogramas: proyecto.cronogramas.length,
    fases: proyecto.cronogramas.reduce((acc, c) => acc + c.fases.length, 0),
    edts: proyecto.cronogramas.reduce((acc, c) =>
      acc + c.fases.reduce((acc2, f) => acc2 + f.edts.length, 0), 0),
    tareas: proyecto.cronogramas.reduce((acc, c) =>
      acc + c.fases.reduce((acc2, f) =>
        acc2 + f.edts.reduce((acc3, e) => acc3 + e.tareas.length, 0), 0), 0)
  }))

  console.table(report)
}
```

## 🎯 **CRONOGRAMA REALISTA**

| Fase | Duración | Responsable | Entregables |
|------|----------|-------------|-------------|
| **Diagnóstico** | 1-2 días | Dev Backend | Análisis completo, backup |
| **Schema** | 2-3 días | Dev Backend | Schema corregido, migración |
| **Migración** | 1-2 días | Dev Backend | Datos migrados, integridad |
| **APIs** | 2-3 días | Dev Backend | APIs funcionando |
| **Componentes** | 3-4 días | Dev Frontend | UI actualizada |
| **Testing** | 2-3 días | QA + Devs | Pruebas completas |
| **Despliegue** | 1 día | DevOps | En producción |

**Total: 12-18 días hábiles**

## 🚨 **PLAN DE CONTINGENCIA**

### **Si falla la migración:**
1. **Revertir schema** a versión anterior
2. **Restaurar backup** de base de datos
3. **Analizar logs** de migración
4. **Corregir script** y reintentar

### **Si se rompen componentes:**
1. **Mantener versión anterior** de componentes problemáticos
2. **Implementar gradualmente** por tipo de cronograma
3. **Usar feature flags** para activar/desactivar

### **Rollback completo:**
```bash
# Base de datos
psql gys_db < backup_pre_cronograma.sql

# Código
git reset --hard backup-pre-cronograma-fix
git push --force
```

## 📈 **MÉTRICAS DE ÉXITO**

- ✅ **0 errores 500** en `/api/proyectos/[id]/cronograma`
- ✅ **100% de proyectos** tienen cronograma comercial al convertir
- ✅ **3 tipos de cronograma** disponibles (comercial, planificación, ejecución)
- ✅ **Jerarquía completa** funciona en UI
- ✅ **Datos migrados** sin pérdidas

## 💡 **RECOMENDACIONES FINALES**

1. **Empezar con comercial** (más crítico)
2. **Probar conversión** exhaustivamente
3. **Documentar cambios** para equipo
4. **Monitorear logs** post-despliegue
5. **Tener backup** siempre disponible

---

**¿Estás listo para iniciar la implementación con este plan?**