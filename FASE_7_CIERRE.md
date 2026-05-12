# Plan de Trabajo — FASE 7 CIERRE

## 1. Archivos creados / modificados

| Path | Tipo | Cambio |
|------|------|--------|
| `src/lib/planTrabajo/getOrCreatePlanTrabajoFolder.ts` | nuevo | Busca carpeta en Drive antes de crear; evita duplicados |
| `src/lib/planTrabajo/snapshotHelpers.ts` | nuevo | `getSnapshotPlan` + `getSnapshotPng` con soporte legacy |
| `src/app/api/proyectos/[id]/plan-trabajo/exportar-docx/route.ts` | **modificado** | Usa `getOrCreatePlanTrabajoFolder`; `snapshotData: { plan, organigramaPngBase64 }` |
| `src/app/api/proyectos/[id]/plan-trabajo/generaciones/route.ts` | nuevo | GET — lista de generaciones (sin snapshotData) |
| `src/app/api/proyectos/[id]/plan-trabajo/generaciones/[generacionId]/route.ts` | nuevo | GET — detalle + snapshotPlan extraído |
| `src/app/api/proyectos/[id]/plan-trabajo/generaciones/[generacionId]/descargar/route.ts` | nuevo | GET — proxy a Drive vía getFileContent |
| `src/app/api/proyectos/[id]/plan-trabajo/generaciones/[generacionId]/regenerar/route.ts` | nuevo | POST — regenera DOCX desde snapshot sin Drive |
| `src/app/proyectos/[id]/plan-trabajo/_components/DetalleGeneracion.tsx` | nuevo | Sheet con 12 View sections del snapshotPlan |
| `src/app/proyectos/[id]/plan-trabajo/_components/HistorialGeneraciones.tsx` | nuevo | Sheet con lista + acciones (descargar/regenerar/ver/Drive) |
| `src/app/proyectos/[id]/plan-trabajo/_components/PlanTrabajoClient.tsx` | **modificado** | + import HistorialGeneraciones + render en toolbar |

---

## 2. Paso 0 — getOrCreatePlanTrabajoFolder

Usa `listFiles({ folderId, query: folderName, pageSize: 20 })` (exportado de googleDrive.ts) para buscar carpeta por nombre exacto. Filtra con `.find(f => f.name === folderName && f.mimeType === FOLDER_MIME)`. Si existe retorna su id; si no, llama `createFolder`.

El endpoint `exportar-docx` ya no usa `createFolder` directamente — lo delega a `getOrCreatePlanTrabajoFolder`.

---

## 3. Paso 1 — snapshotData V1 + helpers

**Formato nuevo** almacenado en `PlanTrabajoGeneracion.snapshotData`:
```json
{
  "plan": { /* PlanTrabajo completo de Prisma */ },
  "organigramaPngBase64": "data:image/png;base64,..."
}
```

**Legacy (Fase 6):** el campo era el `dataBag` procesado (llaves como `eppBasico`, `raciFlat`, etc.). Los helpers detectan el formato:
```ts
function isSnapshotV1(s): s is SnapshotV1 {
  return typeof s === 'object' && s !== null && 'plan' in s && 'organigramaPngBase64' in s
}
```
- `getSnapshotPlan(snapshotData)` → `PlanTrabajo | null` (null si legacy)
- `getSnapshotPng(snapshotData)` → `string` ('' si legacy)

---

## 4. Endpoints API

### GET /api/proyectos/[id]/plan-trabajo/generaciones
- Requiere sesión.
- Verifica que el plan existe para el proyecto.
- Devuelve `{ data: Generacion[] }` — sin `snapshotData` (optimización de payload).
- Ordenado por `generadoEn desc`.

### GET /api/proyectos/[id]/plan-trabajo/generaciones/[generacionId]
- Devuelve detalle con `snapshotPlan` extraído (o `null` si legacy).
- Valida que la generación pertenece al proyecto (cross-check `planTrabajoId`).

### GET /api/proyectos/[id]/plan-trabajo/generaciones/[generacionId]/descargar
- Proxy a Drive vía `getFileContent(driveFileId)`.
- Devuelve buffer con `Content-Disposition: attachment`.
- HTTP 502 si Drive falla.

### POST /api/proyectos/[id]/plan-trabajo/generaciones/[generacionId]/regenerar
- Extrae `snapshotPlan` + `snapshotPng` del snapshot guardado.
- HTTP 400 si snapshotPlan es null (legacy sin soporte).
- Carga proyecto fresco desde DB (para tener datos actuales de cliente/codigo).
- Construye dataBag con `construirDataBag(snapshotPlan, proyecto, snapshotPng)`.
- Renderiza DOCX con `renderizarPlanTrabajoDocx`.
- **NO** sube a Drive, **NO** crea nuevo registro `PlanTrabajoGeneracion`.
- `maxDuration: 120`.

---

## 5. UI

### HistorialGeneraciones.tsx
- Botón "Historial (n)" con icono `History`.
- Carga la lista al abrir el Sheet (con `useEffect([open])`).
- Por cada generación: nombre, fecha, usuario, tamaño.
- Acciones:
  - Botón "Ver" → abre `DetalleGeneracion` (Sheet anidado con `z-[60]`)
  - Botón ExternalLink → `webViewLink` en nueva pestaña
  - DropdownMenu Download:
    - "Copia exacta de Drive" → GET /descargar → blob download
    - "Regenerar desde snapshot" → POST /regenerar → blob download

### DetalleGeneracion.tsx
- Sheet `sm:max-w-2xl` con `z-[60]` para apilarse sobre HistorialGeneraciones (z-50).
- Fetch `GET /generaciones/[id]` al abrir.
- Si `snapshotPlan === null` → mensaje "versión anterior sin datos disponibles".
- Si `snapshotPlan !== null` → renderiza 12 `Section` con cada View component.
- `Section` helper: título + `border-b` + children.

---

## 6. Toolbar actualizado

```tsx
<div className="flex items-center gap-2">
  <BotonGenerarIA ... />
  <BotonExportarDocx proyectoId={proyectoId} orgNodos={contexto.organigrama} disabled={generando} />
  <HistorialGeneraciones proyectoId={proyectoId} />
</div>
```

---

## 7. tsc + build

```
npx tsc --noEmit       → CLEAN (sin output)
npx next build         → exit code 0 — BUILD EXITOSO
  ƒ /api/proyectos/[id]/plan-trabajo/generaciones              → 1.9 kB
  ƒ /api/proyectos/[id]/plan-trabajo/generaciones/[id]        → 1.9 kB
  ƒ /api/proyectos/[id]/plan-trabajo/generaciones/[id]/descargar  → 1.9 kB
  ƒ /api/proyectos/[id]/plan-trabajo/generaciones/[id]/regenerar  → 1.9 kB
  ƒ /proyectos/[id]/plan-trabajo                              → 15.8 kB  (era 14.5 kB)
```

---

## 8. Test E2E manual — Checklist

> Ejecutar con YAN01 en producción/staging una vez deployado.

### Pre-condición
- [ ] Fase 6 deployada y verificada (exportar-docx funciona)
- [ ] Al menos 1 PlanTrabajoGeneracion existente en DB

### Test A — Historial básico
- [ ] Abrir `/proyectos/<yan01>/plan-trabajo`
- [ ] Botón "Historial" visible en toolbar
- [ ] Click → Sheet abre, lista las generaciones (con fecha, tamaño, usuario)

### Test B — Descargar copia exacta
- [ ] DropdownMenu → "Copia exacta de Drive"
- [ ] Descarga el archivo del Drive (mismo binario que se subió)
- [ ] Si Drive falla → toast.error con mensaje

### Test C — Regenerar desde snapshot
- [ ] DropdownMenu → "Regenerar desde snapshot"
- [ ] ~3-5s → descarga `PT_YAN01_RevA.docx`
- [ ] Toast: "DOCX regenerado desde snapshot"
- [ ] Abrir el DOCX: contenido coincide con el snapshot (datos del momento de generación, no los actuales si cambiaron)

### Test D — Ver detalles
- [ ] Click "Ver" en una generación
- [ ] DetalleGeneracion Sheet abre sobre el HistorialGeneraciones Sheet
- [ ] 12 secciones visibles con datos del snapshotPlan
- [ ] Si generación legacy (Fase 6): mensaje "versión anterior sin datos"

### Test E — Nueva exportación actualiza contador
- [ ] Exportar DOCX → se crea nueva generación
- [ ] Cerrar y reabrir Historial → nueva entrada aparece

### Test F — getOrCreatePlanTrabajoFolder (sin duplicados)
- [ ] Exportar DOCX 2 veces para el mismo proyecto
- [ ] Verificar en Drive que hay 1 sola carpeta `PlanTrabajo_YAN01` con 2 archivos

---

## 9. Pendientes para Fase 8

- **Mutex global IA** — prevenir generar-completo + regenerar simultáneos (referenciado en Fase 6 como pendiente Fase 7, movido aquí)
- **`incluirOrganigrama` toggle** — si `plan.incluirOrganigrama === false`, no enviar imagen
- **Endpoint GET /generaciones contador** — para que el botón "Historial (n)" muestre el count correcto desde el inicio (sin abrir el Sheet primero)
- **Paginación de generaciones** — si hay muchas versiones, paginar la lista
