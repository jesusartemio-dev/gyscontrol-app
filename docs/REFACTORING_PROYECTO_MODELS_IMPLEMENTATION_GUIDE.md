# Guía de Implementación: Refactoring de Modelos Proyecto* a Proyecto*Cotizado

## 📋 Resumen Ejecutivo

Esta guía detalla el procedimiento paso a paso para renombrar los modelos de base de datos y código relacionados con proyectos, cambiando de nombres genéricos a nombres específicos que reflejan que son elementos "cotizados" (quoted) del proceso comercial.

### 🎯 Objetivo
Renombrar los siguientes modelos para mayor claridad semántica:
- `ProyectoEquipo` → `ProyectoEquipoCotizado`
- `ProyectoEquipoItem` → `ProyectoEquipoCotizadoItem`
- `ProyectoServicio` → `ProyectoServicioCotizado`
- `ProyectoServicioItem` → `ProyectoServicioCotizadoItem`
- `ProyectoGasto` → `ProyectoCotizadoGasto`
- `ProyectoGastoItem` → `ProyectoGastoCotizadoItem`

### ✅ Garantías
- **Flujo de usuario intacto**: Páginas, modales y workflows permanecen idénticos
- **Funcionalidad preservada**: Toda la lógica de negocio continúa funcionando
- **Interfaz de usuario sin cambios**: Componentes visuales no se modifican
- **Datos de prueba**: Como es ambiente de testing, pérdida de datos no es crítica

---

## 📊 Análisis de Impacto

### Áreas Afectadas
1. **Base de Datos**: Schema Prisma + migraciones
2. **Tipos TypeScript**: Interfaces en `src/types/`
3. **Servicios**: 6 archivos en `src/lib/services/`
4. **Componentes**: ~50+ archivos de componentes
5. **APIs**: ~20+ rutas de API
6. **Tests**: Mocks y casos de prueba
7. **Documentación**: Referencias en docs

### Riesgos Identificados
- **Alto**: Cambios en schema de BD requieren migración
- **Medio**: Errores de tipos TypeScript en compilación
- **Bajo**: Cambios en componentes son mecánicos

---

## 🚀 Plan de Implementación por Fases

### **FASE 1: Preparación y Schema de BD**
**Duración estimada**: 2-3 horas
**Responsable**: Desarrollador principal

#### 1.1 Backup de Base de Datos
```bash
# Crear backup completo de la base de datos
pg_dump gyscontrol_db > backup_pre_refactoring_$(date +%Y%m%d_%H%M%S).sql
```

#### 1.2 Actualizar Schema Prisma
**Archivo**: `prisma/schema.prisma`

**Cambios requeridos**:
```prisma
// ANTES
model ProyectoEquipo {
  // ... campos existentes
}

// DESPUÉS
model ProyectoEquipoCotizado {
  // ... campos existentes (sin cambios)
}
```

**Relaciones a actualizar**:
- En modelo `User`: `ProyectoEquipos` → `ProyectoEquiposCotizados`
- En modelo `Proyecto`: `equipos` → `equiposCotizados`
- En modelo `CatalogoEquipo`: `proyectoEquipoItems` → `proyectoEquipoCotizadoItems`
- En modelo `ListaEquipoItem`: referencias a campos relacionados

#### 1.3 Generar Migración
```bash
# Generar migración de Prisma
npx prisma migrate dev --name rename_proyecto_models_to_cotizado

# Revisar el archivo de migración generado
cat prisma/migrations/*_rename_proyecto_models_to_cotizado/migration.sql
```

#### 1.4 Ejecutar Migración en Desarrollo
```bash
# Aplicar migración en DB local
npx prisma migrate deploy

# Generar nuevo cliente Prisma
npx prisma generate
```

---

### **FASE 2: Actualización de Tipos TypeScript**
**Duración estimada**: 1-2 horas
**Responsable**: Desarrollador principal

#### 2.1 Actualizar Interfaces de Modelos
**Archivo**: `src/types/modelos.ts`

```typescript
// ANTES
export interface ProyectoEquipo {
  id: string
  // ... otros campos
}

// DESPUÉS
export interface ProyectoEquipoCotizado {
  id: string
  // ... otros campos (sin cambios)
}
```

#### 2.2 Actualizar Tipos de Payloads
**Archivo**: `src/types/payloads.ts`

```typescript
// ANTES
export interface ProyectoEquipoPayload {
  proyectoId: string
  // ... otros campos
}

// DESPUÉS
export interface ProyectoEquipoCotizadoPayload {
  proyectoId: string
  // ... otros campos (sin cambios)
}
```

#### 2.3 Verificar Compilación
```bash
# Verificar que no hay errores de tipos
npm run build
```

---

### **FASE 3: Actualización de Servicios**
**Duración estimada**: 2-3 horas
**Responsable**: Desarrollador principal

#### 3.1 Servicios a Actualizar
- `src/lib/services/proyectoEquipo.ts`
- `src/lib/services/proyectoEquipoItem.ts`
- `src/lib/services/proyectoServicio.ts`
- `src/lib/services/proyectoServicioItem.ts`
- `src/lib/services/proyectoGasto.ts`
- `src/lib/services/proyectoGastoItem.ts`

#### 3.2 Patrón de Cambios por Servicio

**Cambios en imports**:
```typescript
// ANTES
import type { ProyectoEquipo, ProyectoEquipoItem } from '@/types'

// DESPUÉS
import type { ProyectoEquipoCotizado, ProyectoEquipoCotizadoItem } from '@/types'
```

**Cambios en tipos de retorno**:
```typescript
// ANTES
export async function getProyectoEquipos(proyectoId: string): Promise<ProyectoEquipo[]>

// DESPUÉS
export async function getProyectoEquipos(proyectoId: string): Promise<ProyectoEquipoCotizado[]>
```

**Cambios en queries Prisma**:
```typescript
// ANTES
const equipos = await prisma.proyectoEquipo.findMany({...})

// DESPUÉS
const equipos = await prisma.proyectoEquipoCotizado.findMany({...})
```

#### 3.3 Verificar Servicios
```bash
# Ejecutar tests de servicios si existen
npm test -- --testPathPattern=services
```

---

### **FASE 4: Actualización de APIs**
**Duración estimada**: 3-4 horas
**Responsable**: Desarrollador principal

#### 4.1 Rutas API a Revisar
- `src/app/api/proyecto-equipo*/**`
- `src/app/api/proyecto-servicio*/**`
- `src/app/api/proyecto-gasto*/**`
- `src/app/api/lista-equipo*/**` (referencias indirectas)

#### 4.2 Patrón de Cambios en APIs

**Queries Prisma**:
```typescript
// ANTES
const equipo = await prisma.proyectoEquipo.findUnique({...})

// DESPUÉS
const equipo = await prisma.proyectoEquipoCotizado.findUnique({...})
```

**Validaciones y tipos**:
```typescript
// ANTES
import type { ProyectoEquipoPayload } from '@/types'

// DESPUÉS
import type { ProyectoEquipoCotizadoPayload } from '@/types'
```

#### 4.3 Probar Endpoints
```bash
# Verificar que las APIs responden correctamente
curl -X GET http://localhost:3000/api/proyecto-equipo/from-proyecto/123
```

---

### **FASE 5: Actualización de Componentes**
**Duración estimada**: 4-6 horas
**Responsable**: Desarrollador principal

#### 5.1 Componentes a Revisar
- Todos los componentes en `src/components/proyectos/`
- Componentes relacionados en `src/components/equipos/`
- Componentes de listas y pedidos

#### 5.2 Patrón de Cambios en Componentes

**Imports de tipos**:
```typescript
// ANTES
import type { ProyectoEquipo, ProyectoEquipoItem } from '@/types'

// DESPUÉS
import type { ProyectoEquipoCotizado, ProyectoEquipoCotizadoItem } from '@/types'
```

**Props y estado**:
```typescript
// ANTES
interface Props {
  equipo: ProyectoEquipo
  onItemChange: (items: ProyectoEquipoItem[]) => void
}

// DESPUÉS
interface Props {
  equipo: ProyectoEquipoCotizado
  onItemChange: (items: ProyectoEquipoCotizadoItem[]) => void
}
```

**Variables locales**:
```typescript
// ANTES
const [equipos, setEquipos] = useState<ProyectoEquipo[]>([])

// DESPUÉS
const [equipos, setEquipos] = useState<ProyectoEquipoCotizado[]>([])
```

#### 5.3 Verificar Componentes
```bash
# Verificar que la aplicación compila
npm run build

# Verificar que no hay errores de linting
npm run lint
```

---

### **FASE 6: Actualización de Tests**
**Duración estimada**: 2-3 horas
**Responsable**: Desarrollador principal

#### 6.1 Archivos de Test a Revisar
- `src/__tests__/**/*.test.ts`
- `src/components/**/__tests__/**/*.test.tsx`
- Mocks en `src/__tests__/__mocks__/`

#### 6.2 Patrón de Cambios en Tests

**Mock data**:
```typescript
// ANTES
const mockEquipo: ProyectoEquipo = {
  id: 'test-id',
  // ...
}

// DESPUÉS
const mockEquipo: ProyectoEquipoCotizado = {
  id: 'test-id',
  // ...
}
```

**Imports y tipos en tests**:
```typescript
// ANTES
import type { ProyectoEquipo } from '@/types'

// DESPUÉS
import type { ProyectoEquipoCotizado } from '@/types'
```

#### 6.3 Ejecutar Tests
```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests específicos si es necesario
npm test -- --testPathPattern=proyecto
```

---

### **FASE 7: Actualización de Documentación**
**Duración estimada**: 1 hora
**Responsable**: Desarrollador principal

#### 7.1 Documentos a Revisar
- `README.md`
- `docs/**/*.md`
- Comentarios en código

#### 7.2 Cambios en Documentación
- Actualizar referencias a modelos antiguos
- Actualizar diagramas si es necesario
- Actualizar ejemplos de código

---

### **FASE 8: Pruebas de Integración**
**Duración estimada**: 2-3 horas
**Responsable**: QA/Desarrollador

#### 8.1 Pruebas Funcionales
- ✅ Navegar a páginas de proyectos
- ✅ Crear/ver/editar equipos, servicios y gastos
- ✅ Funcionalidad de listas y pedidos
- ✅ Flujos completos de cotización a proyecto

#### 8.2 Pruebas de Regresión
```bash
# Ejecutar suite completa de tests
npm test

# Verificar linting
npm run lint

# Verificar tipos
npm run type-check
```

#### 8.3 Pruebas de Base de Datos
```sql
-- Verificar que las tablas nuevas existen
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'Proyecto%Cotizado%';

-- Verificar integridad referencial
SELECT COUNT(*) FROM ProyectoEquipoCotizado;
SELECT COUNT(*) FROM ProyectoEquipoCotizadoItem;
```

---

### **FASE 9: Despliegue y Monitoreo**
**Duración estimada**: 1-2 horas
**Responsable**: DevOps/Desarrollador

#### 9.1 Despliegue en Staging
```bash
# Generar build de producción
npm run build

# Desplegar en staging
# (Comandos específicos del ambiente)
```

#### 9.2 Monitoreo Post-Despliegue
- ✅ Verificar logs de aplicación
- ✅ Probar funcionalidades críticas
- ✅ Monitorear rendimiento
- ✅ Verificar base de datos

---

## ⚠️ Plan de Contingencia y Rollback

### Rollback de Base de Datos
```sql
-- Si es necesario rollback de migración
-- NOTA: Prisma no soporta rollback automático fácil
-- Opción: Restaurar desde backup

-- Restaurar backup
psql gyscontrol_db < backup_pre_refactoring_YYYYMMDD_HHMMSS.sql
```

### Rollback de Código
```bash
# Revertir commits si se usó Git
git revert <commit-hash>
git push origin main
```

### Verificación de Rollback
- ✅ Aplicación compila correctamente
- ✅ Funcionalidades básicas funcionan
- ✅ Base de datos en estado consistente

---

## 📈 Métricas de Éxito

### Criterios de Aceptación
- [ ] Aplicación compila sin errores
- [ ] Todos los tests pasan
- [ ] Flujo completo de cotización → proyecto funciona
- [ ] Base de datos mantiene integridad
- [ ] Interfaz de usuario sin cambios visibles
- [ ] Rendimiento no degradado

### KPIs de Calidad
- **Coverage de Tests**: Mantener >80%
- **Tiempo de Build**: Sin incremento significativo
- **Errores de Runtime**: Cero en funcionalidades críticas

---

## 👥 Roles y Responsabilidades

| Rol | Responsabilidades |
|-----|------------------|
| **Desarrollador Principal** | Implementación completa del refactoring |
| **QA Tester** | Pruebas funcionales y de regresión |
| **DevOps** | Despliegue y monitoreo |
| **Product Owner** | Validación de requisitos y aceptación |

---

## 📅 Cronograma Sugerido

| Fase | Duración | Fecha Inicio | Fecha Fin |
|------|----------|--------------|-----------|
| Fase 1: Schema BD | 3h | Día 1 | Día 1 |
| Fase 2: Tipos TS | 2h | Día 1 | Día 1 |
| Fase 3: Servicios | 3h | Día 2 | Día 2 |
| Fase 4: APIs | 4h | Día 2 | Día 2 |
| Fase 5: Componentes | 6h | Día 3 | Día 3 |
| Fase 6: Tests | 3h | Día 4 | Día 4 |
| Fase 7: Documentación | 1h | Día 4 | Día 4 |
| Fase 8: Pruebas Integración | 3h | Día 5 | Día 5 |
| Fase 9: Despliegue | 2h | Día 5 | Día 5 |

**Total estimado**: 5 días laborables

---

## 🔧 Herramientas y Comandos Útiles

### Desarrollo
```bash
# Verificar tipos
npm run type-check

# Ejecutar tests
npm test

# Build de producción
npm run build

# Lint code
npm run lint
```

### Base de Datos
```bash
# Generar migración
npx prisma migrate dev --name <migration-name>

# Aplicar migraciones
npx prisma migrate deploy

# Generar cliente
npx prisma generate

# Ver schema actual
npx prisma db push --preview-feature
```

### Debugging
```bash
# Ver logs de desarrollo
npm run dev

# Debug tests
npm test -- --verbose

# Ver queries Prisma
DEBUG=prisma:* npm run dev
```

---

## 📝 Checklist Final de Verificación

### Antes de Commit
- [ ] Todos los tipos TypeScript correctos
- [ ] Compilación sin errores
- [ ] Tests pasando
- [ ] Linting aprobado
- [ ] Documentación actualizada

### Después de Despliegue
- [ ] Aplicación inicia correctamente
- [ ] Funcionalidades críticas probadas
- [ ] Base de datos consistente
- [ ] Logs sin errores críticos
- [ ] Rendimiento aceptable

---

*Documento generado automáticamente por Kilo Code - Arquitecto de Software*  
*Fecha: $(date)*  
*Versión: 1.0*