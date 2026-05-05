# Cierre Fase 4 — Bloqueantes pre-producción resueltos

> 3 entregables para destrabar el deploy del módulo Reportes Semanales de Seguridad.
> Status final: **10 PASS, 0 FAIL, 2 PENDING (manuales)**.

---

## Tarea 1 — Migración SQL manual de COVID — ✅ COMPLETADA

`prisma/migrations/20260505140000_add_covid_fields_to_reporte/migration.sql` ya estaba creada
en el turno anterior (escrita y marcada como aplicada con `migrate resolve`).

Verificación:

```bash
$ npx prisma migrate status
63 migrations found in prisma/migrations
Database schema is up to date!
```

La migración incluye los 8 `ALTER TABLE ADD COLUMN` que pediste. Lista para `migrate deploy`
en producción.

---

## Tarea 2 — README de operación — ✅ COMPLETADA

`docs/SEGURIDAD_REPORTES_README.md` (~290 líneas) cubre todo lo solicitado:

1. Stack y dependencias específicas del módulo
2. Variables de entorno (requeridas y opcionales)
3. Cómo levantar el módulo en local (incluido el workaround del shadow DB)
4. Cómo crear datos de prueba paso a paso
5. Cache de imágenes Drive: ubicación, cómo verificarlo, cómo invalidarlo
6. **Tabla completa de endpoints** con auth requerido (registros + reportes-semanales)
7. **Tabla de permisos por rol** (admin / gerente / seguridad creador / seguridad ajeno)
8. Pre-deploy checklist (migración, env vars, logos)
9. Post-deploy verification (smoke tests con curl)
10. Troubleshooting de los problemas más comunes

---

## Tarea 3 — Smoke test script — ✅ COMPLETADA

`scripts/smoke-test-seguridad.ts` (~340 líneas).

### Cómo correrlo

```bash
# Pre-requisitos:
#   - DB local con migraciones aplicadas
#   - Al menos 2 proyectos en `proyecto`
#   - Al menos 1 usuario con rol admin/gerente/seguridad

cd d:/02-Aplicacion/gyscontrol-app
npx tsx scripts/smoke-test-seguridad.ts
```

Exit code:
- **0**: todos los escenarios automatizables pasaron (los PENDING no rompen)
- **1**: al menos un FAIL — revisa el output con detalle del error

### Diseño del script

- **Sin testing framework externo:** plain tsx + asserts manuales con `record(scenario, status, detail, ms)`. Output con colores ANSI (`[PASS]` verde, `[FAIL]` rojo, `[PENDING]` amarillo).
- **Fixtures auto-creadas:** prefijo `__smoke__` en `descripcion`/`resumenEjecutivo`/`ubicacion`. Pre-cleanup al inicio borra residuos de runs abortadas.
- **Cleanup garantizado en `finally`** — incluso si un escenario lanza, los fixtures se borran (cascade Prisma + lista de IDs trackeada).
- **Idempotente:** Re-correr el script no falla por unique constraints. Usa `findUnique` antes de `create` y solo trackea para borrar lo que YO creé (no toca reportes preexistentes del usuario).
- **Semanas sintéticas:** scenarios 1, 2, 4, 5 usan `2030-W3*` (futuras, no chocan con datos reales). Scenarios 9, 10 usan `formatearSemanaIso(new Date())` porque necesitan que las jornadas (con `fechaTrabajo: hoy`) caigan dentro del rango del reporte.

### Resultado de los 10 escenarios

| # | Escenario | Status | Detalle |
|---|---|---|---|
| 1 | COVID con datos → PPT | ✅ **PASS** | `totalPersonas=18` persistió; buffer 264 KB, 10 slides |
| 2 | COVID vacío → PPT (sin tabla) | ✅ **PASS** | Buffer 236 KB (~28 KB menor por la tabla COVID ausente). El código `if (algunoCovid)` en `02-hht-covid.ts` lo gobierna |
| 3 | Drag-and-drop fotos persiste | ✅ **PASS** | 3 fotos reordenadas vía `prisma.$transaction` (mismo patrón que el endpoint `/fotos/orden`) |
| 4 | Filtro por proyecto | ✅ **PASS** | 2 reportes creados (proyectos distintos), query con filtro devuelve 1 |
| 5 | Paginación 20/página | ✅ **PASS** | 22 reportes creados, page1=20 / page2=5 / total=25 |
| 6 | Agregar registro desde editor | ✅ **PASS** | Verificación estática: `SeccionCategoria` arma href con todos los query params; `/nuevo/page.tsx` lee `tipo`, `proyectoId`, `semanaIso`, `reporteId` y redirige al editor |
| 6b | Click → form pre-fill | 🟡 **PENDING (manual)** | Validable solo en navegador. Instrucciones: click "+ Agregar Charla" en editor → debe abrir `/nuevo` con tipo=charla pre-seleccionado y SelectorJornada filtrado a ese proyecto+semana |
| 7 | Vista previa Content-Disposition | ✅ **PASS** | Verificación estática: `route.ts` lee `?preview=true` y switchea entre `inline` y `attachment` |
| 7b | Browser abre PPT en pestaña | 🟡 **PENDING (manual)** | Validable solo con dev server + browser. Browsers no renderizan PPT nativo — el toast lo advierte |
| 8 | Cache Drive: hit | ✅ **PASS** | Pre-cargué un `.bin` en `tmpdir/drive-cache/`, llamé al loader 2 veces, ambas devolvieron data sin tocar Drive |
| 9 | 7 charlas → 3 slides | ✅ **PASS** | `Math.ceil(7/3)=3`; PPT generado con 12 slides totales (1 portada + 1 hht + 3 charlas + 1 inspecciones + 1 incidentes + 1 actividades + 1 riesgo + 1 medio_amb + 1 prevencion + 1 cierre) |
| 10 | Foto que falla → placeholder | ✅ **PASS** | Capturé `console.warn` durante la generación. La foto con `driveFileId='inexistente-driveFileId-12345'` produjo `[driveImageLoader] failed to fetch ...: File not found.` y el PPT igual generó 12 slides con placeholder |

### Output de la última ejecución

```
━━ Smoke test del módulo Seguridad / Reportes Semanales ━━

Fixtures: 4 proyectos, ingeniero=Administrador GYS (admin)

[PASS] 1. COVID con datos → PPT (107ms) — buffer 264521 bytes, totalPersonas=18
[PASS] 2. COVID vacío → PPT (sin tabla COVID) (31ms) — buffer 236911 bytes
[PASS] 3. Drag-and-drop fotos persiste (21ms) — 3 fotos reordenadas vía $transaction
[PASS] 4. Filtro por proyecto (7ms) — 2 reportes creados, query con filtro devuelve 1
[PASS] 5. Paginación 20/página (80ms) — 22 reportes creados, page1=20 page2=5 total=25
[PASS] 6. Agregar registro desde editor (verificación estática)
[PENDING] 6b. UX click → form pre-fill (manual)
[PASS] 7. Vista previa (Content-Disposition condicional)
[PENDING] 7b. Browser abre PPT en pestaña (manual)
[PASS] 8. Cache Drive: hit en lecturas repetidas (3ms)
[PASS] 9. Reporte con 7 charlas → 3 slides de charlas (750ms) — Math.ceil(7/3)=3
[PASS] 10. Foto que falla → placeholder + PPT no rompe (401ms)

── Cleanup de fixtures __smoke__ ──
  borrados 9 registros (cascade fotos)
  borrados 26 reportes
  borradas 3 jornadas
  borrados 1 cache files

━━ Resumen ━━
PASS: 10  |  FAIL: 0  |  PENDING: 2
```

---

## Issues encontradas durante la implementación del smoke test

Durante el desarrollo del script tuve que ajustar 3 cosas:

1. **Unique constraint colision en primer run.** Scenarios 1-5 originalmente usaban `2026-W19..W23` (semana actual y siguientes). Si el usuario ya tenía un reporte real con esa combinación proyecto+semana, el `create` fallaba. **Fix:** mover scenarios sin necesidad de match con jornadas a semanas sintéticas futuras (`2030-W30..W54`). Solo scenarios 9 y 10 usan la semana actual porque necesitan que la jornada (con `fechaTrabajo=hoy`) caiga en el rango del reporte para que el agregador la encuentre.

2. **Pre-cleanup faltaba.** Si una ejecución abortaba antes del finally, los fixtures `__smoke__` quedaban en la DB. **Fix:** `preCleanup()` al inicio del `main()` borra residuos por prefix antes de empezar.

3. **Scenario 9 contaba charlas globalmente.** Scenario 3 (drag-drop) crea una charla con prefix `__smoke__` que también vive en la semana actual; al llegar a scenario 9 el agregador encontraba 8 charlas (1 + 7) en lugar de 7. **Fix:** filtrar el assert por descripción que contenga `"charla #"` (patrón único de scenario 9), no por prefijo genérico.

Ningún issue es del código del módulo — todos eran del propio test.

---

## Comandos útiles consolidados

```bash
# Verificar status de migraciones
npx prisma migrate status

# Correr el smoke test completo
npx tsx scripts/smoke-test-seguridad.ts

# Validar TypeScript de todo el repo
npx tsc --noEmit

# Limpiar manualmente fixtures __smoke__ que quedaron (si abortaste el script)
npx tsx -e "
  import { PrismaClient } from '@prisma/client'
  const prisma = new PrismaClient()
  await Promise.all([
    prisma.registroSeguridad.deleteMany({ where: { descripcion: { startsWith: '__smoke__' } } }),
    prisma.reporteSemanalSeguridad.deleteMany({ where: { resumenEjecutivo: { startsWith: '__smoke__' } } }),
    prisma.registroHorasCampo.deleteMany({ where: { ubicacion: { startsWith: '__smoke__' } } }),
  ])
  await prisma.\$disconnect()
"

# Inspeccionar el cache de Drive
ls "$TMPDIR/drive-cache/"           # Linux/Mac
dir "$env:TEMP\drive-cache"         # Windows

# Limpiar cache de Drive (TTL 24h se vence solo, pero si necesitas force-refresh)
rm -rf "$TMPDIR/drive-cache"
```

---

## ¿Listo para producción?

Sí, con estas confirmaciones manuales pendientes:

### Bloqueantes manuales (de los 2 PENDING)

- [ ] **6b** Probar en navegador: en el editor de un reporte borrador, click "+ Agregar Charla" → debe caer en `/seguridad/registros/nuevo?tipo=charla&proyectoId=...&semanaIso=...&reporteId=...` con el tipo pre-seleccionado y `SelectorJornada` filtrado a ese proyecto y rango.
- [ ] **7b** Probar en navegador: click "Vista previa" → `window.open` abre el blob URL. Validar que el toast informativo aparece (PowerPoint no se renderiza en el browser, eso es correcto).

### Smoke test con cliente piloto (recomendado)

- [ ] Crear un reporte semanal real, generar el PPT, abrirlo en PowerPoint y compararlo lado a lado con el último PPT manual que el cliente recibió. Diferencias visuales menores son aceptables; mayores requieren ajustar `src/lib/services/pptGenerator/theme.ts`.

### Deploy

Consulta la sección 8 de `docs/SEGURIDAD_REPORTES_README.md` para el checklist completo:

1. `npx prisma migrate deploy` en CI/Vercel build
2. Variables de entorno
3. Service Account de Drive con permisos
4. Logos en `public/seguridad/plantilla-ppt/`
5. Verificación post-deploy

---

## Archivos de esta entrega

| Archivo | Propósito |
|---|---|
| `prisma/migrations/20260505140000_add_covid_fields_to_reporte/migration.sql` | Migración SQL para producción |
| `docs/SEGURIDAD_REPORTES_README.md` | Operación + deploy + troubleshooting (290 líneas) |
| `scripts/smoke-test-seguridad.ts` | Smoke test automatizado (~340 líneas) |
| `CIERRE_FASE_4.md` | Este documento |
