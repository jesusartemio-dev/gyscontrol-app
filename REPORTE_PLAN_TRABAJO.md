# REPORTE TÉCNICO — Plan de Trabajo
## Análisis focalizado para implementación del nuevo módulo

> Generado el 2026-05-08. Complementa REPORTE_ARQUITECTURA.md.
> Basado en lectura directa del código fuente; no contiene suposiciones.

---

## 1. CONVERSIÓN COTIZACIÓN → PROYECTO

### Endpoint responsable

`POST /api/proyecto/from-cotizacion`  
Archivo: `src/app/api/proyecto/from-cotizacion/route.ts`

El servicio client-side que lo invoca:  
`src/lib/services/proyecto.ts` → función `crearProyectoDesdeCotizacion(cotizacionId, data)`

### Flujo completo

1. Valida que la cotización existe y tiene `estado === 'aprobada'`.
2. Genera el código del proyecto como `{cliente.codigo}{numeroSecuencia:02}` (ej: `ABC03`).
3. Incrementa `cliente.numeroSecuencia` para el siguiente proyecto.
4. Crea el `Proyecto` con FK `cotizacionId` (la referencia se mantiene). No hay ruptura del vínculo.
5. Copia equipos, servicios y gastos cotizados a modelos propios del proyecto.
6. Crea snapshot de TDR desde `CotizacionTdrAnalisis` → `ProyectoTdrAnalisis`.
7. Transfiere condiciones y exclusiones.
8. Actualiza `CrmOportunidad` vinculada.
9. Crea **solo** el cronograma `comercial`. El cronograma de planificación se crea más tarde manualmente.

### Campos copiados: Cotización → Proyecto (selección clave)

```ts
cotizacionId: cotizacion.id   // FK permanente
clienteId: cotizacion.clienteId
moneda: cotizacion.moneda
tipoCambio: cotizacion.tipoCambio
totalEquiposInterno: suma de cotizacionEquipo[].subtotalInterno
totalServiciosInterno, totalGastosInterno, totalInterno, totalCliente, descuento, grandTotal
```

### Copia de Servicios: campo `edtId` se preserva

```ts
proyectoServicioCotizado: {
  create: cotizacion.cotizacionServicio.map(grupo => ({
    nombre: grupo.nombre,
    edtId: grupo.edtId,             // referencia al catálogo EDT
    subtotalInterno, subtotalCliente, responsableId: gestorId,
    proyectoServicioCotizadoItem: {
      create: grupo.cotizacionServicioItem.map(item => ({
        catalogoServicioId: item.catalogoServicioId,
        edtId: item.edtId,
        costoHoraInterno: item.costoHora,
        costoHoraCliente: item.costoHora * item.margen,
        nombre: item.nombre, cantidadHoras: item.horaTotal,
        costoInterno, costoCliente,
      }))
    }
  }))
}
```

### Cronograma: solo se crea el `comercial` automáticamente

```ts
await prisma.proyectoCronograma.create({
  data: {
    proyectoId: proyecto.id,
    tipo: 'comercial',
    nombre: 'Cronograma Comercial',
    copiadoDesdeCotizacionId: cotizacion.id,
    esBaseline: false,
    version: 1,
  }
})
```

El cronograma de `planificacion` se crea manualmente via `POST /api/proyectos/[id]/cronograma` con `{ tipo: 'planificacion', copiarDesdeId: cronogramaComercialId }`.

---

## 2. PÁGINAS Y APIS — EQUIPOS / SERVICIOS / GASTOS DEL PROYECTO

### Equipos

- **Página:** `src/app/proyectos/[id]/equipos/page.tsx`
- **Servicio:** `src/lib/services/proyectoEquipo.ts` → llama `GET /api/proyecto-equipo/from-proyecto/{proyectoId}`
- **Modelo:** `ProyectoEquipoCotizado` (copia de cotización, no accede directamente a `CotizacionEquipo`)
- **Campos clave mostrados:** `subtotalCliente`, `subtotalInterno`, `costoListas` (planificado en listas), `items[]` con `estado` (`en_lista`, `reemplazado`, etc.)

### Servicios

- **Página:** `src/app/proyectos/[id]/servicios/page.tsx`
- **Modelo:** Los servicios vienen embebidos en `proyecto.servicios` del `ProyectoContext` (no hay fetch adicional). La página no llama a ningún endpoint separado.
- **Comparación mostrada:** `servicio.subtotalCliente` (cotizado al cliente) vs `servicio.subtotalInterno` (presupuesto) vs `cronogramaStats.costoPorEdt[edtId].costo` (costo planificado en cronograma).

### Gastos

- **Página:** `src/app/proyectos/[id]/gastos/page.tsx`
- **Modelo:** `proyecto.gastos` del contexto del layout.
- **Componente:** `src/components/proyectos/ProyectoGastoAccordion`

**Nota importante:** El endpoint `GET /api/proyectos/[id]/route.ts` (plural) NO incluye `proyectoServicioCotizado` ni `proyectoGastoCotizado` en su Prisma include. Los datos de servicios/gastos probablemente vienen del endpoint singular `GET /api/proyecto/[id]` — confirmar al implementar.

---

## 3. CRONOGRAMA DE PLANIFICACIÓN

### Cómo se filtra por tipo

```ts
// src/app/proyectos/[id]/layout.tsx — fetchCronogramaStats()
const activeCrono = cronogramasList.find(c => c.tipo === 'ejecucion')
  || cronogramasList.find(c => c.tipo === 'planificacion')
  || cronogramasList[0] || null
```

El endpoint `/api/proyectos/[id]/cronograma/tree` acepta `?cronogramaId={id}` para filtro explícito.

### Endpoints disponibles

| Método | Path | Descripción |
|--------|------|-------------|
| GET | `/api/proyectos/[id]/cronograma` | Lista todos los cronogramas |
| POST | `/api/proyectos/[id]/cronograma` | Crea cronograma (vacío o copiando) |
| DELETE | `/api/proyectos/[id]/cronograma?cronogramaId=X` | Elimina |
| GET | `/api/proyectos/[id]/cronograma/tree?cronogramaId=X` | Árbol jerárquico completo |
| GET | `/api/proyectos/[id]/cronograma/fases?cronogramaId=X` | Lista fases |
| GET | `/api/proyectos/[id]/cronograma/edts?cronogramaId=X` | Lista EDTs con `edt` (catálogo) |
| GET | `/api/proyectos/[id]/cronograma/tareas?cronogramaId=X` | Lista tareas |
| GET | `/api/proyectos/[id]/cronograma/costo-planificado` | Costo agregado por EDT |
| POST | `/api/proyectos/[id]/cronograma/importar` | Importar Excel/MS Project |
| GET | `/api/proyectos/[id]/cronograma/varianza` | Varianza comercial vs planificación |

### Árbol jerárquico anidado: SÍ EXISTE

`GET /api/proyectos/[id]/cronograma/tree?cronogramaId={id}` devuelve jerarquía completa en un solo request:

```json
{
  "data": {
    "tree": [{
      "id": "proyecto-{id}", "type": "proyecto", "level": 0,
      "children": [{
        "id": "fase-{id}", "type": "fase", "level": 1,
        "data": { "fechaInicioPlan": "...", "estado": "planificado", "progreso": 0 },
        "children": [{
          "id": "edt-{id}", "type": "edt", "level": 2,
          "data": { "edtId": "catálogoEdtId", "horasEstimadas": 40 },
          "children": [{
            "id": "actividad-{id}", "type": "actividad", "level": 3,
            "children": [{
              "id": "tarea-{id}", "type": "tarea", "level": 4,
              "data": { "horasEstimadas": 8, "recursoId": "...", "esExtra": false }
            }]
          }]
        }]
      }]
    }]
  }
}
```

### Relación `Edt` (catálogo) con `ProyectoEdt` (instancia)

- `Edt`: catálogo global (ej: "Ingeniería Básica", "Montaje Eléctrico") — tabla `edt`.
- `ProyectoEdt`: instancia del proyecto. Tiene FK `edtId` → `Edt.id`.
- En el árbol: `edt.data.edtId` = ID del catálogo; el nodo representa la instancia de proyecto.

---

## 4. INTEGRACIÓN MATRIZ DE COMUNICACIONES ↔ EDT

### Cómo carga EDTs (sin filtro por tipo de cronograma)

```ts
// src/app/api/proyectos/[id]/matriz-comunicacion/route.ts (POST con IA):
const proyectoEdtsRaw = await prisma.proyectoEdt.findMany({
  where: { proyectoId },   // SIN filtrar por tipo de cronograma
  include: { proyectoFase: { select: { nombre: true, orden: true } } },
  take: 60,
})
// Dedup por nombre (para no repetir EDTs del comercial y planificación):
const seenEdtNames = new Set<string>()
const edts = proyectoEdtsRaw
  .filter(e => {
    if (seenEdtNames.has(e.nombre)) return false
    seenEdtNames.add(e.nombre)
    return true
  })
  .map(e => ({ nombre: e.nombre, fase: e.proyectoFase?.nombre ?? 'Sin fase' }))
```

### Comportamiento sin cronograma de planificación

La Matriz funciona con solo el cronograma comercial porque la query no filtra por tipo. Hay EDTs disponibles incluso sin la línea base.

### El campo EDT en filas es texto libre, no un selector

```tsx
// src/app/proyectos/[id]/matriz-comunicacion/page.tsx:
{editingId === fila.id ? (
  <Input value={editInfo} onChange={(e) => setEditInfo(e.target.value)} />
) : (
  <span>{fila.informacion}</span>   // fila.informacion = edtNombre como string
)}
```

No hay `<Select>` de EDTs en la edición manual. El binding se genera con IA o se escribe a mano.

---

## 5. CABECERA DEL PROYECTO Y DATOS DEL CLIENTE

### Campos mostrados en el layout.tsx

```tsx
{proyecto.codigo}          // font-mono badge
{proyecto.nombre}          // h1
{proyecto.descripcion}     // subtítulo (si difiere del nombre)
{proyecto.cliente?.nombre} // Con icono Building
{proyecto.fechaInicio}     // Con icono Calendar
{proyecto.diasGarantia}    // Con icono Shield
{proyecto.grandTotal}      // formatCurrency
{proyecto.estado}          // EstadoProyectoStepper
{proyecto.cotizacionId}    // Botón de enlace a cotización
```

No se muestran en la cabecera: `ordenCompraCliente`, `numeroContrato`, `gestor.name`, `supervisor.name`.

### Payload del endpoint GET /api/proyectos/[id]

```ts
// src/app/api/proyectos/[id]/route.ts — include Prisma:
include: {
  cliente: { select: { id: true, codigo: true, nombre: true, ruc: true, logoUrl: true } },
  comercial: { select: { id: true, name: true, email: true } },
  gestor: { select: { id: true, name: true, email: true } },
  listaEquipo: { select: { id: true, nombre: true, estado: true, createdAt: true } },
  cotizacion: { select: { id: true, codigo: true, nombre: true, estado: true } },
  // Si ?metricas=true: proyectoEdt con horasPlan, horasReales...
  proyectoCronograma: { select: { id: true, tipo: true, nombre: true, esBaseline: true,
    proyectoFase: { id: true, nombre: true, estado: true },
    proyectoEdt: { id: true, nombre: true, estado: true, porcentajeAvance: true }
  }}
}
// NO incluye: supervisor, lider, proyectoEquipoCotizado, proyectoServicioCotizado, proyectoGastoCotizado
```

### Todos los campos del Proyecto disponibles para el Plan de Trabajo

```ts
// Del modelo Proyecto (prisma/schema.prisma):
id, clienteId, comercialId, gestorId, supervisorId?, liderId?
nombre, descripcion, codigo, estado
fechaInicio, fechaFin?
moneda, tipoCambio
totalEquiposInterno, totalServiciosInterno, totalGastosInterno, totalInterno
totalCliente, descuento, grandTotal, diasGarantia
adelantoPorcentaje, adelantoMonto, adelantoAmortizado
// Contrato:
numeroContrato?, fechaFirmaContrato?, fechaInicioContrato?, fechaFinContrato?
ordenCompraCliente?, fondoGarantiaPct, igvPct
// Relaciones:
cliente.{ id, codigo, nombre, ruc, logoUrl }
gestor.{ id, name, email }
supervisor?.{ id, name, email }
lider?.{ id, name, email }
comercial?.{ id, name, email }
cotizacion?.{ id, codigo, nombre, estado }
```

---

## 6. ORGANIGRAMA — EXPORTACIÓN PNG Y ESTRUCTURA DE NODOS

### Estructura de ProyectoOrgNodo

```ts
// Respuesta de GET /api/proyectos/[id]/organigrama:
{
  id: string
  proyectoId: string
  parentId: string | null   // árbol construido por el cliente con parentId
  orden: number
  cargoLabel: string        // "Gerente de Proyecto"
  userId: string | null     // null = vacante
  empresaOverride: string | null
  telefonoOverride: string | null
  cipOverride: string | null
  esFijoGys: boolean        // true = nodo de plantilla GYS
  user: { id: string, name: string, email: string, empleado: { telefono: string, cip: string } } | null
  // Computados:
  _telefono: string | null  // telefonoOverride ?? empleado.telefono
  _cip: string | null
  _empresa: string          // override ?? 'GYS CONTROL INDUSTRIAL SAC'
}
```

### Exportación PNG: 100% client-side con Canvas API

```ts
// src/app/proyectos/[id]/organigrama/page.tsx — handleExportPng():
const { buildLayout, NORMAL_DIMS } = await import('@/components/organigrama/OrgChart')
const { nodes, edges, svgWidth, svgHeight } = buildLayout(nodos, NORMAL_DIMS)
const SCALE = 2
const canvas = document.createElement('canvas')
canvas.width = svgWidth * SCALE
canvas.height = svgHeight * SCALE
const ctx = canvas.getContext('2d')!
ctx.scale(SCALE, SCALE)
// ... dibuja background, grid, edges, nodos con rounded rects, texto ...
const link = document.createElement('a')
link.download = `organigrama-${proyectoId}.png`
link.href = canvas.toDataURL('image/png')
link.click()
```

**No existe endpoint de servidor para obtener el PNG.** Para incluirlo en un DOCX server-side, hay que o bien recibir el PNG como base64 del cliente, o implementar renderizado con el paquete `canvas` de npm en Node.js.

### No existe generador DOCX del organigrama

No encontrado: no hay ruta `/api/proyectos/[id]/organigrama/docx/`. El organigrama solo exporta PNG (client-side).

---

## 7. TDR — FORMATOS DE CAMPOS JSON

Todos los tipos están en `src/types/tdr.ts`. Son columnas JSON en `ProyectoTdrAnalisis`.

### `equiposIdentificados`: `EquipoIdentificado[] | null`

```ts
interface EquipoIdentificado {
  nombre: string
  cantidad?: number
  especificacion?: string
  estimadoUsd?: number
  suministra?: 'contratista' | 'cliente'
  marcaSugerida?: string
}
// Ejemplo: [{ nombre: "PLC Siemens S7-1500", cantidad: 2, estimadoUsd: 4500, suministra: "contratista" }]
```

### `serviciosIdentificados`: `ServicioIdentificado[] | null`

```ts
interface ServicioIdentificado {
  nombre: string
  descripcion?: string
  horasEstimadas?: number
}
// Ejemplo: [{ nombre: "Ingeniería de detalle", horasEstimadas: 120 }]
```

### `personalRequerido`: `PersonalRequerido[] | null`

```ts
interface PersonalRequerido {
  rol: string
  cantidad: number
  experienciaAnios?: number
  certificaciones?: string[]
  obligatorio: boolean
}
// Ejemplo: [{ rol: "Ingeniero Eléctrico", cantidad: 1, certificaciones: ["CIP"], obligatorio: true }]
```

### `normasAplicables`: `NormaAplicable[] | null`

```ts
interface NormaAplicable {
  codigo: string
  nombre: string
  categoria?: 'electrica' | 'mecanica' | 'ssoma' | 'calidad' | 'otro'
}
// Ejemplo: [{ codigo: "IEC 60364", nombre: "Instalaciones eléctricas", categoria: "electrica" }]
```

### `documentosPrevios`: `DocumentoPrevio[] | null`

```ts
interface DocumentoPrevio {
  nombre: string
  diasAnticipacion?: number
  responsable?: 'contratista' | 'cliente'
  obligatorio: boolean
}
// Ejemplo: [{ nombre: "Planos de arquitectura", diasAnticipacion: 15, responsable: "cliente", obligatorio: true }]
```

### Tabla resumen otros campos JSON del TDR

| Campo | Tipo base |
|-------|-----------|
| `requerimientos` | `{ descripcion, cantidad?, especificacion?, criticidad?: 'alta'|'media'|'baja' }[]` |
| `cronogramaEstimado` | `{ fase, duracion?, observaciones? }[]` |
| `hitosContractuales` | `{ nombre, tipo: 'kom'|'fat'|'sat'|..., fechaEstimada?, diasDesdeInicio? }[]` |
| `riesgosCriticos` | `{ riesgo, probabilidad?, impacto?, mitigacion? }[]` |
| `penalidades` | `{ causa, tipo, valor, topeMaximo? }[]` |
| `garantias` | `{ fielCumplimiento?, adelanto?, responsabilidadCivil?, servicio? }` (objeto) |
| `presupuestoEstimado` | `{ equipos?, servicios?, gastos?, total? }` (objeto) |

### Endpoint PATCH del TDR de proyecto

`PATCH /api/proyecto/[id]/tdr-analisis` — acepta cualquier campo de `allowedFields` del tipo `TdrAnalisisCore`.

---

## 8. STORAGE DE ARCHIVOS — GOOGLE DRIVE

### Variables de entorno requeridas

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=...   # \n literales → se reemplazan por \n real
GOOGLE_SHARED_DRIVE_ID=...               # Drive de proyectos
GOOGLE_ADMIN_DRIVE_ID=...                # Drive de admin (fallback a SHARED si no existe)
```

### Helper service

Ubicación: `src/lib/services/googleDrive.ts`

```ts
// Funciones exportadas:
export async function uploadFile(options: {
  folderId: string
  fileName: string
  mimeType: string
  buffer: Buffer
}): Promise<drive_v3.Schema$File>   // devuelve { id, webViewLink, ... }

export async function createFolder(options: {
  parentId: string
  folderName: string
}): Promise<drive_v3.Schema$File>

export async function getFileContent(fileId: string): Promise<{
  data: Buffer
  mimeType: string
  fileName: string
}>

export async function deleteFile(fileId: string): Promise<void>
export async function listFiles(options: any): Promise<{ files: any[], nextPageToken?: string }>
```

### Patrón de upload + guardar referencia en BD

```ts
// src/app/api/gasto-adjunto/route.ts:
const driveFile = await uploadFile({
  folderId,               // carpeta en Drive (se crea si no existe)
  fileName: file.name,
  mimeType: file.type || 'application/octet-stream',
  buffer,
})
await prisma.gastoAdjunto.create({
  data: {
    nombreArchivo: file.name,
    urlArchivo: driveFile.webViewLink || '',  // URL para ver en browser
    driveFileId: driveFile.id || null,         // ID para operaciones posteriores
    tipoArchivo: file.type || null,
    tamano: file.size || null,
  },
})
```

**Patrón de naming de carpetas:** `Comprobantes_{proyecto.codigo}` o `Comprobantes_{centroCosto.nombre}`.

---

## 9. GENERADORES DOCX EXISTENTES

### Generador principal: Matriz de Comunicaciones

**Archivo:** `src/lib/matrizComunicacion/exportDocx.ts`  
**Endpoint:** `GET /api/proyectos/[id]/matriz-comunicacion/docx/route.ts`

```ts
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType
} from 'docx'

export async function generarDocxMatriz(datos: DatosMatrizPdf): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 15840, height: 12240 }, // landscape A4 en twips
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      children: [
        tablaDocHeader(datos),          // Tabla header: logo GYS, título, código, revisión, cliente
        separador,
        tablaPersonal(datos.personal),  // Tabla de personal con siglas
        separador,
        tablaMatriz(datos.personal, datos.filas), // Tabla principal
        separador,
        tablaLeyenda(),
      ],
    }],
  })
  return Packer.toBuffer(doc)
}
```

### Cómo se sirve el archivo al browser

```ts
// route.ts:
const buffer = await generarDocxMatriz({ ... })
return new Response(buffer, {
  headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': `attachment; filename="${codigo}.docx"`,
  },
})
```

### ¿Existe `docxtemplater`?

**No. `docxtemplater` NO está en `package.json`.** La librería instalada es `docx@^9.6.1` (generación programática). No existen plantillas `.docx` con placeholders. Si el Plan de Trabajo requiere `docxtemplater`, debe agregarse como nueva dependencia:

```bash
npm install docxtemplater pizzip
```

---

## 10. AUTH Y PERMISOS POR PROYECTO

### Roles del sistema con acceso a módulos de proyecto

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

Roles con acceso de modificación: `admin`, `gerente`, `gestor`, `coordinador`.  
Acceso de lectura: cualquier rol autenticado con `sectionAccess` que incluya el módulo.

### Acceso a un proyecto (GET /api/proyectos/[id])

```ts
const rolesConAccesoTotal = ['admin', 'gerente']
// También accede: comercialId === session.user.id, gestorId === session.user.id
// También accede: responsable de algún proyectoEdt del proyecto
```

### Helper centralizado de permisos de cronograma

```ts
// src/lib/services/cronogramaPermisos.ts:
export const ROLES_CRONOGRAMA = ['admin', 'gerente', 'gestor', 'coordinador'] as const

// Funciones disponibles:
validarPermisoCronograma(cronogramaId)
validarPermisoCronogramaPorEdt(edtId)
validarPermisoCronogramaPorTarea(tareaId)
validarPermisoCronogramaPorFase(faseId)
validarPermisoCronogramaPorActividad(actId)

// Uso en route handler:
const permiso = await validarPermisoCronograma(cronogramaId)
if (!permiso.ok) return permiso.response  // devuelve 401/403 automáticamente
```

### Reglas especiales de cronogramas

- Cronograma `comercial`: solo lectura siempre (generado desde cotización).
- Cronograma bloqueado: no puede modificarse (se bloquea cuando se crea el de ejecución desde la línea base).
- Eliminación de baseline: `admin|gerente|gestor|coordinador` y solo si no existe cronograma de ejecución.

### Ejemplo completo de validación en route handler

```ts
// src/app/api/proyectos/[id]/organigrama/nodos/[nodoId]/route.ts:
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nodoId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { id: proyectoId, nodoId } = await params
  // Sin validación de rol específico — solo que exista sesión
  const body = await req.json()
  // ... lógica de actualización
}
```

---

## 11. PREGUNTAS ABIERTAS

1. **Fuente de `proyecto.servicios` y `proyecto.gastos`:** El endpoint `GET /api/proyectos/[id]/route.ts` (plural) no los incluye en el `include` de Prisma. Verificar si `GET /api/proyecto/[id]/route.ts` (singular) los agrega, o si el `ProyectoContext` los obtiene por separado.

2. **¿El Plan de Trabajo precarga datos del TDR?** El TDR tiene `cronogramaEstimado` (fases), `personalRequerido`, `hitosContractuales`. Confirmar si el Plan los muestra como referencia o solo los usa para generar el documento final.

3. **PNG del organigrama en el DOCX:** La exportación PNG es 100% client-side. Si el DOCX se genera en el servidor e incluye el organigrama, hay dos opciones: (a) el cliente envía el PNG como base64 en el body del POST, o (b) implementar `canvas` npm en Node.js para renderizado server-side.

4. **¿El Plan de Trabajo tiene modelo propio en Prisma?** No se encontró ningún modelo `PlanTrabajo` en el schema. Si es documento generado on-demand sin persistencia, no requiere modelo. Si los datos del Plan deben vivir en BD para que PETS/IPERC los reutilicen, se necesita diseñar el modelo.

5. **¿Qué cronograma usa el Plan?** Confirmar si usa `planificacion` (línea base) o `ejecucion`. ¿Qué muestra si solo existe el cronograma comercial?

6. **Campos de contrato:** `numeroContrato`, `ordenCompraCliente`, `fechaFirmaContrato` existen en el modelo pero no se muestran en el layout actual ni están en el include del endpoint principal. Para el Plan de Trabajo hay que agregarlos explícitamente al `select` del endpoint que se use.

7. **¿El DOCX generado se guarda en Google Drive?** Si sí, seguir el patrón `uploadFile` + guardar `driveFileId`/`webViewLink` en una tabla adjunta nueva o en `Proyecto` directamente.

8. **Código de documento del Plan:** La Matriz usa el patrón `MX-{proyecto.codigo}-GYS-001`. ¿El Plan usará `PT-{proyecto.codigo}-GYS-001`?

9. **Supervisor y Líder fuera del include principal:** El endpoint `GET /api/proyectos/[id]` no devuelve `supervisor` ni `lider`. Si el Plan los necesita (p.ej. para la portada del documento), hay que agregar esos `select` al endpoint o consultar `PersonalProyecto` directamente.

10. **¿El Plan incluye valorizaciones o cuentas por cobrar?** El modelo `Proyecto` tiene `valorizacion[]` y `cuentasPorCobrar[]`. Confirmar si el Plan de Trabajo tiene alcance financiero o solo operativo/técnico.

---

## RESUMEN EJECUTIVO

1. **La conversión cotización → proyecto crea solo el cronograma `comercial` automáticamente.** La línea base (`planificacion`) se crea manualmente copiando el comercial. Para el Plan de Trabajo, usar `planificacion`; si no existe, usar `comercial` como fallback.

2. **Los datos de equipos/servicios/gastos cotizados se copian a modelos propios** (`ProyectoEquipoCotizado`, `ProyectoServicioCotizado`, `ProyectoGastoCotizado`) con FK `cotizacionId` en `Proyecto`. Son independientes de la cotización original.

3. **El árbol completo de planificación está disponible en un solo request:** `GET /api/proyectos/[id]/cronograma/tree?cronogramaId={id}` devuelve jerarquía anidada Proyecto→Fase→EDT→Actividad→Tarea con todos los campos (fechas, horas, responsables, recursos).

4. **El costo planificado vs cotizado ya está implementado:** `GET /api/proyectos/[id]/cronograma/costo-planificado` devuelve `costoPorEdt` agrupado. La página de Servicios ya hace esta comparación — el Plan puede reutilizarla.

5. **Los campos del TDR son tipos TypeScript fuertemente tipados** en `src/types/tdr.ts`. El Plan puede leer `equiposIdentificados`, `personalRequerido`, `normasAplicables`, `cronogramaEstimado`, `hitosContractuales` directamente del `ProyectoTdrAnalisis`.

6. **El generador DOCX usa `docx@9.6.1`** (programático, no plantillas). El generador de referencia es `src/lib/matrizComunicacion/exportDocx.ts` con patrón completo: encabezado GYS, tablas con celdas coloreadas, página landscape, `Packer.toBuffer()` servido como `new Response(buffer, { headers: { 'Content-Disposition': 'attachment' } })`.

7. **El organigrama no tiene exportación server-side.** El PNG se genera en el browser con Canvas API. Para incluirlo en un DOCX del servidor, hay que recibir el PNG como base64 del cliente o implementar renderizado con el paquete `canvas` de npm en Node.js.

8. **Los permisos se gestionan en dos niveles:** nivel proyecto (admin/gerente/gestor/comercial/responsable-EDT) y nivel cronograma (solo `admin|gerente|gestor|coordinador`, con protección adicional sobre cronogramas comerciales bloqueados). El helper `validarPermisoCronograma()` en `src/lib/services/cronogramaPermisos.ts` centraliza toda la lógica.

9. **El storage es Google Drive con Service Account.** Variables de entorno: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SHARED_DRIVE_ID`, `GOOGLE_ADMIN_DRIVE_ID`. Helper completo en `src/lib/services/googleDrive.ts`. Patrón: crear carpeta + `uploadFile` + guardar `driveFileId` y `webViewLink` en tabla adjunto.

10. **El proyecto tiene campos de contrato disponibles** (`numeroContrato`, `ordenCompraCliente`, `fechaFirmaContrato`, `fechaInicioContrato`, `fechaFinContrato`) en el modelo Prisma y en los tipos TypeScript de `src/types/modelos.ts`, pero no están en el include del endpoint principal ni se muestran en el layout actual. El Plan de Trabajo debe agregarlos explícitamente al query del endpoint que use.
