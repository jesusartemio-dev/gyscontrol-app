# Plan de Trabajo — FASE 8 CIERRE (FINAL)

## 1. Archivos creados / modificados

| Path | Tipo | Cambio |
|------|------|--------|
| `prisma/schema.prisma` | **modificado** | + `operacionIAEnCurso String?` + `operacionIAIniciadaEn DateTime?` en model PlanTrabajo |
| `prisma/migrations/20260510_add_mutex_ia_plan_trabajo/migration.sql` | nuevo | ALTER TABLE plan_trabajo ADD COLUMN operacionIAEnCurso, operacionIAIniciadaEn |
| `src/lib/planTrabajo/mutex.ts` | nuevo | `adquirirLockIA` + `liberarLockIA` con updateMany atómico + TTL 10min |
| `src/lib/planTrabajo/validarParaExportar.ts` | nuevo | Errores (cliente, codigo, revision, preparadoPor) + Advertencias (objetivo, alcance, personal) |
| `src/lib/planTrabajo/cargarContexto.ts` | **modificado** | + `clienteCargado` en prerrequisitos; bloqueante si null |
| `src/types/planTrabajo.ts` | **modificado** | + `clienteCargado: boolean` en PlanPrerrequisitos |
| `src/app/api/proyectos/[id]/plan-trabajo/generar-ia/route.ts` | **modificado** | + mutex antes del SSE; liberarLockIA en finally |
| `src/app/api/proyectos/[id]/plan-trabajo/regenerar-seccion/route.ts` | **modificado** | + mutex antes del SSE; liberarLockIA en finally |
| `src/app/api/proyectos/[id]/plan-trabajo/exportar-docx/route.ts` | **modificado** | + validarParaExportar (422); + pngParaDocx respeta toggle incluirOrganigrama |
| `src/lib/planTrabajo/exportDocx.ts` | **modificado** | getImage/getSize manejan string vacío → PNG 1×1 transparente (Opción A) |
| `src/app/proyectos/[id]/plan-trabajo/_components/BotonExportarDocx.tsx` | **modificado** | + prop incluirOrganigrama; no genera PNG si off; maneja 422 con toast.error detallado |
| `src/app/proyectos/[id]/plan-trabajo/_components/BotonGenerarIA.tsx` | **modificado** | + prop iaOcupada; disabled si iaOcupada |
| `src/app/proyectos/[id]/plan-trabajo/_components/BotonRegenerarSeccion.tsx` | **modificado** | + prop iaOcupada; disabled si iaOcupada |
| `src/app/proyectos/[id]/plan-trabajo/_components/SeccionContainer.tsx` | **modificado** | + prop iaOcupada; lo pasa a BotonRegenerarSeccion |
| `src/app/proyectos/[id]/plan-trabajo/_components/PlanTrabajoClient.tsx` | **modificado** | + iaOcupada compute; banner ámbar; pasa iaOcupada/incluirOrganigrama a hijos |

---

## 2. Migración Prisma — mutex

**Workaround aplicado** (shadow DB lockeada por error `P3006` de migración anterior rota):

```bash
# 1. Generar SQL
npx prisma migrate diff --from-schema-datasource --to-schema-datamodel --script
# Output: ALTER TABLE "plan_trabajo" ADD COLUMN "operacionIAEnCurso" TEXT, ADD COLUMN "operacionIAIniciadaEn" TIMESTAMP(3);

# 2. Ejecutar directamente
echo "ALTER TABLE..." | npx prisma db execute --stdin --schema prisma/schema.prisma

# 3. Registrar en historial de migraciones
mkdir prisma/migrations/20260510_add_mutex_ia_plan_trabajo
# + migration.sql creado
npx prisma migrate resolve --applied 20260510_add_mutex_ia_plan_trabajo
```

`prisma generate` no se pudo ejecutar (DLL lockeada por dev server). Los tipos Prisma se actualizarán en el próximo build/reinicio del server. El código fue escrito con cast manual hasta entonces.

---

## 3. Paso 1 — Mutex global IA

### Diseño

```ts
// adquirirLockIA: updateMany atómico
prisma.planTrabajo.updateMany({
  where: {
    id: planTrabajoId,
    OR: [
      { operacionIAEnCurso: null },
      { operacionIAIniciadaEn: { lt: expiracion } }, // TTL 10min
    ],
  },
  data: { operacionIAEnCurso: operacion, operacionIAIniciadaEn: ahora },
})
// result.count > 0 → lock adquirido
// result.count === 0 → lock ocupado por otra op
```

### Flujo en SSE endpoints

```ts
// ANTES del stream
const planId = contexto.planTrabajo.id
const lock = await adquirirLockIA(planId, 'generar')
if (!lock.ok) return Response.json({ error: "..." }, { status: 409 })

const stream = new ReadableStream({
  async start(controller) {
    try {
      // ... lógica
    } finally {
      await liberarLockIA(planId)  // siempre libera, incluso en error
      controller.close()
    }
  },
})
return new Response(stream, ...)
```

### UI

- `iaOcupada = !!plan.operacionIAEnCurso` (campo leído de `contexto.planTrabajo`)
- Banner ámbar visible: `"Operación IA en curso: generar · iniciada hace X min"`
- Todos los botones de IA deshabilitados mientras `iaOcupada`

---

## 4. Paso 2 — Validación pre-export

**Errores (HTTP 422 — bloquean):**
- Proyecto sin cliente asignado
- Código del documento vacío
- Número de revisión vacío
- "Preparado por" vacío

**Advertencias (no bloquean — informativas en el 422):**
- Objetivo muy corto (<50 chars)
- Alcance general muy corto
- Sin personal asignado
- Falta "Revisado por" / "Aprobado por"

**UI:** Toast con `toast.error` + description con los errores restantes, duración 8s.

---

## 5. Paso 3 — Toggle incluirOrganigrama

**Decisión: Opción A** (imagen 1×1 transparente como placeholder).

- En `exportDocx.ts`: `getImage` retorna `PNG_1X1` si tagValue es string vacío o buffer vacío; `getSize` retorna `[1, 1]` para imágenes vacías.
- En `exportar-docx/route.ts`: si `planDb.incluirOrganigrama === false`, se pasa `''` a `construirDataBag` independientemente de lo que envió el cliente.
- En `BotonExportarDocx`: si `incluirOrganigrama === false`, no genera PNG (ahorra ~200ms).

Resultado en DOCX: sección "Organigrama" muestra un punto invisible de 1×1px. No requiere modificar la plantilla.

---

## 6. Paso 4 — Proyecto sin cliente

`clienteCargado = proyecto.cliente !== null` agregado a prerrequisitos.

- Bloqueante: aparece en `bloqueantesFaltantes` → se muestra en `PreRequisitosPanel` con ícono rojo.
- También bloquea el export vía `validarParaExportar` (error "El proyecto no tiene cliente asignado.").
- La validación es redundante pero correcta: bloquea tanto en el panel previo como en el intento de exportar.

---

## 7. tsc + build

```
npx tsc --noEmit  → CLEAN (sin output)

npx next build    → exit code 0
  ƒ /api/proyectos/[id]/plan-trabajo/generar-ia         → 1.9 kB
  ƒ /api/proyectos/[id]/plan-trabajo/regenerar-seccion  → 1.9 kB
  ƒ /api/proyectos/[id]/plan-trabajo/exportar-docx      → 1.9 kB
  ƒ /proyectos/[id]/plan-trabajo                        → 16.2 kB  (era 15.8 kB)
```

---

## 8. Smoke test final — Checklist

> Tests manuales; ejecutar con proyecto YAN01 en producción/staging.

| # | Test | Estado |
|---|------|--------|
| 1 | Generar con IA — completa correctamente | Pendiente (sin browser) |
| 2 | Editar sección manualmente — guarda | Pendiente |
| 3 | Regenerar sección con IA — funciona | Pendiente |
| 4 | Exportar DOCX con organigrama ON — incluye imagen | Pendiente |
| 5 | Exportar DOCX con organigrama OFF — exporta sin error | Pendiente |
| 6 | Ver historial — lista generaciones | Pendiente |
| 7 | Descargar copia exacta — descarga | Pendiente |
| 8 | Regenerar desde snapshot — funciona | Pendiente |
| 9 | Click "Generar IA" dos veces rápido — segundo devuelve 409 | Pendiente |
| 10 | Quitar cliente y exportar — toast "No tiene cliente asignado" | Pendiente |

---

## 9. Resumen general del módulo Plan de Trabajo (Fases 1-8)

### Archivos del módulo

| Categoría | Archivos | LOC aprox. |
|-----------|---------|------------|
| API Routes (endpoints) | 12 | ~1.100 |
| Lib helpers | 12 | ~900 |
| UI Components | 22 | ~2.200 |
| Types | 1 | ~380 |
| Scripts/Tests | 1 | ~45 |
| Prisma (schema + migrations) | 2 | ~60 |
| **Total** | **50** | **~4.685** |

### Endpoints

| Método | Path |
|--------|------|
| POST | `/api/proyectos/[id]/plan-trabajo` |
| GET | `/api/proyectos/[id]/plan-trabajo` |
| PATCH | `/api/proyectos/[id]/plan-trabajo` |
| GET | `/api/proyectos/[id]/plan-trabajo/contexto` |
| POST | `/api/proyectos/[id]/plan-trabajo/generar-ia` (SSE) |
| POST | `/api/proyectos/[id]/plan-trabajo/regenerar-seccion` (SSE) |
| POST | `/api/proyectos/[id]/plan-trabajo/exportar-docx` |
| GET | `/api/proyectos/[id]/plan-trabajo/generaciones` |
| GET | `/api/proyectos/[id]/plan-trabajo/generaciones/[generacionId]` |
| GET | `/api/proyectos/[id]/plan-trabajo/generaciones/[generacionId]/descargar` |
| POST | `/api/proyectos/[id]/plan-trabajo/generaciones/[generacionId]/regenerar` |

### Componentes UI principales

CabeceraEditor, TogglesPanel, PreRequisitosPanel, SeccionContainer, BotonGenerarIA, BotonRegenerarSeccion, BotonExportarDocx, HistorialGeneraciones, DetalleGeneracion, 12 × SeccionView, 12 × SeccionEditor (9 TdrEditableTable + 3 custom)

---

## 10. Pendientes post-Fase 8

- **Reiniciar dev server** para que `prisma generate` tome los nuevos campos (`operacionIAEnCurso`, `operacionIAIniciadaEn`) sin el cast manual en PlanTrabajoClient
- **Paginación del historial** (cuando haya muchas generaciones)
- **Contador en botón Historial** sin necesidad de abrir Sheet
- **Opción B organigrama** (plantilla DOCX con `{#incluirOrganigrama}`) si el punto 1×1 es inaceptable
- **Mutex UI polling** — actualmente el banner desaparece cuando `fetchContexto()` se llama tras SSE done; si el usuario recarga no hay polling en tiempo real
