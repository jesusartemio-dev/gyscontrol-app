# 📚 APIs GYS App — Guía de Endpoints

---

## 🛠️ Estructura base
Cada entidad tiene:
- `/api/entidad/route.ts` → **GET** (listar), **POST** (crear)
- `/api/entidad/[id]/route.ts` → **GET** (detalle), **PUT** (actualizar), **DELETE** (eliminar)

---

## 📂 Entidades principales

| Entidad | Rutas | Métodos disponibles | Descripción |
|:--------|:------|:---------------------|:------------|
| **Catalogo Equipo** | `/api/catalogo-equipo/` | `GET`, `POST` | Listado y creación de equipos de catálogo |
| | `/api/catalogo-equipo/[id]` | `GET`, `PUT`, `DELETE` | Detalle, edición, eliminación de un equipo |
| **Catalogo Servicio** | `/api/catalogo-servicio/` | `GET`, `POST` | Listado y creación de servicios de catálogo |
| | `/api/catalogo-servicio/[id]` | `GET`, `PUT`, `DELETE` | Detalle, edición, eliminación de un servicio |
| **Cliente** | `/api/cliente/` | `GET`, `POST` | Gestión de clientes |
| | `/api/cliente/[id]` | `GET`, `PUT`, `DELETE` | Edición y eliminación de clientes |
| **Cotización** | `/api/cotizacion/` | `GET`, `POST` | Registro de cotizaciones comerciales |
| | `/api/cotizacion/[id]` | `GET`, `PUT`, `DELETE` | Gestión de cotizaciones |
| **Plantilla** | `/api/plantilla/` | `GET`, `POST` | Gestión de plantillas de proyectos |
| | `/api/plantilla/[id]` | `GET`, `PUT`, `DELETE` | Actualización de plantillas |
| **Proyecto** | `/api/proyecto/` | `GET`, `POST` | Creación de proyectos basados en cotizaciones |
| | `/api/proyecto/[id]` | `GET`, `PUT`, `DELETE` | Gestión de proyectos |
| **Usuario** | `/api/admin/usuarios/` | `GET`, `POST`, `PUT`, `DELETE` | Gestión de usuarios del sistema |

---

## 📂 Entidades auxiliares

| Entidad | Ruta | Métodos | Descripción |
|:--------|:-----|:--------|:------------|
| **Categoría Equipo** | `/api/categoria-equipo/` | `GET` | Carga de categorías de equipos para selects |
| **Categoría Servicio** | `/api/categoria-servicio/` | `GET` | Carga de categorías de servicios para selects |
| **Unidad** | `/api/unidad/` | `GET` | Carga de unidades de medida de equipos |
| **Unidad Servicio** | `/api/unidad-servicio/` | `GET` | Carga de unidades de medida de servicios |
| **Recurso** | `/api/recurso/` | `GET` | Carga de recursos de ejecución (personas, HH, etc.) |

---



---

## ✏️ Ejemplo de consumo API (general)

### Crear nuevo cliente (POST `/api/cliente/`)

**Request body ejemplo:**
```json
{
  "nombre": "Cliente ABC",
  "ruc": "12345678901",
  "direccion": "Av. Principal 123",
  "telefono": "987654321",
  "correo": "cliente@abc.com"
}
```

**Response ejemplo:**
```json
{
  "id": "clt_abc123",
  "nombre": "Cliente ABC",
  "ruc": "12345678901",
  "direccion": "Av. Principal 123",
  "telefono": "987654321",
  "correo": "cliente@abc.com",
  "createdAt": "2025-04-26T10:00:00.000Z",
  "updatedAt": "2025-04-26T10:00:00.000Z"
}
```

---

## 🎯 Principios de diseño API GYS
- JSON como formato estándar de comunicación.
- Endpoints RESTful clásicos (`GET`, `POST`, `PUT`, `DELETE`).
- Respuesta estructurada en objetos planos.
- Relaciones anidadas con `.include()` en Prisma.
- Manejadores de error estándar (`try/catch` y mensajes claros).

---

## 📄 Archivo recomendado
Guardar este documento como:
- `APIS_GYS.md`
- o `API_REFERENCE_GYS.md`

Para futuras referencias del backend de APIs en GYS App. ✅

