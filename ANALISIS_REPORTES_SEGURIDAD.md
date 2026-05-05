# Análisis para el módulo "Reportes Semanales de Seguridad"

> Documento de análisis previo al diseño. **No** contiene código de implementación — solo hallazgos sobre el estado actual del proyecto y recomendaciones de integración.
>
> Fecha de análisis: 2026-05-05
> Branch: `main`
> Revisado contra: schema Prisma principal, estructura `src/app`, `src/components`, `src/lib`, `package.json`, `vercel.json`.

---

## 1. Stack técnico

| Aspecto | Valor confirmado |
|---|---|
| Framework | **Next.js 15.2.8** — App Router (no hay carpeta `pages/`) |
| TypeScript | **5.x** (strict project, `tsc --noEmit` como `type-check`) |
| ORM | **Prisma 6.19.0** — schema en `prisma/schema.prisma` (también existen `schema_neon.prisma` y `schema_local.prisma`, ignorables) |
| Base de datos | **PostgreSQL** (driver `pg ^8.16.3`, adapter `@prisma/adapter-pg`) |
| Auth | **NextAuth v4.24.11** + `@next-auth/prisma-adapter` — Google OAuth + Credentials (bcryptjs). Config en `src/lib/auth.ts` |
| Storage de archivos / fotos | **Google Drive (`googleapis ^171.4.0`)** — único storage encontrado. Servicio en `src/lib/services/googleDrive.ts`. **No** hay S3, Cloudinary, Supabase Storage, Vercel Blob ni Firebase. |
| Librería UI | **shadcn/ui** sobre Tailwind v4 + Radix primitives — 48 componentes en `src/components/ui/` |
| Estado / data fetching | **@tanstack/react-query 5.87.4** (dominante). `swr ^2.3.6` está instalado pero el patrón principal es React Query. Provider en `src/lib/providers/QueryProvider.tsx` |
| Validación | **Zod 3.24.3** + `@hookform/resolvers` (validators en `src/lib/validators/`) |
| Formularios | **react-hook-form 7.56.1** combinado con Zod, aunque varios formularios usan `useState` + validación manual |
| PDFs | **`@react-pdf/renderer 4.3.0`**, `jspdf 3.0.3` + `jspdf-autotable`, `html2canvas`, `puppeteer` (esta última en devDeps) |
| Word | **`docx 9.6.1`** — usado en `src/lib/ssoma/exportDocx.ts` |
| PowerPoint | **No instalado** — no hay `pptxgenjs` ni similar |
| Email | **No instalado** — no hay `nodemailer`, `resend`, `sendgrid`, ni `mailgun`. Notificaciones son in-app vía modelo `Notificacion` |
| Cron | **Vercel Crons** — definidos en `vercel.json` (4 jobs activos) |
| Otros relevantes | `recharts 3.2.0` (gráficos), `react-leaflet` (mapas), `exceljs`, `xlsx`, `qrcode`, `html5-qrcode`, `framer-motion`, `dnd-kit` |

### Estructura de carpetas (3 niveles, fragmento útil)

```
src/
├── app/
│   ├── (admin)/, (comercial)/, (logistica)/, (proyectos)/   route groups
│   ├── admin/                  usuarios, permisos, personal, monitoring, actividad, uso-ia
│   ├── administracion/         cuentas-cobrar, cuentas-pagar, gastos, rendiciones, facturacion
│   ├── api/                    211 route.ts (incluye api/cron/*)
│   ├── catalogo/               equipos, servicios, gastos, recursos, edts, unidades, etc.
│   ├── comercial/              cotizaciones, crm, dashboard, plantillas
│   ├── configuracion/          calendario-laboral, departamentos, cargos, permisos, fases
│   ├── crm/                    clientes, oportunidades, actividades, reportes
│   ├── finanzas/               aprovisionamiento, dashboard, requerimientos
│   ├── gastos/                 mis-requerimientos, mis-pedidos, requerimientos
│   ├── gestion/                kpis, reportes (rentabilidad, curva-s, aging-cxc, margen-real, costos-reales)
│   ├── logistica/              listas, pedidos, proveedores, catalogo, cotizaciones
│   ├── mi-trabajo/             mi-jornada, registros, progreso       ← clave para este módulo
│   ├── proyectos/              [id], catalogo, ssoma, equipos, listas, pedidos
│   ├── reportes/               productividad
│   ├── seguridad/              catalogo, stock, entregas, reposiciones, empleados, reportes  ← lugar destino
│   ├── supervision/            jornada-campo, registro-campo, aprobar-campo, equipo, edts, resumen, analisis-edt
│   ├── login/, denied/, demo/, documentos/
│   └── layout.tsx, page.tsx
│
├── components/
│   ├── ui/                     48 componentes shadcn/ui
│   ├── horas-hombre/jornada/   JornadaFormModal, JornadaActiva, CerrarJornadaModal, etc.
│   ├── seguridad/              ModalImportarCatalogoEPP.tsx (único)
│   ├── pdf/                    CotizacionPDF, OrdenCompraPDF
│   ├── proyectos/, comercial/, crm/, logistica/, finanzas/, drive/, ...
│   └── Sidebar.tsx             ← donde se define el menú "Seguridad"
│
├── lib/
│   ├── auth.ts                 NextAuth + roles
│   ├── prisma.ts               singleton
│   ├── permissions/            base-permissions.ts (sistema granular)
│   ├── services/               50+ servicios (incluye googleDrive.ts, progresoService.ts)
│   ├── ssoma/                  exportDocx.ts y otros
│   ├── validators/             schemas Zod
│   ├── providers/              QueryProvider.tsx
│   ├── utils/                  notificaciones, calendarioLaboral, generadores, etc.
│   └── server/                 cronograma, audit
│
├── hooks/                      usePermissions, useListaEquipoFilters, etc. (16 hooks)
└── types/                      next-auth.d.ts, permissions.ts, registroCampo.ts, etc.
```

---

## 2. Módulo de Jornadas de Campo

Esta es la pieza más importante para reutilizar — el módulo nuevo se alimentará principalmente de aquí.

### 2.1 Archivos y rutas involucradas

**Páginas (App Router):**

| Ruta | Archivo | Propósito |
|---|---|---|
| `/mi-trabajo/mi-jornada` | [src/app/mi-trabajo/mi-jornada/page.tsx](src/app/mi-trabajo/mi-jornada/page.tsx) | Vista principal del supervisor de campo: crear, editar y cerrar jornadas |
| `/mi-trabajo/registros` | [src/app/mi-trabajo/registros/page.tsx](src/app/mi-trabajo/registros/page.tsx) | **Obsoleto** — redirige a `/mi-trabajo/timesheet` |
| `/mi-trabajo/progreso` | [src/app/mi-trabajo/progreso/page.tsx](src/app/mi-trabajo/progreso/page.tsx) | Dashboard personal de progreso |
| `/supervision/jornada-campo` | [src/app/supervision/jornada-campo/page.tsx](src/app/supervision/jornada-campo/page.tsx) | Vista de gestor: ver y aprobar/rechazar jornadas |
| `/supervision/registro-campo` | [src/app/supervision/registro-campo/page.tsx](src/app/supervision/registro-campo/page.tsx) | **Obsoleto** — redirige a `/supervision/jornada-campo` |
| `/supervision/aprobar-campo` | [src/app/supervision/aprobar-campo/page.tsx](src/app/supervision/aprobar-campo/page.tsx) | **Obsoleto** — redirige a `/supervision/jornada-campo` |

**Componentes reutilizables** (todos en [src/components/horas-hombre/jornada/](src/components/horas-hombre/jornada/)):

- `JornadaFormModal.tsx` — crear/editar jornada (proyecto, EDT, objetivos, personal planificado)
- `JornadaActiva.tsx` — vista de jornada en curso, agregar tareas, botón cerrar
- `MiJornadaTimeline.tsx` — timeline histórico con filtros
- `AgregarTareaModal.tsx` — añadir tarea (de cronograma o extra)
- `CerrarJornadaModal.tsx` — wizard 3 pasos (horas → bloqueos → progreso)
- `EditarTareaModal.tsx`
- `ListaJornadas.tsx`

**API Routes:**

```
src/app/api/horas-hombre/
├── jornada/
│   ├── iniciar/route.ts                       POST  crear jornada (estado='iniciado')
│   ├── mis-jornadas/route.ts                  GET   jornadas del supervisor logueado
│   ├── todas/route.ts                         GET   todas (vista supervisión)
│   └── [id]/
│       ├── route.ts                           GET/PATCH/DELETE
│       ├── cerrar/route.ts                    PUT   cerrar (→ 'pendiente')
│       ├── reabrir/route.ts                   PUT   reabrir rechazada (→ 'iniciado')
│       ├── agregar-tarea/route.ts             POST
│       └── tarea/[tareaId]/route.ts           GET/PATCH/DELETE
├── campo/[id]/
│   ├── aprobar/route.ts                       PUT   aprobar + crear RegistroHoras
│   └── rechazar/route.ts                      PUT   rechazar con motivo
├── actividades-edt/[edtId]/route.ts           GET
└── tareas-extra/route.ts                      GET
```

**Tipos** (clave): [src/types/registroCampo.ts](src/types/registroCampo.ts) — `MiembroCuadrilla`, `TareaCuadrilla`, `CrearRegistroCampoPayload`, `RegistroCampoResumen`, `RegistroCampoDetalle`, `FiltrosRegistroCampo`.

**Servicios:**
- [src/lib/services/progresoService.ts](src/lib/services/progresoService.ts) — propaga progreso Tarea → Actividad → EDT → Fase → Proyecto (ponderado por horas)
- [src/lib/services/registroHoras.ts](src/lib/services/registroHoras.ts)

### 2.2 Modelo de datos (literal del schema Prisma)

```prisma
model RegistroHorasCampo {
  id              String              @id @default(cuid())

  // Vinculación
  proyectoId      String
  proyectoEdtId   String?
  supervisorId    String              // quien crea la jornada

  // Datos de jornada
  fechaTrabajo    DateTime
  descripcion     String?
  ubicacion       String?
  estado          EstadoRegistroCampo @default(iniciado)

  // Datos de cierre
  objetivosDia        String?
  personalPlanificado Json?           // [{userId, nombre, rolJornada}]
  avanceDia           String?
  bloqueos            Json?           // [{tipoBloqueoId, tipoBloqueoNombre, descripcion, impacto, accion}]
  planSiguiente       String?

  // Aprobación
  fechaAprobacion DateTime?
  aprobadoPorId   String?
  motivoRechazo   String?
  fechaCierre     DateTime?

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  proyecto        Proyecto            @relation(fields: [proyectoId], references: [id])
  proyectoEdt     ProyectoEdt?        @relation(fields: [proyectoEdtId], references: [id])
  supervisor      User                @relation("RegistrosCampoSupervisor", fields: [supervisorId], references: [id])
  aprobadoPor     User?               @relation("RegistrosCampoAprobador", fields: [aprobadoPorId], references: [id])
  tareas          RegistroHorasCampoTarea[]

  @@index([proyectoId, estado, fechaTrabajo])
  @@index([supervisorId, estado])
  @@index([estado, createdAt(sort: Desc)])
  @@map("registro_horas_campo")
}

enum EstadoRegistroCampo {
  iniciado    // jornada en curso
  pendiente   // cerrada, esperando aprobación
  aprobado
  rechazado
}

model RegistroHorasCampoTarea {
  id                String   @id @default(cuid())
  registroCampoId   String
  proyectoTareaId   String?  // null si es tarea extra
  nombreTareaExtra  String?
  descripcion       String?
  porcentajeInicial Int?
  porcentajeFinal   Int?
  createdAt         DateTime @default(now())

  registroCampo     RegistroHorasCampo          @relation(fields: [registroCampoId], references: [id], onDelete: Cascade)
  proyectoTarea     ProyectoTarea?              @relation(fields: [proyectoTareaId], references: [id])
  miembros          RegistroHorasCampoMiembro[]

  @@index([registroCampoId])
  @@index([proyectoTareaId])
  @@map("registro_horas_campo_tarea")
}

model RegistroHorasCampoMiembro {
  id                   String   @id @default(cuid())
  registroCampoTareaId String
  usuarioId            String
  horas                Float
  observaciones        String?
  registroHorasId      String?  @unique  // se setea al aprobar (FK a RegistroHoras)
  createdAt            DateTime @default(now())

  registroCampoTarea   RegistroHorasCampoTarea @relation(fields: [registroCampoTareaId], references: [id], onDelete: Cascade)
  usuario              User                    @relation(fields: [usuarioId], references: [id])
  registroHoras        RegistroHoras?          @relation(fields: [registroHorasId], references: [id])

  @@index([registroCampoTareaId])
  @@index([usuarioId])
  @@map("registro_horas_campo_miembro")
}
```

> **Importante:** una jornada está vinculada a **1 proyecto** y opcionalmente a **1 EDT**. Cada jornada contiene N tareas, cada tarea contiene N miembros con sus horas.

### 2.3 Campos que llena el supervisor en `/mi-trabajo/mi-jornada`

**Crear jornada** (`JornadaFormModal`):
- Requeridos: `proyectoId`, `fechaTrabajo` (default = hoy), `objetivosDia`, `personalPlanificado[]` (cada miembro: `userId`, `nombre`, `rolJornada` ∈ `'trabajador' | 'supervisor' | 'seguridad'`)
- Opcionales: `proyectoEdtId`, `ubicacion`
- Validación: al menos 1 supervisor en `personalPlanificado`

**Agregar tareas** (`AgregarTareaModal`):
- Tipo `cronograma` → `proyectoTareaId`
- Tipo `extra` → `nombreTareaExtra` (o re-usar `ProyectoTarea.esExtra=true` existente)
- Lista de miembros asignados a la tarea

**Cerrar jornada** (`CerrarJornadaModal`, wizard de 3 pasos):
- Paso 1 – Horas: `horasMiembros[miembroId]` = horas trabajadas (defaults inteligentes: si un miembro está en N tareas, se reparte 9.5/N redondeado a 0.5)
- Paso 2 – Bloqueos: array `[{ tipoBloqueoId, tipoBloqueoNombre, descripcion (req), impacto, accion }]`
- Paso 3 – Cierre: `avanceDia` (req), `planSiguiente`, `progresoTareas[]` con porcentaje final por tarea de cronograma

**Aprobación** (gestor/gerente desde `/supervision/jornada-campo`):
- Crea `RegistroHoras` por cada miembro × tarea
- Actualiza `ProyectoTarea.horasReales` y `porcentajeCompletado`
- Propaga progreso hacia arriba vía `progresoService`

### 2.4 Vinculación con proyectos y trabajadores

```
Proyecto ─┐
          └─ RegistroHorasCampo
              │  personalPlanificado (JSON: userId, nombre, rolJornada)
              └─ RegistroHorasCampoTarea (puede apuntar a ProyectoTarea o ser extra)
                  └─ RegistroHorasCampoMiembro (User + horas)
```

- Personal del proyecto: modelo dedicado `PersonalProyecto` (`@@unique([proyectoId, userId, rol])`) — útil como fuente de "trabajadores asignados al proyecto" para autocompletar.
- Roles `RolPersonalProyecto`: `programador, cadista, ingeniero, lider, tecnico, coordinador, asistente`.

### 2.5 Lo que YA existe en el dato del campo

- **Actividades por día** ✅ — vía `RegistroHorasCampoTarea` (1 entrada por tarea × jornada).
- **Horas hombre** ✅ — vía `RegistroHorasCampoMiembro.horas` y, post-aprobación, `RegistroHoras` individuales.
- **Asistencia formal** ✅ pero **separada**: modelos independientes `JornadaAsistencia` y `Asistencia` (con cron `/api/cron/cerrar-asistencia` y `/api/cron/asistencia-reporte`). No están enlazados a `RegistroHorasCampo`.
- **Bloqueos** ✅ — campo JSON `bloqueos[]` con tipos catalogados en modelo `TipoBloqueo`.
- **Plan del día / siguiente día** ✅ — `objetivosDia`, `avanceDia`, `planSiguiente`.
- **Fotos / evidencias** ❌ — **no existe ningún campo de fotos en jornadas de campo**. Este es el gap más relevante para reportes de seguridad.

### 2.6 Patrones de arquitectura del módulo

- **API Routes** (no Server Actions). Patrón:
  ```ts
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor']
  if (!ROLES_PERMITIDOS.includes(session.user.role || '')) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  ```
- **Validación inline** (sin Zod en estos endpoints) — sólo `if (!campo) return 400`.
- **Formularios** del módulo usan `useState` + setters manuales (no `react-hook-form` aquí, aunque sí en otros módulos).
- **Operaciones complejas** envueltas en `prisma.$transaction(async (tx) => { … })` — ver `cerrar` y `aprobar`.

---

## 3. Módulo de Seguridad existente

### 3.1 Estructura de carpetas

```
src/app/seguridad/
├── layout.tsx                       valida auth + roles ['admin','gerente','seguridad']
├── page.tsx                         dashboard con tiles a cada submódulo
├── catalogo/page.tsx                CRUD CatalogoEPP
├── stock/
│   ├── page.tsx                     stock por almacén
│   └── ingreso/page.tsx
├── entregas/
│   ├── page.tsx
│   ├── nueva/page.tsx
│   └── [id]/page.tsx
├── reposiciones/page.tsx
├── empleados/page.tsx
└── reportes/
    ├── page.tsx                     dashboard de reportes
    ├── consumo-mensual/page.tsx
    ├── por-empleado/page.tsx
    └── por-imputacion/page.tsx

src/components/seguridad/
└── ModalImportarCatalogoEPP.tsx     (único componente local)

src/app/api/seguridad/
├── reportes/{consumo-mensual,por-empleado,por-imputacion}/route.ts
└── reposiciones/route.ts

src/app/api/
├── catalogo-epp/route.ts            GET/POST
└── entrega-epp/route.ts             GET/POST
```

### 3.2 Layout y navegación

**Layout** ([src/app/seguridad/layout.tsx](src/app/seguridad/layout.tsx)):

```tsx
export default async function SeguridadLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const role = session.user.role
  if (!['admin', 'gerente', 'seguridad'].includes(role)) redirect('/')
  return <>{children}</>
}
```

**Sidebar global** ([src/components/Sidebar.tsx:324-340](src/components/Sidebar.tsx#L324-L340)):

```tsx
{
  key: 'seguridad',
  title: 'Seguridad',
  icon: HardHat,
  color: 'text-orange-400',
  roles: ['admin', 'gerente', 'seguridad'],
  links: [
    { href: '/seguridad', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/seguridad/catalogo', label: 'Catálogo EPP', icon: Package },
    { href: '/seguridad/stock', label: 'Stock EPP', icon: Warehouse },
    { href: '/seguridad/entregas', label: 'Entregas', icon: ClipboardList },
    { href: '/seguridad/reposiciones', label: 'Reposiciones', icon: Clock },
    { href: '/seguridad/empleados', label: 'Empleados', icon: Users },
    { href: '/seguridad/reportes', label: 'Reportes', icon: BarChart3 },
  ],
},
```

**Dashboard de tiles** ([src/app/seguridad/page.tsx](src/app/seguridad/page.tsx)):

```tsx
const TILES = [
  { href: '/seguridad/catalogo',    label: 'Catálogo EPP',  icon: Package,       color: 'text-blue-600 bg-blue-50',     desc: '...' },
  { href: '/seguridad/stock',       label: 'Stock EPP',     icon: Warehouse,     color: 'text-emerald-600 bg-emerald-50', desc: '...' },
  { href: '/seguridad/entregas',    label: 'Entregas',      icon: ClipboardList, color: 'text-orange-600 bg-orange-50', desc: '...' },
  { href: '/seguridad/reposiciones',label: 'Reposiciones',  icon: Clock,         color: 'text-red-600 bg-red-50',       desc: '...' },
  { href: '/seguridad/empleados',   label: 'Empleados',     icon: Users,         color: 'text-violet-600 bg-violet-50', desc: '...' },
  { href: '/seguridad/reportes',    label: 'Reportes',      icon: BarChart3,     color: 'text-cyan-600 bg-cyan-50',     desc: '...' },
]
```

### 3.3 Modelos de datos del submódulo EPPs (literal)

```prisma
model CatalogoEPP {
  id                String          @id @default(cuid())
  codigo            String          @unique
  descripcion       String
  marca             String?
  modelo            String?
  talla             String?
  unidadId          String
  subcategoria      SubcategoriaEPP
  requiereTalla     Boolean         @default(false)
  tallaCampo        TallaCampo?
  vidaUtilDias      Int?
  esConsumible      Boolean         @default(false)
  imagenUrl         String?
  precioReferencial Float?
  monedaReferencial String          @default("PEN")
  activo            Boolean         @default(true)
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  unidad           Unidad           @relation(fields: [unidadId], references: [id])
  stockAlmacen     StockAlmacen[]
  movimientos      MovimientoAlmacen[]
  ordenCompraItems OrdenCompraItem[]
  pedidoEquipoItems PedidoEquipoItem[]
  entregaItems     EntregaEPPItem[]

  @@index([subcategoria, activo])
  @@map("catalogo_epp")
}

model EntregaEPP {
  id             String           @id @default(cuid())
  numero         String           @unique
  empleadoId     String
  almacenId      String
  proyectoId     String?
  centroCostoId  String?
  fechaEntrega   DateTime         @default(now())
  entregadoPorId String
  observaciones  String?
  firmaUrl       String?
  estado         EstadoEntregaEPP @default(vigente)
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  empleado     Empleado     @relation(fields: [empleadoId], references: [id])
  almacen      Almacen      @relation(fields: [almacenId], references: [id])
  proyecto     Proyecto?    @relation(fields: [proyectoId], references: [id])
  centroCosto  CentroCosto? @relation(fields: [centroCostoId], references: [id])
  entregadoPor User         @relation("EntregaEppEntregador", fields: [entregadoPorId], references: [id])
  items        EntregaEPPItem[]

  @@index([empleadoId, fechaEntrega(sort: Desc)])
  @@index([fechaEntrega(sort: Desc)])
  @@map("entrega_epp")
}

model EntregaEPPItem {
  id                      String                @id @default(cuid())
  entregaId               String
  catalogoEppId           String
  cantidad                Float
  talla                   String?
  costoUnitario           Float?
  costoMoneda             String                @default("PEN")
  fechaEntrega            DateTime
  fechaReposicionEstimada DateTime?
  estado                  EstadoEntregaEPPItem  @default(vigente)
  motivoBaja              String?
  reemplazadoPorItemId    String?
  observaciones           String?
  createdAt               DateTime              @default(now())
  updatedAt               DateTime              @updatedAt

  entrega        EntregaEPP        @relation(fields: [entregaId], references: [id], onDelete: Cascade)
  catalogoEpp    CatalogoEPP       @relation(fields: [catalogoEppId], references: [id])
  reemplazadoPor EntregaEPPItem?   @relation("EppReemplazo", fields: [reemplazadoPorItemId], references: [id])
  reemplazos     EntregaEPPItem[]  @relation("EppReemplazo")
  movimientos    MovimientoAlmacen[]

  @@index([catalogoEppId, estado])
  @@index([fechaReposicionEstimada])
  @@map("entrega_epp_item")
}

enum SubcategoriaEPP { cabeza, manos, ojos, auditiva, respiratoria, pies, caida, ropa, visibilidad, otro }
enum TallaCampo      { calzado, camisa, pantalon, casco }
enum EstadoEntregaEPP { vigente, parcialmente_renovada, renovada, dada_baja }
enum EstadoEntregaEPPItem { vigente, reemplazado, devuelto, perdido, dañado, baja }
```

### 3.4 Patrones del submódulo (representativos)

**Page (client component + fetch)** — `src/app/seguridad/entregas/page.tsx`:

```tsx
'use client'
export default function EntregasEppListaPage() {
  const [entregas, setEntregas] = useState<EntregaListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/entrega-epp')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setEntregas)
      .catch(() => toast.error('Error al cargar entregas'))
      .finally(() => setLoading(false))
  }, [])
  // … render con Card/Table
}
```

**Reporte API GET con agregación en memoria** — `src/app/api/seguridad/reportes/consumo-mensual/route.ts`:

```ts
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!['admin', 'gerente', 'seguridad'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const desde = new Date(searchParams.get('desde')!)
  const hasta = new Date(searchParams.get('hasta')!)

  const items = await prisma.entregaEPPItem.findMany({
    where: { fechaEntrega: { gte: desde, lte: hasta } },
    select: { cantidad: true, costoUnitario: true, costoMoneda: true, fechaEntrega: true,
              catalogoEpp: { select: { subcategoria: true } } },
  })

  // agrupación manual con Map<key, agg>
  // …
  return NextResponse.json({ desde, hasta, totales, meses })
}
```

**Form (Dialog modal + estado local + validación manual)** — `src/app/seguridad/catalogo/page.tsx`:
- Sin `react-hook-form` aquí; usa `useState({ id, codigo, descripcion, ... })` y `if (!draft.codigo.trim()) return toast.error(...)`.
- POST si crear (`!draft.id`), PUT si editar.
- Recarga tras éxito con `cargar()`.

### 3.5 Roles con acceso

`['admin', 'gerente', 'seguridad']` (validado en layout y replicado en todas las APIs del módulo).

### 3.6 Navegación

Sidebar global → "Seguridad" → expande submenú con 7 links → al entrar a `/seguridad` se ve un grid de 6 tiles que duplica los enlaces. Cada subpágina tiene un botón "back" a `/seguridad`.

---

## 4. Modelos compartidos relevantes

### 4.1 Proyecto (literal, fragmento útil)

```prisma
model Proyecto {
  id              String          @id
  clienteId       String?
  comercialId     String?
  gestorId        String
  supervisorId    String?
  liderId         String?
  centroCostoId   String?
  cotizacionId    String?
  esInterno       Boolean         @default(false)
  nombre          String
  descripcion     String?
  codigo          String
  estado          ProyectoEstado  @default(creado)
  fechaInicio     DateTime
  fechaFin        DateTime?
  moneda          String?         @default("USD")
  // … +60 campos financieros (totales internos/cliente, descuentos, IGV, etc.)
  progresoGeneral Int             @default(0)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime
  deletedAt       DateTime?

  cliente            Cliente?              @relation(fields: [clienteId], references: [id])
  gestor             User                  @relation("ProyectoGestor",     fields: [gestorId],     references: [id])
  comercial          User?                 @relation("ProyectoComercial",  fields: [comercialId],  references: [id])
  supervisor         User?                 @relation("ProyectoSupervisor", fields: [supervisorId], references: [id])
  lider              User?                 @relation("ProyectoLider",      fields: [liderId],      references: [id])
  personalProyecto   PersonalProyecto[]
  registrosCampo     RegistroHorasCampo[]
  proyectoEdt        ProyectoEdt[]
  proyectoFase       ProyectoFase[]
  ssomaExpediente    SsomaExpediente?      // ← SSOMA expediente 1:1 por proyecto
  entregasEpp        EntregaEPP[]
  // … más relaciones
  @@map("proyecto")
}

enum ProyectoEstado {
  creado, en_planificacion, listas_pendientes, listas_aprobadas,
  pedidos_creados, en_ejecucion, en_cierre, cerrado, pausado, cancelado
}
```

### 4.2 User + Empleado (Trabajador) + asignación a proyecto

```prisma
model User {
  id        String   @id @default(cuid())
  name      String?
  email     String   @unique
  password  String?
  role      Role     @default(colaborador)
  image     String?
  // … relaciones (ver schema completo: 80+ relaciones)
  empleado  Empleado?
  @@map("user")
}

enum Role {
  colaborador, comercial, presupuestos, proyectos, coordinador,
  coordinador_logistico, logistico, gestor, gerente, seguridad,
  admin, administracion
}

model Empleado {
  id                 String           @id @default(cuid())
  userId             String           @unique
  cargoId            String?
  departamentoId     String?
  sueldoPlanilla     Float?
  sueldoHonorarios   Float?
  fechaIngreso       DateTime?
  fechaCese          DateTime?
  activo             Boolean          @default(true)
  documentoIdentidad String?
  telefono           String?
  direccion          String?
  modalidadTrabajo   ModalidadTrabajo @default(presencial)
  // tallas (útiles para fotos de EPP, ya integradas con EntregaEPP)
  tallaCamisa        String?
  tallaPantalon      String?
  tallaCalzado       String?
  tallaCasco         String?
  cargo              Cargo?           @relation(fields: [cargoId], references: [id])
  departamento       Departamento?    @relation(fields: [departamentoId], references: [id])
  user               User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  asistencias        Asistencia[]
  entregasEpp        EntregaEPP[]
  @@map("empleado")
}

model PersonalProyecto {
  id              String              @id @default(cuid())
  proyectoId      String
  userId          String
  rol             RolPersonalProyecto
  fechaAsignacion DateTime            @default(now())
  fechaFin        DateTime?
  activo          Boolean             @default(true)
  notas           String?
  proyecto        Proyecto            @relation(fields: [proyectoId], references: [id], onDelete: Cascade)
  user            User                @relation(fields: [userId], references: [id])
  @@unique([proyectoId, userId, rol])
  @@map("personal_proyecto")
}
```

### 4.3 Modelos de evidencia/fotos/adjuntos

**El proyecto usa un patrón consistente de "Adjunto" por entidad** (todos guardan referencia a Google Drive):

```prisma
model HojaDeGastosAdjunto {
  id             String   @id @default(cuid())
  hojaDeGastosId String
  depositoHojaId String?
  nombreArchivo  String
  urlArchivo     String
  driveFileId    String?
  tipoArchivo    String?
  tamano         Int?
  tipo           String   @default("constancia_deposito")
  createdAt      DateTime @default(now())
  // … relaciones
}
```

**Otros adjuntos similares** (mismo shape `nombreArchivo / urlArchivo / driveFileId / tipoArchivo / tamano`):
`CartaFianzaAdjunto`, `ValorizacionAdjunto`, `GastoAdjunto`, `CxPAdjunto`, `CxCAdjunto`.

> **No existe** un modelo genérico de "Foto" o "Evidencia" reutilizable. **No existe** un modelo de "registro fotográfico" para jornadas de campo. **Hay que crear uno** para reportes semanales — la opción más limpia es un modelo `FotoSeguridadReporte` (o `EvidenciaReporteSeguridad`) que siga el shape de los adjuntos existentes.

### 4.4 Modelos de seguridad ya existentes (catálogo completo)

**SSOMA** (Sistema Salud y Seguridad Ocupacional):
- `SsomaExpediente` — 1 por proyecto. Contiene flags (`hayTrabajoElectrico`, `hayTrabajoAltura`, `hayEspacioConfinado`, `hayTrabajoCaliente`), info de gestor/ingSeguridad, `driveFolderId`.
- `SsomaDocumento` — PETS, IPERC, MATRIZ_EPP, PLAN_EMERGENCIA, PAR (cada uno con subtipo).
- `SsomaPersonalHabilitado` — personal habilitado por expediente, con vencimientos de certificaciones (`certAlturaVence`, `certElectricoVence`, `certCalienteVence`, `aptitudMedicaVence`).

**EPP**: `CatalogoEPP`, `EntregaEPP`, `EntregaEPPItem` (ver §3.3).

> **No existe** ningún modelo para: charlas de seguridad, inspecciones, incidentes, observaciones planeadas/no planeadas, reporte de actos/condiciones inseguras. Estos son gaps claros.

### 4.5 Notificaciones

```prisma
model Notificacion {
  id           String                 @id
  titulo       String
  mensaje      String
  tipo         TipoNotificacion       @default(info)       // info | warning | success | error
  prioridad    PrioridadNotificacion  @default(media)      // baja | media | alta | critica
  usuarioId    String
  entidadTipo  String?
  entidadId    String?
  leida        Boolean                @default(false)
  fechaLectura DateTime?
  accionUrl    String?
  accionTexto  String?
  createdAt    DateTime               @default(now())
  user         User                   @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  @@map("notificaciones")
}
```

In-app únicamente. Helpers en [src/lib/utils/notificaciones.ts](src/lib/utils/notificaciones.ts).

---

## 5. Patrones y convenciones del proyecto

| Aspecto | Patrón observado |
|---|---|
| **Routes / carpetas** | `kebab-case` (`mi-jornada`, `aprobar-campo`, `cuentas-cobrar`) |
| **Componentes React** | `PascalCase.tsx` (`JornadaFormModal.tsx`, `GastoAdjuntoUpload.tsx`) |
| **Variables / funciones** | `camelCase` |
| **Servicios** | `src/lib/services/<entidad>.ts` |
| **Validators Zod** | `src/lib/validators/<entidad>.ts` |
| **API vs Server Actions** | **API Routes 100%** — 211 `route.ts`. **No hay archivos `actions.ts`** en código de aplicación. |
| **Formularios** | Mezclado: módulos nuevos usan `react-hook-form` + Zod (con `@hookform/resolvers`); módulos como Jornada y Catálogo EPP usan `useState` + validación manual + `toast` (sonner). Patrón aceptable: cualquiera de los dos. |
| **Upload de archivos** | `FormData` + `POST` a route que llama `uploadFile()` de `src/lib/services/googleDrive.ts` → guarda fila en tabla `*Adjunto`. Ejemplo en `src/app/api/hoja-de-gastos-adjunto/route.ts`. |
| **Auth en APIs** | `getServerSession(authOptions)` → check `session.user` → check `session.user.role` contra array de roles permitidos → return 401/403. |
| **Permisos granulares** | Sistema en [src/lib/permissions/base-permissions.ts](src/lib/permissions/base-permissions.ts) y [src/lib/services/permissions.ts](src/lib/services/permissions.ts) (resource × action). Hook cliente: [src/hooks/usePermissions.ts](src/hooks/usePermissions.ts). En la práctica, los módulos existentes (Seguridad incluido) chequean `session.user.role` contra arrays — el sistema granular existe pero no es uniforme aún. |
| **Notificaciones** | In-app via modelo `Notificacion`. **No** hay envío de email. |
| **PDFs** | `@react-pdf/renderer` para documentos formales (componentes en `src/components/pdf/`) y `jspdf` + `jspdf-autotable` para tablas/exportes simples. Ejemplo: [src/components/pdf/CotizacionPDF.tsx](src/components/pdf/CotizacionPDF.tsx). |
| **Word** | `docx` package vía [src/lib/ssoma/exportDocx.ts](src/lib/ssoma/exportDocx.ts) y endpoint `src/app/api/ssoma/documento/[id]/word/route.ts`. |
| **PowerPoint** | **No implementado.** Si el reporte semanal necesita PPT, hay que añadir una librería (recomendado: `pptxgenjs`). |
| **Cron** | Vercel Crons (ver `vercel.json`): `actualizar-vencimiento`, `cartas-fianza`, `asistencia-reporte`, `cerrar-asistencia`. Endpoints en `src/app/api/cron/<job>/route.ts`. **Patrón:** validan `Authorization: Bearer ${process.env.CRON_SECRET}`. |
| **Toast** | `sonner` (`import { toast } from 'sonner'`). |
| **Charts** | `recharts 3.2.0` ya integrado (ej. uso de IA stacked chart). |
| **Tabla / lista virtual** | `react-window`, `ag-grid-community/react` disponibles. |

---

## 6. Endpoints / queries reutilizables para el nuevo módulo

| Caso de uso | Endpoint | Notas |
|---|---|---|
| **Listar jornadas por rango fecha + proyecto** | `GET /api/horas-hombre/jornada/todas` (acepta filtros) | Devuelve jornadas con tareas, miembros y bloqueos. Estado del filtro: `aprobado`, `pendiente`, etc. **Núcleo del reporte semanal**. |
| **Detalle de una jornada** | `GET /api/horas-hombre/jornada/[id]` | Para drill-down desde reporte. |
| **Mis jornadas (supervisor)** | `GET /api/horas-hombre/jornada/mis-jornadas` | Por si el supervisor quiere ver SU reporte. |
| **Tareas del cronograma de un EDT** | `GET /api/horas-hombre/actividades-edt/[edtId]` | Para vincular avance. |
| **Catálogo de bloqueos** | `GET /api/configuracion/tipos-bloqueo` | Necesario si el reporte categoriza bloqueos. |
| **Listar trabajadores asignados a un proyecto** | (revisar) endpoint que devuelva `PersonalProyecto` por `proyectoId` | Existe la tabla `PersonalProyecto`; no se verificó endpoint dedicado — puede requerir uno nuevo o reutilizar `GET /api/proyectos/[id]/personal` si existe. |
| **Listar entregas EPP por rango** | `GET /api/entrega-epp` (filtrable por fechas) | Puede integrarse al reporte (cumplimiento de EPP en la semana). |
| **Reportes EPP existentes** | `GET /api/seguridad/reportes/{consumo-mensual,por-empleado,por-imputacion}` | Patrón a seguir para los reportes semanales. |
| **Productividad** | `GET /api/horas-hombre/productividad` (verificar) | Suma horas por usuario/periodo. |
| **Aprobación / rechazo jornada** | `PUT /api/horas-hombre/campo/[id]/{aprobar,rechazar}` | Sólo si el reporte semanal incluye flujo de aprobación de su propio documento. |
| **Subida a Drive** | `uploadFile()` en `src/lib/services/googleDrive.ts` | Reutilizable directo para fotos del reporte. |
| **Notificación in-app** | helpers en `src/lib/utils/notificaciones.ts` + modelo `Notificacion` | Para avisar viernes "ya puedes generar tu reporte" / "reporte pendiente". |

> **Sumar horas hombre por semana / proyecto / persona**: **no existe un endpoint dedicado**, pero es trivial derivarlo agregando `RegistroHorasCampoMiembro.horas` agrupado por `usuarioId / proyectoId / fechaTrabajo` (semana ISO). Se puede hacer en memoria como en `consumo-mensual` o con `prisma.groupBy`.

---

## 7. Gaps detectados

Cosas que **NO existen** y que probablemente habrá que crear:

1. **Modelo de actividad de seguridad** (charla / inspección / incidente / observación) — no hay nada equivalente en el schema. Si el reporte semanal incluye estas categorías, hay que diseñar uno o varios modelos:
   - `ChargaSeguridad` (charlas de 5 minutos, capacitaciones)
   - `InspeccionSeguridad`
   - `Incidente` / `Accidente`
   - `ObservacionSeguridad` (acto/condición insegura)
2. **Modelo de fotos categorizadas** — hay adjuntos por entidad pero no hay un modelo genérico que pueda etiquetar fotos por categoría (`charla`, `inspeccion`, `epp_uso`, `incidente`, `panoramica_obra`, etc.). Hay que crear `FotoReporteSeguridad` (o similar) con un campo `categoria` enum y FK al reporte.
3. **Modelo de ReporteSemanalSeguridad en sí** — no existe. Se necesita un agregador con: proyectoId, semanaISO (`YYYY-Www`), fechaInicio, fechaFin, supervisorId, estado (`borrador | enviado | aprobado`), resumenEjecutivo, indicadoresKPI (JSON), referencias a fotos, etc.
4. **Generación de PowerPoint** — `pptxgenjs` no está instalado. Si la entrega final es PPT, hay que añadirlo. Alternativa: PDF con `@react-pdf/renderer` (ya disponible) que mimetice un PPT.
5. **Cron de viernes** — la infraestructura de Vercel Crons existe, pero no hay un cron que dispare creación / cierre / notificación de reportes semanales. Habrá que añadir entrada en `vercel.json` y endpoint nuevo (ej. `/api/cron/reporte-semanal-seguridad`).
6. **Endpoint "trabajadores activos en proyecto durante semana X"** — no se encontró; es derivable de `RegistroHorasCampoMiembro` cruzado con `RegistroHorasCampo` por rango de fechas, pero conviene un helper.
7. **Vinculación foto ↔ jornada de campo** — actualmente las jornadas no aceptan adjuntos. Si las fotos del reporte semanal vienen **del día a día** (lo natural), conviene también añadir un `RegistroHorasCampoAdjunto` para que el supervisor cargue fotos al cerrar jornada y luego el reporte semanal las recolecta automáticamente.
8. **Email** — si el reporte se manda por correo al cliente/gerencia, **no hay infraestructura de email**: hay que elegir e instalar `resend` (más simple, soporta React Email) o `nodemailer`.
9. **Catálogo de tipos de evento de seguridad** — paralelo a `TipoBloqueo`, podría hacer falta un `TipoEventoSeguridad` para que charlas/inspecciones/incidentes sean tipados.

---

## 8. Recomendación de ubicación e integración

### 8.1 Ubicación recomendada

**Opción A (recomendada)** — Submódulo dentro de Seguridad:

```
src/app/seguridad/
└── reportes-semanales/
    ├── page.tsx                              listado de reportes (filtro por proyecto/semana/estado)
    ├── nuevo/page.tsx                        crear reporte (selector de proyecto + semana)
    ├── [id]/
    │   ├── page.tsx                          editor del reporte (server component carga, client component edita)
    │   ├── fotos/page.tsx                    galería editable (subida a Drive)
    │   ├── exportar/page.tsx                 vista previa + descarga PDF/PPT
    │   └── enviar/page.tsx                   submit a aprobación / envío
    └── plantilla/page.tsx                    (opcional) configurar plantilla del reporte por proyecto

src/app/api/seguridad/reportes-semanales/
├── route.ts                                 GET listar / POST crear
├── [id]/
│   ├── route.ts                             GET/PATCH/DELETE
│   ├── fotos/route.ts                       POST upload, GET listar
│   ├── enviar/route.ts                      PUT cambiar estado a 'enviado'
│   ├── aprobar/route.ts                     PUT
│   ├── rechazar/route.ts                    PUT
│   └── exportar-{pdf,pptx}/route.ts         GET genera el archivo
└── kpis/route.ts                            GET indicadores agregados (horas, asistencia, EPP, etc.)

src/app/api/cron/
└── reporte-semanal-seguridad/route.ts       cron viernes: crea borradores y/o notifica
```

**Por qué A es preferible:**
- Coherente con el patrón actual (los reportes EPP viven en `/seguridad/reportes/*`).
- El layout de Seguridad ya valida roles `['admin', 'gerente', 'seguridad']` — los supervisores de campo, cuyo rol típico es `colaborador` o `coordinador`, **no entrarían**. Hay que **ampliar el array de roles del layout** o crear un layout interno que permita acceso de lectura a ciertos roles cuando el reporte es propio.
- Si se decide que el supervisor llene el reporte desde "Mi Trabajo" en vez de "Seguridad", se puede partir el módulo: edición desde `/mi-trabajo/reporte-semanal-seguridad/...` y revisión/exportación desde `/seguridad/reportes-semanales/...`. Ambas rutas comparten APIs.

**Opción B** (alternativa) — Submódulo dentro de `/seguridad/reportes/semanales/*`. Más anidado pero tiene la ventaja de mantener "Reportes" como punto único en el dashboard. **Inconveniente:** un reporte semanal es transaccional (se crea, se edita, se envía) — no es solo un dashboard. Vivir junto a "consumo-mensual" sería incoherente. **No recomendado**.

### 8.2 Integración al sidebar y dashboard

**Sidebar** ([src/components/Sidebar.tsx:331-339](src/components/Sidebar.tsx#L331-L339)) — añadir antes de "Reportes":

```tsx
{ href: '/seguridad/reportes-semanales', label: 'Reportes Semanales', icon: FileBarChart, /* o ClipboardCheck */ },
```

**Dashboard tile** ([src/app/seguridad/page.tsx](src/app/seguridad/page.tsx)) — añadir al array `TILES`:

```tsx
{ href: '/seguridad/reportes-semanales',
  label: 'Reportes Semanales',
  icon: FileBarChart,
  color: 'text-amber-600 bg-amber-50',
  desc: 'Genera y envía el reporte semanal de seguridad por proyecto' },
```

**Roles** — discutir con el usuario:
- Si **solo gerente/seguridad/admin** generan el reporte: dejar el layout actual.
- Si los **supervisores de campo** lo escriben: ampliar `['admin', 'gerente', 'seguridad', 'gestor', 'coordinador', 'colaborador']` con filtros "solo ve los reportes de sus propios proyectos / jornadas". Recomendado mover esto al sistema granular `permissions/base-permissions.ts` (resources: `security_reports`, actions: `view`, `view_own`, `create`, `edit`, `submit`, `approve`).

### 8.3 Modelos sugeridos a añadir (alto nivel, sin código)

- `ReporteSemanalSeguridad` (proyectoId, anioSemana `YYYY-Www`, fechaInicio, fechaFin, supervisorId, estado, resumenEjecutivo, indicadores Json, createdAt/updatedAt)
- `ReporteSemanalSeguridadFoto` (reporteId, urlArchivo, driveFileId, categoria enum, descripcion, fechaTomada, jornadaCampoId? — para enlazar fotos cargadas en jornada)
- `ReporteSemanalSeguridadEvento` (charla/inspeccion/incidente/observacion) o usar 4 modelos separados según necesidad
- (Opcional) `RegistroHorasCampoAdjunto` para que las fotos se carguen ya en la jornada y el reporte solo las consume

### 8.4 Checklist de decisiones a confirmar con el usuario antes de codear

1. ¿Quién llena el reporte: supervisor de campo, ingeniero de seguridad, o ambos? (impacta roles).
2. ¿Una jornada produce foto, o el reporte semanal tiene su propia galería independiente?
3. ¿La salida final es **PDF** (ya tenemos infra) o **PPT** (hay que instalar `pptxgenjs`)? ¿O ambos?
4. ¿Se envía por **email** automáticamente al cliente / gerencia? Si sí, instalar `resend` o `nodemailer` (no hay nada actualmente).
5. ¿Hay un **flujo de aprobación** del reporte (borrador → revisado por seguridad → enviado al cliente)?
6. ¿Qué KPIs/agregados deben aparecer? Sugerencias derivables del schema actual:
   - Horas hombre semanales (de `RegistroHorasCampoMiembro`)
   - Días con bloqueos (de `RegistroHorasCampo.bloqueos`)
   - Personal habilitado vs personal en obra (de `SsomaPersonalHabilitado` × `RegistroHorasCampoMiembro`)
   - EPP entregado en la semana (de `EntregaEPP` por `proyectoId` + rango)
   - Personal con certificaciones por vencer (de `SsomaPersonalHabilitado.*Vence`)
7. ¿El cron del viernes debe **crear un borrador** automático, o solo **notificar** "vence pronto, complétalo"?
8. ¿Se necesita una **plantilla por proyecto/cliente** (ítems del reporte) o todos los reportes tienen la misma estructura?

---

## Resumen ejecutivo

**Lo bueno (ya disponible):**
- App Router, Prisma, NextAuth, shadcn/ui — stack maduro y consistente.
- **Jornadas de Campo** ya capturan: proyecto, fecha, personal planificado, tareas con horas por miembro, bloqueos categorizados, avance y plan diario, aprobación. Este es el ~70% del input de un reporte semanal.
- **Google Drive** integrado para storage de archivos — patrón claro para añadir fotos.
- **PDFs** con `@react-pdf/renderer` y **Word** con `docx` ya en uso.
- **Vercel Crons** ya operando — fácil añadir uno nuevo para los viernes.
- **Notificaciones in-app** con modelo `Notificacion`.
- Módulo de **Seguridad existente con patrón claro** para extender (layout + tiles + APIs con check de rol).

**Lo que falta y hay que diseñar/instalar:**
- Modelo `ReporteSemanalSeguridad` + tabla de fotos categorizadas.
- Probablemente: charlas / inspecciones / incidentes / observaciones (depende de alcance).
- **Fotos en jornadas de campo**: actualmente las jornadas no aceptan adjuntos — recomendado añadirlo primero.
- **Email** (no instalado).
- **PPT** (no instalado; PDF puede sustituirlo).
- Endpoint dedicado para "trabajadores activos en un rango por proyecto" y "horas semanales agregadas".

**Recomendación final de ubicación:** `/seguridad/reportes-semanales/*` (con APIs en `/api/seguridad/reportes-semanales/*` y un cron en `/api/cron/reporte-semanal-seguridad`), añadido al sidebar de Seguridad y al dashboard de tiles. El acceso debe ampliarse con permisos granulares para que supervisores de campo puedan editar **sus** reportes sin abrir el resto del módulo.
