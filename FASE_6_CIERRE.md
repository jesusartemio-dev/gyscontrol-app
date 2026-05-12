# Plan de Trabajo — FASE 6 CIERRE

## 1. Archivos creados / modificados

| Path | Tipo | Cambio |
|------|------|--------|
| `src/app/proyectos/[id]/plan-trabajo/_components/editores/ResponsabilidadesEditor.tsx` | **modificado** | + import toast + catch con toast.error en handleSave |
| `src/app/proyectos/[id]/plan-trabajo/_components/editores/HistogramasEditor.tsx` | **modificado** | + import toast + catch con toast.error en handleSave |
| `src/app/proyectos/[id]/plan-trabajo/_components/editores/MatrizRaciEditor.tsx` | **modificado** | + import toast + catch con toast.error en handleSave |
| `src/lib/planTrabajo/descargarPlantilla.ts` | nuevo | Caché TTL 30min + descarga via getFileContent + validación mimeType |
| `src/lib/planTrabajo/defaults.ts` | nuevo | RESPONSABILIDADES_DEFAULT + aplicarDefaults<T> |
| `src/lib/planTrabajo/construirDataBag.ts` | nuevo | Mapper PlanTrabajo + Proyecto → dataBag para docxtemplater |
| `src/lib/planTrabajo/exportDocx.ts` | nuevo | docxtemplater + pizzip + image-module → Buffer |
| `src/lib/planTrabajo/generarOrganigramaPng.ts` | nuevo | Canvas rendering client-side (adaptado de organigrama/page.tsx) |
| `src/app/api/proyectos/[id]/plan-trabajo/exportar-docx/route.ts` | nuevo | POST endpoint — render + Drive + PlanTrabajoGeneracion |
| `src/app/proyectos/[id]/plan-trabajo/_components/BotonExportarDocx.tsx` | nuevo | Botón "Exportar DOCX" con PNG generación y descarga |
| `src/app/proyectos/[id]/plan-trabajo/_components/PlanTrabajoClient.tsx` | **modificado** | + import BotonExportarDocx + render junto a BotonGenerarIA |
| `src/types/docxtemplater-image-module-free.d.ts` | nuevo | Declaración de tipos para módulo sin @types |
| `scripts/test-descargar-plantilla.ts` | nuevo | Script standalone de test de descarga |
| `.env.example` | **modificado** | + vars GOOGLE_* + GOOGLE_DRIVE_PLAN_TEMPLATE_FILE_ID |
| `.env.production` | **modificado** | + GOOGLE_DRIVE_PLAN_TEMPLATE_FILE_ID=1thAH_pmDfpbcEYOWxP9mDhNyXpRANzVF |

---

## 2. Mini-fix Fase 5.5 — Confirmación

Los 3 editores complejos ahora muestran `toast.error` en caso de fallo:

```ts
} catch (e) {
  toast.error(e instanceof Error ? e.message : 'Error al guardar')
} finally {
  setGuardando(false)
}
```

Librería confirmada: `sonner` (`import { toast } from 'sonner'`), consistente con todos los otros editores del módulo.

---

## 3. Setup — Deps + Env confirmados

**Paquetes instalados:**
```
docxtemplater@3.68.7
pizzip@3.2.0
docxtemplater-image-module-free@1.1.1
```

No hay `@types/docxtemplater-image-module-free` en npm. Solución: declaración manual en `src/types/docxtemplater-image-module-free.d.ts`.

**Env vars:**
- `.env.example`: documentadas GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_SHARED_DRIVE_ID, GOOGLE_ADMIN_DRIVE_ID, GOOGLE_DRIVE_PLAN_TEMPLATE_FILE_ID
- `.env.production`: agregado `GOOGLE_DRIVE_PLAN_TEMPLATE_FILE_ID=1thAH_pmDfpbcEYOWxP9mDhNyXpRANzVF`
- Las credenciales de Service Account (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SHARED_DRIVE_ID`) están en Vercel dashboard, no en archivos committed (correcto — secretos no van a git)

---

## 4. tsc + lint + build

```
npx tsc --noEmit       → (sin output) CLEAN
                         (tras agregar src/types/docxtemplater-image-module-free.d.ts
                          para módulo sin @types)
```

```
npm run lint           → Cero errores en archivos nuevos de Fase 6.
                         Errores pre-existentes sin cambio.
```

```
npx next build         → exit code 0 — BUILD EXITOSO
                         ƒ /api/proyectos/[id]/plan-trabajo/exportar-docx → 1.89 kB
                         ƒ /proyectos/[id]/plan-trabajo → 14.5 kB
                         (Fase 5.5 era 12.7 kB; +1.8 kB por BotonExportarDocx + imports)
```

---

## 5. Test del helper de plantilla

**Comando ejecutado:**
```
npx dotenv -e .env.production -- npx tsx scripts/test-descargar-plantilla.ts
```

**Resultado:**
```
FileId: 1thAH_pmDfpbcEYOWxP9mDhNyXpRANzVF
❌ Error: Error al descargar plantilla de Drive: Google Drive Service Account credentials not configured
```

**Diagnóstico:** Las credenciales `GOOGLE_SERVICE_ACCOUNT_EMAIL` y `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` están en Vercel (dashboard), no en `.env.production` (correcto — no se commitean). El test standalone no puede ejecutarse localmente sin esas credenciales.

**Cómo confirmar en producción:**
Deployar + abrir `/proyectos/<yan01>/plan-trabajo` → click "Exportar DOCX". Si el Drive helper falla, el endpoint devuelve HTTP 500 con el error exacto en el body JSON (`{ error: "..." }`).

**El test E2E real es el único que puede verificar la descarga de plantilla. Ver sección 7.**

---

## 6. Estado del PNG del organigrama

**Escenario: B (client-side, no tied to DOM refs)**

La función `handleExportPng` en `organigrama/page.tsx` NO usa refs de React — trabaja con `buildLayout(nodos, NORMAL_DIMS)` (puro JS) y luego `document.createElement('canvas')` (browser Canvas API).

**Approach adoptado:**
1. Extraer el rendering a `src/lib/planTrabajo/generarOrganigramaPng.ts` (cliente)
2. `BotonExportarDocx` recibe `orgNodos: OrgNodoContexto[]` como prop desde PlanTrabajoClient (ya disponibles en `contexto.organigrama`)
3. Al clickear, llama `generarOrganigramaPng(orgNodos)` que:
   - Adapta `OrgNodoContexto[]` → `OrgNodoCompleto[]` (agrega `_telefono`, `_cip`, `_empresa` computados)
   - Importa dinámicamente `buildLayout`, `NORMAL_DIMS` de `@/components/organigrama/OrgChart`
   - Renderiza con Canvas API (idéntico al código de organigrama/page.tsx)
   - Devuelve `canvas.toDataURL('image/png')` (data URI completa)
4. El data URI se envía en el body del POST como `organigramaPngBase64`
5. En el endpoint, se pasa al dataBag tal cual — el image module de docxtemplater extrae los bytes Base64 (`replace(/^data:image\/[^;]+;base64,/, '')`)

**Si el organigrama está vacío** (`nodos.length === 0`), `generarOrganigramaPng` retorna `''` y `imagenOrganigrama` queda como string vacío. La plantilla debe manejar este caso (tag vacío en lugar de imagen).

---

## 7. Test E2E manual — Checklist

> Tests manuales NO ejecutados por el agente (sin acceso a browser + sin Drive credentials locales).
> Ejecutar con el proyecto YAN01 en producción/staging una vez deployado.

### Pre-condición
- [ ] GOOGLE_SERVICE_ACCOUNT_EMAIL configurado en Vercel
- [ ] GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY configurado en Vercel
- [ ] GOOGLE_SHARED_DRIVE_ID configurado en Vercel
- [ ] GOOGLE_DRIVE_PLAN_TEMPLATE_FILE_ID configurado en Vercel (ya en `.env.production`)
- [ ] Plan de Trabajo YAN01 tiene todas las secciones generadas (✓ desde Fase 4)

### Test A — Descarga básica
- [ ] Abrir `/proyectos/<yan01>/plan-trabajo`
- [ ] Click "Exportar DOCX"
- [ ] Spinner "Generando..." aparece ~3-5 segundos
- [ ] Se descarga `PT_YAN01_RevA.docx` (o el código/rev del proyecto)
- [ ] Toast: "Documento descargado y guardado en Drive" con link "Ver en Drive"
  - Si Drive falla: toast warning "Descargado, pero falló subida a Drive: <mensaje>"

### Test B — Contenido del .docx
Abrir `PT_YAN01_RevA.docx` en Word:
- [ ] Cabecera: clienteNombre, proyectoNombre, codigoDocumento correctos
- [ ] Firmantes: preparadoPor, revisadoPor, aprobadoPor (o vacíos si no configurados)
- [ ] Revisiones: tabla con 1 fila (emisión inicial)
- [ ] Objetivo: texto del plan
- [ ] Alcance General: texto del plan
- [ ] Responsabilidades: 4 secciones con items (defaults si no editadas)
- [ ] Referencias, Personal, RACI: filas con datos reales
- [ ] EPP (3 subcategorías), Herramientas/Equipos/Materiales: filas correctas
- [ ] Restricciones, Alcance Detallado: filas correctas
- [ ] Histogramas: filas con etiqueta + total
- [ ] Cronograma: filas con fase/edt/fechas/horas
- [ ] Imagen del organigrama insertada (600×400px)
- [ ] Sin `{}` sueltas en el texto (placeholder sin reemplazar → revisar dataBag)

### Test C — Drive y PlanTrabajoGeneracion
- [ ] Archivo aparece en Drive bajo carpeta `PlanTrabajo_YAN01`
- [ ] Registro creado en `PlanTrabajoGeneracion` (verificar en DB o historial futuro)

### Test D — Error graceful
- [ ] Deshabilitar temporalmente GOOGLE_DRIVE_PLAN_TEMPLATE_FILE_ID en Vercel
- [ ] Click "Exportar DOCX"
- [ ] Toast error "GOOGLE_DRIVE_PLAN_TEMPLATE_FILE_ID no está configurado" (endpoint retorna 500)

---

## 8. Arquitectura completa del flujo

```
[BotonExportarDocx] (cliente)
  │
  ├─ 1. generarOrganigramaPng(orgNodos)  → canvas.toDataURL() → base64 string
  │
  └─ 2. POST /api/proyectos/[id]/plan-trabajo/exportar-docx
         body: { organigramaPngBase64 }
              │
              ├─ auth check (getServerSession)
              ├─ fetch plan + proyecto + cliente (Prisma)
              ├─ construirDataBag(plan, proyecto, base64)
              │    ├─ aplicarDefaults(responsabilidades, RESPONSABILIDADES_DEFAULT)
              │    ├─ raciFlat = raci.filas.flatMap(asignaciones)
              │    └─ imagenOrganigrama = base64 string
              ├─ renderizarPlanTrabajoDocx({ dataBag })
              │    ├─ descargarPlantillaPlanTrabajo() [caché TTL 30min]
              │    │    └─ getFileContent(fileId) → { data: Buffer, mimeType }
              │    └─ docxtemplater.render(dataBag) → zip → Buffer
              ├─ createFolder(PlanTrabajo_<codigo>) + uploadFile(buffer) [soft fail]
              ├─ prisma.planTrabajoGeneracion.create [solo si Drive OK]
              └─ NextResponse(buffer) + headers Content-Disposition, X-Drive-*
```

---

## 9. Detalles de implementación

### descargarPlantilla.ts — getFileContent
Reutiliza `getFileContent(fileId)` del helper de Drive existente, que ya:
- Descarga binario con `responseType: 'arraybuffer'` → `Buffer`
- Maneja Google Workspace files (export) — no aplica para .docx nativo
- Devuelve `{ data: Buffer, mimeType: string }`

La validación de mimeType queda en `descargarPlantilla.ts`:
```ts
if (result.mimeType === MIME_GOOGLE_DOC) → error claro "re-subir desactivando conversión"
if (result.mimeType !== MIME_DOCX) → error con mimeType recibido
```

### Drive folder — createFolder siempre crea nueva
`createFolder` del helper NO busca si ya existe — siempre crea. Esto significa que cada exportación crea una carpeta nueva `PlanTrabajo_<codigo>` en Drive.

**Para Fase 7:** Implementar `getOrCreatePlanTrabajoFolder(proyectoId)` que:
1. `listFiles({ folderId: getSharedDriveId(), query: 'PlanTrabajo_<codigo>' })`
2. Si no existe → `createFolder(...)`
3. Guarda `driveFolderId` en `PlanTrabajo` para reusar

### dataBag.herramientas — colisión de nombre
El dataBag tiene tanto `herramientas` (array de PlanItemRecurso para la subcategoría) como `{...}`. No hay colisión porque el campo es distinto del nombre del campo del plan. ✓

---

## 10. Pendientes para Fase 7

- **`getOrCreatePlanTrabajoFolder`** — evitar crear carpeta duplicada en cada exportación
- **UI de historial** — mostrar `PlanTrabajoGeneracion[]` en el plan (lista de versiones con link a Drive)
- **Endpoint GET /generaciones** — listar versiones del plan
- **Botón "Descargar versión anterior"** — link directo a `webViewLink` de Drive
- **`incluirOrganigrama` toggle** — si `plan.incluirOrganigrama === false`, no enviar imagen (pasar `''`)
- **Mutex global IA** — prevenir generar-completo + regenerar simultáneos
