# Reportes Semanales de Seguridad — Implementación Fase 2

> Capa de agregación semanal: modelo `ReporteSemanalSeguridad`, servicio agregador,
> API CRUD + flujo de estados, editor full con auto-save y KPIs editables.
> También incluye la UI de edición de `RegistroSeguridad` (TODO de Fase 1).
> **No** incluye Fase 3 (generación PPT).

---

## Resumen ejecutivo

Lo que quedó operativo end-to-end:

1. Modelo `ReporteSemanalSeguridad` + enum `EstadoReporteSeguridad` en Prisma, con migración aplicada y cliente regenerado.
2. Helpers ISO-week en `src/lib/validators/reporteSeguridad.ts` (`parsearSemanaIso`, `formatearSemanaIso`, `rangoSemanaIso`).
3. Servicio `src/lib/services/reporteSeguridad.ts` con `obtenerOCrearReporte` (upsert) y `obtenerReporteAgregado` (join en vivo de jornadas + registros → KPIs calculados).
4. API Routes completas bajo `/api/seguridad/reportes-semanales/` (list, create, get, patch, delete, agregado, enviar, aprobar, rechazar).
5. UI de listado, creación (`/seguridad/reportes-semanales/nuevo`) y editor full (`/seguridad/reportes-semanales/[id]`):
   - Auto-save con debounce 1.5s.
   - KPIs editables con override/reset (icono lápiz / ↺).
   - Secciones por categoría de actividad con galería de fotos.
   - Flujo de estados: borrador → enviado → aprobado/rechazado.
6. UI de edición de `RegistroSeguridad` en `/seguridad/registros/[id]/editar` (botón "Editar" habilitado en el detalle).
7. Sidebar con nuevo ítem "Reportes semanales" (`FileBarChart`) y tile en dashboard de seguridad.
8. `npx tsc --noEmit` pasa limpio (exit 0).

---

## Archivos creados

### Migración
- `prisma/migrations/20260505120000_add_reporte_semanal_seguridad/migration.sql`

### Validadores
- `src/lib/validators/reporteSeguridad.ts`
  - `parsearSemanaIso` / `formatearSemanaIso` / `rangoSemanaIso` (date-fns ISO week)
  - `estadoReporteSeguridadEnum`, `EstadoReporteSeguridad`, `ESTADO_REPORTE_LABELS`
  - `crearReporteSeguridadSchema`, `actualizarReporteSeguridadSchema`, `rechazarReporteSeguridadSchema`

### Servicio
- `src/lib/services/reporteSeguridad.ts`
  - `REPORTE_INCLUDE` + `ReporteSeguridadDetalle` type
  - `obtenerOCrearReporte(proyectoId, semanaIso, ingenieroId)` — upsert por unique key
  - `obtenerReporteAgregado(reporteId)` → `ReporteAgregado` (reporte + KPI calculado + registros + jornadas)

### API Routes
- `src/app/api/seguridad/reportes-semanales/route.ts` — `GET` (filtros: proyectoId, semanaIso, estado, ingenieroId) + `POST` (upsert-friendly: devuelve 200 si ya existe)
- `src/app/api/seguridad/reportes-semanales/[id]/route.ts` — `GET`, `PATCH`, `DELETE`
- `src/app/api/seguridad/reportes-semanales/[id]/agregado/route.ts` — `GET` → `ReporteAgregado`
- `src/app/api/seguridad/reportes-semanales/[id]/enviar/route.ts` — `POST` (borrador|rechazado → enviado)
- `src/app/api/seguridad/reportes-semanales/[id]/aprobar/route.ts` — `POST` (enviado → aprobado; solo admin/gerente)
- `src/app/api/seguridad/reportes-semanales/[id]/rechazar/route.ts` — `POST` (enviado → rechazado; requiere `notasRevision`; solo admin/gerente)

### UI Components
- `src/components/seguridad/reportes-semanales/SelectorSemana.tsx` — navegación ← semana →
- `src/components/seguridad/reportes-semanales/KpiEditable.tsx` — KPI con pencil/reset, muestra valor auto si no hay override
- `src/components/seguridad/reportes-semanales/SeccionCategoria.tsx` — acordeón por tipo de actividad con galería de fotos
- `src/components/seguridad/reportes-semanales/ReporteSeguridadCard.tsx` — card de listado con badge de estado

### Páginas nuevas
- `src/app/seguridad/reportes-semanales/page.tsx` — listado con filtro por estado
- `src/app/seguridad/reportes-semanales/nuevo/page.tsx` — selector proyecto + semana → crea y redirige al editor
- `src/app/seguridad/reportes-semanales/[id]/page.tsx` — editor completo
- `src/app/seguridad/registros/[id]/editar/page.tsx` — edición de un registro de campo (Fase 1 TODO)

---

## Archivos modificados

- `prisma/schema.prisma`
  - Nuevo modelo `ReporteSemanalSeguridad` (después de `RegistroSeguridadFoto`)
  - Nuevo enum `EstadoReporteSeguridad`
  - `Proyecto.reportesSemanalesSeguridad ReporteSemanalSeguridad[]`
  - `User.reportesSeguridadCreados` + `User.reportesSeguridadAprobados`

- `src/components/Sidebar.tsx`
  - Importado `FileBarChart`
  - Añadido ítem "Reportes semanales" (`/seguridad/reportes-semanales`) entre "Registros de campo" y "Reportes EPP"
  - "Reportes" renombrado a "Reportes EPP" para distinguirlos

- `src/app/seguridad/page.tsx`
  - Importado `FileBarChart`
  - Añadido tile "Reportes semanales" (`text-cyan-600 bg-cyan-50`)
  - "Reportes" renombrado a "Reportes EPP"

- `src/app/seguridad/registros/[id]/page.tsx`
  - Botón "Editar" ya no está `disabled`; apunta a `/seguridad/registros/[id]/editar` con `<Link>`

---

## Comandos corridos

```bash
npx prisma validate                                              # OK
npx prisma db push --skip-generate                              # ✅ schema aplicado
npx prisma generate                                             # ✅ cliente regenerado
# migración SQL escrita manualmente en
# prisma/migrations/20260505120000_add_reporte_semanal_seguridad/migration.sql
npx prisma migrate resolve --applied 20260505120000_add_reporte_semanal_seguridad   # ✅
npx tsc --noEmit                                                # ✅ exit 0, sin errores
```

---

## Flujo de estados del reporte

```
borrador ──[enviar]──► enviado ──[aprobar]──► aprobado
    ▲                      │
    └──────[rechazar]───────┘
           (+ notasRevision)
```

- `seguridad` puede enviar solo sus propios reportes.
- `admin`/`gerente` pueden aprobar y rechazar; también pueden editar y borrar cualquier reporte.
- Un reporte `aprobado` no puede editarse ni eliminarse.
- Rechazado vuelve a estado `rechazado` (similar a borrador pero con motivo visible).

---

## Decisiones tomadas

1. **KPI auto vs. override.** Los KPIs que se pueden calcular automáticamente (incidentes desde registros tipo `incidente`, asistentes de charla) muestran el valor calculado pero admiten override con el ícono de lápiz. Al limpiar el override (ícono ↺) vuelven al valor calculado. Los KPIs sin fuente de cálculo (HH hombre, días sin accidentes, etc.) empiezan en `—` hasta que el ingeniero los ingresa.

2. **Auto-save con debounce 1.5s.** El editor aplica `PATCH` automáticamente 1.5s después del último cambio. Un spinner "Guardando…" aparece durante ese proceso. No hay botón "Guardar" explícito — coherente con la UX moderna.

3. **`POST /reportes-semanales` es upsert-friendly.** Si el par `(proyectoId, semanaIso)` ya existe, devuelve 200 con el existente en lugar de 409. Permite que la página `/nuevo` sea idempotente.

4. **Secciones de actividades en el editor.** Los registros se agrupan por `tipo` usando `SeccionCategoria` — acordeón colapsable. Las fotos de cada registro se muestran en grid dentro de la sección. No se duplican fotos; cada foto aparece en la sección de su registro padre.

5. **No se implementó Fase 3 (PPT).** La dependencia `pptxgenjs` no se instaló. El endpoint de exportación queda como pendiente.

6. **Renombre de "Reportes" → "Reportes EPP"** en sidebar y dashboard para evitar confusión con los nuevos "Reportes semanales".

---

## Pendientes para Fase 3 / Tareas menores

### Generación PPT (Fase 3)
- [ ] `npm install pptxgenjs`
- [ ] Servicio de armado del PPT con plantilla corporativa
- [ ] `GET /api/seguridad/reportes-semanales/[id]/exportar-pptx`
- [ ] Botón "Exportar PPT" en el editor

### Mejoras menores
- [ ] **Cron semanal**: `POST /api/cron/reporte-semanal-seguridad` (viernes) que crea borradores automáticos y notifica a ingenieros de seguridad. Entry en `vercel.json`.
- [ ] **Notificaciones in-app**: al enviar → notificar a admin/gerente; al aprobar/rechazar → notificar al ingeniero.
- [ ] **Filtro por proyecto** en el listado de reportes.
- [ ] **Paginación** en el listado (hoy `take: 100`).
- [ ] **Agregar registros desde el editor**: botón "+" en cada `SeccionCategoria` que abre el flujo de `/seguridad/registros/nuevo` pre-seleccionando la jornada de esa semana.
- [ ] **Reordenar fotos** por drag-and-drop (columna `orden` ya existe en BD).
