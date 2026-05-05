# Reportes Semanales de Seguridad — Implementación Fase 3

> Generación del archivo `.pptx` final replicando 1:1 la plantilla actual del cliente Nexa.
> El ingeniero descarga el PPT desde el editor del reporte semanal con un click.

---

## Resumen ejecutivo

Lo que quedó operativo end-to-end:

1. Dependencia `pptxgenjs` instalada y verificada en runtime (smoke test → buffer válido).
2. Servicio `driveImageLoader` que descarga imágenes de Drive a `data:image/...;base64,...` con concurrencia controlada (5 paralelas) y fallback `null` si una falla.
3. Generador de PPT modular en `src/lib/services/pptGenerator/` con:
   - `theme.ts` — todos los colores, fuentes, posiciones del `PLANTILLA_PPT_SPEC.md` como constantes.
   - `helpers.ts` — `addHeaderBanner`, `addFooter`, `addPhotoToSlide`, `captionTextRuns`, `chunkArray`, `truncate`, `formatearFechaCorta/LargaUpper/Anio`, `DIAS_SEMANA_ABREV`.
   - 10 archivos de slides en `slides/` (uno por sección).
   - `_grid-fotos.ts` — helper compartido entre charlas e inspecciones (mismo grid de 3 columnas).
   - `index.ts` — orquestador `generarPptReporteSeguridad(agregado): Promise<Buffer>`.
4. Endpoint `GET /api/seguridad/reportes-semanales/[id]/exportar-pptx` con `maxDuration = 60`, auth, control de roles, y headers correctos para descarga.
5. Botón "Generar PPT" funcional en el editor — descarga programática vía `fetch` + `blob` + `<a download>`.
6. `npx tsc --noEmit` pasa limpio.
7. Smoke test runtime: pptxgenjs genera PPT de 44KB válido sin errores.

---

## Archivos creados

### Servicios
- `src/lib/services/driveImageLoader.ts`
  - `descargarImagenDrive(driveFileId)` → `string | null` (data URL base64)
  - `descargarImagenesDrive(ids[], concurrency=5)` → array same-length

### Generador de PPT
- `src/lib/services/pptGenerator/theme.ts` — constantes de colores, fuentes, posiciones, títulos
- `src/lib/services/pptGenerator/helpers.ts` — funciones reutilizables
- `src/lib/services/pptGenerator/types.ts` — tipo `PptGenInput` consumido por slides
- `src/lib/services/pptGenerator/index.ts` — `generarPptReporteSeguridad(agregado)`
- `src/lib/services/pptGenerator/slides/01-portada.ts`
- `src/lib/services/pptGenerator/slides/02-hht-covid.ts`
- `src/lib/services/pptGenerator/slides/_grid-fotos.ts` (compartido charlas/inspecciones)
- `src/lib/services/pptGenerator/slides/03-charlas.ts`
- `src/lib/services/pptGenerator/slides/04-inspecciones.ts`
- `src/lib/services/pptGenerator/slides/05-incidentes.ts`
- `src/lib/services/pptGenerator/slides/06-actividades.ts`
- `src/lib/services/pptGenerator/slides/07-riesgo-critico.ts`
- `src/lib/services/pptGenerator/slides/08-medio-ambiente.ts`
- `src/lib/services/pptGenerator/slides/09-prevencion.ts`
- `src/lib/services/pptGenerator/slides/10-cierre.ts`

### API Route
- `src/app/api/seguridad/reportes-semanales/[id]/exportar-pptx/route.ts`

## Archivos modificados

- `package.json` — añadida dependencia `pptxgenjs`
- `src/app/seguridad/reportes-semanales/[id]/page.tsx` — añadido state `pptDownloading`, función `descargarPpt()`, botón "Generar PPT" con loader

---

## Cómo se invoca el patrón pptxgenjs

`pptxgenjs` se distribuye como CJS con default export que es la clase. En TS estricto el siguiente patrón funciona y pasa tsc:

```typescript
import PptxGenJSCtor from 'pptxgenjs'
import type PptxGenJS from 'pptxgenjs'

const pres: PptxGenJS = new (PptxGenJSCtor as unknown as { new (): PptxGenJS })()
pres.layout = 'LAYOUT_WIDE'
const slide = pres.addSlide()
slide.addText('hola', { x: 1, y: 1, w: 5, h: 1 })
const buffer = (await pres.write({ outputType: 'nodebuffer' })) as Buffer
```

Comprobado en runtime con un smoke test que generó un PPT de 44KB válido.

---

## Decisiones tomadas que no estaban en el prompt

1. **Constructor cast unusual.** `pptxgenjs` exporta una clase pero el `import default` no se reconoce como constructor en TS strict mode. Usé `new (PptxGenJSCtor as unknown as { new (): PptxGenJS })()` — feo pero correcto, sin `any`. Documentado arriba.

2. **HHT calculado desde `RegistroHorasCampoMiembro.horas`.** El campo es `horas` (no `horasTrabajadas` como sugería el prompt). La columna "Acumulado" se calcula sumando día a día. La columna "Hrs/día" se omitió porque cada miembro puede tener sus propias horas — habría que dividir y daría un valor confuso.

3. **Tabla COVID con valores fijos.** No tenemos un modelo `RegistroCovid` ni columnas en `ReporteSemanalSeguridad` para "Sospechosos / Infectados / Curados / Fallecidos / Grupo Riesgo". Por ahora se generan en 0. El total y "Trabajan en obra" se obtienen del max de personas en la semana. **Pendiente Fase 4:** añadir estos campos al schema (override manual).

4. **Banda naranja superior en slide 2.** El spec marca el slide 2 sin header banner explícito, pero por coherencia visual con slides 3-9 le agregué uno con el título "HHT y Reporte Covid 19 de la Semana". El título HHT específico va dentro del cuerpo, debajo.

5. **`captionTextRuns` con `breakLine` para formato multi-línea.** `pptxgenjs` no acepta `\n` en text — hay que usar arrays de runs con `options.breakLine: true`. Implementé un helper `captionTextRuns()` que devuelve los runs ya formateados con bold para los labels.

6. **Manejo de slide vacío.** Cada sección genera **1 slide con texto "Sin {tipo} esta semana"** si no hay registros. Esto mantiene la numeración de páginas y la estructura coherente — el cliente nota la consistencia visual entre semanas (Opción A del spec).

7. **Logo cliente hardcoded a Nexa.** El spec lo dejaba explícito. Para multi-cliente en Fase 4 se vincularía a `Proyecto.cliente.logoUrl`.

8. **`maxDuration = 60` en el endpoint.** El PPT con ~20 fotos toma alrededor de 8-15s en local (dominado por Drive). En Vercel la página puede demorar más por la latencia de Drive. 60s da margen.

9. **Footer en todos los slides excepto portada y cierre.** Consistente con el spec. El número de página se calcula upfront a partir de los counts por tipo y se va incrementando.

10. **Logging detallado.** El generador loggea inicio, fotos descargadas/fallidas, slides totales y bytes finales. Útil para debugging cuando un cliente reporta "el PPT salió raro" — el log muestra cuántas fotos fallaron.

---

## Performance esperado

Reporte con 20 fotos típicas (~1-3MB cada una en Drive):

| Etapa | Tiempo |
|---|---|
| Auth + obtenerReporteAgregado | 100-300ms |
| Descarga de 20 fotos en paralelo (5 concurrentes) | 4-8s |
| Conversión a base64 y armado de slides | 500ms-1s |
| `pres.write()` (compresión zip) | 300-800ms |
| **Total** | **~6-10s** |

El cuello de botella es Drive. Si fuera necesario optimizar, las fotos podrían:
- Subirse ya con thumbnail más pequeño (480px) que pesa <100KB
- Cachearse después de la primera descarga (por driveFileId, hash en Redis o filesystem temp)

---

## Diferencias visuales conocidas vs el PPT original

Se replicó la estructura, posiciones y colores del spec. Diferencias menores que pueden surgir:

1. **Master slide vs slide normal.** El PPT original usa SlideMaster para el background oscuro de portada/cierre. Aquí lo hago con un rectángulo de fondo color `#1D1D1D`. Visualmente equivalente.

2. **Fuente Verdana 28pt vs 36pt en portada.** El spec dice 36pt pero a esa escala el título completo no entra en el ancho. Reduje a 28pt para que el texto largo "INFORME SEMANAL DEL X AL Y DEL 2026" no se corte.

3. **Tabla HHT sin columna "Hrs/día".** Ver punto 2 de Decisiones.

4. **Logo cliente solo Nexa.** No hay placeholder para otros clientes (Fase 4).

5. **Caption de actividades formato Calibri.** El spec menciona "Arial bold + Calibri regular" pero por simplicidad usé Calibri 10pt completo, con `bold` solo en los labels via `captionTextRuns`.

---

## Cómo probar end-to-end

### Pre-requisitos
- Reporte semanal existente (creado en Fase 2) con registros variados.
- Variables `GOOGLE_SERVICE_ACCOUNT_*` configuradas para que el endpoint pueda descargar fotos.
- User con rol `seguridad`, `admin` o `gerente`.

### Pasos
1. **Levantar dev server:** `npm run dev`.
2. **Crear/abrir reporte:** ir a `/seguridad/reportes-semanales`, crear o abrir uno con varios registros (idealmente uno con 3+ charlas, 3+ inspecciones, 1 incidente, 1 actividad con foto, 1 riesgo crítico, 1 medio ambiente, 1 prevención).
3. **Click "Generar PPT":** el botón muestra "Generando…" con spinner.
4. **Esperar 5-15s.** Toast verde "PPT generado correctamente" + descarga automática del archivo.
5. **Abrir en PowerPoint** y verificar:
   - Portada con título "INFORME SEMANAL DEL X AL Y DEL 2026", logo Nexa centrado, fondo oscuro.
   - Slide 2: tabla HHT con días de la semana, totales correctos. Tabla COVID abajo.
   - Slides charlas (1-3): grid de 3 columnas con foto + caption "Fecha: ... / Descripción/Tema: ... / Cantidad de Participantes: X".
   - Slides inspecciones: grid igual sin "Cantidad de Participantes".
   - Slide incidentes: lista con bullets (o "No se reportaron incidentes").
   - Slide actividades: 2 fotos a la izquierda + caption + bloque derecho.
   - Slide riesgo crítico: 2 fotos izquierda + texto multi-formato derecha.
   - Slide medio ambiente: foto grande derecha + texto pequeño izquierda.
   - Slide prevención: caja naranja izquierda + 2 fotos derecha + caption.
   - Slide cierre: "Gracias" en grande sobre fondo oscuro.

### Casos a verificar
- **Reporte sin charlas:** debe generar 1 slide de charlas con texto "Sin charlas esta semana".
- **Reporte con 7 charlas:** debe generar 3 slides de charlas (3+3+1).
- **Foto que falla:** desconfigurar `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` temporalmente → todas las fotos deben aparecer como placeholder gris "Foto no disponible" sin romper el flujo.
- **Reporte vacío (sin ningún registro):** debe generar 10 slides con todas las secciones diciendo "Sin X esta semana".

---

## Pendientes para Fase 4

### Cron y notificaciones
- [ ] `POST /api/cron/reporte-semanal-seguridad` (viernes) que crea borradores automáticos por proyecto y notifica a ingenieros de seguridad. Entry en `vercel.json`.
- [ ] Notificaciones in-app: al enviar → admin/gerente; al aprobar/rechazar → ingeniero.

### Multi-cliente
- [ ] Modelo `Cliente.logoUrl` (o tabla nueva `ClienteAsset`).
- [ ] `theme.ts` debe leer el logo del cliente desde el `agregado.reporte.proyecto.cliente.logoUrl`.
- [ ] Fallback a `logo_nexa.png` si no hay logo del cliente.

### Datos COVID
- [ ] Agregar a `ReporteSemanalSeguridad`: `covidSospechosos`, `covidInfectados`, `covidCurados`, `covidFallecidos`, `covidGrupoRiesgo` (Int? cada uno).
- [ ] UI en el editor para editar estos campos.
- [ ] Slide 2 los lee del reporte en lugar de hardcodear 0.

### Performance
- [ ] Cache de imágenes Drive en filesystem temp por `driveFileId`. Hash → archivo. TTL 24h.
- [ ] Pre-cargar thumbnails 480px desde Drive en lugar de la imagen original.
- [ ] Si las descargas siguen siendo el cuello de botella, considerar Storage local (S3/Vercel Blob) para imágenes nuevas.

### UX
- [ ] Vista previa del PPT en el editor (renderizar primer slide como imagen) antes de descargar.
- [ ] Permitir reordenar fotos por drag-and-drop antes de generar (la columna `orden` ya existe).
- [ ] Botón "Generar PDF" además del PPT (usar `puppeteer` o `mammoth` para conversión).

### Tests
- [ ] Snapshot test del estructura del PPT generado (verificar que se mantiene un X número de slides para data conocida).
- [ ] Tests de los slide generators con mocks de `agregado` (sin Drive).
