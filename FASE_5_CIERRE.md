# Plan de Trabajo — FASE 5 CIERRE

## 1. Archivos creados / modificados

| Path | Tipo | Cambio |
|------|------|--------|
| `src/app/proyectos/[id]/plan-trabajo/_components/SeccionContainer.tsx` | **modificado** | + prop `onEditar?: () => void` + botón Pencil en header |
| `src/app/proyectos/[id]/plan-trabajo/_components/PlanTrabajoClient.tsx` | **modificado** | + imports 9 editores + type `SeccionEditable` + state `editandoSeccion` + `handleSaveSeccion` + renders condicionales de editores + `onEditar` props en 8 secciones |
| `src/app/proyectos/[id]/plan-trabajo/_components/editores/ObjetivoEditor.tsx` | nuevo | Sheet + Textarea |
| `src/app/proyectos/[id]/plan-trabajo/_components/editores/AlcanceGeneralEditor.tsx` | nuevo | Sheet + Textarea |
| `src/app/proyectos/[id]/plan-trabajo/_components/editores/AlcanceDetalladoEditor.tsx` | nuevo | Sheet + TdrEditableTable (8 columnas) |
| `src/app/proyectos/[id]/plan-trabajo/_components/editores/RestriccionesEditor.tsx` | nuevo | Sheet + TdrEditableTable (2 columnas) |
| `src/app/proyectos/[id]/plan-trabajo/_components/editores/PersonalAsignadoEditor.tsx` | nuevo | Sheet + TdrEditableTable (7 columnas) |
| `src/app/proyectos/[id]/plan-trabajo/_components/editores/ReferenciasEditor.tsx` | nuevo | Sheet + TdrEditableTable (3 columnas, origen select) |
| `src/app/proyectos/[id]/plan-trabajo/_components/editores/EppRequeridosEditor.tsx` | nuevo | Sheet + Tabs (3) + TdrEditableTable por tab |
| `src/app/proyectos/[id]/plan-trabajo/_components/editores/HerramientasEditor.tsx` | nuevo | Sheet + Tabs (3) + TdrEditableTable por tab |
| `src/app/proyectos/[id]/plan-trabajo/_components/editores/CronogramaResumenEditor.tsx` | nuevo | Sheet + TdrEditableTable (6 columnas) |

---

## 2. Respuestas pre-coding

### A — ¿TdrEditableTable existe y puede reutilizarse sin modificaciones?

**SÍ.** `src/components/tdr/TdrEditableTable.tsx` tiene la firma exacta:

```ts
interface Props<T extends object> {
  data: T[]
  columns: ColumnaTabla<T>[]
  filaVacia: () => T
  onSave: (data: T[]) => Promise<void>
  onCancel: () => void
}
```

**Comportamiento confirmado:**
- Gestiona su propio estado de filas internamente
- `onSave(filas)` es llamado cuando el usuario hace click en "Guardar cambios"
- `onCancel()` es llamado cuando el usuario hace click en "Cancelar"
- Muestra `toast.success('Cambios guardados')` internamente en save exitoso
- Muestra `toast.error(...)` internamente si `onSave` lanza
- **No cierra el editor** al guardar — solo llama `onSave`. El cierre lo maneja el padre vía `onCancel`

**Tipos soportados:** `'text' | 'number' | 'select' | 'multiselect' | 'boolean'`

**No modificado** — cero cambios al componente compartido.

### B — ¿Existen Sheet y Tabs en el proyecto?

- **Sheet** → `src/components/ui/sheet.tsx` ✅ (exporta Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription)
- **Tabs** → `src/components/ui/tabs.tsx` ✅ (exporta Tabs, TabsList, TabsTrigger, TabsContent)

### C — ¿El PATCH endpoint acepta objetivo y alcanceGeneral como strings?

**SÍ.** `src/lib/validators/planTrabajo.ts`:
```ts
planTrabajoUpdateSchema: {
  objetivo: z.string().max(20000).nullish(),
  alcanceGeneral: z.string().max(20000).nullish(),
  ...
}
planTrabajoPatchSchema = planTrabajoUpdateSchema.merge(planTrabajoPatchSeccionSchema)
```
El endpoint PATCH en `/api/proyectos/[id]/plan-trabajo` acepta todos los campos en una sola llamada.

### D — ¿Cómo se preservan servicioCotizadoRefId, edtRefId, proyectoOrgNodoRefId?

`actualizarCelda` en TdrEditableTable usa spread:
```ts
setFilas(prev => prev.map((f, i) => (i === idxFila ? { ...f, [key]: valor } : f)))
```
Las keys no listadas en `columns` (como `servicioCotizadoRefId`, `edtRefId`, `proyectoOrgNodoRefId`) NO aparecen en la tabla pero se preservan automáticamente al editar otras columnas. Solo es necesario que estén en el array `data` inicial — lo cual está garantizado porque los datos vienen del plan.

---

## 3. tsc + lint + build

```
npx tsc --noEmit       → (sin output) CLEAN
```

```
npm run lint           → Solo warnings/errors en archivos pre-existentes
                         (unused eslint-disable en seguridad/*, lib/*, aprovisionamiento/*,
                          react/jsx-no-comment-textnodes y no-html-link-for-pages pre-existentes)
                         Cero errores en archivos nuevos de Fase 5.
```

```
npx next build         → exit code 0 — BUILD EXITOSO
                         ƒ /proyectos/[id]/plan-trabajo → 10.4 kB (dinámica)
                         ƒ /api/proyectos/[id]/plan-trabajo → 1.89 kB
                         ƒ /api/proyectos/[id]/plan-trabajo/contexto → 1.89 kB
                         ƒ /api/proyectos/[id]/plan-trabajo/generar-ia → 1.89 kB
                         ƒ /api/proyectos/[id]/plan-trabajo/regenerar-seccion → 1.89 kB
```

---

## 4. Arquitectura de editores

### Patrón Textarea (Objetivo, AlcanceGeneral)

```
Sheet (open=true, onOpenChange→onCancel)
  SheetContent side="right" sm:max-w-2xl
    SheetHeader → SheetTitle
    Textarea (min-h-[400px]) — estado local `texto`
    SheetFooter
      Button "Cancelar" → onCancel()
      Button "Guardar" → handleSave() → await onSave(texto) + toast.success
```

**Nota:** El error se maneja en el catch local con `toast.error`. El éxito cierra el Sheet vía `setEditandoSeccion(null)` en `handleSaveSeccion` del padre.

### Patrón TdrEditableTable simple

```
Sheet (open=true, onOpenChange→onCancel)
  SheetContent side="right" sm:max-w-[3xl|4xl|5xl] overflow-y-auto
    SheetHeader → SheetTitle
    div.mt-4
      TdrEditableTable (data, columns, filaVacia, onSave, onCancel)
        — Save/Cancel buttons gestionados internamente por TdrEditableTable
        — onSave recibe el array actualizado → llama al padre → cierra Sheet
        — onCancel → cierra Sheet directamente
```

**Sin SheetFooter** — TdrEditableTable tiene sus propios botones.

### Patrón Tabs + TdrEditableTable (EppRequeridos, Herramientas)

```
Sheet (open=true, onOpenChange→onCancel)
  SheetContent side="right" sm:max-w-3xl overflow-y-auto
    SheetHeader → SheetTitle
    Tabs defaultValue="[primera_tab]" className="mt-4"
      TabsList → TabsTrigger ×3
      TabsContent value="[tab]" className="mt-4"
        TdrEditableTable
          onSave={async (rows) => onSave({ ...valor, [campo]: rows })}
          onCancel={onCancel}
```

**Comportamiento por tab:**
- Guardar en Tab A → PATCH con todos los sub-arrays (A actualizado + B y C del prop `valor`)
- Sheet se cierra → usuario reabre para editar Tab B
- Esto es correcto: cada "Guardar cambios" persiste el estado completo

---

## 5. Columnas por editor

| Editor | Columnas | max-w |
|--------|----------|-------|
| AlcanceDetalladoEditor | numero, nombre*, descripcion, ubicacion, Altura (bool), T.Cal. (bool), Eléct. (bool), Esp.Conf. (bool) | 5xl |
| RestriccionesEditor | texto*, categoria | 3xl |
| PersonalAsignadoEditor | nombre*, cargo*, empresa, siglas, cip, email, telefono | 5xl |
| ReferenciasEditor | titulo*, codigoDocumento, origen* (select: TDR/COTIZACION/NORMATIVA/MANUAL) | 3xl |
| EppRequeridosEditor | nombre*, norma, observaciones (×3 tabs) | 3xl |
| HerramientasEditor | nombre*, cantidad (num), unidad, observaciones (×3 tabs) | 3xl |
| CronogramaResumenEditor | fase*, edt*, actividad, fechaInicio, fechaFin, horasPlan (num) | 4xl |

(\*) = required

---

## 6. Tests manuales — Estado

> **NOTA DE HONESTIDAD:** Los tests manuales en browser no fueron ejecutados por el agente.
> Resultados esperados según el código escrito, para validar manualmente.

### Test A — Botón Pencil aparece en secciones editables

- Las 8 secciones con `onEditar` muestran ícono Pencil a la izquierda del botón ↻
- Las 3 sin `onEditar` (matrizRaci, histogramas, responsabilidades) no tienen Pencil
- El Pencil no aparece si la sección no está completa (no bloquea, pero la edición abre el editor vacío)

### Test B — Abrir y cerrar editor de Objetivo

- Click Pencil en "Objetivo del Proyecto" → Sheet lateral aparece desde la derecha
- Textarea muestra el texto actual del objetivo
- Click X o Cancelar → Sheet cierra, sin cambios
- Click fuera del Sheet → `onOpenChange(false)` → `onCancel()` → cierra

### Test C — Editar y guardar Objetivo

- Click Pencil → Sheet abre
- Modificar texto → click "Guardar"
- Spinner aparece brevemente
- Toast "Objetivo guardado"
- Sheet cierra → ObjetivoView actualizado con el nuevo texto (fetchContexto refrescó)

### Test D — Editar AlcanceDetallado (tabla)

- Click Pencil → Sheet 5xl abre con tabla de 8 columnas
- Checkboxes para los 4 riesgos
- "Agregar fila" → nueva fila vacía
- Click "Guardar cambios" → TdrEditableTable muestra "Guardando…" → "Cambios guardados"
- Sheet cierra → AlcanceDetalladoView actualizado
- servicioCotizadoRefId y edtRefId preservados (no visibles pero en los datos)

### Test E — Editar EPP (tabs)

- Click Pencil en "EPP Requeridos" → Sheet 3xl con 3 tabs
- Tab "Básico" muestra tabla de EPP básico
- Editar → "Guardar cambios" → guarda básico + bioseguridad + riesgoEspecifico actuales → Sheet cierra
- Reabrir → tab "Bioseguridad" → editar → "Guardar cambios" → guarda full EPP

### Test F — Error en guardado

- Si el backend devuelve error (503, validación fallida):
  - Para editores Textarea: `toast.error(mensaje)` en el catch del editor, Sheet permanece abierto
  - Para TdrEditableTable: `toast.error(mensaje)` interno, tabla permanece editable

---

## 7. Detalles de implementación

### SeccionContainer — cambios mínimos

```tsx
// Header modificado: de solo BotonRegenerarSeccion a div con Pencil + BotonRegenerarSeccion
<div className="flex items-center gap-1">
  {onEditar && (
    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onEditar} title="Editar esta sección">
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  )}
  {iaHabilitada && <BotonRegenerarSeccion ... />}
</div>
```

### handleSaveSeccion — función única para todos los editores

```ts
const handleSaveSeccion = async (seccion: SeccionEditable, valor: unknown) => {
  const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [seccion]: valor }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error ?? `HTTP ${res.status}`)
  }
  await fetchContexto()
  setEditandoSeccion(null)  // cierra el Sheet
}
```

### Secciones sin editor (por diseño)

| Sección | Motivo |
|---------|--------|
| matrizRaci | Estructura compleja (RACI por EDT × rol); mejor generada solo con IA |
| histogramas | Calculado automáticamente de cronograma; no tiene sentido editar manualmente |
| responsabilidades | Arrays de strings por rol; la IA lo gestiona bien; edición manual es rara |

---

## 8. Para Fase 6

- Exportar el Plan de Trabajo a PDF/DOCX (patrón establecido en Matriz de Comunicaciones y Organigrama)
- Editor inline para secciones RACI, Histogramas, Responsabilidades (fuera del alcance de Fase 5)
- Historial de generaciones (`generaciones: PlanTrabajoGeneracion[]` ya está en el modelo)
- Mutex de operación IA global para prevenir generar-completo + regenerar simultáneos
- Indicador visual de `fechaGeneracionIA` + `ultimaSeccionRegenerada` en el header
