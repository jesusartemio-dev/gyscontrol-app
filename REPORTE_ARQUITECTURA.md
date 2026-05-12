# REPORTE DE ARQUITECTURA — GYS Control Industrial

> Generado el 2026-05-08 para uso en diseño del módulo Plan de Trabajo.
> Basado en lectura directa del código fuente; no contiene suposiciones.

---

## 1. STACK TECNOLOGICO

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router, server + client components) | 15.2.8 |
| Lenguaje | TypeScript | ^5 |
| ORM | Prisma Client | ^6.19.0 |
| Base de datos | PostgreSQL (driver pg) | ^8.16.3 |
| Auth | next-auth (JWT strategy, CredentialsProvider + GoogleProvider) | ^4.24.11 |
| UI | shadcn/ui (Radix primitives + Tailwind CSS v4) | — |
| Formularios | react-hook-form + @hookform/resolvers | ^7.56.1 |
| Validación | Zod | ^3.24.3 |
| Data fetching | SWR ^2.3.6 + TanStack Query ^5.87.4 + fetch nativo | — |
| Notificaciones | sonner ^2.0.3 + react-hot-toast ^2.5.2 | — |
| Exportación DOCX | docx ^9.6.1 | — |
| Exportación PDF | jspdf ^3.0.3 + jspdf-autotable ^5.0.7 | — |
| Exportación PNG | Canvas API (nativo browser) | — |
| IA | @anthropic-ai/sdk ^0.74.0 (Claude via API) | — |
| Gráficos | recharts ^3.2.0 | — |
| Diagramas | reactflow ^11.11.4 + Canvas propio (organigrama) | — |
| Animaciones | framer-motion ^12.23.12 | — |
| Fechas | date-fns ^4.1.0 | — |
| Drag and Drop | @dnd-kit/core, @dnd-kit/sortable | — |
| Excel | exceljs ^4.4.0 + xlsx ^0.18.5 | — |
| Storage | Google Drive via googleapis ^171.4.0 | — |
| Testing | Jest + Playwright + @testing-library | — |

---

## 2. ESTRUCTURA DE CARPETAS

```
src/
├── app/                          # App Router de Next.js
│   ├── (admin)/                  # Grupo de rutas admin
│   ├── admin/
│   │   ├── usuarios/page.tsx
│   │   ├── permisos/page.tsx
│   │   └── monitoring/page.tsx
│   ├── api/                      # Route handlers (REST API)
│   │   ├── admin/
│   │   ├── auth/[...nextauth]/
│   │   ├── cotizacion/[id]/
│   │   ├── cotizaciones/[id]/
│   │   ├── proyecto/[id]/        # TDR, costos-reales (ruta SINGULAR)
│   │   ├── proyectos/            # Listado + sub-recursos (ruta PLURAL)
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── organigrama/route.ts
│   │   │       ├── organigrama/nodos/route.ts
│   │   │       ├── organigrama/nodos/[nodoId]/route.ts
│   │   │       ├── matriz-comunicacion/route.ts
│   │   │       ├── matriz-comunicacion/filas/route.ts
│   │   │       ├── matriz-comunicacion/filas/[filaId]/route.ts
│   │   │       ├── matriz-comunicacion/docx/route.ts
│   │   │       ├── cronograma/       # ~20 sub-rutas de cronograma
│   │   │       ├── fases/, edt/, actividades/, subtareas/
│   │   │       └── valorizaciones/
│   │   └── ...
│   ├── comercial/                # Módulo comercial (cotizaciones, plantillas, CRM)
│   ├── crm/
│   ├── logistica/
│   ├── proyectos/                # Módulo proyectos en ejecución
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   ├── layout.tsx        # Layout: header, sidebar, ProyectoContext
│   │   │   ├── page.tsx          # Hub / resumen del proyecto
│   │   │   ├── ProyectoContext.tsx
│   │   │   ├── tdr/page.tsx
│   │   │   ├── organigrama/page.tsx
│   │   │   ├── matriz-comunicacion/page.tsx
│   │   │   ├── cronograma/page.tsx
│   │   │   ├── equipos/, servicios/, gastos/
│   │   │   ├── listas/, pedidos/
│   │   │   ├── personal/, recursos/
│   │   │   ├── tareas/, ssoma/
│   │   │   └── requerimientos/
│   │   ├── listas/page.tsx
│   │   ├── pedidos/page.tsx
│   │   ├── equipos/page.tsx
│   │   └── catalogo/page.tsx
│   └── page.tsx
├── components/
│   ├── ui/                       # Primitivos shadcn/ui (button, input, card, dialog, etc.)
│   ├── tdr/
│   │   ├── TdrCompletitudBar.tsx
│   │   ├── TdrResumenEjecutivo.tsx
│   │   ├── TdrBloqueCard.tsx
│   │   ├── TdrEditableTable.tsx
│   │   ├── BloqueAccionesIA.tsx
│   │   ├── EstadoBloqueBadge.tsx
│   │   └── bloques/              # 8 bloques: Identificacion, Alcance, Suministros...
│   ├── organigrama/
│   │   └── OrgChart.tsx          # SVG render + buildLayout + NORMAL_DIMS exports
│   ├── proyectos/
│   │   ├── EstadoProyectoStepper.tsx
│   │   ├── ResumenTotalesProyecto.tsx
│   │   └── SeccionContrato.tsx
│   └── ...
├── lib/
│   ├── auth.ts                   # NextAuth authOptions
│   ├── prisma.ts                 # Singleton PrismaClient
│   ├── matrizComunicacion/
│   │   ├── exportDocx.ts         # Generador DOCX con librería docx
│   │   ├── exportPdf.ts          # Generador PDF con jsPDF + autoTable
│   │   ├── prompt.ts             # Prompt IA para generación de matriz
│   │   └── utils.ts              # generarSiglas()
│   ├── tdr/
│   │   ├── cliente.ts            # Funciones fetch del cliente
│   │   ├── completitud.ts        # calcularCompletitudGeneral()
│   │   └── extraccionPorBloque.ts
│   ├── organigrama/
│   │   └── nodosGys.ts           # NODOS_FIJOS_GYS, matchCargoConRolProyecto()
│   ├── agente/                   # IA: models.ts, featureFlags.ts, usageTracker.ts
│   ├── server/                   # Server-side: audit, calendarioLaboral, cronograma
│   ├── services/                 # CRUD wrappers
│   ├── utils/                    # Utilidades puras
│   └── validators/               # Esquemas Zod
├── types/
│   ├── tdr.ts                    # Tipos TDR completos (compartidos cotizacion+proyecto)
│   ├── index.ts                  # Tipos globales (Proyecto, ProyectoCronograma, etc.)
│   └── ...
└── middleware.ts
```


---

## 3. MODELO DE DATOS

### 3.1 Modelo Proyecto (tabla: proyecto)

Campos clave: id (cuid), clienteId?, gestorId (req), supervisorId?, liderId?, cotizacionId?, esInterno, nombre, descripcion?, codigo, estado (enum ProyectoEstado), fechaInicio, fechaFin?, moneda, tipoCambio?, diasGarantia (365), totalEquiposInterno, totalServiciosInterno, totalGastosInterno, totalInterno, totalCliente, descuento, grandTotal, totalRealEquipos, totalRealServicios, totalRealGastos, totalReal, progresoGeneral (int), numeroContrato?, fechaFirmaContrato?, fechaInicioContrato?, fechaFinContrato?, fondoGarantiaPct, descuentoComercialPct, igvPct (18), ordenCompraCliente?, adelantoPorcentaje, adelantoMonto, adelantoAmortizado, createdAt, updatedAt (SIN @updatedAt), deletedAt?

Relaciones a módulos de gestión: orgNodos (ProyectoOrgNodo[]), matrizComunicacion (MatrizComunicacion?), tdrAnalisis (ProyectoTdrAnalisis?), proyectoCronograma (ProyectoCronograma[]), proyectoEdt (ProyectoEdt[]), proyectoFase (ProyectoFase[])

Estados (enum ProyectoEstado): creado, en_planificacion, en_revision, aprobado, listas_aprobadas, pedidos_creados, en_ejecucion, en_cierre, cerrado, pausado, cancelado

### 3.2 Modelo ProyectoTdrAnalisis (tabla: proyecto_tdr_analisis)

Relacion: proyectoId @unique — 1-a-1 con Proyecto, onDelete: Cascade
Campos de origen: cotizacionTdrOrigenId?, desconectadoDeOrigen (bool), fechaSnapshot
Texto libre: resumenTdr @db.Text, alcanceDetectado? @db.Text, resumenEjecutivoNarrativa? @db.Text
JSON (arrays o objetos tipados en src/types/tdr.ts):
  resumenEjecutivoPuntos? (ResumenEjecutivoPunto[])
  requerimientos? (Requerimiento[])
  equiposIdentificados? (EquipoIdentificado[])
  serviciosIdentificados? (ServicioIdentificado[])
  ambiguedades? (Ambiguedad[])
  consultasCliente? (ConsultaCliente[])
  supuestos? (Supuesto[])
  exclusiones? (Exclusion[])
  cronogramaEstimado? (FaseCronograma[])
  presupuestoEstimado? (PresupuestoEstimado)
  personalRequerido? (PersonalRequerido[])
  normasAplicables? (NormaAplicable[])
  documentosPrevios? (DocumentoPrevio[])
  entregablesDossier? (EntregableDossier[])
  riesgosCriticos? (RiesgoCritico[])
  hitosContractuales? (HitoContractual[])
  penalidades? (Penalidad[])
  garantias? (Garantias)
Metadatos PDF: nombreArchivo?, paginasPdf?, clienteDetectado?, proyectoDetectado?, ubicacionDetectada?
Calculado: bloquesCompletitud? (BloquesCompletitud — recalculado en cada PATCH)

### 3.3 Modelos Organigrama

PlantillaOrganigrama (tabla: plantilla_organigrama): id, nombre, descripcion?, activo, createdAt, updatedAt
  -> nodos: PlantillaOrgNodo[]

PlantillaOrgNodo (tabla: plantilla_org_nodo): id, plantillaId, parentId?, orden, cargoLabel, recursoId?, esObligatorio, gysParentLabel?
  -> auto-referencial via padre/hijos
  -> gysParentLabel: a qué nodo GYS fijo se ancla este nodo raíz

ProyectoOrgNodo (tabla: proyecto_org_nodo): id, proyectoId, parentId?, orden, cargoLabel, recursoId?, userId?, cipOverride?, telefonoOverride?, empresaOverride?, esFijoGys (bool)
  -> auto-referencial via padre/hijos
  -> userId: FK a User (cargo asignado)
  -> esFijoGys:true = nodo corporativo GYS, no eliminable
  -> Prioridad overrides: telefonoOverride > User.empleado.telefono (mismo para cip, empresa)

Nodos fijos GYS hardcoded (src/lib/organigrama/nodosGys.ts):
  GERENCIA GENERAL (root)
    COMERCIAL
    GERENCIA DE PROYECTOS  <- nodos de plantilla se anclan aqui
    HSEQ

### 3.4 Modelos Matriz de Comunicaciones

MatrizComunicacion (tabla: matriz_comunicacion): id, proyectoId @unique, version (1.0), estado (borrador), generadoConIA, createdAt, updatedAt
  -> proyectoId 1-a-1, onDelete: Cascade
  -> filas: MatrizComunicacionFila[]

MatrizComunicacionFila (tabla: matriz_comunicacion_fila): id, matrizId, edtId?, orden, informacion, emisor, receptores @db.Text (JSON: [{siglas,valor}[]]), medio, frecuencia, formato, notas?, createdAt, updatedAt
  -> edtId FK a ProyectoEdt (opcional, onDelete: SetNull)
  -> receptores almacena JSON serializado de [{siglas: string, valor: string}]
  -> medio: I=Informe, M=Minuta, E=Email, R=Reunion, P=Planilla, IE, IR
  -> frecuencia: M=Mensual, S=Semanal, E=Eventual
  -> valor en celdas: D=Destinatario, E=Emisor, R=Autoriza, S=Soporte, V=Valida

### 3.5 Modelos Cronograma (referencia para Plan de Trabajo)

ProyectoCronograma: id, proyectoId, tipo (String: comercial|planificacion|ejecucion), nombre, copiadoDesdeCotizacionId?, esBaseline, version (int), bloqueado; @@unique([proyectoId, tipo])
ProyectoFase: id, proyectoId, proyectoCronogramaId, nombre, orden, fechaInicio/FinPlan?, fechaInicio/FinReal?, estado (EstadoFase), porcentajeAvance; @@unique([proyectoId, cronogramaId, nombre])
ProyectoEdt: id, proyectoId, edtId (FK catalogo), proyectoCronogramaId, proyectoFaseId?, nombre, orden, horasPlan, horasReales, estado (EstadoEdt), responsableId?, porcentajeAvance, prioridad
ProyectoActividad: id, proyectoEdtId, proyectoCronogramaId, nombre, orden, responsableId?, fechaInicio/FinPlan, fechaInicio/FinReal?, estado, porcentajeAvance, horasPlan, horasReales
ProyectoTarea: id, proyectoEdtId, proyectoCronogramaId, nombre, orden, fechaInicio, fechaFin, horasEstimadas?, horasReales, personasEstimadas, estado, prioridad, porcentajeCompletado, responsableId?, recursoId?, esExtra, dependenciaId? (self-ref)


---

## 4. CAPA DE API / BACKEND

Todos los endpoints son REST API Routes de Next.js (route.ts). Autenticacion: getServerSession(authOptions) en cada handler — no existe middleware global de auth a nivel de rutas. Sin validacion Zod en los 3 modulos analizados.

### 4.1 TDR — ruta SINGULAR /api/proyecto/[id]/tdr-analisis/

| Metodo | Path | Descripcion |
|---|---|---|
| GET | /api/proyecto/[id]/tdr-analisis | Analisis TDR o 404 con {puedeImportar, cotizacionId}. Inyecta cotizacionId del proyecto. |
| POST | /api/proyecto/[id]/tdr-analisis | Sin body: importa cotizacion origen. {vacio:true}: crea vacio. Idempotente si existe. |
| PATCH | /api/proyecto/[id]/tdr-analisis | Actualiza campos en whitelist 24 campos. Recalcula bloquesCompletitud. |
| DELETE | /api/proyecto/[id]/tdr-analisis | Elimina analisis completo. |
| POST | /api/proyecto/[id]/tdr-analisis/analizar-pdf | FormData {file} PDF max 20MB. Streaming SSE (events: status, done, error). 2 llamadas IA. maxDuration=300s. |
| POST | /api/proyecto/[id]/tdr-analisis/resincronizar | Re-importa desde cotizacion origen descartando cambios manuales. |

Whitelist PATCH (24 campos): consultasCliente, supuestos, exclusiones, ambiguedades, requerimientos, equiposIdentificados, serviciosIdentificados, cronogramaEstimado, presupuestoEstimado, resumenTdr, clienteDetectado, proyectoDetectado, ubicacionDetectada, alcanceDetectado, resumenEjecutivoNarrativa, resumenEjecutivoPuntos, personalRequerido, normasAplicables, documentosPrevios, entregablesDossier, riesgosCriticos, hitosContractuales, penalidades, garantias

Flujo analizar-pdf (streaming SSE en 2 fases):
1. Recibe PDF via FormData
2. Extrae texto con pdf-parse
3. IA fase 1: prompt de resumen exhaustivo — devuelve texto libre
4. Emite event:status "Extrayendo datos estructurados..."
5. IA fase 2: convierte el resumen a JSON con schema definido
6. Crea o actualiza ProyectoTdrAnalisis en DB
7. Emite event:done con analisis completo

### 4.2 Organigrama — /api/proyectos/[id]/organigrama/

| Metodo | Path | Descripcion |
|---|---|---|
| GET | .../organigrama | Lista nodos con user+empleado+recurso. Resuelve _telefono, _cip, _empresa. |
| POST | .../organigrama | {plantillaId?}. Elimina existente, crea nodos GYS fijos, luego plantilla. Auto-asigna gestor/supervisor/lider. |
| DELETE | .../organigrama | Elimina todos. BLOQUEO 409 si existe MatrizComunicacion. |
| POST | .../organigrama/nodos | {cargoLabel, parentId?, orden?, recursoId?, userId?}. Siempre esFijoGys:false. |
| PATCH | .../organigrama/nodos/[nodoId] | Parcial: cargoLabel, parentId, orden, recursoId, userId, cipOverride, telefonoOverride, empresaOverride. |
| DELETE | .../organigrama/nodos/[nodoId] | Error 400 si esFijoGys:true. |

Campos calculados en respuesta:
- _telefono = nodo.telefonoOverride ?? nodo.user?.empleado?.telefono ?? null
- _cip = nodo.cipOverride ?? nodo.user?.empleado?.cip ?? null
- _empresa = nodo.empresaOverride ?? "GYS CONTROL INDUSTRIAL SAC"

### 4.3 Matriz de Comunicaciones — /api/proyectos/[id]/matriz-comunicacion/

| Metodo | Path | Descripcion |
|---|---|---|
| GET | .../matriz-comunicacion | Matriz con filas. Devuelve null si no existe (HTTP 200, no 404). |
| POST | .../matriz-comunicacion | {generarConIA:boolean}. Error 409 si ya existe. Con IA: Claude con EDTs+personal. |
| PATCH | .../matriz-comunicacion | {version?, estado?}. Solo metadatos. |
| DELETE | .../matriz-comunicacion | Elimina matriz y filas (cascade). |
| POST | .../matriz-comunicacion/filas | {informacion, emisor, receptores:Celda[], medio, frecuencia, formato, notas?, edtId?}. Orden = max+1. |
| PATCH | .../matriz-comunicacion/filas/[filaId] | Parcial. receptores serializado a JSON. |
| DELETE | .../matriz-comunicacion/filas/[filaId] | Elimina fila. |
| GET | .../matriz-comunicacion/docx | Genera y devuelve .docx (Content-Disposition attachment). |

Flujo generacion IA:
1. Obtiene proyecto con orgNodos (userId not null)
2. Deduplica por userId (misma persona en varios nodos)
3. Genera siglas unicas con generarSiglas()
4. Consulta ProyectoEdt del proyecto (max 60, dedup por nombre)
5. buildPromptMatriz() — prompt incluye personal y lista de EDTs obligatorios
6. Llama Claude (model: ssoma-document, max_tokens: 4096)
7. Parsea JSON respuesta
8. Crea MatrizComunicacion + filas en DB



---

## 5. CAPA DE UI — PATRON DE CADA MODULO

### 5.1 Layout del Proyecto

Archivo: src/app/proyectos/[id]/layout.tsx

- Client component ('use client'). 
- Provee ProyectoContext (proyecto, cronogramaStats, costosReales, refreshProyecto).
- Auto-oculta sidebar en fullWidthPages: ['cronograma','listas','pedidos','organigrama','matriz-comunicacion','tdr'].
- Breadcrumb dinamico construido desde pathname.
- Edicion inline del header del proyecto (codigo, nombre, descripcion, fechaInicio, diasGarantia).
- Boton toggle "Resumen" flotante cuando sidebar esta oculto (bottom-right).

---

### 5.2 Modulo TDR

Ruta: src/app/proyectos/[id]/tdr/page.tsx (471 lineas)

Jerarquia de componentes:
```
TdrProyectoPage
├── Input[type=file] hidden (para PDF)
├── TdrCompletitudBar (src/components/tdr/TdrCompletitudBar.tsx)
│   └── 8 badges con estado completo/parcial/vacio
├── TdrResumenEjecutivo (src/components/tdr/TdrResumenEjecutivo.tsx)
│   └── narrativa + resumenEjecutivoPuntos editables
└── 8 BloqueCards (src/components/tdr/bloques/)
    ├── BloqueIdentificacion  — clienteDetectado, proyectoDetectado, ubicacionDetectada
    ├── BloqueAlcance         — resumenTdr, alcanceDetectado, requerimientos (tabla)
    ├── BloqueSuministros     — equiposIdentificados, serviciosIdentificados
    ├── BloquePersonal        — personalRequerido (tabla)
    ├── BloquePlazos          — cronogramaEstimado, hitosContractuales
    ├── BloqueSsoma           — normasAplicables, documentosPrevios, riesgosCriticos
    ├── BloqueComercial       — presupuestoEstimado, penalidades, garantias
    └── BloqueEntregables     — entregablesDossier
```

Estructura del formulario: Bloques Card independientes. Cada bloque recibe datos, estado (EstadoBloque: completo/parcial/vacio) y onGuardar(campos:object).

Edicion: Todos los campos son editables en todo momento. No hay modo "solo lectura".

Guardado: Manual por bloque. El usuario edita y presiona "Guardar" dentro del bloque. onGuardar(campos) llama patchAnalisis('proyecto', proyectoId, campos) -> PATCH /api/proyecto/[id]/tdr-analisis.

Tablas dinamicas: TdrEditableTable (src/components/tdr/TdrEditableTable.tsx) para listas. Permite agregar/eliminar filas. Cambios acumulan en estado local hasta "Guardar bloque".

Subida de archivos: Input file hidden acepta .pdf. PDF se procesa en memoria — no se almacena en DB ni storage.

Estado vacio: 3 opciones:
1. "Analizar PDF con IA" — streaming SSE, indicador de fase en boton
2. "Importar de cotizacion" — POST sin body
3. "Inicializar manualmente" — POST {vacio:true}

Revisiones/versiones: No existen. Solo hay fechaSnapshot.

---

### 5.3 Modulo Organigrama

Ruta: src/app/proyectos/[id]/organigrama/page.tsx (1217 lineas)

Jerarquia de componentes:
```
OrganigramaProyectoPage
├── Toolbar (Exportar PDF, PNG, Eliminar, Regenerar)
├── Tabs (Vista | Editar nodos)
│   ├── Tab Vista
│   │   ├── OrgChart — SVG interactivo (src/components/organigrama/OrgChart.tsx)
│   │   └── PanelLateral — w-72, visible al click en nodo
│   │       ├── Input cargo (disabled si esFijoGys)
│   │       ├── Select usuario
│   │       ├── Input empresa override
│   │       ├── Input telefono override
│   │       └── Input CIP override
│   └── Tab Editar nodos
│       ├── Table (depth-first sorted, edicion inline por fila)
│       └── FormAgregarNodo (inline al final)
└── AlertDialog (confirmar eliminar organigrama)
```

Estado vacio: Selector de PlantillaOrganigrama + boton "Generar desde plantilla" o "Crear desde cero".

Edicion: 2 modos paralelos independientes:
1. Panel lateral (Tab Vista): click en nodo -> panel derecho; boton "Guardar cambios" -> PATCH inmediato.
2. Inline (Tab Editar): click lapiz -> inputs en fila; boton check -> PATCH inmediato.

Nodos GYS fijos: esFijoGys:true. Cargo no editable. No eliminables. Background #2E4057. API rechaza DELETE con 400.

Reordenar: Botones up/down en Tab Editar. Promise.all con multiples PATCH para intercambiar valores de orden entre hermanos del mismo padre.

Exportacion PNG: Canvas API nativo (2x retina). Renderiza grid puntual + aristas bezier + nodos con estilos. Sin DOM capture. Descarga .png.

Exportacion PDF: jsPDF nativo (sin DOM capture — evita bugs con oklch). A4 landscape. Logos cliente + GYS con addImage. Nodos con roundedRect. Aristas bezier con pdf.lines.

---

### 5.4 Modulo Matriz de Comunicaciones

Ruta: src/app/proyectos/[id]/matriz-comunicacion/page.tsx (537 lineas, sin sub-componentes propios)

Estructura de componentes (todo inline):
```
MatrizComunicacionPage
├── Toolbar (Agregar fila | PDF | Word | Eliminar y regenerar)
├── Leyenda personal (chips de siglas con tooltip nombre+cargo)
├── Table (spreadsheet-like)
│   ├── Thead row 1: # | ACTIVIDAD | FREC. | MEDIO | RESPONSABILIDAD (colspan N) | acciones
│   ├── Thead row 2: siglas de cada persona (N columnas dinamicas)
│   └── Tbody: una row por MatrizComunicacionFila
│       ├── Celdas fijas: orden, informacion, frecuencia, medio
│       ├── N celdas dinamicas (una por persona, valor D/E/R/S/V)
│       └── Columna acciones (lapiz/basura, visible en hover)
└── Leyenda de codigos + AlertDialog eliminar
```

Carga al montar (Promise.all):
- /api/proyectos/[id]/matriz-comunicacion  -> setMatriz
- /api/proyectos/[id]/organigrama          -> buildPersonal() -> setPersonal
- /api/proyectos/[id]                      -> setProyectoInfo

Columnas dinamicas: derivadas de los nodos del organigrama mediante buildPersonal() + generarSiglas(). Las siglas se generan de las iniciales del nombre (unicas). No persisten en DB a nivel de cabecera.

Edicion inline por fila:
1. Hover en fila muestra icono lapiz
2. Click activa inputs en esa fila (informacion, frecuencia, medio, celdas de persona)
3. Boton check guarda -> PATCH /api/proyectos/[id]/matriz-comunicacion/filas/[filaId]
4. Boton X cancela sin PATCH

Agregar fila: Crea en backend con informacion="Nueva actividad", receptores=[{siglas, valor:'D'} para cada persona], luego activa edicion de esa fila.

Exportacion PDF: Client-side, generarPdfMatriz() en src/lib/matrizComunicacion/exportPdf.ts. jsPDF + jspdf-autotable. Incluye tabla de personal y tabla de matriz.

Exportacion Word: Server-side. GET /api/proyectos/[id]/matriz-comunicacion/docx -> blob -> descarga.

Estado vacio: 2 botones: "Crear vacia" y "Generar con IA".


---

## 6. Exportacion a Documentos (DOCX / PDF / PNG)

### 6.1 Matriz de Comunicaciones — DOCX (server-side)

**Ruta API:** GET /api/proyectos/[id]/matriz-comunicacion/docx/route.ts

Flujo:
1. Lee MatrizComunicacion + MatrizComunicacionFila[] + ProyectoOrgNodo[] del mismo proyecto.
2. Llama generarDocxMatriz(matriz, filas, nodos, proyectoInfo) en src/lib/matrizComunicacion/exportDocx.ts.
3. Devuelve Buffer via Packer.toBuffer() con Content-Type vnd.openxmlformats-officedocument.wordprocessingml.document.

Libreria: docx npm ^9.6.1 (server-safe, sin DOM).

Estructura del DOCX generada:
- tablaDocHeader: tabla 3-col: logo | titulo | datos proyecto
- tablaPersonal: tabla 4-col: N | Nombres | Cargo | Empresa
- tablaMatriz: tabla dinamica (6 + N cols): N | ACTIVIDAD | FREC | MEDIO | RESP | siglas*N
- tablaLeyenda: tabla leyenda D/E/R/S/V

Constantes de estilo:
- AZULhex = '2E4057' (color corporativo header)
- Fuente Arial, tamano 8pt para cuerpo
- Color texto cabecera: blanco sobre AZULhex
- Bordes: BorderStyle.SINGLE 0.5pt

Funcion clave buildPersonal(nodos):
- Filtra nodos que tengan user asignado
- Genera siglas unicas (iniciales del nombre, con numero si colision)
- Devuelve array { siglas, nombre, cargo, empresa }

generarSiglas(nombre, usados): toma primeras letras de cada palabra del nombre, si colision agrega numero.

### 6.2 Matriz de Comunicaciones — PDF (client-side)

Archivo: src/lib/matrizComunicacion/exportPdf.ts

Flujo desde page.tsx:
1. generarPdfMatriz(matriz, filas, personal, proyectoInfo) llamado en boton "Exportar PDF".
2. jsPDF orientacion landscape, A4.
3. Dibuja tabla personal con jspdf-autotable.
4. Dibuja tabla de matriz con jspdf-autotable.
5. doc.save('matriz-comunicacion.pdf').

Nota: personal ya viene precalculado del estado del componente (buildPersonal aplicado sobre organigrama).

### 6.3 Organigrama — PNG (client-side, Canvas API)

En src/app/proyectos/[id]/organigrama/page.tsx (funcion exportarPng):

Flujo:
1. Reutiliza buildLayout(nodos, NORMAL_DIMS) para obtener posiciones SVG.
2. Crea canvas offscreen del tamano svgWidth x svgHeight.
3. Dibuja fondo #f8fafc (slate-50).
4. Patron de puntos: loop cada 24px dibuja circulos #CBD5E1.
5. Dibuja edges (lineas bezier) con ctx.bezierCurveTo.
6. Por cada nodo dibuja un rectangulo redondeado con colores segun esFijoGys.
7. Texto con ctx.fillText: cargoLabel, nombre, telefono, cip, email, empresa.
8. canvas.toBlob('image/png') -> descarga via link.

Razon Canvas API (no html2canvas): las tarjetas de nodo usan oklch() CSS (Tailwind v4) que html2canvas no soporta.

### 6.4 Organigrama — PDF (client-side)

Funcion exportarPdf en page.tsx:

Flujo:
1. Crea canvas igual que PNG pero usa canvas.toDataURL('image/png').
2. Calcula ratio para que quepa en A4 landscape.
3. jsPDF('landscape', 'mm', 'a4').
4. doc.addImage(dataUrl, 'PNG', x, y, w, h).
5. doc.save('organigrama.pdf').

### 6.5 TDR — Sin exportacion directa

El modulo TDR no tiene boton de exportar DOCX/PDF integrado en la pagina. El analisis se guarda en DB y se muestra como formulario editable por bloques. No hay libreria de exportacion invocada desde /proyectos/[id]/tdr/page.tsx.


---

## 7. Integracion entre Modulos

### Dependencias directas (hard constraints)

ProyectoOrgNodo (1:N) <---- MatrizComunicacion (1:1 por proyecto)

Regla: DELETE /organigrama devuelve 409 si existe MatrizComunicacion.
El usuario debe eliminar la Matriz antes de poder borrar/recrear el Organigrama.

Implementacion en DELETE /api/proyectos/[id]/organigrama:
```typescript
const matriz = await prisma.matrizComunicacion.findUnique({
  where: { proyectoId },
  select: { id: true },
})
if (matriz) {
  return NextResponse.json({ error: 'El organigrama no se puede eliminar...' }, { status: 409 })
}
```

### Dependencias de datos en tiempo de render

1. Matriz lee Organigrama: Al montar matriz-comunicacion/page.tsx, hace fetch a /api/proyectos/[id]/organigrama para construir las columnas de personas. Sin organigrama cargado, la tabla de matriz no tiene columnas.

2. Generacion IA de Matriz usa EDT: El endpoint POST /api/proyectos/[id]/matriz-comunicacion con { generarConIA: true } lee:
   - ProyectoEdt del proyecto (max 60) para conocer el alcance
   - ProyectoOrgNodo del proyecto para saber el equipo
   Combina ambos en el prompt buildPromptMatriz().

3. Organigrama POST usa Roles del Proyecto: Al crear organigrama desde plantilla, auto-asigna gestorId, supervisorId, liderId del proyecto a los nodos que coincidan con esos roles via matchCargoConRolProyecto().

4. TDR importa desde Cotizacion: patchAnalisis() con { origen: 'cotizacion', cotizacionId } copia campos de la cotizacion al analisis TDR. Funcion importarDesdeCotizacion() en src/lib/tdr/cliente.ts.

### Context de Proyecto

src/app/proyectos/[id]/layout.tsx provee ProyectoContext con:
- proyecto: datos basicos del proyecto (nombre, estado, gestorId, supervisorId, liderId)
- refreshProyecto(): refetch
- Lista fullWidthPages: paginas que no muestran sidebar lateral de proyecto

Todos los modulos de proyecto acceden al contexto via useProyecto() hook.

### Modelo Proyecto — campos relevantes para integracion

```prisma
model Proyecto {
  id           String   @id @default(cuid())
  nombre       String
  estado       String   @default("activo")
  gestorId     String?
  supervisorId String?
  liderId      String?
  gestor       User?    @relation("ProyectoGestor", ...)
  supervisor   User?    @relation("ProyectoSupervisor", ...)
  lider        User?    @relation("ProyectoLider", ...)
  // relaciones a modulos:
  orgNodos     ProyectoOrgNodo[]
  matrizComun  MatrizComunicacion?
  tdrAnalisis  ProyectoTdrAnalisis?
  cronogramas  ProyectoCronograma[]
}
```


---

## 8. Autenticacion y Permisos

### Proveedor: next-auth v4.24.11

Archivo: src/lib/auth.ts

Estrategia: JWT, maxAge 30 dias.
Proveedores: CredentialsProvider (email + bcrypt) y GoogleProvider.

Callbacks JWT:
```typescript
// src/lib/auth.ts
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id
      token.role = user.role
      token.sectionAccess = await getSectionAccess(user.id)
    }
    return token
  },
  async session({ session, token }) {
    if (session.user) {
      session.user.id    = token.id as string
      session.user.role  = token.role as string
      session.user.sectionAccess = token.sectionAccess as string[]
    }
    return session
  },
}
```

getSectionAccess(userId) consulta la tabla de permisos por rol en DB (commit f0d6471).

### Uso en API Routes

Cada handler llama getServerSession(authOptions) individualmente. No hay middleware global.

Patron uniforme:
```typescript
const session = await getServerSession(authOptions)
if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
```

### Role Enum en Prisma

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

### Control de acceso en UI

En layout.tsx de proyecto y en componentes de seccion, se chequea session.user.role contra arrays de roles permitidos:
```typescript
const puedeEditar = ['admin', 'gerente', 'gestor'].includes(session.user.role)
```

sectionAccess controla que secciones del sidebar son visibles (sistema DB-driven).

### Sin RBAC fine-grained en API

Las API routes solo verifican autenticacion (session existe), no verifican rol especifico por endpoint. El control de rol esta en UI. Excepcion: algunas rutas verifican que el usuario sea gestor/admin del proyecto comparando IDs.


---

## 9. Convenciones y Patrones

### 9.1 Estructura de Archivos

```
src/
  app/
    api/
      proyectos/[id]/          <- plural, todos los modulos nuevos aqui
        organigrama/
          route.ts             <- GET, POST, DELETE del organigrama completo
          nodos/
            route.ts           <- POST crear nodo individual
            [nodoId]/
              route.ts         <- PATCH, DELETE nodo individual
        matriz-comunicacion/
          route.ts             <- GET, POST, PATCH, DELETE de la matriz
          filas/
            route.ts           <- POST crear fila
            [filaId]/
              route.ts         <- PATCH, DELETE fila
          docx/
            route.ts           <- GET exportar DOCX
      proyecto/[id]/           <- SINGULAR (solo TDR, inconsistencia legacy)
        tdr-analisis/
          route.ts
          analizar-pdf/
            route.ts
    proyectos/
      [id]/
        layout.tsx             <- ProyectoContext provider, sidebar
        organigrama/page.tsx
        matriz-comunicacion/page.tsx
        tdr/page.tsx
  components/
    organigrama/
      OrgChart.tsx             <- Renderizador SVG reutilizable
  lib/
    matrizComunicacion/
      exportDocx.ts
      exportPdf.ts
      prompt.ts
    organigrama/
      nodosGys.ts
    tdr/
      cliente.ts
  types/
    tdr.ts
```

### 9.2 Patron de API Route

Handlers exportados con nombre: GET, POST, PATCH, DELETE.

Patron params Next.js 15 (async params):
```typescript
interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  // ...
}
```

### 9.3 Patron de Pagina Cliente

Todas las pages de modulo son 'use client'. Cargan datos con fetch + useEffect + useState. No usan TanStack Query ni SWR (aunque estan en dependencias).

Patron tipico:
```typescript
const [data, setData] = useState<T | null>(null)
const [cargando, setCargando] = useState(true)

useEffect(() => {
  fetch('/api/proyectos/[id]/...')
    .then(r => r.json())
    .then(setData)
    .finally(() => setCargando(false))
}, [id])
```

### 9.4 Sin Edicion Optimista

Todas las ediciones van al servidor antes de actualizar UI:
1. Llama fetch PATCH/POST
2. Si ok: llama funcion de recarga o actualiza estado local
3. Si error: muestra toast de error

### 9.5 Toast / Notificaciones

Libreria sonner (import { toast } from 'sonner'). Alternativa react-hot-toast disponible en deps.
- toast.success('Guardado') en operaciones exitosas
- toast.error('Error al guardar') en fallos
- Sin confirmacion modal excepto: confirm() nativo en organigrama (deuda tecnica)
- AlertDialog de Radix en operaciones criticas

### 9.6 Formularios

react-hook-form + zod disponibles pero no usados en los modulos existentes (TDR, Organigrama, Matriz). Los modulos usan useState + handlers manuales. El uso de react-hook-form se ve en modulos mas nuevos (cotizaciones, logistica).

### 9.7 Estilos

Tailwind CSS v4. Clases de shadcn/ui via @radix-ui/* primitivos.
Color corporativo: #2E4057 (azul oscuro GYS).
Patron de clases condicionales: template literal con .join(' ') o clsx().

### 9.8 Prisma — Reglas de uso

- prisma client: importado de @/lib/prisma (singleton).
- Relaciones: siempre usar include explicito, nunca select *.
- updatedAt sin @updatedAt en modelos cronograma: requiere updatedAt: new Date() explicito.
- Transacciones: se usa prisma.$transaction([...]) en operaciones multi-tabla criticas.
- Raw SQL: evitado, usar Prisma Client methods.

### 9.9 Nomenclatura

- Modelos Prisma: PascalCase (ProyectoOrgNodo)
- Tablas DB: snake_case via @@map("proyecto_org_nodo")
- Campos Prisma: camelCase (cargoLabel, esFijoGys)
- Rutas API: kebab-case (/organigrama, /matriz-comunicacion, /tdr-analisis)
- Archivos TS/TSX: camelCase para libs, PascalCase para componentes


---

## 10. Inconsistencias y Deuda Tecnica

### 10.1 Ruta API Singular vs Plural (CRITICO)

- Todos los modulos nuevos: GET /api/proyectos/[id]/... (plural)
- TDR: GET /api/proyecto/[id]/tdr-analisis (singular)

Causa: TDR fue creado antes de estandarizar el prefijo. Si se agrega Plan de Trabajo, debe usar plural /api/proyectos/[id]/plan-trabajo.

### 10.2 confirm() Nativo en Organigrama

En page.tsx de organigrama, el borrado de un nodo individual usa confirm() nativo del navegador. Inconsistente con el patron AlertDialog de Radix usado en otros lugares del mismo archivo. Corregir con AlertDialog.

### 10.3 Paginas Monoliticas

- organigrama/page.tsx: 1217 lineas. Contiene logica de Canvas, PDF, DOCX, edicion inline, panel lateral, todo junto.
- layout.tsx de proyecto: 810 lineas.
- matriz-comunicacion/page.tsx: 537 lineas.

Sin sub-componentes extraidos. Dificil de mantener y testear.

### 10.4 fetch Manual vs TanStack Query

TanStack Query y SWR estan en dependencias pero los modulos usan fetch+useEffect manual. No hay invalidacion de cache, no hay retry automatico, no hay loading states consistentes.

### 10.5 Sin React Hook Form en Modulos Principales

Validacion y estado de formularios se maneja con useState multiple. Sin validacion de campo en tiempo real. Errores mostrados via toast en lugar de inline.

### 10.6 Exportacion PDF de Organigrama Duplica Logica Canvas

exportarPng y exportarPdf en organigrama/page.tsx contienen logica de dibujado en canvas casi identica. Deberia extraerse a funcion reutilizable buildOrgCanvas(nodos, dims): HTMLCanvasElement.

### 10.7 updatedAt Explicito en Modelos Cronograma

Los modelos ProyectoCronograma, ProyectoFase, ProyectoEdt, ProyectoActividad, ProyectoTarea tienen campo updatedAt DateTime SIN annotation @updatedAt. Cada create/update debe incluir updatedAt: new Date() manualmente. Facil de olvidar y causa datos stale.

### 10.8 Tipo String para ProyectoCronograma.tipo

```prisma
tipo  String  // valores: 'comercial' | 'planificacion' | 'ejecucion'
```

Deberia ser un enum Prisma para tipo-seguridad. Actualmente solo se valida en aplicacion, no en DB.

### 10.9 maxDuration = 300 en Streaming TDR

El endpoint analizar-pdf/route.ts tiene export const maxDuration = 300. Requiere plan Vercel Pro o superior. En plan Free (60s max) fallaria en PDFs grandes.

### 10.10 Sin Tests para Modulos de Proyecto

Los tests existentes cubren cotizaciones y aprovisionamiento. No hay tests para organigrama, matriz ni TDR en src/__tests__/.

### 10.11 Columns de Matriz No Persistidas

Las siglas de personal en la matriz se regeneran en cada render desde el organigrama. Si el organigrama cambia despues de crear filas, las asignaciones D/E/R/S/V en receptores (guardadas como {siglas: 'JA', valor: 'D'}) pueden quedar huerfanas (siglas que ya no corresponden a nadie).


---

## 11. Preguntas Abiertas para Diseno del Modulo "Plan de Trabajo"

### 11.1 Alcance del Modulo

- A que nivel jerarquico opera: Fase > EDT > Actividad > Tarea?
- Es el mismo modelo que ProyectoCronograma (cronograma de planificacion/ejecucion) o un modulo paralelo?
- Incluye asignacion de responsables por tarea (relacion con ProyectoOrgNodo)?
- Incluye fechas y duraciones calculadas con el calendario laboral?

### 11.2 Relacion con Cronograma Existente

El cronograma existente (ProyectoCronograma con tipos 'comercial'/'planificacion'/'ejecucion') ya tiene la jerarquia Fase > EDT > Actividad > Tarea > Subtarea. El Plan de Trabajo es:
- a) Una vista diferente del mismo modelo?
- b) Un tipo adicional de cronograma (tipo='plan_trabajo')?
- c) Un modelo completamente nuevo con su propia jerarquia?

### 11.3 Exportacion

- Que formatos se requieren: DOCX, PDF, Excel?
- El DOCX debe seguir el mismo patron que la Matriz (server-side con libreria docx)?
- El PDF debe ser client-side (jsPDF) o server-side?

### 11.4 Integracion con Organigrama

- Las tareas del plan de trabajo se asignan a nodos del organigrama?
- Si el organigrama no esta creado, el plan de trabajo puede existir solo?
- Debe haber un constraint de integridad (similar al de Matriz -> Organigrama)?

### 11.5 Integracion con TDR

- El plan de trabajo se genera (manual o IA) a partir del TDR (hitos contractuales, personal requerido)?
- Los hitos contractuales de TDR se mapean a fases del plan de trabajo?

### 11.6 Generacion con IA

- Debe incluir generacion con IA similar a la matriz?
- Si si: que datos alimentan el prompt (TDR, EDT del proyecto, equipo del organigrama)?
- Modelo a usar: claude-sonnet-4-6 como en la matriz?

### 11.7 Estado y Versionado

- El plan de trabajo tiene versiones (v1, v2, revision)?
- Multiples planes por proyecto (uno por fase contractual)?
- Estado: borrador / aprobado / en ejecucion?

### 11.8 Integracion con Logistica

- Las tareas del plan generan ordenes de compra o requerimientos de materiales?
- Relacion con el modulo de OC multi-proyecto existente?

### 11.9 Permisos Especificos

- Quienes pueden editar el plan: solo gestor/gerente o tambien coordinador?
- El plan es visible para el cliente (rol colaborador externo)?

### 11.10 Ruta y Nombre de URL

Siguiendo la convencion del sistema, la ruta deberia ser:
- Page: /proyectos/[id]/plan-trabajo
- API: /api/proyectos/[id]/plan-trabajo (usar PLURAL como convencion nueva)

Confirmar nombre: "Plan de Trabajo", "Plan de Ejecucion", "Plan Operativo"?

---

*Fin del reporte. Generado automaticamente el 2026-05-08.*
