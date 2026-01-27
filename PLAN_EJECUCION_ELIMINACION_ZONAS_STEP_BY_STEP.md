# 🚀 PLAN EJECUTABLE: ELIMINACIÓN COMPLETA DE ZONAS - STEP BY STEP

**Proyecto:** GYS Control - Sistema de Cronogramas  
**Objetivo:** Eliminar completamente el concepto "ZONAS" y modelo ProyectoZona  
**Fecha:** 04 de Diciembre de 2025  
**Tiempo Estimado:** 4-5 horas de ejecución  
**Estado:** ⚠️ **CRÍTICO - REQUIERE EJECUCIÓN INMEDIATA**

---

## 📊 **RESUMEN EJECUTIVO DEL PLAN**

### **Magnitud del Problema Identificado**
- **Total de archivos afectados:** 150+ archivos
- **APIs que fallan:** 5 endpoints críticos (Error 500)
- **Componentes con referencias:** 25+ componentes React
- **Servicios afectados:** 10+ servicios TypeScript
- **Schemas Prisma afectados:** 3 archivos (schema.prisma, schema_local.prisma, schema_neon.prisma)

### **Arquitectura Final Objetivo (5 Niveles)**
```
🏢 PROYECTO → 📋 FASES → 🔧 EDTs → ⚙️ ACTIVIDADES → ✅ TAREAS
```

### **Documentación de Respaldo**
Este plan se basa en la documentación oficial existente:
- `docs/CRONOGRAMA_5_NIVELES_IMPLEMENTATION_GUIDE.md` - Guía oficial
- `REPORTE_DESCARTE_ZONAS.md` - Confirmación oficial de eliminación
- `ZONAS_ELIMINACION_PLAN_DETALLADO.md` - Plan técnico detallado
- `AUDITORIA_POST_ELIMINACION_ZONAS.md` - Auditoría de inconsistencias
- `API_DB_DESALINEADAS_REPORT_v2.md` - APIs desalineadas identificadas

---

## 🎯 **FASES DE EJECUCIÓN**

### **FASE 0: VERIFICACIONES PREVIAS** ⏱️ *15 minutos*

**Objetivo:** Preparar el entorno y crear respaldo de seguridad

#### **Checklist Fase 0:**
- [ ] **Paso 0.1:** Crear backup completo del proyecto
  - **Comando:** `git add . && git commit -m "BACKUP: Estado antes de eliminar zonas"`
  - **Verificación:** `git log --oneline` debe mostrar commit de backup
  - **Criterio de éxito:** Backup creado y commit visible
  - **Riesgo:** ⚠️ Sin backup, pérdida de trabajo en caso de error

- [ ] **Paso 0.2:** Verificar estado actual del build
  - **Comando:** `npm run build`
  - **Esperado:** Build debe fallar por APIs de zonas (5 errores esperados)
  - **Criterio de éxito:** Errores identificados y documentados
  - **Riesgo:** ⚠️ Si no hay errores, revisar si zonas ya están eliminadas

- [ ] **Paso 0.3:** Verificar esquema actual de Prisma
  - **Comando:** `npx prisma validate`
  - **Verificar:** `npx prisma db push --preview-feature --accept-data-loss`
  - **Criterio de éxito:** Esquema válido y sincronizado
  - **Riesgo:** ⚠️ Esquema inconsistente puede romper migración

---

### **FASE 1: LIMPIEZA DE APIs CRÍTICAS** ⏱️ *30 minutos*

**Objetivo:** Eliminar APIs que causan Error 500 y limpiar referencias

#### **Checklist Fase 1:**

##### **APIs Críticas - ELIMINAR COMPLETAMENTE:**
- [ ] **Paso 1.1:** Eliminar archivo API de zonas principal
  - **Archivo:** `src/app/api/proyectos/[id]/zonas/route.ts`
  - **Acción:** `rm src/app/api/proyectos/[id]/zonas/route.ts`
  - **Comando verificación:** `ls -la src/app/api/proyectos/[id]/zonas/`
  - **Criterio de éxito:** Directorio debe estar vacío o no existir
  - **Riesgo:** 🔴 CRÍTICO - Puede romper componentes que llaman estas APIs

- [ ] **Paso 1.2:** Eliminar archivo API de zona específica
  - **Archivo:** `src/app/api/proyectos/[id]/zonas/[zonaId]/route.ts`
  - **Acción:** `rm src/app/api/proyectos/[id]/zonas/[zonaId]/route.ts`
  - **Comando verificación:** `find src -name "*zona*" -type f`
  - **Criterio de éxito:** No debe quedar ningún archivo con "zona" en el path
  - **Riesgo:** 🔴 CRÍTICO - Error 500 garantizado si no se elimina

##### **APIs con Referencias - MODIFICAR:**
- [ ] **Paso 1.3:** Limpiar API de cronograma actividades
  - **Archivo:** `src/app/api/proyectos/[id]/cronograma/actividades/route.ts`
  - **Líneas a modificar:** 246 (`zonaId = searchParams.get('zonaId')`)
  - **Acción:** Eliminar línea que obtiene parámetro zonaId
  - **Comando verificación:** `grep -n "zonaId" src/app/api/proyectos/[id]/cronograma/actividades/route.ts`
  - **Criterio de éxito:** 0 resultados de zonaId en el archivo
  - **Riesgo:** 🟡 MEDIO - Puede causar warnings en frontend

- [ ] **Paso 1.4:** Limpiar API de EDTs
  - **Archivo:** `src/app/api/proyectos/[id]/edt/route.ts`
  - **Líneas a modificar:** 26, 39, 174, 177, 184, 196
  - **Cambios:** Eliminar filtros `zona`, validaciones de unicidad con zona, campo zona en payload
  - **Comando verificación:** `grep -n "zona" src/app/api/proyectos/[id]/edt/route.ts`
  - **Criterio de éxito:** 0 resultados de "zona" en el archivo (excepto comentarios)
  - **Riesgo:** 🟡 MEDIO - Formularios de EDTs pueden fallar

- [ ] **Paso 1.5:** Limpiar API de reordenamiento
  - **Archivo:** `src/app/api/proyectos/[id]/reordenar/route.ts`
  - **Líneas a modificar:** 16 (enum), 86-98 (case zona), 157 (tipo), 182-183 (case zona)
  - **Cambios:** Remover 'zona' del enum tipo, eliminar casos de zona
  - **Comando verificación:** `grep -n "zona" src/app/api/proyectos/[id]/reordenar/route.ts`
  - **Criterio de éxito:** 0 resultados de "zona" (excepto comentarios)
  - **Riesgo:** 🟡 MEDIO - Funcionalidad de reordenamiento de zonas eliminada

##### **APIs Adicionales - MODIFICAR:**
- [ ] **Paso 1.6:** Limpiar API de asignar responsable
  - **Archivo:** `src/app/api/proyectos/[id]/cronograma/asignar-responsable/route.ts`
  - **Líneas a modificar:** 182-188 (case 'zona')
  - **Acción:** Eliminar bloque completo del case 'zona'
  - **Comando verificación:** `grep -A 10 -B 2 "case 'zona'" src/app/api/proyectos/[id]/cronograma/asignar-responsable/route.ts`
  - **Criterio de éxito:** No debe existir case 'zona'
  - **Riesgo:** 🟡 MEDIO - Funcionalidad de asignación por zona eliminada

- [ ] **Paso 1.7:** Limpiar API de importación
  - **Archivo:** `src/app/api/proyectos/[id]/cronograma/importar/route.ts`
  - **Líneas a modificar:** 231-235 (creación automática de zonas)
  - **Acción:** Eliminar lógica de creación automática de zonas
  - **Comando verificación:** `grep -n "zona" src/app/api/proyectos/[id]/cronograma/importar/route.ts`
  - **Criterio de éxito:** Solo comentarios sobre zona, no lógica funcional
  - **Riesgo:** 🟡 MEDIO - Importación puede no crear zonas automáticamente

---

### **FASE 2: ACTUALIZACIÓN DE SCHEMAS PRISMA** ⏱️ *25 minutos*

**Objetivo:** Eliminar campos zona de todos los esquemas de Prisma

#### **Checklist Fase 2:**

##### **Schema Principal:**
- [ ] **Paso 2.1:** Actualizar prisma/schema.prisma
  - **Archivos:** `prisma/schema.prisma`
  - **Líneas a eliminar:** 
    - `zona String?` en modelo ProyectoEdt (línea ~664)
    - `zona String?` en modelo CotizacionEdt (línea ~520)
    - Índices con zona en @@unique y @@index
  - **Comando verificación:** `grep -n "zona" prisma/schema.prisma`
  - **Criterio de éxito:** 0 resultados de "zona" en schema
  - **Riesgo:** 🔴 CRÍTICO - Puede romper migraciones si no se hace correctamente

- [ ] **Paso 2.2:** Actualizar prisma/schema_local.prisma
  - **Cambios:** Mismos cambios que schema.prisma
  - **Comando verificación:** `grep -n "zona" prisma/schema_local.prisma`
  - **Criterio de éxito:** 0 resultados de "zona"
  - **Riesgo:** 🔴 CRÍTICO - Inconsistencia entre schemas locales

- [ ] **Paso 2.3:** Actualizar prisma/schema_neon.prisma
  - **Cambios:** Mismos cambios que schema.prisma
  - **Comando verificación:** `grep -n "zona" prisma/schema_neon.prisma`
  - **Criterio de éxito:** 0 resultados de "zona"
  - **Riesgo:** 🔴 CRÍTICO - Inconsistencia con base de datos Neon

##### **Generación de Cliente:**
- [ ] **Paso 2.4:** Regenerar cliente Prisma
  - **Comando:** `npx prisma generate`
  - **Verificar:** `ls -la node_modules/.prisma/` debe mostrar archivos actualizados
  - **Criterio de éxito:** Cliente regenerado sin errores
  - **Riesgo:** 🔴 CRÍTICO - Tipos TypeScript incorrectos sin regeneración

##### **Aplicación de Migración:**
- [ ] **Paso 2.5:** Verificar migración disponible
  - **Archivo esperado:** `scripts/migrate_remove_zones.sql` o similar
  - **Si existe:** Aplicar migración `psql -U username -d database_name -f scripts/migrate_remove_zones.sql`
  - **Si no existe:** Crear migración manual con DROP COLUMN
  - **Comando verificación:** `npx prisma migrate status`
  - **Criterio de éxito:** Migración aplicada exitosamente
  - **Riesgo:** 🔴 CRÍTICO - Base de datos inconsistente sin migración

---

### **FASE 3: LIMPIEZA DE COMPONENTES FRONTEND** ⏱️ *45 minutos*

**Objetivo:** Eliminar referencias a zonas en componentes React

#### **Checklist Fase 3:**

##### **Componentes Críticos - ELIMINAR:**
- [ ] **Paso 3.1:** Eliminar componente de zonas de cotización
  - **Archivo:** `src/components/comercial/cronograma/CotizacionZonaList.tsx`
  - **Acción:** `rm src/components/comercial/cronograma/CotizacionZonaList.tsx`
  - **Comando verificación:** `find src -name "*zona*" -type f`
  - **Criterio de éxito:** 0 archivos con "zona" en el nombre
  - **Riesgo:** 🔴 CRÍTICO - Componente obsoleto que puede causar errores de import

##### **Componentes de Lista - MODIFICAR:**
- [ ] **Paso 3.2:** Limpiar ProyectoActividadList
  - **Archivo:** `src/components/proyectos/cronograma/ProyectoActividadList.tsx`
  - **Líneas a modificar:** 70 (zonaId?: string), 78 (zonaId), 97 (if zonaId), 121 ([proyectoId, zonaId]), 461 (zonaId={zonaId})
  - **Cambios:** Eliminar prop zonaId y todas sus referencias
  - **Comando verificación:** `grep -n "zona" src/components/proyectos/cronograma/ProyectoActividadList.tsx`
  - **Criterio de éxito:** 0 referencias a zonaId
  - **Riesgo:** 🟡 MEDIO - Filtros por zona eliminados

- [ ] **Paso 3.3:** Limpiar EdtList
  - **Archivo:** `src/components/proyectos/EdtList.tsx`
  - **Líneas a modificar:** 80 (filtro zona), 136 (placeholder), 221-225 (badge zona)
  - **Cambios:** Eliminar filtros de zona, actualizar placeholder, remover badge
  - **Comando verificación:** `grep -n "zona" src/components/proyectos/EdtList.tsx`
  - **Criterio de éxito:** 0 referencias funcionales a zona
  - **Riesgo:** 🟡 MEDIO - Búsqueda por zona eliminada

##### **Formularios - MODIFICAR:**
- [ ] **Paso 3.4:** Limpiar EdtForm
  - **Archivo:** `src/components/proyectos/EdtForm.tsx`
  - **Líneas a modificar:** 31 (zona: z.string()), 97 (zona: edt?.zona), 116 (zona: data.zona), 256 (campo zona completo)
  - **Cambios:** Eliminar campo zona del schema de validación, del estado, del payload y del JSX
  - **Comando verificación:** `grep -n "zona" src/components/proyectos/EdtForm.tsx`
  - **Criterio de éxito:** Solo comentarios sobre zona, no campos funcionales
  - **Riesgo:** 🔴 CRÍTICO - Formulario puede fallar al enviar

- [ ] **Paso 3.5:** Limpiar ProyectoEdtForm
  - **Archivo:** `src/components/proyectos/cronograma/ProyectoEdtForm.tsx`
  - **Líneas a modificar:** 35 (zona field), 81 (zona state), 136 (zona payload), 230-234 (zona JSX)
  - **Cambios:** Eliminar campo zona completamente
  - **Comando verificación:** `grep -n "zona" src/components/proyectos/cronograma/ProyectoEdtForm.tsx`
  - **Criterio de éxito:** 0 campos funcionales de zona
  - **Riesgo:** 🔴 CRÍTICO - Formulario de EDT puede romperse

##### **Vistas y Filtros - MODIFICAR:**
- [ ] **Paso 3.6:** Limpiar ProyectoCronogramaFilters
  - **Archivo:** `src/components/proyectos/cronograma/ProyectoCronogramaFilters.tsx`
  - **Líneas a modificar:** 42, 76, 114, 132, 286-292 (filtros zona)
  - **Cambios:** Eliminar filtros de zona, actualizar lógica de filtrado
  - **Comando verificación:** `grep -n "zona" src/components/proyectos/cronograma/ProyectoCronogramaFilters.tsx`
  - **Criterio de éxito:** Filtros de zona eliminados
  - **Riesgo:** 🟡 MEDIO - Filtros UI no funcionarán para zona

- [ ] **Paso 3.7:** Limpiar ProyectoGanttView
  - **Archivo:** `src/components/proyectos/cronograma/ProyectoGanttView.tsx`
  - **Líneas a modificar:** 36, 106, 352, 836 (tipo 'zona')
  - **Cambios:** Eliminar tipo 'zona' de enums y lógica
  - **Comando verificación:** `grep -n "zona" src/components/proyectos/cronograma/ProyectoGanttView.tsx`
  - **Criterio de éxito:** 0 referencias a tipo 'zona'
  - **Riesgo:** 🟡 MEDIO - Vista Gantt puede no mostrar elementos de zona

##### **Componentes Comerciales - MODIFICAR:**
- [ ] **Paso 3.8:** Limpiar CotizacionActividadList
  - **Archivo:** `src/components/comercial/cronograma/CotizacionActividadList.tsx`
  - **Líneas a modificar:** 88, 179, 249, 656-674, 928-941 (referencias zona)
  - **Cambios:** Eliminar referencias a zonas en lógica y UI
  - **Comando verificación:** `grep -n "zona" src/components/comercial/cronograma/CotizacionActividadList.tsx`
  - **Criterio de éxito:** 0 referencias funcionales a zona
  - **Riesgo:** 🟡 MEDIO - Lista comercial puede mostrar datos incorrectos

- [ ] **Paso 3.9:** Limpiar ProyectoCronogramaTab
  - **Archivo:** `src/components/proyectos/cronograma/ProyectoCronogramaTab.tsx`
  - **Líneas a modificar:** 590 (comentario zonas)
  - **Cambios:** Actualizar comentario para reflejar 5 niveles
  - **Comando verificación:** `grep -n "zona" src/components/proyectos/cronograma/ProyectoCronogramaTab.tsx`
  - **Criterio de éxito:** Comentarios actualizados, sin referencias funcionales
  - **Riesgo:** 🟡 BAJO - Solo comentario, sin impacto funcional

---

### **FASE 4: ACTUALIZACIÓN DE SERVICIOS** ⏱️ *30 minutos*

**Objetivo:** Eliminar lógica de zonas de servicios TypeScript

#### **Checklist Fase 4:**

##### **Servicios Principales - MODIFICAR:**
- [ ] **Paso 4.1:** Limpiar proyectoEdt service
  - **Archivo:** `src/lib/services/proyectoEdt.ts`
  - **Líneas a modificar:** 47, 68, 145, 263, 324, 329, 336, 402, 578, 830, 906, 1030 (referencias zona)
  - **Cambios:** Eliminar todas las referencias a zona, actualizar validaciones de unicidad
  - **Comando verificación:** `grep -n "zona" src/lib/services/proyectoEdt.ts`
  - **Criterio de éxito:** 0 referencias funcionales a zona
  - **Riesgo:** 🔴 CRÍTICO - Servicio puede fallar en operaciones CRUD

- [ ] **Paso 4.2:** Limpiar cronogramaMigration service
  - **Archivo:** `src/lib/services/cronogramaMigration.ts`
  - **Líneas a modificar:** 17, 38, 59, 147, 286, 342, 391, 420 (referencias zona)
  - **Cambios:** Eliminar función crearZonaPorDefecto y referencias a zonas
  - **Comando verificación:** `grep -n "zona" src/lib/services/cronogramaMigration.ts`
  - **Criterio de éxito:** 0 referencias funcionales a zona
  - **Riesgo:** 🟡 MEDIO - Migraciones pueden no crear zonas automáticamente

##### **Servicios Adicionales - MODIFICAR:**
- [ ] **Paso 4.3:** Limpiar msProjectService
  - **Archivo:** `src/lib/services/msProjectService.ts`
  - **Líneas a modificar:** Lógica de zonas (10+ líneas)
  - **Cambios:** Eliminar exportación de zonas, actualizar estructura XML
  - **Comando verificación:** `grep -n "zona" src/lib/services/msProjectService.ts`
  - **Criterio de éxito:** 0 referencias funcionales a zona
  - **Riesgo:** 🟡 MEDIO - Exportación MS Project puede no incluir zonas

- [ ] **Paso 4.4:** Limpiar cronogramaAnalytics service
  - **Archivo:** `src/lib/services/cronogramaAnalytics.ts`
  - **Líneas a modificar:** 33 (filtro zona)
  - **Cambios:** Eliminar filtros por zona en análisis
  - **Comando verificación:** `grep -n "zona" src/lib/services/cronogramaAnalytics.ts`
  - **Criterio de éxito:** 0 referencias a filtro zona
  - **Riesgo:** 🟡 MEDIO - Analytics pueden no segmentar por zona

- [ ] **Paso 4.5:** Limpiar cotizacionCronograma service
  - **Archivo:** `src/lib/services/cotizacionCronograma.ts`
  - **Líneas a modificar:** 5+ líneas (referencias zona)
  - **Cambios:** Eliminar campos zona de interfaces y lógica
  - **Comando verificación:** `grep -n "zona" src/lib/services/cotizacionCronograma.ts`
  - **Criterio de éxito:** 0 referencias funcionales a zona
  - **Riesgo:** 🟡 MEDIO - Cronogramas comerciales pueden tener datos inconsistentes

---

### **FASE 5: ACTUALIZACIÓN DE TIPOS TYPESCRIPT** ⏱️ *15 minutos*

**Objetivo:** Eliminar interfaces y tipos relacionados con zonas

#### **Checklist Fase 5:**

##### **Tipos de Payloads:**
- [ ] **Paso 5.1:** Limpiar src/types/payloads.ts
  - **Archivo:** `src/types/payloads.ts`
  - **Líneas a modificar:** 1160, 1186, 1245, 1345, 1365 (campos zona?: string)
  - **Cambios:** Eliminar campos zona de todas las interfaces
  - **Comando verificación:** `grep -n "zona" src/types/payloads.ts`
  - **Criterio de éxito:** 0 campos zona en interfaces
  - **Riesgo:** 🔴 CRÍTICO - Tipos incorrectos pueden causar errores de TypeScript

##### **Tipos de Modelos:**
- [ ] **Paso 5.2:** Limpiar src/types/modelos.ts
  - **Archivo:** `src/types/modelos.ts`
  - **Líneas a modificar:** 834 (zona?: string | null), 1719 (comentario zona)
  - **Cambios:** Eliminar campo zona de interfaces de modelos
  - **Comando verificación:** `grep -n "zona" src/types/modelos.ts`
  - **Criterio de éxito:** 0 campos zona en modelos
  - **Riesgo:** 🔴 CRÍTICO - Interfaces inconsistentes con esquema Prisma

##### **Hooks:**
- [ ] **Paso 5.3:** Limpiar useSortableList hook
  - **Archivo:** `src/hooks/useSortableList.ts`
  - **Líneas a modificar:** 20-21 (tipo incluye 'zona')
  - **Cambios:** Remover 'zona' del tipo de elementos ordenables
  - **Comando verificación:** `grep -n "zona" src/hooks/useSortableList.ts`
  - **Criterio de éxito:** 0 referencias a 'zona' en tipos
  - **Riesgo:** 🟡 MEDIO - Hook puede no manejar elementos tipo 'zona'

---

### **FASE 6: LIMPIEZA DE CÓDIGO RESIDUAL** ⏱️ *20 minutos*

**Objetivo:** Eliminar referencias restantes y archivos auxiliares

#### **Checklist Fase 6:**

##### **Archivos Auxiliares:**
- [ ] **Paso 6.1:** Limpiar estilos CSS
  - **Archivo:** `src/components/cronograma/CronogramaTreeView.css`
  - **Líneas a eliminar:** `.node-icon-zona` y referencias relacionadas
  - **Comando verificación:** `grep -n "zona" src/components/cronograma/CronogramaTreeView.css`
  - **Criterio de éxito:** 0 estilos relacionados con zona
  - **Riesgo:** 🟡 BAJO - Solo estilos, sin impacto funcional

- [ ] **Paso 6.2:** Limpiar utilidades MS Project
  - **Archivo:** `src/lib/utils/msProjectXmlExport.ts`
  - **Líneas a modificar:** Tipo 'zona' en enums
  - **Comando verificación:** `grep -n "zona" src/lib/utils/msProjectXmlExport.ts`
  - **Criterio de éxito:** 0 referencias a tipo 'zona'
  - **Riesgo:** 🟡 BAJO - Utilidad de exportación puede no manejar zonas

##### **Búsqueda Global de Referencias:**
- [ ] **Paso 6.3:** Búsqueda global de referencias restantes
  - **Comando:** `grep -r "zona" src/ --include="*.ts" --include="*.tsx" | grep -v "zona horaria"`
  - **Acción:** Revisar cada resultado y eliminar referencias funcionales a zonas
  - **Criterio de éxito:** Solo comentarios o referencias válidas (zona horaria)
  - **Riesgo:** 🟡 MEDIO - Referencias pueden romper funcionalidad

---

### **FASE 7: MIGRACIÓN Y COMPILACIÓN** ⏱️ *20 minutos*

**Objetivo:** Aplicar migración final y verificar compilación

#### **Checklist Fase 7:**

##### **Migración Final:**
- [ ] **Paso 7.1:** Crear migración de eliminación de zona
  - **Comando:** `npx prisma migrate dev --name remove_zona_fields`
  - **Contenido migración:**
    ```sql
    ALTER TABLE proyecto_edts DROP COLUMN IF EXISTS zona;
    ALTER TABLE cotizacion_edts DROP COLUMN IF EXISTS zona;
    DROP INDEX IF EXISTS proyecto_edts_proyecto_cronograma_categoria_zona_idx;
    DROP INDEX IF EXISTS cotizacion_edts_cotizacion_categoria_zona_idx;
    ```
  - **Comando verificación:** `npx prisma migrate status`
  - **Criterio de éxito:** Migración aplicada exitosamente
  - **Riesgo:** 🔴 CRÍTICO - Base de datos inconsistente sin migración

##### **Regeneración Final:**
- [ ] **Paso 7.2:** Regenerar cliente Prisma final
  - **Comando:** `npx prisma generate`
  - **Comando verificación:** `npx prisma validate`
  - **Criterio de éxito:** Cliente regenerado sin errores
  - **Riesgo:** 🔴 CRÍTICO - Tipos incorrectos sin regeneración

##### **Compilación:**
- [ ] **Paso 7.3:** Verificar compilación
  - **Comando:** `npm run build`
  - **Esperado:** Build exitoso sin errores de zona
  - **Comando verificación:** `echo $?` (debe ser 0)
  - **Criterio de éxito:** Build exitoso al 100%
  - **Riesgo:** 🔴 CRÍTICO - Sistema no funciona sin build exitoso

- [ ] **Paso 7.4:** Ejecutar linter
  - **Comando:** `npm run lint` o `npx eslint src/`
  - **Esperado:** 0 errores relacionados con zona
  - **Criterio de éxito:** Linter pasa sin warnings de zona
  - **Riesgo:** 🟡 MEDIO - Código con código smell pero funcional

---

### **FASE 8: PRUEBAS Y VALIDACIONES FINALES** ⏱️ *30 minutos*

**Objetivo:** Verificar que el sistema funciona correctamente sin zonas

#### **Checklist Fase 8:**

##### **Tests Unitarios:**
- [ ] **Paso 8.1:** Ejecutar tests existentes
  - **Comando:** `npm test`
  - **Esperado:** Tests pasan o fallan por motivos no relacionados con zona
  - **Comando verificación:** `npm test -- --verbose | grep -i zona`
  - **Criterio de éxito:** 0 tests fallando por referencias a zona
  - **Riesgo:** 🟡 MEDIO - Tests pueden necesitar actualización

##### **Verificación Manual de APIs:**
- [ ] **Paso 8.2:** Probar APIs eliminadas (deben dar 404)
  - **Comando:** `curl -X GET http://localhost:3000/api/proyectos/test/zonas`
  - **Esperado:** 404 Not Found (archivo eliminado)
  - **Criterio de éxito:** API retorna 404, no 500
  - **Riesgo:** 🔴 CRÍTICO - APIs aún existentes causarán errores 500

- [ ] **Paso 8.3:** Probar APIs modificadas
  - **APIs a probar:**
    - `GET /api/proyectos/[id]/actividades` (sin parámetro zonaId)
    - `GET /api/proyectos/[id]/edt` (sin filtro zona)
    - `POST /api/proyectos/[id]/edt` (sin campo zona)
  - **Esperado:** APIs funcionan correctamente sin parámetros zona
  - **Criterio de éxito:** Todas las APIs responden correctamente
  - **Riesgo:** 🔴 CRÍTICO - APIs rotas impiden funcionalidad principal

##### **Verificación de Base de Datos:**
- [ ] **Paso 8.4:** Verificar esquema de base de datos
  - **Comando:** `psql -c "SELECT column_name FROM information_schema.columns WHERE table_name IN ('proyecto_edts', 'cotizacion_edts') AND column_name = 'zona';"`
  - **Esperado:** 0 filas (columna zona eliminada)
  - **Criterio de éxito:** Columnas zona no existen
  - **Riesgo:** 🔴 CRÍTICO - Base de datos inconsistente

##### **Verificación Frontend:**
- [ ] **Paso 8.5:** Verificar compilación frontend
  - **Comando:** `npm run build && npm run start`
  - **Probar manualmente:**
    - Crear EDT (no debe tener campo zona)
    - Crear actividad (no debe pedir zona)
    - Ver cronograma (5 niveles, sin zona)
  - **Criterio de éxito:** Frontend funciona sin referencias a zona
  - **Riesgo:** 🔴 CRÍTICO - Frontend roto impide uso del sistema

---

### **FASE 9: DOCUMENTACIÓN Y CLEANUP FINAL** ⏱️ *15 minutos*

**Objetivo:** Actualizar documentación y realizar limpieza final

#### **Checklist Fase 9:**

##### **Documentación:**
- [ ] **Paso 9.1:** Actualizar README principal
  - **Archivo:** `README.md`
  - **Cambios:** Actualizar descripción de arquitectura para 5 niveles
  - **Comando verificación:** `grep -n "zona" README.md`
  - **Criterio de éxito:** Documentación actualizada sin referencias a zona
  - **Riesgo:** 🟡 BAJO - Solo documentación, sin impacto funcional

- [ ] **Paso 9.2:** Crear log de cambios
  - **Archivo:** `CAMBIOS_ELIMINACION_ZONAS.md`
  - **Contenido:** Resumen de cambios realizados por fase
  - **Comando:** `echo "## Eliminación de Zonas - $(date)" >> CAMBIOS_ELIMINACION_ZONAS.md`
  - **Criterio de éxito:** Log creado con fecha y resumen
  - **Riesgo:** 🟡 BAJO - Solo documentación

##### **Cleanup Final:**
- [ ] **Paso 9.3:** Verificación final de archivos con "zona"
  - **Comando:** `find src -name "*zona*" -type f`
  - **Esperado:** 0 archivos con "zona" en el nombre
  - **Acción:** Eliminar cualquier archivo restante con zona en el nombre
  - **Criterio de éxito:** 0 archivos con "zona" en el nombre
  - **Riesgo:** 🟡 BAJO - Archivos obsoletos no críticos

- [ ] **Paso 9.4:** Commit final
  - **Comando:** `git add . && git commit -m "ELIMINACIÓN ZONAS: Migración completa a sistema de 5 niveles"`
  - **Tag:** `git tag -a v5.0.0-sin-zonas -m "Sistema de 5 niveles sin ZONAS"`
  - **Criterio de éxito:** Cambios committeados y taggeados
  - **Riesgo:** 🟡 BAJO - Sin impacto funcional

---

## 🎯 **RESUMEN RÁPIDO PARA EJECUCIÓN**

**TIEMPO TOTAL ESTIMADO: 4-5 HORAS**

### **Orden de Ejecución Exacto:**

1. **🔒 BACKUP INMEDIATO:** `git add . && git commit -m "BACKUP: Antes de eliminar zonas"`
2. **🗑️ ELIMINAR APIs CRÍTICAS:** `rm src/app/api/proyectos/[id]/zonas/*.ts`
3. **🔧 LIMPIAR APIs RESTANTES:** Eliminar parámetro `zonaId` y filtros de 8 APIs específicas
4. **🗃️ ACTUALIZAR SCHEMAS PRISMA:** Eliminar campos `zona` de 3 archivos schema
5. **⚛️ LIMPIAR COMPONENTES:** Eliminar 25+ referencias zona en componentes React
6. **🛠️ ACTUALIZAR SERVICIOS:** Eliminar lógica zona de 10+ servicios TypeScript
7. **📝 LIMPIAR TIPOS:** Eliminar interfaces zona de `payloads.ts` y `modelos.ts`
8. **🧹 LIMPIEZA RESIDUAL:** Búsqueda global y eliminación de referencias restantes
9. **🔄 MIGRACIÓN FINAL:** `npx prisma migrate dev --name remove_zona_fields`
10. **✅ VERIFICACIÓN COMPLETA:** `npm run build && npm test`

### **Comandos de Verificación Críticos:**
```bash
# Verificar eliminación de APIs
curl -X GET http://localhost:3000/api/proyectos/test/zonas  # Debe dar 404

# Verificar compilación
npm run build  # Debe ser exitoso

# Verificar base de datos
psql -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'proyecto_edts' AND column_name = 'zona';"  # Debe retornar 0 filas

# Búsqueda global de referencias restantes
grep -r "zona" src/ --include="*.ts" --include="*.tsx" | grep -v "zona horaria"  # Debe retornar 0 resultados funcionales
```

### **Indicadores de Éxito por Fase:**
- **Fase 0:** ✅ Backup creado, build falla con 5 errores esperados
- **Fase 1:** ✅ APIs de zona eliminadas, otras APIs sin referencias zona
- **Fase 2:** ✅ Esquemas Prisma sin campos zona, cliente regenerado
- **Fase 3:** ✅ Componentes React sin props zonaId
- **Fase 4:** ✅ Servicios sin lógica zona
- **Fase 5:** ✅ Interfaces sin campos zona
- **Fase 6:** ✅ 0 referencias zona restantes
- **Fase 7:** ✅ Build exitoso al 100%
- **Fase 8:** ✅ Tests pasan, APIs funcionan sin zona
- **Fase 9:** ✅ Documentación actualizada, cambios committeados

### **Puntos de Rollback:**
- **Después de Fase 0:** `git reset --hard HEAD~1`
- **Después de Fase 7:** Usar migración de rollback si existe
- **En cualquier momento:** `git checkout <commit-anterior>`

---

## 📊 **ESTADÍSTICAS FINALES DEL PLAN**

**📁 Archivo creado:** `PLAN_EJECUCION_ELIMINACION_ZONAS_STEP_BY_STEP.md`  
**📋 Total de fases:** 10 fases (0-9)  
**✅ Total de pasos:** 47 pasos específicos en checklist  
**⏱️ Tiempo estimado:** 4-5 horas de ejecución  
**🔴 Nivel de criticidad:** CRÍTICO - Requiere ejecución inmediata  
**🎯 Resultado esperado:** Sistema de 5 niveles sin zonas funcionando al 100%

### **Distribución de Pasos por Fase:**
- Fase 0: 3 pasos (Verificaciones previas)
- Fase 1: 7 pasos (APIs críticas)
- Fase 2: 5 pasos (Schemas Prisma)
- Fase 3: 9 pasos (Componentes React)
- Fase 4: 5 pasos (Servicios)
- Fase 5: 3 pasos (Tipos TypeScript)
- Fase 6: 3 pasos (Código residual)
- Fase 7: 4 pasos (Migración y compilación)
- Fase 8: 5 pasos (Pruebas y validaciones)
- Fase 9: 4 pasos (Documentación final)

**🎯 Estado:** **LISTO PARA EJECUCIÓN INMEDIATA**  
**📅 Última actualización:** 04 de Diciembre de 2025  
**👨‍💻 Responsable:** Sistema Técnico GYS Control  
**📋 Plan basado en:** Documentación oficial existente y auditoría técnica

---

**⚠️ IMPORTANTE:** Este plan es AUTOCONTENIDO. Puedes abrirlo en 1 mes y ejecutarlo sin necesidad de revisar conversaciones anteriores. Cada paso incluye verificación específica y criterios de éxito claros.