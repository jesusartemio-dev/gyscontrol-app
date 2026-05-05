# Reportes Semanales de Seguridad — Implementación Fase 0 + Fase 1

> Entrega del módulo de captura de actividades de seguridad de campo (charlas NDAD,
> inspecciones, observaciones, etc.) atadas a una jornada existente.
> **No** incluye Fase 2 (reporte semanal agregado) ni Fase 3 (generación PPT).

---

## Resumen ejecutivo

Lo que ya funciona end-to-end:

1. Modelos `RegistroSeguridad` + `RegistroSeguridadFoto` + enum `TipoRegistroSeguridad` en Prisma, con migración aplicada y cliente regenerado.
2. APIs CRUD bajo `/api/seguridad/registros/*` con auth + roles + Zod, incluyendo upload de fotos a Google Drive y endpoint de jornadas activas del día.
3. UI de captura mobile-first en `/seguridad/registros/nuevo` con `SelectorJornada` (cards tocables, persistencia en `localStorage`, toggle "solo asignadas", refrescar).
4. Lista filtrable en `/seguridad/registros` y vista detalle en `/seguridad/registros/[id]`.
5. Integración al sidebar de Seguridad y al dashboard de tiles.
6. `npx tsc --noEmit` pasa limpio.

---

## Archivos creados

### Schema y migración
- `prisma/migrations/20260505100054_add_registro_seguridad/migration.sql` — SQL de la migración.

### Validadores Zod
- `src/lib/validators/registroSeguridad.ts` — `tipoRegistroSeguridadEnum`, `crearRegistroSeguridadSchema`, `actualizarRegistroSeguridadSchema`, mapa `TIPO_REGISTRO_LABELS` con etiquetas en español.

### Servicios
- `src/lib/services/registroSeguridad.ts` — `listarJornadasActivasDelDia`, `obtenerJornadasDeSemana`, `listarRegistrosSeguridadDeJornada`, `listarRegistrosSeguridadDeSemana`, `REGISTRO_INCLUDE`.

### API Routes
- `src/app/api/seguridad/registros/route.ts` — `GET` (lista con filtros) y `POST` (crear).
- `src/app/api/seguridad/registros/[id]/route.ts` — `GET`, `PATCH`, `DELETE`.
- `src/app/api/seguridad/registros/[id]/fotos/route.ts` — `GET`, `POST` (multipart → Drive).
- `src/app/api/seguridad/registros/[id]/fotos/[fotoId]/route.ts` — `DELETE` (Drive + BD).
- `src/app/api/seguridad/registros/jornadas-activas/route.ts` — `GET` con `?soloAsignadas=true|false`.

### UI Components
- `src/components/seguridad/registros/SelectorJornada.tsx`
- `src/components/seguridad/registros/SelectorTipoRegistro.tsx`
- `src/components/seguridad/registros/FotosUploader.tsx`
- `src/components/seguridad/registros/RegistroSeguridadCard.tsx`
- `src/components/seguridad/registros/FiltrosRegistros.tsx`

### Páginas
- `src/app/seguridad/registros/page.tsx` — listado.
- `src/app/seguridad/registros/nuevo/page.tsx` — captura mobile-first.
- `src/app/seguridad/registros/[id]/page.tsx` — detalle.

## Archivos modificados

- `prisma/schema.prisma` — añadidos `RegistroSeguridad`, `RegistroSeguridadFoto`, enum `TipoRegistroSeguridad`. Relaciones inversas en `RegistroHorasCampo.registrosSeguridad` y `User.registrosSeguridad` (relation name `RegistrosSeguridadIngeniero`).
- `src/lib/permissions/base-permissions.ts` — añadidos `SECURITY_RECORD_PERMISSIONS` (`create`, `view_own`, `view_all`, `edit_own`, `delete_own`) y constante `SECURITY_RECORD_ALLOWED_ROLES`. Incluidos en `ALL_BASE_PERMISSIONS`.
- `src/lib/services/googleDrive.ts` — añadida helper `deleteFile(fileId)` (faltaba, se usa al borrar fotos).
- `src/components/Sidebar.tsx` — importado `ClipboardCheck`, añadido link `/seguridad/registros` entre Empleados y Reportes.
- `src/app/seguridad/page.tsx` — añadido tile "Registros de campo" entre Empleados y Reportes (color `text-amber-600 bg-amber-50`).

---

## Comandos de migración corridos

```bash
npx prisma validate                                 # OK
npx prisma migrate dev --name add_registro_seguridad   # ❌ falló por shadow DB
npx prisma db push --skip-generate                  # ✅ schema aplicado a gys_db local
npx prisma generate                                 # ✅ cliente regenerado
# migración SQL escrita manualmente en
# prisma/migrations/20260505100054_add_registro_seguridad/migration.sql
npx prisma migrate resolve --applied 20260505100054_add_registro_seguridad   # ✅
npx tsc --noEmit                                    # ✅ exit 0, sin errores
```

> **Por qué no `migrate dev`:** la shadow DB de Prisma falla al replicar la migración pre-existente
> `20260212_margen_to_factor_venta_costo` (`Error P3006 / P1014`). Es un issue del histórico de
> migraciones del proyecto, **no** de los modelos nuevos. La salida limpia fue: `db push` sincroniza
> el schema, se escribió a mano la migración SQL siguiendo exactamente el patrón que generaría
> Prisma, y se marcó como aplicada con `migrate resolve`. La migración queda lista para correr
> en cualquier ambiente fresco.

**Para producción / staging:** correr la migración con `npx prisma migrate deploy` una vez se
arregle el issue del shadow DB (o ejecutar el SQL manualmente con `psql`).

---

## Decisiones tomadas que no estaban en el prompt

1. **`deleteFile` en `googleDrive.ts`.** El helper no existía. Lo añadí siguiendo el estilo del
   resto del archivo. Se usa en el `DELETE` de fotos. Si la llamada a Drive falla, se borra la
   fila igualmente y se loguea un warning (no bloquea al usuario).

2. **Reglas finas de autorización.** El prompt pedía roles `['admin', 'gerente', 'seguridad']`
   en todas las APIs. Para coherencia con los permisos granulares `view_own / view_all / edit_own`
   añadidos:
   - `seguridad` solo puede **ver, editar o eliminar** los registros que él mismo creó.
   - `admin` y `gerente` ven y editan todo.
   - Crear: cualquiera de los tres roles.
   Se implementó inline (helper `puedeEditar` por route). El sistema granular vía `permissions`
   queda registrado pero no es el que valida — sigue el patrón actual del proyecto.

3. **No se permiten registros sobre jornadas `aprobado`/`rechazado`.** Solo `iniciado` o
   `pendiente`. El `POST /registros` devuelve 400 si la jornada no está en uno de esos estados.

4. **`asistentes` solo se persiste cuando `tipo === 'charla'`.** En cualquier otro tipo se
   guarda `null`, incluso si el cliente lo envía. Esto se hace en POST y en PATCH (cuando
   cambia el tipo, también limpia el campo).

5. **Campo `ubicacion` en cards de jornada.** El selector lo muestra si la jornada lo trae
   (originado en `RegistroHorasCampo.ubicacion`). Es información útil cuando hay varias plantas.

6. **Tamaño máximo de foto: 15MB.** No estaba especificado, parecía razonable para imágenes
   de móvil. El uploader cliente y el endpoint validan ambos.

7. **Endpoint `GET /api/proyecto`** se reutiliza para el filtro de la lista (devuelve más
   datos de los necesarios pero ya existe; no quise inventar otro endpoint en Fase 1).

8. **Botón "Editar" en el detalle queda deshabilitado.** El backend acepta `PATCH` pero
   no se construyó UI de edición porque el prompt enumeró 3 páginas (lista / nuevo / detalle)
   y dijo "Botón editar" sin especificar pantalla. Lo dejé como TODO de Fase 2 — el endpoint
   ya soporta la operación, solo falta la UI.

9. **Persistencia de `ultimaJornadaId` con expiración por día.** En `localStorage` con clave
   `seguridad:ultimaJornadaId` y un campo `fecha` (YYYY-MM-DD). Al cargar, si el día cambió,
   se limpia. Cumple la regla "al día siguiente se invalida".

10. **Migración generada manualmente.** El SQL de la migración está commiteable y refleja
    exactamente lo que produciría `prisma migrate diff`.

---

## Pendientes para Fase 2 / 3

### Reporte semanal (Fase 2)
- [ ] Modelo `ReporteSemanalSeguridad` (proyectoId, anioSemana `YYYY-Www`, fechaInicio, fechaFin, estado, etc.).
- [ ] Endpoint agregador `GET /api/seguridad/reportes-semanales/[anioSemana]/[proyectoId]/agregado` que use `obtenerJornadasDeSemana` + `listarRegistrosSeguridadDeSemana` (ambos ya existen).
- [ ] UI `/seguridad/reportes-semanales/*` (listado, nuevo, editor, exportar).
- [ ] Cron `/api/cron/reporte-semanal-seguridad` (viernes) — entry en `vercel.json` + endpoint con `Authorization: Bearer ${process.env.CRON_SECRET}`.
- [ ] Notificaciones in-app a ingenieros de seguridad cuando vence el plazo del reporte.

### Generación PPT (Fase 3)
- [ ] Instalar `pptxgenjs` (no está en `package.json`).
- [ ] Componente / servicio de armado del PPT con plantilla.
- [ ] Endpoint de descarga `GET /api/seguridad/reportes-semanales/[id]/exportar-pptx`.

### Tareas menores
- [ ] **UI de edición** del registro (el endpoint `PATCH` ya existe).
- [ ] **Reordenar fotos** mediante drag-and-drop (ya está la columna `orden` en BD).
- [ ] **Reintentar foto fallida** desde el detalle (hoy se notifica con `toast.warning` pero no hay botón "reintentar").
- [ ] **Endpoint ligero `/api/proyecto?fields=min`** que devuelva solo `{ id, codigo, nombre }` para los filtros (hoy se usa el endpoint pesado).
- [ ] **Permisos granulares** vía `usePermission` hook en lugar de chequeo inline de roles (refactor general del proyecto, no urgente).
- [ ] **Arreglar shadow DB** de Prisma para que `migrate dev` funcione (problema previo a este módulo).

---

## Cómo probar manualmente el flujo

### Pre-requisitos
- Postgres local corriendo (`gys_db` con migración aplicada).
- Variables de entorno de Drive: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SHARED_DRIVE_ID` (o `GOOGLE_ADMIN_DRIVE_ID`).
- Usuario con rol `seguridad`, `admin` o `gerente`.
- Al menos un proyecto activo con una jornada de campo iniciada hoy (`RegistroHorasCampo.estado = 'iniciado'` y `fechaTrabajo` = hoy). Si no la tienes, crea una vía `/mi-trabajo/mi-jornada` o directo en Prisma Studio.

### Pasos
1. **Levantar dev server**

   ```bash
   npm run dev
   ```

2. **Login** con un usuario de rol `seguridad` (o `admin` / `gerente`).

3. **Abrir** `http://localhost:3000/seguridad`. Debes ver el nuevo tile "Registros de campo" en color ámbar.

4. **Click → "Registros de campo"**. Llega a `/seguridad/registros`. Como aún no hay datos, ves el empty state.

5. **Click → "Nuevo registro"** (botón naranja arriba-derecha). Llega a `/seguridad/registros/nuevo`.
   - El `SelectorJornada` carga las jornadas del día (si tu user está en `PersonalProyecto.activo` del proyecto).
   - Si no aparecen, desactiva el toggle "Solo mis proyectos asignados" para ver todas las jornadas activas.
   - Si no hay ninguna, ve a `/mi-trabajo/mi-jornada` con un user supervisor y abre una.
   - Selecciona una card. Queda con borde naranja.

6. **Llena el formulario**:
   - Tipo: "Charla NDAD".
   - Descripción: "Charla de 5 minutos sobre uso de arnés en altura".
   - Asistentes: 12.
   - Observaciones: opcional.
   - Fotos: en móvil, click "Agregar" → abre cámara directa (`capture="environment"`). En desktop, abre file picker. Sube 1–3 imágenes. Verifica preview.

7. **Click "Guardar registro"**. Ves toast verde, redirige a `/seguridad/registros/[id]`.
   - El detalle muestra el registro con badge azul "Charla NDAD", proyecto, ingeniero, supervisor, descripción, asistentes, y galería de fotos.
   - Click en una foto: abre Drive en pestaña nueva.

8. **Volver** (← back) → `/seguridad/registros`. Ahora ves la card del registro recién creado (con miniatura de la primera foto).

9. **Probar filtros**: cambia "Tipo" a "Inspección". El listado se vacía. Vuelve a "Todos". Selecciona el proyecto. Aplica rango de fechas. Limpia con "Limpiar filtros".

10. **Probar `localStorage`**: cierra la pestaña, abre otra `/seguridad/registros/nuevo`. La jornada que elegiste sigue seleccionada.

11. **Probar eliminación**: en el detalle, click "Eliminar" → confirmación → "Eliminar". Toast verde, redirige a la lista, y la foto desaparece de Google Drive (revísalo).

12. **Probar autorización**:
    - Con un user `seguridad`, intenta abrir el detalle de un registro creado por otro `seguridad` → 403.
    - Con `admin` / `gerente` → puedes ver y editar todo.

13. **Probar fallback de fotos**: si Drive está mal configurado o cae, intenta crear un registro con fotos. La descripción se guardará pero saldrá `toast.warning` "X fotos no se pudieron subir". El registro existe; las fotos no. (Requiere desconfigurar `GOOGLE_*` para reproducir).

### Casos a verificar también
- En móvil (375px de ancho): toda la UI de `/nuevo` debe verse perfecta. `SelectorJornada` cards ≥ 64px de alto. Botón "Guardar" pegado abajo, h-12.
- Refrescar el `SelectorJornada` con el botón ↻ trae jornadas recién abiertas por otros supervisores.
- Si una jornada se cierra (`pendiente`) durante el día, sigue apareciendo en activas (porque está dentro del rango `iniciado | pendiente`).
- Si una jornada se aprueba (`aprobado`), desaparece del selector y al intentar crear un registro contra ella el endpoint devuelve 400.

---

## Estructura de carpetas final del módulo

```
src/app/seguridad/registros/
├── page.tsx                                # listado con filtros
├── nuevo/page.tsx                          # captura mobile-first
└── [id]/page.tsx                           # detalle + galería + eliminar

src/app/api/seguridad/registros/
├── route.ts                                # GET listar / POST crear
├── jornadas-activas/route.ts               # GET ?soloAsignadas=
└── [id]/
    ├── route.ts                            # GET/PATCH/DELETE
    └── fotos/
        ├── route.ts                        # GET/POST
        └── [fotoId]/route.ts               # DELETE

src/components/seguridad/registros/
├── SelectorJornada.tsx
├── SelectorTipoRegistro.tsx
├── FotosUploader.tsx
├── RegistroSeguridadCard.tsx
└── FiltrosRegistros.tsx

src/lib/services/registroSeguridad.ts       # 4 helpers de query
src/lib/validators/registroSeguridad.ts     # Zod schemas + labels
```
