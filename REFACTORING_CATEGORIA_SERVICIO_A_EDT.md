# 🚀 Guía Completa: Refactoring "Categoría Servicio" → "EDT" en GYS Control

## 📋 Resumen Ejecutivo

Esta guía detalla el proceso completo para cambiar todas las referencias de "Categoría Servicio" a "EDT" en el sistema GYS Control. Como estamos en desarrollo, podemos ser agresivos con los cambios sin preocuparnos por migraciones de datos existentes.

**Alcance:** 300+ archivos afectados
**Tiempo estimado:** 8-12 días de desarrollo (acelerado por estar en desarrollo)
**Riesgo:** Medio-Alto (cambios masivos pero sin datos críticos que perder)

---

## 🎯 FASE 1: Preparación Rápida (2-4 horas)

### 🎯 **IMPORTANTE:** Como estamos en desarrollo y los datos no son críticos, podemos ser agresivos con los cambios.

### Objetivos Mínimos
- Crear rama de desarrollo
- Backup básico del código
- Verificar herramientas disponibles

### Pasos Detallados

#### 1.1 Crear Rama de Desarrollo
```bash
git checkout -b refactor/categoria-servicio-to-edt
```

#### 1.2 Backup Básico
```bash
git tag backup-pre-refactor-categoria-edt-$(date +%Y%m%d_%H%M%S)
```

#### 1.3 Verificar Herramientas
```bash
# Verificar que tenemos las herramientas necesarias
which sed && which grep && which find
npm --version
```

### 🚀 **ACELERACIÓN:** Podemos empezar directamente con la Fase 2 si las herramientas básicas están disponibles.

---

## 🗄️ FASE 2: Base de Datos (1-2 días)

### Objetivos
- Renombrar tabla y campos en Prisma schema
- Actualizar todas las relaciones
- Verificar integridad del schema

### Cambios Específicos

#### 2.1 Actualizar `prisma/schema.prisma`

**Cambios en el modelo `Edt`:**
```prisma
// ANTES
model CategoriaServicio {
  id                String             @id @default(cuid())
  nombre            String             @unique
  descripcion       String?
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  faseDefaultId     String?
  servicios         CatalogoServicio[]
  fase_default      FaseDefault?       @relation(fields: [faseDefaultId], references: [id])
  registrosHorasRef RegistroHoras[]    @relation("RegistroHorasEdt")
  cotizacionEdts    CotizacionEdt[]
  proyectoEdts      ProyectoEdt[]

  @@map("categoria_servicio")
}

// DESPUÉS
model Edt {
  id                String             @id @default(cuid())
  nombre            String             @unique
  descripcion       String?
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  faseDefaultId     String?
  servicios         CatalogoServicio[]
  fase_default      FaseDefault?       @relation(fields: [faseDefaultId], references: [id])
  registrosHorasRef RegistroHoras[]    @relation("RegistroHorasEdt")
  cotizacionEdts    CotizacionEdt[]
  proyectoEdts      ProyectoEdt[]

  @@map("edt") // ← Cambiar nombre de tabla
}
```

**Actualizar relaciones en otros modelos:**

```prisma
// En CatalogoServicio
categoria   Edt   @relation(fields: [categoriaId], references: [id])

// En CotizacionEdt
categoriaServicio    Edt   @relation(fields: [categoriaServicioId], references: [id])

// En ProyectoEdt
categoriaServicio    Edt   @relation(fields: [categoriaServicioId], references: [id])

// En RegistroHoras
categoriaServicioRef Edt   @relation("RegistroHorasEdt", fields: [categoriaServicioId], references: [id])
```

#### 2.2 Generar Nueva Migración
```bash
npx prisma migrate dev --name rename-categoria-servicio-to-edt
npx prisma generate
```

#### 2.3 Verificar Schema
```bash
npx prisma db push --preview-feature
```

---

## 🔧 FASE 3: Backend - APIs (2-3 días)

### Objetivos
- Renombrar rutas de API
- Actualizar controladores
- Modificar servicios backend
- Cambiar validaciones

### Cambios por Archivo

#### 3.1 Renombrar Directorio de API
```bash
# Mover directorio completo
mv src/app/api/categoria-servicio src/app/api/edt
```

#### 3.2 Actualizar Rutas API

**`src/app/api/edt/route.ts`:**
```typescript
// ANTES
export async function GET() {
  const categorias = await prisma.categoriaServicio.findMany()
  return NextResponse.json(categorias)
}

// DESPUÉS
export async function GET() {
  const edts = await prisma.edt.findMany()
  return NextResponse.json(edts)
}
```

**`src/app/api/edt/[id]/route.ts`:**
```typescript
// Cambiar todas las referencias de categoriaServicio → edt
const edt = await prisma.edt.findUnique({
  where: { id: params.id }
})
```

#### 3.3 Actualizar APIs Relacionadas

**Archivos a modificar:**
- `src/app/api/cotizaciones/[id]/cronograma/generar/route.ts`
- `src/app/api/proyectos/[id]/edt/route.ts`
- `src/app/api/proyecto-edt/route.ts`
- `src/app/api/registro-horas/route.ts`

**Cambios comunes:**
```typescript
// ANTES
categoriaServicio: true,
categoriaServicioId: data.categoriaServicioId,

// DESPUÉS
edt: true,
edtId: data.edtId,
```

#### 3.4 Actualizar Servicios Backend

**`src/lib/services/cotizacionCronograma.ts`:**
```typescript
// Cambiar todas las referencias
categoriaServicio → edt
categoriaServicioId → edtId
```

**`src/lib/services/proyectoEdt.ts`:**
```typescript
// Actualizar queries
const edts = await prisma.edt.findMany({
  include: {
    servicios: true,
    cotizacionEdts: true,
    proyectoEdts: true
  }
})
```

---

## 📝 FASE 4: Tipos TypeScript (1-2 días)

### Objetivos
- Renombrar interfaces principales
- Actualizar payloads
- Modificar validadores

### Cambios en `src/types/modelos.ts`

#### 4.1 Renombrar Interface Principal
```typescript
// ANTES
export interface CategoriaServicio {
  id: string
  nombre: string
  descripcion?: string
  createdAt: string
  updatedAt: string
  servicios?: CatalogoServicio[]
  faseDefaultId?: string
  faseDefault?: FaseDefault
}

// DESPUÉS
export interface Edt {
  id: string
  nombre: string
  descripcion?: string
  createdAt: string
  updatedAt: string
  servicios?: CatalogoServicio[]
  faseDefaultId?: string
  faseDefault?: FaseDefault
}
```

#### 4.2 Actualizar Relaciones en Otros Modelos
```typescript
// En CotizacionEdt
categoriaServicio: Edt  // ← Cambiar tipo
categoriaServicioId: string

// En ProyectoEdt
categoriaServicio: Edt  // ← Cambiar tipo
categoriaServicioId: string
```

#### 4.3 Cambios en `src/types/payloads.ts`

```typescript
// ANTES
export interface CategoriaServicioPayload {
  nombre: string
  descripcion?: string
  faseDefaultId?: string
}

// DESPUÉS
export interface EdtPayload {
  nombre: string
  descripcion?: string
  faseDefaultId?: string
}
```

---

## 🌐 FASE 5: Servicios Frontend (1-2 días)

### Objetivos
- Renombrar servicio principal
- Actualizar llamadas a API
- Modificar funciones y tipos

### Cambios en `src/lib/services/categoriaServicio.ts`

#### 5.1 Renombrar Archivo
```bash
mv src/lib/services/categoriaServicio.ts src/lib/services/edt.ts
```

#### 5.2 Actualizar Contenido
```typescript
// ANTES
export async function getCategoriasServicio(): Promise<CategoriaServicio[]>

// DESPUÉS
export async function getEdts(): Promise<Edt[]>
```

#### 5.3 Cambiar Endpoint
```typescript
// ANTES
const res = await fetch(buildApiUrl('/api/categoria-servicio'))

// DESPUÉS
const res = await fetch(buildApiUrl('/api/edt'))
```

#### 5.4 Actualizar Imports en Otros Servicios
```typescript
// En archivos que importan categoriaServicio
import { getEdts } from '@/lib/services/edt'
import type { Edt } from '@/types'
```

---

## 🎨 FASE 6: Componentes Frontend (4-5 días)

### Objetivos
- Cambiar etiquetas UI
- Actualizar formularios
- Modificar tablas y listas
- Cambiar validaciones

### 6.1 Componentes de Catálogo

**`src/components/catalogo/CategoriaServicioForm.tsx` → `EdtForm.tsx`:**
```typescript
// ANTES
<label>Categoría Servicio</label>

// DESPUÉS
<label>EDT</label>
```

**`src/components/catalogo/CategoriaServicioTableView.tsx` → `EdtTableView.tsx`:**
```typescript
// Headers de tabla
// ANTES: "Categoría Servicio"
// DESPUÉS: "EDT"
```

### 6.2 Componentes de Cronograma

**`src/components/comercial/cronograma/CotizacionEdtForm.tsx`:**
```typescript
// ANTES
<label htmlFor="categoriaServicioId">Servicio *</label>

// DESPUÉS
<label htmlFor="edtId">EDT *</label>
```

**`src/components/proyectos/EdtForm.tsx`:**
```typescript
// ANTES
categoriaServicioId: z.string().min(1, 'La categoría de servicio es requerida')

// DESPUÉS
edtId: z.string().min(1, 'El EDT es requerido')
```

### 6.3 Componentes de Proyecto

**`src/components/proyectos/EdtList.tsx`:**
```typescript
// ANTES
{edt.categoriaServicio.nombre}

// DESPUÉS
{edt.edt.nombre}
```

### 6.4 Selectores y Modales

**`src/components/catalogo/CategoriaServicioSelect.tsx` → `EdtSelect.tsx`:**
```typescript
// Props y lógica de selección
interface EdtSelectProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
}
```

---

## ✅ FASE 7: Validadores y Reglas (1 día)

### Objetivos
- Actualizar schemas de validación
- Modificar reglas de negocio
- Cambiar mensajes de error

### Cambios en `src/lib/validators/cronograma.ts`

```typescript
// ANTES
categoriaServicioId: cuidSchema,

// DESPUÉS
edtId: cuidSchema,
```

### Cambios en `src/lib/validators/cronogramaRules.ts`

```typescript
// Mensajes de validación
// ANTES: "La categoría de servicio es requerida"
// DESPUÉS: "El EDT es requerido"
```

---

## 🧪 FASE 8: Testing y QA (2-3 días)

### Objetivos
- Ejecutar tests automatizados
- Pruebas de integración
- Validación manual
- Corrección de bugs

### 8.1 Tests Unitarios
```bash
# Ejecutar tests relacionados con EDTs
npm test -- --testPathPattern="edt|Edt"
npm test -- --testPathPattern="categoriaServicio" # Deberían fallar inicialmente
```

### 8.2 Tests de Integración
```bash
# Tests E2E
npm run test:e2e -- --spec="cronograma"
npm run test:e2e -- --spec="catalogo"
```

### 8.3 Validación Manual

**Casos de prueba críticos:**
1. ✅ Crear nuevo EDT
2. ✅ Listar EDTs en catálogo
3. ✅ Asignar EDT a cotización
4. ✅ Generar cronograma con EDTs
5. ✅ Crear EDTs de proyecto
6. ✅ Filtrar por EDT en reportes

### 8.4 Checklist de Validación

- [ ] APIs responden correctamente
- [ ] Formularios guardan datos
- [ ] Tablas muestran información correcta
- [ ] Filtros funcionan
- [ ] Relaciones se mantienen
- [ ] UI muestra "EDT" en lugar de "Categoría Servicio"

---

## 🚀 FASE 9: Despliegue y Monitoreo (1 día)

### Objetivos
- Merge a rama principal
- Despliegue controlado
- Monitoreo post-despliegue

### 9.1 Merge y Despliegue
```bash
git checkout main
git merge refactor/categoria-servicio-to-edt
git push origin main
```

### 9.2 Monitoreo
- Verificar logs de aplicación
- Monitorear errores en APIs
- Validar funcionamiento en producción

---

## 🛠️ Herramientas de Automatización

### Script de Reemplazo Masivo
```bash
#!/bin/bash
# reemplazar-categoria-edt.sh

# Reemplazos masivos
find src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs sed -i 's/categoriaServicio/edt/g'
find src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs sed -i 's/CategoriaServicio/Edt/g'
find src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs sed -i 's/categoria_servicio/edt/g'
```

### Verificación de Cambios
```bash
#!/bin/bash
# verificar-cambios.sh

echo "🔍 Verificando referencias restantes a categoriaServicio..."
grep -r "categoriaServicio" src/ --exclude-dir=node_modules || echo "✅ No se encontraron referencias"

echo "🔍 Verificando referencias a CategoriaServicio..."
grep -r "CategoriaServicio" src/ --exclude-dir=node_modules || echo "✅ No se encontraron referencias"
```

---

## ⚠️ Riesgos y Mitigaciones

### Riesgos (Reducidos por estar en desarrollo)
1. **Pérdida de referencias:** Usar git para tracking
2. **Errores de compilación:** Compilar frecuentemente
3. **Tests fallidos:** Ejecutar tests en cada fase
4. **Inconsistencias UI:** Checklist de validación manual

### 🎯 **VENTAJAS en Desarrollo:**
- ✅ Sin migraciones de datos complejas
- ✅ Podemos resetear BD si es necesario
- ✅ Tests pueden fallar inicialmente (esperado)
- ✅ Más libertad para cambios agresivos

### Plan de Contingencia
- **Rollback:** `git reset --hard backup-pre-refactor-categoria-edt`
- **Branch alternativo:** Mantener rama principal intacta
- **Backup de BD:** Antes de cualquier cambio en schema

---

## 📊 Métricas de Éxito

- ✅ 0 referencias a "categoriaServicio" en código
- ✅ 0 referencias a "CategoriaServicio" en tipos
- ✅ Todas las APIs responden correctamente
- ✅ UI muestra "EDT" consistentemente
- ✅ Tests pasan completamente
- ✅ Funcionalidades críticas operativas

---

## 🎯 Checklist Final de Verificación

### Backend
- [ ] APIs `/api/edt/` funcionan
- [ ] Base de datos actualizada
- [ ] Migraciones aplicadas
- [ ] Servicios backend actualizados

### Frontend
- [ ] Tipos TypeScript correctos
- [ ] Servicios frontend actualizados
- [ ] Componentes muestran "EDT"
- [ ] Formularios funcionan
- [ ] Tablas y listas correctas

### Testing
- [ ] Tests unitarios pasan
- [ ] Tests de integración pasan
- [ ] QA manual completado
- [ ] Rendimiento aceptable

---

## 📞 Soporte y Contactos

**Responsable del Refactoring:** Jesús Artemio
**Equipo de QA:** Equipo de desarrollo
**Tiempo estimado por fase:** Ver sección correspondiente
**Prioridad:** Alta (cambio fundamental de nomenclatura)

---

*Esta guía debe seguirse estrictamente para evitar errores costosos. Cada fase debe completarse y validarse antes de pasar a la siguiente.*