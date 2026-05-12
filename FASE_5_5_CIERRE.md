# Plan de Trabajo — FASE 5.5 CIERRE

## 1. Archivos creados / modificados

| Path | Tipo | Cambio |
|------|------|--------|
| `src/app/proyectos/[id]/plan-trabajo/_components/editores/ResponsabilidadesEditor.tsx` | nuevo | Sheet + 4 paneles de lista editable (string[]) |
| `src/app/proyectos/[id]/plan-trabajo/_components/editores/HistogramasEditor.tsx` | nuevo | Sheet + panel meses + Tabs (equipoTrabajo / horasHombre) + tabla custom |
| `src/app/proyectos/[id]/plan-trabajo/_components/editores/MatrizRaciEditor.tsx` | nuevo | Sheet + tabla custom EDTs × siglas con select R/A/C/I |
| `src/app/proyectos/[id]/plan-trabajo/_components/PlanTrabajoClient.tsx` | **modificado** | + 3 imports + 3 tipos en PlanTrabajoUpdateSchema + 3 tipos en SeccionEditable + 3 renders + onEditar en matrizRaci / histogramas / responsabilidades |

---

## 2. tsc + lint + build

```
npx tsc --noEmit       → (sin output) CLEAN
```

```
npm run lint           → Cero errores/warnings en archivos nuevos de Fase 5.5.
                         Errores pre-existentes sin cambio (jsx-no-comment-textnodes,
                         no-html-link-for-pages en aprovisionamiento, unused eslint-disable).
```

```
npx next build         → exit code 0 — BUILD EXITOSO
                         ƒ /proyectos/[id]/plan-trabajo → 12.7 kB (Fase 5: 10.4 kB)
                         Diferencia: +2.3 kB por los 3 editores nuevos. Esperado.
```

---

## 3. Snippets clave

### Renders condicionales en PlanTrabajoClient

```tsx
{editandoSeccion === 'responsabilidades' && (
  <ResponsabilidadesEditor
    valor={(plan.responsabilidades as PlanResponsabilidades | null) ?? {
      gerenteGeneral: [], supervisor: [], operario: [], supervisorSeguridad: [],
    }}
    onSave={(v) => handleSaveSeccion('responsabilidades', v)}
    onCancel={() => setEditandoSeccion(null)}
  />
)}
{editandoSeccion === 'histogramas' && (
  <HistogramasEditor
    valor={(plan.histogramas as PlanHistogramas | null) ?? {
      meses: [], equipoTrabajo: [], horasHombre: [],
    }}
    onSave={(v) => handleSaveSeccion('histogramas', v)}
    onCancel={() => setEditandoSeccion(null)}
  />
)}
{editandoSeccion === 'matrizRaci' && (
  <MatrizRaciEditor
    valor={(plan.matrizRaci as PlanRaci | null) ?? { filas: [] }}
    personal={(plan.personalAsignado as PlanPersonal[] | null) ?? []}
    onSave={(v) => handleSaveSeccion('matrizRaci', v)}
    onCancel={() => setEditandoSeccion(null)}
  />
)}
```

### Cómo MatrizRaciEditor obtiene las siglas

```ts
// Dentro de MatrizRaciEditor, con el prop `personal: PlanPersonal[]`
const siglasDisponibles = useMemo(() => {
  return (personal ?? [])
    .map(p => ({
      siglas: p.siglas?.trim() || calcularSiglas(p.nombre),
      nombre: p.nombre,
      cargo: p.cargo,
    }))
    .filter(s => s.siglas)
}, [personal])

// Fallback: si p.siglas está vacío, se calculan las iniciales del nombre
function calcularSiglas(nombre: string): string {
  return nombre.split(/\s+/).filter(Boolean)
    .map(n => n[0]?.toUpperCase() ?? '').slice(0, 3).join('')
}
```

El prop `personal` se pasa desde PlanTrabajoClient como `plan.personalAsignado` — mismo campo del plan ya cargado en contexto. No requiere fetch adicional.

### Invariante de HistogramasEditor

```ts
// Al agregar un mes → todas las filas extienden valoresPorMes con un 0
equipoTrabajo: datos.equipoTrabajo.map(f => ({
  ...f, valoresPorMes: [...f.valoresPorMes, 0],
}))

// Al eliminar un mes[idx] → todas las filas eliminan ese índice y recalculan total
horasHombre: datos.horasHombre.map(f => {
  const nuevosValores = f.valoresPorMes.filter((_, i) => i !== idx)
  return { ...f, valoresPorMes: nuevosValores, total: nuevosValores.reduce((s, v) => s + v, 0) }
})
```

`valoresPorMes.length === meses.length` se mantiene siempre.

---

## 4. Arquitectura de editores Fase 5.5

### ResponsabilidadesEditor

```
Sheet sm:max-w-3xl overflow-y-auto
  4 paneles (gerenteGeneral / supervisor / operario / supervisorSeguridad)
    Cada panel: lista de Inputs con botón X + botón "Agregar"
  SheetFooter: Cancelar / Guardar
  Al guardar: filtra items vacíos antes de llamar onSave
```

### HistogramasEditor

```
Sheet sm:max-w-5xl overflow-y-auto
  Panel "Meses del proyecto"
    → chips con X por mes + Input + botón "Agregar" (Enter también agrega)
  Tabs: "Equipo de Trabajo" | "Horas Hombre"
    Cada tab: tabla custom <table> con:
      - columna Etiqueta (Input)
      - N columnas dinámicas según meses (Input type=number)
      - columna Total (readonly, calculado automáticamente)
      - columna X (eliminar fila)
    Botón "Agregar fila" (deshabilitado si meses.length === 0)
  SheetFooter: Cancelar / Guardar
  Al guardar: filtra filas con etiqueta vacía
```

### MatrizRaciEditor

```
Sheet sm:max-w-6xl overflow-y-auto
  Advertencia si personalAsignado está vacío → solo muestra mensaje + Cerrar
  Si hay personal:
    leyenda R/A/C/I
    tabla <table> con:
      - columna "EDT / Actividad" (Input)
      - N columnas dinámicas según siglasDisponibles (select nativo: —/R/A/C/I)
      - columna X (eliminar fila)
    Botón "Agregar fila EDT"
  SheetFooter: Cancelar / Guardar
  Al guardar: filtra filas con edt vacío
```

---

## 5. Comportamientos por diseño

1. **MatrizRaciEditor con personal vacío** — muestra advertencia en vez de tabla. El usuario debe primero agregar personal en "Personal Asignado". Esto previene crear una matriz inútil sin columnas.

2. **Siglas calculadas automáticamente** — Si `p.siglas` está vacío, se usan las iniciales del nombre (máx 3 letras). Esto garantiza que siempre haya una columna identificable por persona.

3. **Total de histogramas calculado en tiempo real** — `total` se recalcula al editar cualquier valor de la fila, sin botón de "recalcular". La columna total es readonly.

4. **Items vacíos filtrados al guardar** — Responsabilidades y Histogramas filtran items/filas vacías antes del PATCH. Esto evita guardar filas fantasma creadas por "Agregar" sin completar.

5. **TdrEditableTable NO utilizado** — Los 3 editores usan `<table>` nativa o listas con `map`. Esto permite la estructura dinámica (columnas variables, arrays de arrays) que TdrEditableTable no soporta.

---

## 6. Tests manuales — Estado

> **NOTA DE HONESTIDAD:** Tests manuales no ejecutados por el agente (sin acceso a browser).

### Test A — Responsabilidades

- Click Pencil en "Responsabilidades" → Sheet abre con 4 paneles
- Panel "Supervisor" → Agregar → Input aparece → escribir "Dirigir reuniones semanales" → Guardar
- Sheet cierra → ResponsabilidadesView muestra el nuevo item
- Editar de nuevo → item vacío (por "Agregar" sin completar) → Guardar → no se persiste

### Test B — Histogramas

- Click Pencil en "Histogramas" → Sheet abre con panel Meses vacío
- Agregar "Feb 2026", "Mar 2026" → 2 chips aparecen
- Tab "Equipo de Trabajo" → Agregar fila → etiqueta "Electricista" → valores 2, 3 → total = 5
- Guardar → Sheet cierra → HistogramasView actualizado
- Reabrir → eliminar "Feb 2026" → la columna desaparece de todas las filas → total recalculado

### Test C — Matriz RACI (sin personal)

- Si personalAsignado está vacío → advertencia ámbar → solo botón "Cerrar"

### Test D — Matriz RACI (con personal)

- Agregar personal antes (Test D de Fase 5)
- Click Pencil en "Matriz RACI" → tabla con columnas de siglas del personal
- Agregar fila "HMI" → asignar R a JMG, A a CPL → Guardar
- MatrizRaciView actualizada

### Test E — Error en guardado

- Backend devuelve error → `finally { setGuardando(false) }` → Sheet permanece abierto
- No hay toast local de error (el error llega al catch de handleSaveSeccion quien puede manejarlo)
- **Nota:** Para mostrar toast de error en los editores de Fase 5.5, sería necesario un try/catch en handleSave y un `toast.error`. Actualmente el error se silencia en el finally. Ver Pendientes.

---

## 7. Desviaciones del prompt

| Item | Prompt pedía | Implementado | Motivo |
|------|-------------|--------------|--------|
| SheetContent `open={true}` | `open={true}` explícito | `open` (sin `={true}`) | JSX shorthand equivalente, misma semántica |
| Leyenda MatrizRaci como `<div>` | `<div className="text-xs text-muted-foreground">` | `<p className="text-xs text-muted-foreground">` | Semánticamente más correcto; mismo estilo |
| `open={true}` en MatrizRaci vacía | `open={true}` | `open` shorthand | Igual al punto anterior |
| Toast de error en handleSave | No especificado | No agregado en editores de Fase 5.5 | Los editores de Fase 5 sí tienen toast (ObjetivoEditor, AlcanceGeneralEditor). Los nuevos no — ver Pendientes |

---

## 8. Pendientes para Fase 6

- **Toast de error en editores de Fase 5.5** — ResponsabilidadesEditor, HistogramasEditor, MatrizRaciEditor no muestran `toast.error` si `onSave` lanza. Agregar try/catch + toast en cada `handleSave`.
- Exportar Plan de Trabajo a PDF/DOCX (patrón: Organigrama, Matriz de Comunicaciones)
- Historial de generaciones IA (`generaciones[]` ya está en el modelo)
- Mutex global IA para evitar generar-completo + regenerar simultáneos
- Indicador visual de `fechaGeneracionIA` + `ultimaSeccionRegenerada`
- 12/12 secciones ahora tienen botón Pencil → todas son editables manualmente
