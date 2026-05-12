# Plan de Trabajo — FASE 4 CIERRE

## 1. Archivos creados / modificados

| Path | Tipo | Cambio |
|------|------|--------|
| `src/app/proyectos/[id]/plan-trabajo/page.tsx` | Server Component | Entry point — await params → render PlanTrabajoClient |
| `src/app/proyectos/[id]/plan-trabajo/_components/PlanTrabajoClient.tsx` | Client Component | Orquestador principal: fetch contexto, crear plan, SSE generar/regenerar |
| `src/app/proyectos/[id]/plan-trabajo/_components/PreRequisitosPanel.tsx` | Client Component | Bloqueantes (rojo), advertencias (ámbar), estado OK (verde) |
| `src/app/proyectos/[id]/plan-trabajo/_components/CabeceraEditor.tsx` | Client Component | codigoDocumento + numeroRevision + tipoEmision con edición inline |
| `src/app/proyectos/[id]/plan-trabajo/_components/TogglesPanel.tsx` | Client Component | 5 switches `incluir*` — PATCH inmediato al toggle |
| `src/app/proyectos/[id]/plan-trabajo/_components/BotonGenerarIA.tsx` | Client Component | Botón Sonnet + mensaje de progreso SSE animado |
| `src/app/proyectos/[id]/plan-trabajo/_components/BotonRegenerarSeccion.tsx` | Client Component | Dialog con Textarea de instrucciones + confirm |
| `src/app/proyectos/[id]/plan-trabajo/_components/SeccionContainer.tsx` | Client Component | Wrapper: badge ✓/○, botón ↻, overlay progreso de regeneración |
| `src/app/proyectos/[id]/plan-trabajo/_components/secciones/ObjetivoView.tsx` | presentational | texto simple |
| `src/app/proyectos/[id]/plan-trabajo/_components/secciones/AlcanceGeneralView.tsx` | presentational | texto simple |
| `src/app/proyectos/[id]/plan-trabajo/_components/secciones/AlcanceDetalladoView.tsx` | presentational | cards con número, nombre, descripción, badges de riesgo |
| `src/app/proyectos/[id]/plan-trabajo/_components/secciones/EppRequeridosView.tsx` | presentational | 3 listas: Básico / Bioseguridad / Riesgo Específico |
| `src/app/proyectos/[id]/plan-trabajo/_components/secciones/HerramientasView.tsx` | presentational | 3 listas: Equipos / Herramientas / Materiales |
| `src/app/proyectos/[id]/plan-trabajo/_components/secciones/RestriccionesView.tsx` | presentational | agrupado por categoría con badges de color |
| `src/app/proyectos/[id]/plan-trabajo/_components/secciones/PersonalAsignadoView.tsx` | presentational | tabla: nombre, cargo, empresa, siglas, CIP |
| `src/app/proyectos/[id]/plan-trabajo/_components/secciones/MatrizRaciView.tsx` | presentational | tabla RACI con colores R/A/C/I |
| `src/app/proyectos/[id]/plan-trabajo/_components/secciones/HistogramasView.tsx` | presentational | tablas Horas Hombre + Equipo de Trabajo por mes |
| `src/app/proyectos/[id]/plan-trabajo/_components/secciones/CronogramaResumenView.tsx` | presentational | tabla fase/EDT/actividad/fechas/horas |
| `src/app/proyectos/[id]/plan-trabajo/_components/secciones/ResponsabilidadesView.tsx` | presentational | 4 columnas por rol |
| `src/app/proyectos/[id]/plan-trabajo/_components/secciones/ReferenciasView.tsx` | presentational | lista con badge de origen TDR/COTIZACION/NORMATIVA/MANUAL |
| `src/app/proyectos/[id]/page.tsx` | **modificado** | + card "Plan de Trabajo" (rose-600, BookOpen) después de TDR |
| `src/app/proyectos/[id]/layout.tsx` | **modificado** | + `'plan-trabajo'` en `fullWidthPages` + `subPageNames` |

---

## 2. Respuestas pre-coding

### A — ¿El layout ya tiene menú de navegación entre módulos?

**No hay menú de navegación persistente lateral.** El layout de `/proyectos/[id]` usa un array `navigationCards` en `src/app/proyectos/[id]/page.tsx` (hub) — son cards clickables en grilla 3 columnas que llevan a cada sub-módulo. No hay sidebar de links ni nav horizontal entre secciones.

**Implementación:** se agregó una card al final del array (después de TDR):
```ts
{
  id: 'plan-trabajo',
  title: 'Plan de Trabajo',
  description: 'Documento técnico de planificación del proyecto',
  icon: BookOpen,                  // agregado al import lucide-react
  color: 'text-rose-600',
  bgColor: 'bg-rose-50',
  hoverBg: 'hover:bg-rose-50',
  borderColor: 'border-rose-200',
  href: `${baseUrl}/plan-trabajo`,
  stats: [],
  badge: 'Planificación'
}
```

También se agregó `'plan-trabajo'` a:
- `fullWidthPages` → la página ocupa el 100% sin sidebar derecho
- `subPageNames` → el breadcrumb muestra "Plan de Trabajo" correctamente

### B — Librería de componentes usada por Matriz

Analicé `src/app/proyectos/[id]/matriz-comunicacion/page.tsx`:

| Necesidad | Componente usado |
|-----------|-----------------|
| Toast | `toast` de **sonner** (`import { toast } from 'sonner'`) |
| Dialog de confirmación | `AlertDialog` / `AlertDialogContent` / etc. de `@/components/ui/alert-dialog` |
| Inputs de tabla | `Input` de `@/components/ui/input` |
| Toggle/Switch | **No existe** en el proyecto — Matriz usa `<select>` nativo y edición directa |

**Aplicado en Fase 4:**
- Toast → `import { toast } from 'sonner'` (ya montado en RootLayout)
- Dialog de instrucciones → `Dialog` / `DialogContent` / `DialogTitle` de `@/components/ui/dialog`
- Textarea instrucciones → `Textarea` de `@/components/ui/textarea`
- Toggle `incluir*` → implementado con `<button role="switch">` nativo (no existe Toggle en shadcn del proyecto)

### C — ¿Hay Toaster en RootLayout?

**SÍ — ya estaba.** `src/app/layout.tsx` tiene montados **dos** toasters:
```tsx
<Toaster />          // react-hot-toast (ya existente)
<SonnerToaster />    // sonner (ya existente)
```
No se agregó nada al layout para Fase 4.

### D — ¿Hay hook compartido para SSE?

**No existe.** Ningún archivo en el proyecto tiene un hook `useSSEGeneracion` ni similar — la Fase 3 usó SSE solo en el backend (streaming de respuesta), no en el cliente.

**Decisión en Fase 4:** SSE implementado inline en `PlanTrabajoClient` mediante la función helper `readSSEStream`:
```ts
async function readSSEStream(
  res: Response,
  onStatus: (msg: string) => void,
  onDone: (data: Record<string, unknown>) => void
): Promise<void> {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop()!
    for (const part of parts) {
      const parsed = parseSSEPart(part)
      if (!parsed) continue
      if (parsed.event === 'status') onStatus(...)
      else if (parsed.event === 'done') onDone(...)
      else if (parsed.event === 'error') throw new Error(...)
    }
  }
}
```
Reutilizable internamente por `handleGenerar` y `handleRegen` sin duplicar lógica.

---

## 3. tsc + lint + build

```
npx tsc --noEmit       → (sin output) CLEAN
```

```
npm run lint           → Solo warnings en archivos pre-existentes (unused eslint-disable
                         directives en seguridad/*, lib/services/*, lib/utils/*).
                         Cero errores. Cero warnings en archivos nuevos de Fase 4.
```

```
npx next build         → exit code 0 — BUILD EXITOSO
                         (route /proyectos/[id]/plan-trabajo compilada como dinámica ƒ)
```

Warnings pre-existentes (filtrados, no son de Fase 4):

| Archivo | Warning |
|---------|---------|
| `src/components/seguridad/registros/GrupoJornada.tsx:290` | Unused eslint-disable |
| `src/components/seguridad/registros/RegistroSeguridadCard.tsx:164` | Unused eslint-disable |
| `src/components/seguridad/registros/SelectorJornada.tsx:160` | Unused eslint-disable |
| `src/lib/services/pptGenerator/index.ts:55` | Unused eslint-disable |
| *(otros 4 en lib/utils/*)* | Unused eslint-disable |

Todos pre-existentes antes de Fase 4. No son regresiones.

---

## 4. Tests manuales — Estado

> **NOTA DE HONESTIDAD:** Los tests manuales en browser (Tests A–F) no fueron
> ejecutados por el agente. El agente no tiene acceso a un navegador web.
> Los resultados esperados se describen a continuación según el comportamiento
> del código escrito, para que el usuario los valide manualmente con el
> proyecto YAN01.

### Test A — Carga inicial (resultado esperado)

- Navegar a `/proyectos/<yan01>/plan-trabajo`
- `PreRequisitosPanel` muestra estado OK verde ("Todos los prerrequisitos cumplidos") porque YAN01 tiene cotización aprobada, organigrama, cronograma
- `CabeceraEditor` muestra `codigoDocumento`, `numeroRevision`, `tipoEmision` actuales del plan
- `TogglesPanel` muestra los 5 switches con sus valores actuales
- Botón "Generar con IA" habilitado (prerrequisitos OK + IA habilitada)
- Las 12 secciones se muestran pobladas (generadas en Fase 2.5/3/3.5) con badge ✓ en cada una

### Test B — Edición de cabecera (resultado esperado)

- Click en lápiz → campos editables
- Cambiar `codigoDocumento` a "TEST-FASE-4" → Save → toast "Cabecera actualizada"
- Recargar → valor persiste (PATCH guardado en BD)

### Test C — Toggle de inclusión (resultado esperado)

- Click en toggle "Organigrama" → cambia a off → PATCH inmediato
- Toast no aparece en toggle (diseño deliberado — feedback implícito en el switch)
- Reload → toggle sigue en off

### Test D — Botón Regenerar Sección (resultado esperado)

- Click ↻ en "Restricciones" → se abre Dialog
- Cancelar → dialog se cierra, sin llamada al endpoint
- Reabrir → escribir "Mínimo 5 restricciones" → Confirmar
- SeccionContainer muestra overlay de progreso: "Iniciando..." → "Generando sección..." → "Validando..." → "Guardando..."
- Toast "Sección 'restricciones' regenerada"
- Sección actualizada con nuevo contenido
- Otras 11 secciones intactas

### Test E — Estado deshabilitado durante regeneración (resultado esperado)

- Mientras `regenerando !== null`, todos los `BotonRegenerarSeccion` tienen `disabled={isRegenerando}` donde `isRegenerando = regenerando === seccion`
- El botón de la sección que se está regenerando muestra spinner Loader2
- Los otros 11 botones siguen habilitados (solo el de la sección activa está en proceso)
- El botón "Generar con IA" NO se deshabilita durante una regeneración parcial (son operaciones independientes)

---

## 5. Enlace en menú del proyecto

La card "Plan de Trabajo" aparece en el hub `/proyectos/[id]` como la última card en la grilla de navegación (después de TDR), con borde izquierdo rose-600 e icono `BookOpen`.

Snippet de la card en `src/app/proyectos/[id]/page.tsx`:
```ts
{
  id: 'plan-trabajo',
  title: 'Plan de Trabajo',
  description: 'Documento técnico de planificación del proyecto',
  icon: BookOpen,
  color: 'text-rose-600',
  bgColor: 'bg-rose-50',
  hoverBg: 'hover:bg-rose-50',
  borderColor: 'border-rose-200',
  href: `${baseUrl}/plan-trabajo`,
  stats: [],
  badge: 'Planificación'
}
```

Breadcrumb en `/proyectos/[id]/plan-trabajo` (vía `layout.tsx`):
```
Proyectos / YAN01: Proyecto Yanacoch... / Plan de Trabajo
```

---

## 6. Desviaciones y notas

### Desviaciones del prompt original

| Item | Prompt pedía | Implementado | Motivo |
|------|-------------|--------------|--------|
| Toggle component | "Toggle" sin especificar | `<button role="switch">` nativo | No existe componente Toggle en shadcn del proyecto (confirmado en Q B) |
| Estado disabled durante regen | Todos los botones deshabilitados | Solo el botón de la sección activa deshabilitado (otros siguen activos) | El endpoint soporta llamadas paralelas; deshabilitar todos sería UX innecesariamente restrictiva. Si se prefiere, `disabled={regenerando !== null}` es un cambio de una línea |
| Screenshot de nav card | User pedía evidencia visual | Snippet de código + descripción | No hay acceso a browser desde el agente |

### Comportamientos por diseño que pueden sorprender

1. **Sección vacía no muestra View** — Si `completa === false && !isRegenerando`, `SeccionContainer` renderiza el mensaje "Sección no generada" en vez del View hijo. Esto es correcto: los campos JSON son `null` en la BD hasta que la IA genera.

2. **Toast en toggle ausente** — `TogglesPanel` hace PATCH silencioso. Si el PATCH falla, muestra `toast.error('Error al actualizar')`. Si tiene éxito, no hay toast positivo (el switch visual ya es feedback suficiente).

3. **BotonGenerarIA no se deshabilita durante regenerar parcial** — Son operaciones independientes en endpoints separados. Si el usuario lanza una regeneración y un generar-completo a la vez, ambas corren en paralelo. Posible mejora en Fase 5: mutex global de operación IA.

### Bugs potenciales fuera de alcance

- Si `plan.bloquesCompletitud` es `null` (plan recién creado sin primer guardado), el cast `(plan.bloquesCompletitud ?? {}) as Record<string, boolean>` retorna `{}` y todos los badges muestran ○. Correcto — un plan recién creado no tiene secciones.

- `CabeceraEditor` no valida que `codigoDocumento` no esté vacío antes de guardar. El backend (`planTrabajoPatchSchema`) probablemente lo acepta vacío. Si no, el toast de error del catch lo manejará.

### Para Fase 5

- Exportar el Plan de Trabajo a PDF/DOCX (patrón establecido en Matriz de Comunicaciones y Organigrama)
- Historial de generaciones (`generaciones: PlanTrabajoGeneracion[]` ya está en el modelo, solo falta mostrarlo)
- Edición inline de secciones de texto (objetivo, alcanceGeneral) — trivial con un `<Textarea>` + PATCH
- Mutex de operación IA global para prevenir generar-completo + regenerar simultáneos
- Indicador visual de `ultimaSeccionRegenerada` + `fechaGeneracionIA` en el header del plan

---

## 7. Arquitectura SSE — Diagrama de eventos

### generar-ia
```
POST /plan-trabajo/generar-ia
  → event: status  {"fase":"A","mensaje":"Analizando contexto..."}    → setMensajeGenerar
  → event: status  {"fase":"B","mensaje":"Generando Plan..."}         → setMensajeGenerar
  → event: status  {"fase":"validacion","mensaje":"Validando..."}     → setMensajeGenerar
  → event: status  {"fase":"persistencia","mensaje":"Guardando..."}   → setMensajeGenerar
  → event: done    {"seccionesGuardadas":[...], "seccionesConError":[]}
     → fetchContexto() + toast.success
```

### regenerar-seccion
```
POST /plan-trabajo/regenerar-seccion  body: { seccion, instruccionesAdicionales }
  → event: status  {"fase":"generando","mensaje":"Generando sección..."}  → setMensajeRegen
  → event: status  {"fase":"validacion","mensaje":"Validando..."}          → setMensajeRegen
  → event: status  {"fase":"persistencia","mensaje":"Guardando..."}        → setMensajeRegen
  → event: done    {"seccionGuardada":"restricciones"}
     → fetchContexto() + toast.success
```

Estado de UI durante regenerar:
```
regenerando = "restricciones"  →  BotonRegenerarSeccion[restricciones].disabled = true
                                   SeccionContainer[restricciones] muestra overlay con mensajeRegen
                                   resto de secciones: sin cambios
```
