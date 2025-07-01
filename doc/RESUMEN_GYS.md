# 📦 Resumen General del Proyecto GYS App (Next.js + Prisma)

Este documento resume la estructura actual del proyecto, incluyendo modelos, rutas API, páginas, tipos, payloads, componentes, servicios y utilidades.

---

## 📁 Estructura General de Carpetas

/prisma/
└── schema.prisma

/src/
├── app/
│ ├── api/
│ ├── admin/
│ ├── catalogo/
│ ├── comercial/
│ ├── denied/
│ ├── login/
│ ├── logistica/
│ ├── proyectos/
│ ├── layout.tsx
│ └── page.tsx
├── components/
│ ├── catalogo/
│ ├── clientes/
│ ├── cotizaciones/
│ ├── equipos/
│ ├── gestion/
│ ├── logistica/
│ ├── pdf/
│ ├── plantillas/
│ ├── proyectos/
│ ├── requerimientos/
│ ├── ui/
│ └── Sidebar.tsx, Providers.tsx, LogoutButton.tsx
├── lib/
│ ├── services/
│ ├── utils/
│ └── validators/
└── types/
├── modelos.ts
├── payloads.ts
└── index.ts, auth.ts, prisma.ts



---

## 🗂 Modelos Prisma (`prisma/schema.prisma`)

- User, Account, Session, VerificationToken
- Cliente, Proveedor, Proyecto, Valorizacion
- CatalogoEquipo, CatalogoServicio, CategoriaEquipo, CategoriaServicio, Unidad, UnidadServicio, Recurso
- Plantilla, PlantillaEquipo, PlantillaEquipoItem, PlantillaServicio, PlantillaServicioItem, PlantillaGasto, PlantillaGastoItem
- Cotizacion, CotizacionEquipo, CotizacionEquipoItem, CotizacionServicio, CotizacionServicioItem, CotizacionGasto, CotizacionGastoItem, CotizacionProveedor, CotizacionProveedorItem
- ProyectoEquipo, ProyectoEquipoItem, ProyectoServicio, ProyectoServicioItem, ProyectoGasto, ProyectoGastoItem
- ListaEquipo, ListaEquipoItem, PedidoEquipo, PedidoEquipoItem, RegistroHoras

---

## 🌐 Rutas API (`/src/app/api`)

- `/catalogo-equipo`, `/catalogo-servicio`, `/categoria-equipo`, `/categoria-servicio`, `/unidad`, `/unidad-servicio`, `/recurso`
- `/plantilla`, `/plantilla-equipo`, `/plantilla-servicio`, `/plantilla-gasto`
- `/cotizacion`, `/cotizacion-equipo`, `/cotizacion-servicio`, `/cotizacion-gasto`, `/cotizacion-proveedor`, `/cotizacion-proveedor-item`
- `/proyecto`, `/proyecto-equipo`, `/proyecto-servicio`, `/proyecto-gasto`
- `/lista-equipo`, `/lista-equipo-item`
- `/pedido-equipo`, `/pedido-equipo-item`
- `/valorizacion`, `/registro-horas`

---

## 📄 Páginas (`/src/app`)

- `/catalogo/`: categorías, equipos, servicios, recursos
- `/comercial/`: clientes, cotizaciones, plantillas
- `/logistica/`: listas, pedidos, cotizaciones, proveedores
- `/proyectos/`: por proyecto, equipos, requerimientos
- `/login/`, `/admin/`, `/denied/`

---

## 🛡️ Types (`/src/types`)

- **modelos.ts** → Tipos reflejados del schema Prisma: User, Cliente, Proyecto, Catalogo, Plantilla, Cotizacion, Proyecto, Lista, Pedido, Valorizacion, RegistroHoras.
- **payloads.ts** → DTOs para las operaciones POST/PUT/PATCH.
- **index.ts**, **auth.ts**, **prisma.ts** → Configuración base de types y utilidades.

---

## 🏗️ Componentes (`/src/components`)

Organizados por dominio:
- **catalogo** → formularios, listas, selects, modals de equipos y servicios.
- **clientes** → formularios y listas de clientes.
- **cotizaciones** → formularios, listas, acordeones para equipos, servicios, gastos.
- **equipos**, **gestion**, **logistica**, **pdf**, **plantillas**, **proyectos**, **requerimientos** → componentes específicos por área.
- **ui** → componentes compartidos (ConfirmDialog, Sidebar, LogoutButton, Providers).

---

## 🔌 Servicios (`/src/lib/services`)

Servicios API para manejar:
- Catalogo (equipos, servicios, categorías, unidades)
- Plantillas (equipos, servicios, gastos)
- Cotizaciones (equipos, servicios, gastos, proveedores)
- Proyectos (equipos, servicios, gastos)
- Listas, pedidos, valorizaciones, horas

---

## 🧰 Utils (`/src/lib/utils`)

- Archivos para import/export Excel (`equiposExcel`, `serviciosExcel`, `recursoExcel`)
- Recalculo de precios y márgenes (`recalculoCatalogoEquipo`, `recalculoCotizacion`, `recalculoPlantilla`)
- Costos, fórmulas, validadores (`validators/plantilla`, `validators/plantillaServicio`)

---

## ✅ Funciones clave por área

| Área               | Funcionalidad principal                                      |
|--------------------|-------------------------------------------------------------|
| Catálogo           | Gestionar catálogo de equipos y servicios, importación Excel |
| Plantillas         | Crear plantillas para cotizaciones, dividir por secciones    |
| Cotizaciones       | Generar cotizaciones cliente a partir de plantillas         |
| Proyectos          | Transformar cotizaciones en proyectos, gestionar ejecución   |
| Logística          | Crear listas técnicas, enviar pedidos, gestionar proveedores |
| Valorizaciones     | Calcular valorización mensual de proyectos                  |
| Registro de horas  | Control de horas hombre y costos de recursos                |

---

## 🌟 Resumen final

El proyecto **GYS App** es una plataforma modular de gestión de proyectos industriales con:
- Backend en Prisma + PostgreSQL.
- Frontend en Next.js + React + TypeScript.
- Módulos separados por dominio: comercial, proyectos, logística, gestión.
- Amplia estructura de tipos y payloads para mantener consistencia.
- Servicios y utilidades bien organizados para escalar funciones futuras.

---

✍️ Autor original de la estructura: Jesús Artemio (Master Experto 🧙‍♂️)  
📅 Última actualización del resumen: 2025-05-28
