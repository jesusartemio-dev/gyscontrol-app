# 📑 Documento de Proyecto: Guía Completa de GYS-APP-NEXT

---

## 🧠 Visión general del proyecto
- **Nombre del sistema:** GYS App
- **Tecnologías principales:**
  - Backend: Next.js (APIs Server Actions)
  - ORM: Prisma (PostgreSQL o similar)
  - Frontend: Next.js + Tailwind CSS + shadcn/ui + React Hook Form + Zod
  - Autenticación: NextAuth.js
  - Librerías de soporte: clsx, react-hot-toast, sonner, lucide-react
- **Propósito:** Gestión comercial, logística y de proyectos industriales.

---

## 🛠️ Estructura técnica general

| Área | Descripción |
|:-----|:------------|
| **Modelos** (`schema.prisma`) | Modelos claros y relacionales: Cliente, Usuario, Plantilla, Cotización, Proyecto, Catálogo de Equipos y Servicios. |
| **APIs** (`/api/entidad/`) | APIs RESTful con GET, POST, PUT, DELETE por entidad. Relaciones anidadas incluidas. |
| **Types** (`/types/`) | Tipos de respuesta (modelos) y tipos de envío (payloads). Tipado fuerte en todo el sistema. |
| **Servicios** (`/lib/services/`) | Servicios de cliente que consumen las APIs de backend. Separados por entidad. |
| **Componentes** (`/components/`) | Formularios, listas, selects y control de edición/validación para cada módulo. |
| **Páginas** (`/app/`) | Rutas organizadas por áreas: Comercial, Logística, Proyectos, Admin. |
| **Autenticación** | Login de usuarios con roles: admin, comercial, proyectos, logística. Acceso protegido en cada página. |
| **Estilo UI/UX** | Tailwind CSS, estilo minimalista, interfaz responsiva, edición inline, selectores claros. |

---

## 🚀 Flujo de desarrollo estándar (FLUJO GYS)

1. **Modelo Prisma:** Definir modelos y migrar DB.
2. **API:** Crear rutas API por entidad (`route.ts` y `[id]/route.ts`).
3. **Types:** Crear types de respuesta (`modelos.ts`) y de payloads (`payloads.ts`).
4. **Servicios:** Crear funciones de consumo de API (`getEntidad`, `createEntidad`, `updateEntidad`, `deleteEntidad`).
5. **Componentes:** Formularios, listas y selects controlados.
6. **Páginas:** Creación de vistas en `/app/contexto/entidad/page.tsx`.
7. **Sidebar:** Registro en navegación con control de visibilidad por rol.
8. **Pruebas finales:** Alta, edición, borrado y filtros.

---

## 🧩 Roles y permisos

| Rol | Acceso |
|:----|:-------|
| **Admin** | Total acceso (gestión de usuarios, catálogo, proyectos). |
| **Comercial** | Clientes, Cotizaciones, Plantillas. |
| **Proyectos** | Proyectos (gestión y seguimiento). |
| **Logística** | Logística de compras y materiales. |

---

## 🖥️ Componentes principales

| Componente | Función |
|:-----------|:--------|
| `ConfirmDialog` | Confirmaciones de eliminación. |
| `LogoutButton` | Cierre de sesión con confirmación. |
| `Sidebar` | Navegación por rol. |
| `Formularios` | Cliente, Catálogo de Equipos, Servicios, Usuarios. |
| `Listas` | Clientes, Equipos, Servicios, Usuarios. |
| `Selects` | Equipos y servicios reutilizables. |

---

## 📚 Buenas prácticas implementadas

- Comentarios estándar en cabecera de archivos.
- Tipado fuerte en todo el flujo (modelos, payloads, servicios).
- Validaciones de formulario con Zod + React Hook Form.
- Feedback inmediato con sonner y react-hot-toast.
- Botones deshabilitados si no hay cambios.
- Optimización de filtros con `Select` y `Input`.
- Código limpio, modularizado, mantenible y escalable.

---

## 📄 Archivo recomendado

Guardar este contenido como:
- `README_GYS.md`
- o `ARQUITECTURA_TECNICA_GYS.md`

Para futuras referencias del sistema completo GYS App. ✅

