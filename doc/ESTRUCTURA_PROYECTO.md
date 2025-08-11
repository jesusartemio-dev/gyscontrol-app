# 📁 Estructura del Proyecto GYS App - Carpeta src/

## Descripción General
Este documento describe la estructura completa de la carpeta `src/` del proyecto GYS App, que contiene todo el código fuente de la aplicación Next.js.

## Estructura Completa de src/

```
src/                                 # Código fuente principal
├── 📁 app/                          # App Router de Next.js 13+
│   ├── 📄 favicon.ico
│   ├── 📄 globals.css               # Estilos globales
│   ├── 📄 layout.tsx                # Layout principal
│   ├── 📄 page.tsx                  # Página de inicio
│   │
│   ├── 📁 admin/                    # Módulo de administración
│   │   └── 📁 usuarios/
│   │       └── 📄 page.tsx
│   │
│   ├── 📁 api/                      # API Routes de Next.js
│   │   ├── 📁 admin/                # Endpoints de administración
│   │   │   └── 📁 usuarios/
│   │   │       └── 📄 route.ts
│   │   ├── 📁 auth/                 # Autenticación NextAuth
│   │   │   └── 📁 [...nextauth]/
│   │   │       └── 📄 route.ts
│   │   ├── 📁 catalogo-equipo/      # CRUD catálogo equipos
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 catalogo-servicio/    # CRUD catálogo servicios
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   ├── 📁 categoria/
│   │   │   │   └── 📁 [id]/
│   │   │   └── 📄 route.ts
│   │   ├── 📁 categoria-equipo/     # CRUD categorías equipos
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 categoria-servicio/   # CRUD categorías servicios
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 clientes/             # CRUD clientes
│   │   │   └── 📄 route.ts
│   │   ├── 📁 comercial/            # Endpoints comerciales
│   │   │   └── 📁 plantillas/
│   │   │       └── 📄 route.ts
│   │   ├── 📁 cotizacion/           # CRUD cotizaciones
│   │   │   ├── 📁 [id]/
│   │   │   │   ├── 📁 recalcular/
│   │   │   │   └── 📄 route.ts
│   │   │   ├── 📁 from-plantilla/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 cotizacion-equipo/    # Equipos en cotizaciones
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 cotizacion-equipo-item/ # Items de equipos
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 cotizacion-gasto/     # Gastos en cotizaciones
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 cotizacion-gasto-item/ # Items de gastos
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 cotizacion-proveedor/ # Proveedores cotizaciones
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 cotizacion-proveedor-item/ # Items proveedores
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   ├── 📁 bulk/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 cotizacion-servicio/  # Servicios cotizaciones
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 cotizacion-servicio-item/ # Items servicios
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 lista-equipo/         # Listas de equipos
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   ├── 📁 all/
│   │   │   │   └── 📄 route.ts
│   │   │   ├── 📁 enviar/
│   │   │   │   └── 📁 [id]/
│   │   │   ├── 📁 from-proyecto/
│   │   │   │   └── 📁 [id]/
│   │   │   ├── 📁 item-from-proyecto/
│   │   │   │   └── 📄 route.ts
│   │   │   ├── 📄 route.ts
│   │   │   └── 📁 sync-reales/
│   │   │       └── 📁 [id]/
│   │   ├── 📁 lista-equipo-item/    # Items listas equipos
│   │   │   ├── 📁 [id]/
│   │   │   │   ├── 📁 reemplazar/
│   │   │   │   ├── 📄 route.ts
│   │   │   │   └── 📁 seleccionar-cotizacion/
│   │   │   ├── 📁 by-lista/
│   │   │   │   └── 📁 [listaId]/
│   │   │   ├── 📄 route.ts
│   │   │   └── 📄 seleccionar-cotizacion.ts
│   │   ├── 📁 lista-por-proyecto/   # Listas por proyecto
│   │   │   └── 📄 route.ts
│   │   ├── 📁 lista-requerimiento/  # Listas requerimientos
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 lista-requerimiento-item/ # Items requerimientos
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 logistica/            # Endpoints logística
│   │   │   └── 📁 listas/
│   │   │       ├── 📁 [id]/
│   │   │       └── 📄 route.ts
│   │   ├── 📁 logistica-catalogo-equipo/ # Catálogo logística
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 paquete-compra/       # Paquetes de compra
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 paquete-compra-item/  # Items paquetes
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 pedido-equipo/        # Pedidos de equipos
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 pedido-equipo-item/   # Items pedidos
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 plantilla/            # CRUD plantillas
│   │   │   ├── 📁 [id]/
│   │   │   │   ├── 📁 recalcular/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 plantilla-equipo/     # Equipos en plantillas
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 plantilla-equipo-item/ # Items equipos plantillas
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 plantilla-gasto/      # Gastos en plantillas
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 plantilla-gasto-item/ # Items gastos plantillas
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 plantilla-servicio/   # Servicios plantillas
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 plantilla-servicio-item/ # Items servicios plantillas
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 procesar-pdf/         # Procesamiento PDF
│   │   │   └── 📄 route.ts
│   │   ├── 📁 proveedor/            # CRUD proveedores
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 proyecto/             # CRUD proyectos
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   ├── 📁 from-cotizacion/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 proyecto-equipo/      # Equipos en proyectos
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📁 from-proyecto/
│   │   │       └── 📁 [id]/
│   │   ├── 📁 proyecto-equipo-item/ # Items equipos proyectos
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   ├── 📁 disponibles/
│   │   │   │   └── 📁 [proyectoId]/
│   │   │   ├── 📁 from-proyecto/
│   │   │   │   └── 📁 [id]/
│   │   │   └── 📄 route.ts
│   │   ├── 📁 recurso/              # CRUD recursos
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   ├── 📁 unidad/               # CRUD unidades
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 route.ts
│   │   │   └── 📄 route.ts
│   │   └── 📁 unidad-servicio/      # CRUD unidades servicio
│   │       ├── 📁 [id]/
│   │       │   └── 📄 route.ts
│   │       └── 📄 route.ts
    │   │
│   ├── 📁 catalogo/                 # Módulo de catálogo
│   │   ├── 📁 categorias-equipo/
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 categorias-servicio/
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 equipos/
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 recursos/
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 servicios/
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 unidades/
│   │   │   └── 📄 page.tsx
│   │   └── 📁 unidades-servicio/
│   │       └── 📄 page.tsx
│   │
│   ├── 📁 comercial/                # Módulo comercial
│   │   ├── 📁 clientes/
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 cotizaciones/
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 page.tsx
│   │   │   ├── 📁 servicio/
│   │   │   │   └── 📄 page.tsx
│   │   │   └── 📁 vista/
│   │   │       └── 📄 page.tsx
│   │   ├── 📁 dashboard/
│   │   │   └── 📄 page.tsx
│   │   ├── 📄 layout.tsx
│   │   ├── 📄 page.tsx
│   │   └── 📁 plantillas/
│   │       ├── 📁 [id]/
│   │       │   ├── 📄 page.tsx
│   │       │   └── 📄 page2.tsx
│   │       ├── 📁 equipo/
│   │       │   └── 📄 page.tsx
│   │       ├── 📄 layout.tsx
│   │       ├── 📄 page.tsx
│   │       └── 📁 servicio/
│   │           └── 📄 page.tsx
│   │
│   ├── 📁 denied/                   # Página de acceso denegado
│   │   └── 📄 page.tsx
│   │
│   ├── 📁 login/                    # Módulo de autenticación
│   │   └── 📄 page.tsx
│   │
│   ├── 📁 logistica/                # Módulo de logística
│   │   ├── 📁 catalogo/
│   │   │   └── 📄 page.tsx
│   │   ├── 📁 cotizaciones/
│   │   │   ├── 📁 crear/
│   │   │   │   └── 📄 page.tsx
│   │   │   └── 📄 page.tsx
│   │   ├── 📄 layout.tsx
│   │   ├── 📁 listas/
│   │   │   ├── 📁 [id]/
│   │   │   │   └── 📄 page.tsx
│   │   │   └── 📄 page.tsx
│   │   ├── 📄 page.tsx
│   │   ├── 📁 pedidos/
│   │   │   └── 📄 page.tsx
│   │   └── 📁 proveedores/
│   │       └── 📄 page.tsx
│   │
│   └── 📁 proyectos/                # Módulo de proyectos
│       ├── 📁 [id]/
│       │   ├── 📁 equipos/
│       │   │   └── 📄 page.tsx
│       │   ├── 📄 layout.tsx
│       │   ├── 📄 page.tsx
│       │   └── 📁 requerimientos/
│       │       └── 📄 page.tsx
│       └── 📄 page.tsx
    │
├── 📁 components/                   # Componentes React reutilizables
│   ├── 📄 ConfirmDialog.tsx         # Diálogo de confirmación
│   ├── 📄 LogoutButton.tsx          # Botón de cerrar sesión
│   ├── 📄 Providers.tsx             # Proveedores de contexto
│   ├── 📄 Sidebar.tsx               # Barra lateral de navegación
│   ├── 📄 UsuariosClient.tsx        # Cliente de usuarios
│   ├── 📁 catalogo/                 # Componentes del catálogo
│   │   ├── 📄 RecursoForm.tsx
│   │   ├── 📄 RecursoList.tsx
│   │   ├── 📄 RecursoSelect.tsx
│   │   ├── 📄 UnidadForm.tsx
│   │   └── 📄 UnidadList.tsx
│   ├── 📁 clientes/                 # Componentes de clientes
│   │   ├── 📄 ClienteForm.tsx
│   │   └── 📄 ClienteList.tsx
│   ├── 📁 cotizaciones/             # Componentes de cotizaciones
│   ├── 📁 equipos/                  # Componentes de equipos
│   ├── 📁 gestion/                  # Componentes de gestión
│   ├── 📁 logistica/                # Componentes de logística
│   │   ├── 📄 ProveedorForm.tsx
│   │   └── 📄 ProveedorList.tsx
│   ├── 📁 pdf/                      # Componentes para PDF
│   │   ├── 📄 CotizacionPDF.tsx
│   │   └── 📄 CotizacionPDFView.tsx
│   ├── 📁 plantillas/               # Componentes de plantillas
│   │   └── 📁 equipos/
│   ├── 📁 proyectos/                # Componentes de proyectos
│   │   └── 📁 equipos/
│   ├── 📁 requerimientos/           # Componentes de requerimientos
│   └── 📁 ui/                       # Componentes UI base
│       ├── 📄 ConfirmModal.tsx
│       ├── 📄 DeleteAlertDialog.tsx
│       ├── 📄 accordion.tsx
│       ├── 📄 alert-dialog.tsx
│       ├── 📄 badge.tsx
│       ├── 📄 button.tsx
│       ├── 📄 card.tsx
│       ├── 📄 checkbox.tsx
│       ├── 📄 dialog.tsx
│       ├── 📄 dropdown-menu.tsx
│       ├── 📄 input.tsx
│       ├── 📄 label.tsx
│       ├── 📄 scroll-area.tsx
│       ├── 📄 select.tsx
│       ├── 📄 skeleton.tsx
│       ├── 📄 table.tsx
│       ├── 📄 tabs.tsx
│       ├── 📄 textarea.tsx
│       └── 📄 tooltip.tsx
    │
├── 📁 lib/                          # Librerías y utilidades
│   ├── 📄 auth.ts                   # Configuración de autenticación
│   ├── 📄 prisma.ts                 # Cliente de Prisma
│   ├── 📄 utils.ts                  # Utilidades generales
│   ├── 📁 services/                 # Servicios de la aplicación
│   │   ├── 📄 catalogoEquipo.ts
│   │   ├── 📄 catalogoServicio.ts
│   │   ├── 📄 categoriaEquipo.ts
│   │   ├── 📄 categoriaServicio.ts
│   │   ├── 📄 cliente.ts
│   │   ├── 📄 cotizacion.ts
│   │   ├── 📄 cotizacionEquipo.ts
│   │   ├── 📄 cotizacionEquipoItem.ts
│   │   ├── 📄 cotizacionGasto.ts
│   │   ├── 📄 cotizacionGastoItem.ts
│   │   ├── 📄 cotizacionProveedor.ts
│   │   ├── 📄 cotizacionServicio.ts
│   │   ├── 📄 listaEquipo.ts
│   │   ├── 📄 listaEquipoItem.ts
│   │   ├── 📄 listaPorProyecto.ts
│   │   ├── 📄 listaRequerimiento.ts
│   │   ├── 📄 logisticaLista.ts
│   │   ├── 📄 nivelServicio.ts
│   │   ├── 📄 paqueteCompra.ts
│   │   ├── 📄 paqueteCompraItem.ts
│   │   ├── 📄 pedidoEquipo.ts
│   │   ├── 📄 pedidoEquipoItem.ts
│   │   ├── 📄 plantilla.ts
│   │   ├── 📄 plantillaEquipo.ts
│   │   ├── 📄 plantillaEquipoItem.ts
│   │   ├── 📄 plantillaGasto.ts
│   │   ├── 📄 plantillaGastoItem.ts
│   │   ├── 📄 plantillaServicio.ts
│   │   ├── 📄 plantillaServicioItem.ts
│   │   ├── 📄 proveedor.ts
│   │   ├── 📄 proyecto.ts
│   │   ├── 📄 proyectoEquipo.ts
│   │   ├── 📄 proyectoEquipoItem.ts
│   │   ├── 📄 recurso.ts
│   │   ├── 📄 registroHoras.ts
│   │   ├── 📄 unidad.ts
│   │   ├── 📄 unidadServicio.ts
│   │   └── 📄 valorizacion.ts
│   ├── 📁 utils/                    # Utilidades específicas
│   │   ├── 📄 categoriaEquipoExcel.ts
│   │   ├── 📄 categoriaServicioExcel.ts
│   │   ├── 📄 costos.ts
│   │   ├── 📄 equiposExcel.ts
│   │   ├── 📄 equiposImportUtils.ts
│   │   ├── 📄 formulas.ts
│   │   ├── 📄 recalculoCatalogoEquipo.ts
│   │   ├── 📄 recalculoCotizacion.ts
│   │   ├── 📄 recalculoPlantilla.ts
│   │   ├── 📄 recursoExcel.ts
│   │   ├── 📄 recursoImportUtils.ts
│   │   ├── 📄 serviciosExcel.ts
│   │   ├── 📄 serviciosImportUtils.ts
│   │   ├── 📄 unidadExcel.ts
│   │   ├── 📄 unidadImportUtils.ts
│   │   └── 📄 unidadServicioExcel.ts
│   └── 📁 validators/               # Validadores de datos
│       ├── 📄 plantilla.ts
│       ├── 📄 plantillaEquipo.ts
│       └── 📄 plantillaServicio.ts
    │
├── 📄 middleware.ts                 # Middleware de Next.js
│
└── 📁 types/                        # Definiciones de tipos TypeScript
    ├── 📄 index.ts                  # Tipos principales
    ├── 📄 modelos.ts                # Modelos de datos
    ├── 📄 next-auth.d.ts            # Tipos de NextAuth
    ├── 📄 payloads.ts               # Tipos de payloads
    └── 📄 pdf-parse.d.ts            # Tipos para parsing de PDF
```

## Descripción de Módulos Principales

### 🏗️ Arquitectura
- **Next.js 13+ App Router**: Utiliza el nuevo sistema de rutas basado en carpetas
- **Prisma ORM**: Para la gestión de base de datos con migraciones
- **TypeScript**: Tipado estático en toda la aplicación
- **API Routes**: Endpoints REST organizados por funcionalidad

### 📦 Módulos Funcionales

#### 🔧 Catálogo
- Gestión de equipos, servicios y categorías
- Unidades de medida y recursos
- Estructura modular con componentes reutilizables

#### 💼 Comercial
- Cotizaciones y plantillas
- Gestión de proveedores
- Procesamiento de documentos PDF

#### 📋 Proyectos
- Gestión de proyectos y equipos
- Listas de requerimientos
- Seguimiento de estados

#### 🚚 Logística
- Pedidos y paquetes de compra
- Gestión de inventario
- Sincronización de datos

#### 👥 Administración
- Gestión de usuarios
- Autenticación y autorización
- Configuraciones del sistema

### 🔄 Flujo de Datos
1. **Frontend**: Componentes React con TypeScript
2. **API Layer**: Next.js API Routes
3. **Business Logic**: Servicios en `/lib/services`
4. **Database**: Prisma ORM con PostgreSQL
5. **Validation**: Esquemas de validación con Zod

### 📱 Características Técnicas
- **Responsive Design**: Adaptable a diferentes dispositivos
- **Server-Side Rendering**: Optimización de rendimiento
- **Type Safety**: TypeScript en toda la aplicación
- **Database Migrations**: Control de versiones de BD
- **Authentication**: NextAuth.js para autenticación
- **PDF Processing**: Capacidad de procesamiento de documentos

---

*Última actualización: Enero 2025*
*Versión del proyecto: Next.js 14 + Prisma*



