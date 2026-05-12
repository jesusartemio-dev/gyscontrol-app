# VALIDACIÓN PRE-FASE 0 — Plan de Trabajo
Fecha: 2026-05-08

---

## Item 1: HELPER validarPermisoCronograma
**✓ Confirmado**

**Ruta exacta:** `src/lib/services/cronogramaPermisos.ts`

**Firmas de todas las funciones exportadas:**

```ts
// src/lib/services/cronogramaPermisos.ts — líneas 10, 37-93, 98-107, 112-121, 126-135, 140-149

export const ROLES_CRONOGRAMA = ['admin', 'gerente', 'gestor', 'coordinador'] as const
// línea 10

export async function validarPermisoCronograma(
  cronogramaId: string,
  options: { ignoreBloqueo?: boolean } = {}
): Promise<ResultadoValidacion>
// líneas 37-93 — ResultadoValidacion = ValidacionExitosa | ValidacionError
// ValidacionExitosa: { ok: true, userId, role, cronogramaId, cronogramaTipo, proyectoId }
// ValidacionError:   { ok: false, response: NextResponse }

export async function validarPermisoCronogramaPorEdt(edtId: string): Promise<ResultadoValidacion>
// líneas 98-107

export async function validarPermisoCronogramaPorTarea(tareaId: string): Promise<ResultadoValidacion>
// líneas 112-121

export async function validarPermisoCronogramaPorFase(faseId: string): Promise<ResultadoValidacion>
// líneas 126-135

export async function validarPermisoCronogramaPorActividad(actividadId: string): Promise<ResultadoValidacion>
// líneas 140-149
```

**Reglas del helper (líneas 37-93):**
1. Auth: session requerida → 401
2. Rol en ROLES_CRONOGRAMA → 403 si no
3. Cronograma existe → 404 si no
4. tipo !== 'comercial' → 403 si es comercial
5. !bloqueado (salvo ignoreBloqueo: true) → 403 si bloqueado

**Ejemplo de uso real** — `src/app/api/proyectos/[id]/cronograma/fases/route.ts`, línea 16:

```ts
// src/app/api/proyectos/[id]/cronograma/fases/route.ts — líneas 1-60 (fragmento POST típico)
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'

// Patrón de uso en todos los 15 route handlers que lo importan:
const permiso = await validarPermisoCronograma(cronogramaId)
if (!permiso.ok) return permiso.response   // devuelve 401/403/404 directamente
// Si ok: usar permiso.userId, permiso.proyectoId, permiso.cronogramaTipo
```

**Archivos que lo usan** (15 route handlers):
- `src/app/api/proyectos/[id]/cronograma/fases/route.ts`
- `src/app/api/proyectos/[id]/cronograma/edts/route.ts`
- `src/app/api/proyectos/[id]/cronograma/tareas/route.ts`
- `src/app/api/proyectos/[id]/cronograma/actividades/route.ts`
- `src/app/api/proyectos/[id]/cronograma/importar-excel/route.ts`
- `src/app/api/proyectos/[id]/cronograma/import-edts/route.ts`
- `src/app/api/proyectos/[id]/cronograma/import-tareas/route.ts`
- `src/app/api/proyectos/[id]/cronograma/[cronogramaId]/baseline/route.ts`
- `src/app/api/proyectos/[id]/cronograma/dependencias/route.ts`
- `src/app/api/proyectos/[id]/cronograma/dependencias/[dependenciaId]/route.ts`
- `src/app/api/proyectos/[id]/cronograma/tree/[nodeId]/route.ts`
- `src/app/api/proyectos/[id]/fases/[faseId]/route.ts`
- `src/app/api/proyectos/[id]/actividades/[actividadId]/route.ts`
- `src/app/api/proyecto-edt/[id]/route.ts`
- `src/app/api/proyecto-edt/[id]/tareas/[tareaId]/route.ts`

**Helpers tipo "¿puede el usuario X acceder al proyecto Y"?**
No existe un helper centralizado genérico para acceso al proyecto. Lo que existe es:
- `validarPermisoCronograma*` para operaciones de cronograma (centralizado, en `cronogramaPermisos.ts`)
- Comprobación inline en cada route handler de proyecto usando `rolesConAccesoTotal`, `esGestorDelProyecto`, `esComercialDelProyecto` (no centralizado)
- `canEdit`, `hasAccess` existen solo en módulos de listas/equipo y section-access (`src/lib/services/section-access.ts`) — no son helpers de acceso a proyecto

---

## Item 2: SERVICIO GOOGLE DRIVE
**✓ Confirmado**

**Ruta exacta:** `src/lib/services/googleDrive.ts`

**Firmas exactas:**

```ts
// src/lib/services/googleDrive.ts

// líneas 158-181
export async function uploadFile(options: {
  folderId: string
  fileName: string
  mimeType: string
  buffer: Buffer
}): Promise<drive_v3.Schema$File>   // res.data: { id, name, mimeType, size, modifiedTime, webViewLink,
                                     //            thumbnailLink, iconLink, parents, createdTime }

// líneas 188-206
export async function createFolder(options: {
  parentId: string
  folderName: string
}): Promise<drive_v3.Schema$File>   // res.data: { id, name, mimeType, webViewLink, parents, createdTime }

// líneas 105-156
export async function getFileContent(fileId: string): Promise<{
  data: Buffer
  mimeType: string
  fileName: string
}>

// líneas 183-186
export async function deleteFile(fileId: string): Promise<void>

// líneas 52-91
export async function listFiles(options: {
  folderId?: string; query?: string; pageSize?: number; pageToken?: string;
  orderBy?: string; driveId?: string
}): Promise<{ files: drive_v3.Schema$File[]; nextPageToken?: string }>

// líneas 93-103
export async function getFile(fileId: string): Promise<drive_v3.Schema$File>

// líneas 30-50 — helpers auxiliares:
export function getSharedDriveId(): string
export function getAdminDriveId(): string
export function getAllowedDriveIds(): string[]
```

**¿Existe helper tipo "getOrCreateProjectFolder"?**
No en `googleDrive.ts`. El patrón se repite *inline* en cada route handler de adjuntos como función privada local:
- `getOrCreateComprobantesFolder(hojaId)` en `src/app/api/gasto-adjunto/route.ts`, línea 8
- `getOrCreateDepositoFolder(hojaId)` en `src/app/api/hoja-de-gastos-adjunto/route.ts`, línea 7
- `getOrCreateCxPFolder()` en `src/app/api/cxp-adjunto/route.ts`, línea 9
- `getOrCreateCxCFolder()` en `src/app/api/cxc-adjunto/route.ts`, línea 9
- `getOrCreateLogosFolder()` en `src/app/api/clientes/[id]/logo/route.ts`, línea 16
- `getOrCreateRegistroFolder(registroId)` en `src/app/api/seguridad/registros/[id]/fotos/route.ts`, línea 11

No existe un helper compartido en `src/lib/services/`. Cada módulo duplica el patrón.

**Ejemplo de uso real** — `src/app/api/gasto-adjunto/route.ts`, líneas 78-96:

```ts
// src/app/api/gasto-adjunto/route.ts — líneas 78-96
const driveFile = await uploadFile({
  folderId,                                    // carpeta obtenida de getOrCreateComprobantesFolder()
  fileName: file.name,
  mimeType: file.type || 'application/octet-stream',
  buffer,
})
const adjunto = await prisma.gastoAdjunto.create({
  data: {
    gastoLineaId: gastoLineaId || null,
    gastoComprobanteId: gastoComprobanteId || null,
    nombreArchivo: file.name,
    urlArchivo: driveFile.webViewLink || '',   // URL para ver en browser
    driveFileId: driveFile.id || null,          // ID para eliminar/referenciar
    tipoArchivo: file.type || null,
    tamano: file.size || null,
  },
})
```

**uploadFile devuelve** (campo `res.data` — `drive_v3.Schema$File`):
```
{ id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink, iconLink, parents, createdTime }
```
Los campos más usados en código son `driveFile.id` y `driveFile.webViewLink`.

---

## Item 3: PROYECTO CONTEXT (cliente)
**✗ Diferente al reporte: el hook se llama `useProyectoContext`, no `useProyecto`**

**Ruta:** `src/app/proyectos/[id]/ProyectoContext.tsx`

**Tipo/interface completo del contexto** (líneas 6-53):

```ts
// src/app/proyectos/[id]/ProyectoContext.tsx — líneas 6-53

export interface CronogramaStats {
  cronogramas: number
  fases: number
  fasesEnProgreso: number
  edts: number
  tareas: number
  tareasCompletadas: number
  tareasEnProgreso: number
  tareasExtra: number
  horasPlan: number
  horasReales: number
  costoPlanificado: number
  tareasConRecurso: number
  tareasConResponsable: number
  tareasVencidas: number
  fechaInicioPlan: string | null
  fechaFinPlan: string | null
  costoPorEdt?: Record<string, { edtNombre: string; costo: number; tareas: number; tareasConRecurso: number }>
  activeCronograma: ProyectoCronograma | null
}

export interface CostosReales {
  equipos: number
  servicios: number
  gastos: number
  total: number
  loading: boolean
}

export interface ProyectoContextType {
  proyecto: Proyecto | null
  setProyecto: (proyecto: Proyecto) => void
  refreshProyecto: () => Promise<void>
  loading: boolean
  cronogramaStats: CronogramaStats
  costosReales: CostosReales
  refreshCostosReales: () => void
}
```

**Hook exportado:** `useProyectoContext()` (línea 47) — el reporte menciona `useProyecto()` que NO existe con ese nombre.

**¿El layout.tsx envuelve con el Provider?**
Sí. `src/app/proyectos/[id]/layout.tsx` importa `ProyectoContext` en línea 34 y provee el contexto con valor completo.

**¿Lo consumen la página de Matriz y la de Organigrama?**
NO. Revisión directa de `src/app/proyectos/[id]/organigrama/page.tsx` y `src/app/proyectos/[id]/matriz-comunicacion/page.tsx`: ninguna hace import de `ProyectoContext` ni llama a `useProyectoContext()`. Ambas hacen sus propios fetch independientes con `fetch('/api/proyectos/${proyectoId}')`.

**Archivos que SÍ consumen el contexto:**
```
src/app/proyectos/[id]/page.tsx
src/app/proyectos/[id]/servicios/page.tsx
src/app/proyectos/[id]/equipos/page.tsx
src/app/proyectos/[id]/tareas/page.tsx
src/app/proyectos/[id]/ssoma/page.tsx
src/app/proyectos/[id]/personal/page.tsx
```

Organigrama y Matriz NO consumen el contexto.

---

## Item 4: CRONOGRAMA DE PLANIFICACIÓN
**✓ Confirmado con matices**

**¿El campo `tipo` es string o enum en Prisma?**
Es `String` en el schema (no enum Prisma). Confirmado en el modelo `ProyectoCronograma`:
```prisma
// prisma/schema.prisma — sección ProyectoCronograma (extraído del reporte de arquitectura)
tipo  String  // valores: 'comercial' | 'planificacion' | 'ejecucion'
```

**¿Existe constante/enum en código TS?**
No hay un `enum` TypeScript dedicado para el tipo de cronograma. El valor está hardcodeado como strings literales en varios lugares. En `route.ts` del cronograma se usa Zod para validar:

```ts
// src/app/api/proyectos/[id]/cronograma/route.ts — líneas 18-24
const createCronogramaSchema = z.object({
  tipo: z.enum(['comercial', 'planificacion', 'ejecucion']),
  ...
})
```

Y nombres automáticos en objeto constante:
```ts
// líneas 27-31
const NOMBRES_CRONOGRAMA: Record<string, string> = {
  comercial: 'Comercial',
  planificacion: 'Línea Base',
  ejecucion: 'Ejecución'
}
```

También en `src/app/proyectos/[id]/layout.tsx` se filtran con strings literales `'ejecucion'` y `'planificacion'`.

**Handler POST completo** (simplificado — el handler completo ocupa líneas 79-501):

El POST acepta:
```ts
{
  tipo: 'comercial' | 'planificacion' | 'ejecucion',
  nombre?: string,
  copiadoDesdeCotizacionId?: string,
  copiarDesdeId?: string,  // Si viene → copia estructura completa
  esBaseline?: boolean     // default false
}
```

Flujo resumido:
1. Valida sesión y proyecto
2. Verifica límites (máx 1 por tipo; ejecución requiere baseline previo)
3. Si `copiarDesdeId` → copia fases/edts/actividades/tareas con `$queryRaw` para actividades y tareas
4. Si NO `copiarDesdeId` → crea cronograma vacío (sin fases)
5. Cuando `tipo === 'planificacion'` sin copiar → `esBaseline = true` automáticamente
6. Cuando crea `ejecucion` desde un baseline → bloquea el baseline origen

**¿Qué pasa si no se manda `copiarDesdeId`?**
Crea un cronograma vacío (sin fases, sin EDTs, sin tareas). No falla. Retorna `{ success: true, data: cronograma }` con status 201.

---

## Item 5: ENDPOINT ÁRBOL DEL CRONOGRAMA
**✓ Confirmado con diferencias vs. reporte**

**Ruta exacta:** `src/app/api/proyectos/[id]/cronograma/tree/route.ts`

**El reporte menciona `/tree?cronogramaId={id}` — eso es correcto.** No existe subruta `/tree/[nodeId]` separada para el árbol completo (hay un `tree/[nodeId]/route.ts` para operaciones de nodo individual, no para GET del árbol).

**Handler GET — primeras 60 líneas** (líneas 17-82):

```ts
// src/app/api/proyectos/[id]/cronograma/tree/route.ts — líneas 17-35
export async function GET(request: NextRequest, { params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const expandedNodes = searchParams.get('expandedNodes')?.split(',') || []
  const includeProgress = searchParams.get('includeProgress') === 'true'
  const maxDepth = parseInt(searchParams.get('maxDepth') || '6')
  const cronogramaId = searchParams.get('cronogramaId')
  // ...
}
```

**¿Acepta filtros adicionales?**
Sí — más parámetros de los que menciona el reporte:
- `?cronogramaId={id}` — filtrar por cronograma específico
- `?expandedNodes=fase-abc,edt-xyz` — lista de nodos expandidos (coma-separada)
- `?includeProgress=true` — incluir progreso (leído pero no parece usarse aún)
- `?maxDepth=6` — profundidad máxima (leído, valor default 6, pero no se aplica en el mapping actual)

**Fallback sin `cronogramaId`** (líneas 126-231): selecciona por prioridad: ejecución > planificación baseline > cualquiera > todas las fases.

**Estructura exacta del JSON devuelto** (líneas 539-573):

```json
{
  "success": true,
  "data": {
    "tree": [{
      "id": "proyecto-{id}",
      "type": "proyecto",
      "nombre": "...",
      "level": 0,
      "expanded": true,
      "data": { "fechaInicioComercial": "...", "fechaFinComercial": "...", "horasEstimadas": 0 },
      "metadata": {
        "hasChildren": true,
        "totalChildren": N,
        "progressPercentage": 0,
        "status": "pendiente",
        "recursosTotales": N, "recursosAsignados": N,
        "recursosExtrasTotales": N, "recursosExtrasAsignados": N,
        "responsablesTotales": N, "responsablesAsignados": N,
        "responsablesExtrasTotales": N, "responsablesExtrasAsignados": N
      },
      "children": [{
        "id": "fase-{id}", "type": "fase", "level": 1,
        "data": { "descripcion": "...", "fechaInicioComercial": "...", "fechaFinComercial": "...",
                  "fechaInicioReal": "...", "fechaFinReal": "...", "estado": "...",
                  "progreso": 0, "orden": 0, "horasEstimadas": N },
        "children": [{
          "id": "edt-{id}", "type": "edt", "level": 2,
          "data": { "edtId": "...", "horasEstimadas": N, "responsableId": "...", "responsableNombre": "..." },
          "children": [{
            "id": "actividad-{id}", "type": "actividad", "level": 3,
            "data": { "horasEstimadas": N, "horasReales": N, "responsableId": "...", ... },
            "children": [{
              "id": "tarea-{id}", "type": "tarea", "level": 4,
              "data": { "fechaInicio": "...", "fechaFin": "...", "horasEstimadas": N,
                        "recursoId": "...", "recursoNombre": "...", "esExtra": false,
                        "personasEstimadas": 1, ... },
              "children": []
            }]
          },
          {
            "id": "extras-group-{edtId}", "type": "actividad", "level": 3,
            "nombre": "Tareas Extras",
            "data": { "isExtrasGroup": true, "orden": 9999, ... }
          }]
        }]
      }]
    }]
  }
}
```

**Diferencia con el reporte de arquitectura:** el reporte describe una estructura simplificada. La real agrega: `metadata` con conteos de recursos/responsables propagados bottom-up, `expanded` por nodo, un pseudo-nodo "Tareas Extras" al final de cada EDT para tareas sin actividad, y la raíz es siempre el nodo de proyecto (nivel 0).

---

## Item 6: ORGANIGRAMA EXPORT PNG
**✓ Confirmado con diferencia menor**

**¿Está inline o importada?**
Está 100% inline en `src/app/proyectos/[id]/organigrama/page.tsx` como función de componente. No es una función importada de otro archivo.

**Función completa** (líneas 308-420):

```ts
// src/app/proyectos/[id]/organigrama/page.tsx — líneas 308-420
const handleExportPng = async () => {
  try {
    const { buildLayout, NORMAL_DIMS } = await import('@/components/organigrama/OrgChart')
    const { nodes, edges, svgWidth, svgHeight } = buildLayout(nodos, NORMAL_DIMS)
    const { NODE_W, NODE_H } = NORMAL_DIMS
    const SCALE = 2  // hardcodeado — no configurable sin editar código

    const canvas = document.createElement('canvas')
    canvas.width = svgWidth * SCALE
    canvas.height = svgHeight * SCALE
    const ctx = canvas.getContext('2d')!
    ctx.scale(SCALE, SCALE)

    // Background (#F8FAFC) + dot grid (cada 24px, círculos #CBD5E1)
    // Edges: bezierCurveTo con strokeStyle #94A3B8
    // Nodos: roundedRect de 8px radio; GYS=bg #2E4057, vacante=bg blanco borde rojo
    // Texto: cargoLabel (9px bold), nombre (13px bold), tel/cip/email (10px)
    // ... [dibujado completo de background, edges, nodes]

    const link = document.createElement('a')
    link.download = `organigrama-${proyectoId}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    toast.success('Imagen exportada')
  } catch (e) {
    console.error(e)
    toast.error('Error al exportar imagen')
  }
}
```

**Dimensiones del canvas:**
- `svgWidth` y `svgHeight` son calculados por `buildLayout()` en `OrgChart.tsx` según el número de nodos y `NORMAL_DIMS` (no son fijos)
- `canvas.width = svgWidth * 2`, `canvas.height = svgHeight * 2` (resolución 2x retina)
- `SCALE = 2` hardcodeado en línea 313, no es parámetro configurable

**¿Podría extraerse a `src/lib/organigrama/exportPng.ts` sin cambios grandes?**
Sí, con cambios menores: la función usa `nodos` (estado del componente), `proyectoId` (params), y `toast` (UI). Al extraerla habría que pasarlos como argumentos. El resto del Canvas API es puro y no depende del DOM del componente.

**Diferencia con el reporte:** El reporte (REPORTE_ARQUITECTURA.md sección 6.3) describe correctamente el flujo. La función real se llama `handleExportPng` (no `exportarPng` como menciona el reporte en las secciones 5.3 y 10.6 de forma inconsistente — el código usa `handleExportPng`).

---

## Item 7: CAMPOS DE CABECERA DEL PROYECTO
**✓ Confirmado con matices**

**Modelo `Proyecto` en `prisma/schema.prisma`** (líneas 1034-1138) — verificación de campos solicitados:

| Campo | Existe en schema | Notas |
|-------|-----------------|-------|
| `codigo` | ✓ | línea 1053 |
| `nombre` | ✓ | línea 1044 |
| `descripcion` | ✓ | línea 1045 (opcional `?`) |
| `numeroContrato` | ✓ | línea 1068 (opcional `?`) |
| `ordenCompraCliente` | ✓ | línea 1075 (opcional `?`) |
| `fechaFirmaContrato` | ✓ | línea 1069 (opcional `?`) |
| `fechaInicio` | ✓ | línea 1055 (requerido) |
| `fechaFin` | ✓ | línea 1056 (opcional `?`) |
| `clienteId` | ✓ | línea 1036 (opcional `?`) |
| `gestorId` | ✓ | línea 1038 (requerido) |
| `supervisorId` | ✓ | línea 1041 (opcional `?`) |
| `liderId` | ✓ | línea 1042 (opcional `?`) |

Todos los 12 campos mencionados EXISTEN en el schema.

**Bloque `include` del GET en `src/app/api/proyectos/[id]/route.ts`** (líneas 77-138):

```ts
// src/app/api/proyectos/[id]/route.ts — líneas 77-138
include: {
  cliente: { select: { id, codigo, nombre, ruc, logoUrl } },
  comercial: { select: { id, name, email } },
  gestor:    { select: { id, name, email } },
  listaEquipo: { select: { id, nombre, estado, createdAt } },
  cotizacion: { select: { id, codigo, nombre, estado } },
  // Si ?metricas=true: proyectoEdt con horasPlan, horasReales...
  proyectoCronograma: {
    select: {
      id, tipo, nombre, esBaseline,
      proyectoFase: { select: { id, nombre, estado } },
      proyectoEdt:  { select: { id, nombre, estado, porcentajeAvance } }
    }
  }
}
```

**Campos de los 12 solicitados que NO están en la respuesta del endpoint principal:**
- `supervisor` — no incluido (solo `supervisorId` viene por campos escalares del modelo)
- `lider` — no incluido (solo `liderId` viene por campos escalares)
- `numeroContrato`, `ordenCompraCliente`, `fechaFirmaContrato` — son campos escalares del modelo, SÍ vienen en la respuesta (todo campo escalar del modelo se incluye automáticamente si no se usa `select`)

**Aclaración importante:** el query usa `include`, no `select`, por lo que TODOS los campos escalares del modelo `Proyecto` se devuelven (incluyendo `numeroContrato`, `ordenCompraCliente`, `fechaFirmaContrato`, etc.). Solo las relaciones deben declararse explícitamente. Las relaciones `supervisor` y `lider` NO están en el `include`, por lo que no se devuelven los objetos de usuario de supervisor ni lider — solo sus IDs (`supervisorId`, `liderId`).

---

## Item 8: MODELO CLIENTE
**✓ Confirmado**

**Modelo `Cliente` completo** en `prisma/schema.prisma` (líneas 161-195):

```prisma
model Cliente {
  id                       String                 @id
  codigo                   String                 @unique
  numeroSecuencia          Int?                   @default(1)
  nombre                   String
  ruc                      String?
  direccion                String?
  telefono                 String?
  correo                   String?
  createdAt                DateTime               @default(now())
  updatedAt                DateTime
  calificacion             Int?                   @default(3)
  estadoRelacion           String                 @default("prospecto")
  frecuenciaCompra         String?
  linkedin                 String?
  potencialAnual           Float?
  sector                   String?
  sitioWeb                 String?
  tamanoEmpresa            String?
  ultimoProyecto           DateTime?
  calificacionSatisfaccion Int?                   @default(3)
  frecuenciaCompraMeses    Int?
  logoUrl                  String?
  cotizacion               Cotizacion[]
  proyecto                 Proyecto[]
  crmContactoCliente       CrmContactoCliente[]
  crmHistorialProyecto     CrmHistorialProyecto[]
  crmOportunidad           CrmOportunidad[]
  cuentasPorCobrar         CuentaPorCobrar[]
  tarifasRecursos          TarifaClienteRecurso[]
  descuentosHH             ConfigDescuentoHH[]
  valorizacionesHH         ValorizacionHH[]

  @@map("cliente")
}
```

**¿Tiene logoUrl, urlLogo, driveLogoId o similar?**
`logoUrl` ✓ (línea 183). No existe `urlLogo` ni `driveLogoId`.

**¿Tiene ruc, direccion, telefono, email, codigo?**
- `ruc` ✓ (opcional)
- `direccion` ✓ (opcional)
- `telefono` ✓ (opcional)
- `correo` ✓ (campo se llama `correo`, NO `email`)
- `codigo` ✓ (`@unique`)

**Diferencia con el reporte:** el campo de email se llama `correo` (no `email`). El reporte de arquitectura no lo menciona explícitamente pero el campo `correo` no es `email`.

---

## Item 9: DRAG-DROP REORDENABLE
**✓ Confirmado — existe e implementado**

**Librería instalada:** `@dnd-kit/core` y `@dnd-kit/sortable` (confirmado en `package.json` vía uso en `src/components/ui/sortable-list.tsx` línea 14-29 y en archivos de módulos).

**Módulos que usan drag-drop** (15 archivos en total):
- `src/components/ui/sortable-list.tsx` — componente genérico reutilizable
- `src/components/ui/sortable-item.tsx` — item individual sortable
- `src/hooks/useSortableList.ts` — hook que llama a `POST /api/proyectos/{id}/reordenar`
- `src/app/proyectos/[id]/listas/page.tsx` — listas de equipos
- `src/app/proyectos/[id]/pedidos/page.tsx` — pedidos
- `src/components/proyectos/cronograma/ProyectoEdtList.tsx` — cronograma EDTs
- `src/components/cotizaciones/CotizacionEquipoItemTable.tsx` — items cotización
- `src/components/equipos/ListaEquipoItemList.tsx`
- `src/components/seguridad/registros/GaleriaFotosSortable.tsx`
- Y otros

**¿La Matriz de Comunicaciones usa drag-drop?**
NO. Revisión de `src/app/proyectos/[id]/matriz-comunicacion/page.tsx`: no hay importaciones de `@dnd-kit` ni `useSortable`. El reordenamiento de filas de la Matriz no está implementado con DnD.

**Snippet de implementación del componente genérico** (src/components/ui/sortable-list.tsx, líneas 43-156):

```ts
// src/components/ui/sortable-list.tsx — patrón DnD
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'

// Al soltar (dragEnd):
const reorderedItems = arrayMove(items, oldIndex, newIndex)
const updatedItems = reorderedItems.map((item, index) => ({ ...item, orden: index }))
await onReorder(updatedItems)  // callback pasado como prop
```

**¿Cómo se persiste el orden?**
POST bulk a un endpoint dedicado. El hook `useSortableList` (src/hooks/useSortableList.ts, línea 55) llama a:

```ts
POST /api/proyectos/${proyectoId}/reordenar
Body: {
  tipo: 'edt' | 'actividad' | 'tarea',
  proyectoId,
  parentId?,
  cronogramaId?,
  elementos: [{ id, orden }]  // array con todos los elementos y sus nuevos índices
}
```

El endpoint `src/app/api/proyectos/[id]/reordenar/route.ts` ejecuta `prisma.$transaction` actualizando cada elemento individualmente dentro de la transacción (no un bulk update con `updateMany`).

**Permisos del endpoint reordenar** (línea 67): Solo `comercialId` o `gestorId` del proyecto — no usa `validarPermisoCronograma`.

---

## Item 10: CONVENCIÓN DE FOLDERS DE COMPONENTES
**✓ Confirmado con observaciones**

**Contenido de `src/components/` (un nivel):**
```
admin/           administracion/    agente/          aprovisionamiento/
asistencia/      catalogo/          clientes/         comercial/
common/          configuracion/     cotizaciones/     crm/
cronograma/      dashboard/         debug/            drive/
equipos/         error/             examples/         finanzas/
gestion/         horas-hombre/      lazy/             logistica/
organigrama/     pdf/               plantillas/       proyectos/
rendiciones/     reportes/          requerimientos/   seguridad/
shared/          supervision/       tareas/           tdr/
trazabilidad/    ui/                valorizacion/
# + archivos raíz: ConfirmDialog.tsx, DeleteWithValidationDialog.tsx, LogoutButton.tsx,
# MobileNav.tsx, MobileSidebar.tsx, NotificacionesBell.tsx, NotificationSettings.tsx,
# PersonalClient.tsx, Providers.tsx, RadixProvider.tsx, RollbackButton.tsx, Sidebar.tsx,
# UsuariosClient.tsx
```

**Contenido de `src/app/proyectos/[id]/` (un nivel):**
```
ProyectoContext.tsx  cronograma/   equipos/   gastos/   layout.tsx   listas/
matriz-comunicacion/ organigrama/  page.tsx   pedidos/  personal/    recursos/
requerimientos/      servicios/    ssoma/     tareas/   tdr/
```

**¿Hay carpetas `_components`?** No. Ninguna subcarpeta usa la convención `_components`. Las páginas monolíticas (organigrama, matriz) contienen todo inline en `page.tsx`.

**Contenido de `src/app/proyectos/[id]/matriz-comunicacion/`:**
```
page.tsx  (único archivo — sin subcarpetas)
```

**Contenido de `src/app/proyectos/[id]/organigrama/`:**
```
page.tsx  (único archivo — sin subcarpetas)
```

**Organigrama: componentes locales vs. en `src/components/`:**
- Renderizador SVG: `src/components/organigrama/OrgChart.tsx` (exporta `buildLayout`, `NORMAL_DIMS`, `OrgNodoCompleto`)
- Lógica de nodos GYS: `src/lib/organigrama/nodosGys.ts`
- Toda la lógica de Canvas/PDF/edición: inline en `src/app/proyectos/[id]/organigrama/page.tsx` (1217 líneas)
- No hay carpeta `src/app/proyectos/[id]/organigrama/_components/`

**Observación:** La convención del proyecto es componentes reutilizables en `src/components/{módulo}/` y lógica de página inline en `page.tsx`. No existe convención `_components` local.

---

## Item 11: SEEDS Y MIGRATIONS
**✓ Confirmado**

**Seeds encontrados:**
- `prisma/seed.ts` — seed principal (usuario admin, etc.)
- `prisma/seed-section-access.ts` — seed de permisos de sección
- `prisma/seeds/organigrama.ts` — seed de plantillas de organigrama

**Scripts en `package.json`:**
```json
"db:seed": "tsx prisma/seed.ts",
"db:seed:organigrama": "tsx prisma/seeds/organigrama.ts"
```

**`prisma.seed` en package.json:** No existe la clave `"prisma": { "seed": "..." }` en `package.json`. Solo existen scripts npm con prefijo `db:seed`. El comando `prisma db seed` NO funcionará directamente — hay que usar los scripts npm.

**Migraciones** en `prisma/migrations/` — formato de nombres:

```
20251211165732_init                     ← formato: YYYYMMDDHHMMSS_descripcion
20251216191918                          ← a veces sin descripción
20251219221740_rename_categoria_servicio_to_edt
20260112192700_remove_formula_fields
20260212_margen_to_factor_venta_costo   ← a veces sin hora (solo YYYYMMDD_)
20260215_add_role_administracion
20260508100000_add_cliente_logo_url
20260508110000_add_plantilla_nodo_gys_parent_label  ← más reciente
migration_lock.toml
```

**Cantidad total de migraciones:** ~50+ (listadas parcialmente arriba).

**Formatos mixtos de nombres:**
1. `YYYYMMDDHHMMSS_descripcion` (formato Prisma estándar)
2. `YYYYMMDD_descripcion` (sin hora)
3. `YYYYMMDD` (sin descripción)

La inconsistencia en el formato es deuda técnica: algunas migraciones fueron creadas manualmente (sin `prisma migrate dev`).

---

## Item 12: ROLES Y PERMISOS
**✓ Confirmado**

**Enum `Role` en `prisma/schema.prisma`** (líneas 3439-3452):

```prisma
enum Role {
  colaborador
  comercial
  presupuestos
  proyectos
  coordinador
  coordinador_logistico
  logistico
  gestor
  gerente
  seguridad
  admin
  administracion
}
```

**¿Existen helpers `canEditProject`, `puedeEditarProyecto`, `tieneAccesoProyecto`?**
NO. No existen esas funciones en `src/lib/`. La validación de acceso al proyecto se hace inline en cada route handler.

**Route handler del organigrama POST — verificación de permisos:**

```ts
// src/app/api/proyectos/[id]/organigrama/route.ts — líneas 38-41
export async function POST(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // Sin verificación de rol específico — solo que exista sesión autenticada
```

El POST del organigrama solo verifica que el usuario esté autenticado. No verifica rol.

**Route handler del cronograma POST — verificación de permisos:**

```ts
// src/app/api/proyectos/[id]/cronograma/route.ts — líneas 79-94
export async function POST(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // Sin verificación de rol — solo autenticación
  // ...
  // Nota: el DELETE del cronograma SÍ verifica rol (líneas 554-559):
  // const rolesPermitidos = ['admin', 'gerente', 'gestor', 'coordinador']
  // if (!rolesPermitidos.includes(userRole)) → 403
```

**Comparativa de verificación de permisos:**

| Handler | Nivel de verificación |
|---------|----------------------|
| POST organigrama | Solo autenticado |
| POST cronograma | Solo autenticado |
| DELETE cronograma (baseline) | Rol: admin/gerente/gestor/coordinador |
| PATCH fases/edts/tareas/actividades | `validarPermisoCronograma()` (rol + tipo + bloqueado) |
| DELETE organigrama/nodo (esFijoGys) | Solo 400 si es fijo |
| POST reordenar | gestorId o comercialId del proyecto |

---

## 🚨 INCONSISTENCIAS Y BLOQUEOS

### I-1: Hook del contexto tiene nombre diferente al reportado
El reporte de arquitectura menciona `useProyecto()` (sección 7). El código real exporta `useProyectoContext()` (línea 47 de ProyectoContext.tsx). Si el Plan de Trabajo consume el contexto debe usar `useProyectoContext`.

### I-2: Organigrama y Matriz NO consumen ProyectoContext
El reporte indica que "todos los módulos acceden al contexto via useProyecto()". Pero organigrama y matriz-comunicacion NO lo hacen — tienen fetches independientes. El Plan de Trabajo puede usar el contexto (como servicios/equipos/tareas) O hacer fetch propio (como organigrama/matriz).

### I-3: uploadFile devuelve `drive_v3.Schema$File` (tipo nullable)
Todos los campos de `drive_v3.Schema$File` son opcionales (`string | null | undefined`). El código siempre hace `driveFile.id || null` y `driveFile.webViewLink || ''`. No hay garantía de que `id` o `webViewLink` no sean nulos — se debe verificar antes de guardar.

### I-4: No existe helper "getOrCreateProjectFolder" centralizado
Cada módulo duplica la función privada. Si el Plan de Trabajo requiere subir archivos a Drive, tendrá que crear su propio `getOrCreatePlanTrabajoFolder()` o se debe refactorizar a un helper en `src/lib/services/googleDrive.ts`.

### I-5: `copiarDesdeId` en POST cronograma usa `$queryRaw` para actividades y tareas
El POST de cronograma copia fases y EDTs con Prisma Client pero copia actividades y tareas con `$queryRaw` (líneas 285-367). Esto viola la regla de "evitar raw SQL" del MEMORY.md y hace el código frágil. Si se agrega un nuevo campo a `ProyectoActividad` o `ProyectoTarea`, el $queryRaw de copia quedaría desactualizado silenciosamente.

### I-6: Endpoint `/api/proyectos/[id]/reordenar` no usa `validarPermisoCronograma`
El reordenamiento de EDTs/actividades/tareas verifica solo que el usuario sea `gestorId` o `comercialId` del proyecto (línea 67), no que tenga rol `ROLES_CRONOGRAMA`. Es inconsistente con el patrón del resto de endpoints de cronograma.

### I-7: Formato de nombres de migración inconsistente
Hay 3 formatos distintos. La migración `20251216191918` no tiene descripción. Algunas no tienen hora. Dificulta identificar migraciones en producción.

### I-8: `prisma.seed` no configurado en package.json
`prisma db seed` no funcionará. Solo funcionan los scripts npm `db:seed` y `db:seed:organigrama`. Los nuevos colaboradores podrían asumir que `prisma db seed` funciona.

### I-9: `ProyectoEstado` enum tiene diferencia con el reporte
El reporte de arquitectura lista el enum incluyendo `en_revision` y `aprobado`. El schema real (líneas 3426-3437) tiene `listas_pendientes` en su lugar y no tiene `en_revision` ni `aprobado`. Los estados reales son: `creado, en_planificacion, listas_pendientes, listas_aprobadas, pedidos_creados, en_ejecucion, en_cierre, cerrado, pausado, cancelado`.

### I-10: `handleExportPng` vs `exportarPng` — nombre inconsistente en el reporte
El reporte (sección 5.3 y 10.6) llama a la función `exportarPng`. El código real la llama `handleExportPng`. Menor, pero importante para búsquedas en código.

---

## ✅ LISTO PARA FASE 1

Los siguientes items están confirmados y listos para usar sin modificaciones:

1. **`validarPermisoCronograma`** — listo, usar exactamente como está. Recuerda pasar `{ ignoreBloqueo: true }` si el Plan de Trabajo necesita editar cronogramas bloqueados (no probable).

2. **`src/lib/services/googleDrive.ts`** — listo. Para el Plan de Trabajo crear una función local `getOrCreatePlanTrabajoFolder(proyectoId)` siguiendo el patrón de `gasto-adjunto/route.ts`.

3. **`ProyectoContext`** — listo, usar `useProyectoContext()` (nombre correcto). Tener en cuenta que `supervisor` y `lider` no vienen como objetos relacionados en `proyecto` — solo sus IDs.

4. **`POST /api/proyectos/[id]/cronograma`** — listo. Sin `copiarDesdeId` crea cronograma vacío (correcto para Plan de Trabajo que se llenaría manualmente o con IA).

5. **`GET /api/proyectos/[id]/cronograma/tree`** — listo. Acepta `?cronogramaId=` y retorna árbol 5-niveles con metadata completa. Usar este endpoint como fuente del Plan de Trabajo.

6. **`handleExportPng`** — funcional. Extraerla a `src/lib/organigrama/exportPng.ts` es un refactor deseable pero no bloqueante para el Plan de Trabajo.

7. **Modelo `Proyecto`** — todos los campos del Plan de Trabajo existen. Agregar `supervisor` y `lider` explícitamente al `include` del endpoint que use el Plan de Trabajo.

8. **Modelo `Cliente`** — listo. `logoUrl` existe. Campo email se llama `correo`.

9. **`@dnd-kit`** — instalado y con patrón establecido (`SortableList` + `useSortableList` + `POST /reordenar`). Listo para reutilizar en el Plan de Trabajo si se requiere reordenamiento de filas/secciones.

10. **Convención de carpetas** — patrón confirmado: componentes reutilizables en `src/components/{módulo}/`, lógica de página en `page.tsx`. No usar `_components`.

11. **Seeds** — usar `npm run db:seed` (no `prisma db seed`). Para seeds del Plan de Trabajo crear `prisma/seeds/plan-trabajo.ts` y agregar script `"db:seed:plan-trabajo"` en package.json.

12. **Roles** — enum confirmado. Para el Plan de Trabajo reutilizar `validarPermisoCronograma` (que ya verifica `ROLES_CRONOGRAMA = ['admin', 'gerente', 'gestor', 'coordinador']`).

---

## ⚠️ RESOLUCIONES NECESARIAS ANTES DE IMPLEMENTAR

1. **Decidir si el Plan de Trabajo consume `ProyectoContext` o hace fetch propio.** Recomendado: consumir contexto (como hacen servicios/equipos/tareas) para consistencia, pero organigrama y matriz prueban que es opcional.

2. **Decidir el endpoint fuente del Plan de Trabajo:** ¿usar el cronograma `planificacion` con `GET /tree`? ¿O crear un endpoint propio? Si se reutiliza el tree endpoint, considerar que devuelve mucho más de lo que el Plan de Trabajo necesitaría.

3. **Si el DOCX del Plan de Trabajo incluye el organigrama:** definir si el PNG viene del cliente (base64 en el body del POST) o se implementa renderizado server-side con npm `canvas`.

4. **Centralizar `getOrCreateProjectFolder`** en `src/lib/services/googleDrive.ts` si el Plan de Trabajo también sube archivos — evitar duplicar la función por quinta vez.

5. **El `$queryRaw` en copia de cronograma es una deuda técnica conocida** — no bloquea el Plan de Trabajo pero si se necesita copiar el cronograma con campos nuevos de Plan de Trabajo, esos campos no se copiarán automáticamente.
