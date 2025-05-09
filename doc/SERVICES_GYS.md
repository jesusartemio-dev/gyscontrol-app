# 📑 SERVICES_GYS.md — Guía de Servicios Cliente GYS App

---

## 📚 Concepto general

Los servicios en GYS (`/lib/services/*.ts`) son funciones **cliente** encargadas de:

- Conectarse a las APIs (`/api/entidad/`).
- Enviar o recibir datos con tipado fuerte.
- Ser consumidos directamente por los **componentes** y **páginas**.

---

## 🧠 Organización de archivos

| Archivo | Propósito |
|:--------|:----------|
| `/lib/services/catalogoEquipo.ts` | CRUD de equipos del catálogo |
| `/lib/services/catalogoServicio.ts` | CRUD de servicios del catálogo |
| `/lib/services/cliente.ts` | CRUD de clientes |
| `/lib/services/cotizacion.ts` | CRUD de cotizaciones |
| `/lib/services/plantilla.ts` | CRUD de plantillas |
| `/lib/services/proyecto.ts` | CRUD de proyectos |
| `/lib/services/usuario.ts` | Gestión de usuarios |
| `/lib/services/categoriaEquipo.ts`, `/categoriaServicio.ts`, `/unidad.ts`, `/unidadServicio.ts`, `/recurso.ts` | Carga de datos auxiliares (listas para selects) |

---

## 🔧 Estructura típica de un servicio

Cada archivo de servicios incluye funciones como:

```typescript
import { Entidad, EntidadPayload } from '@/types'

export async function getEntidades(): Promise<Entidad[]> { ... }

export async function getEntidadById(id: string): Promise<Entidad | null> { ... }

export async function createEntidad(data: EntidadPayload): Promise<Entidad> { ... }

export async function updateEntidad(id: string, data: EntidadPayload): Promise<Entidad> { ... }

export async function deleteEntidad(id: string): Promise<void> { ... }
```

- **GET**: listar o buscar por ID
- **POST**: crear nuevo
- **PUT**: actualizar existente
- **DELETE**: eliminar

---

## 📚 Lista de servicios implementados

### Servicios principales (CRUD completo)

| Entidad | Archivo de servicio | Funciones |
|:--------|:--------------------|:---------|
| Catalogo Equipo | `/lib/services/catalogoEquipo.ts` | `getCatalogoEquipos`, `getCatalogoEquipoById`, `createEquipo`, `updateEquipo`, `deleteEquipo` |
| Catalogo Servicio | `/lib/services/catalogoServicio.ts` | `getCatalogoServicios`, `getCatalogoServicioById`, `createCatalogoServicio`, `updateCatalogoServicio`, `deleteCatalogoServicio` |
| Cliente | `/lib/services/cliente.ts` | `getClientes`, `getClienteById`, `createCliente`, `updateCliente`, `deleteCliente` |
| Cotización | `/lib/services/cotizacion.ts` | `getCotizaciones`, `getCotizacionById`, `createCotizacion`, `updateCotizacion`, `deleteCotizacion` |
| Plantilla | `/lib/services/plantilla.ts` | `getPlantillas`, `getPlantillaById`, `createPlantilla`, `updatePlantilla`, `deletePlantilla` |
| Proyecto | `/lib/services/proyecto.ts` | `getProyectos`, `getProyectoById`, `createProyecto`, `updateProyecto`, `deleteProyecto` |
| Usuario | `/lib/services/usuario.ts` | `getUsuarios`, `createUsuario`, `updateUsuario`, `deleteUsuario` |

---

### Servicios auxiliares (solo GET)

| Entidad | Archivo de servicio | Funciones |
|:--------|:--------------------|:---------|
| Categoría Equipo | `/lib/services/categoriaEquipo.ts` | `getCategoriaEquipo` |
| Categoría Servicio | `/lib/services/categoriaServicio.ts` | `getCategoriasServicio` |
| Unidad | `/lib/services/unidad.ts` | `getUnidades` |
| Unidad Servicio | `/lib/services/unidadServicio.ts` | `getUnidadesServicio` |
| Recurso | `/lib/services/recurso.ts` | `getRecursos` |

---

## 🎯 Buenas prácticas aplicadas

- **Tipado fuerte** de entrada y salida (`EntidadPayload`, `Entidad`).
- **Uso de `fetch`** en todas las llamadas.
- **Manejo básico de errores** con try/catch a nivel de consumo si es necesario.
- **Modularidad:** Un servicio por entidad.
- **Consistencia:** Nombrado de funciones consistente.

---

## 📄 Archivo recomendado

Guardar este documento como:
- `SERVICES_GYS.md`
- o `SERVICES_REFERENCE_GYS.md`

Para futuras referencias del consumo de servicios en GYS App. ✅

