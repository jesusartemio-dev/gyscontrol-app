# 📂 FOLDERS_GYS.md — Estructura de Carpetas Proyecto GYS App

---

## 📁 Árbol general de carpetas

```plaintext
/src
 ├── app/
 │    ├── (rutas principales: comercial, admin, proyectos, logistica)
 │    ├── api/
 │    │    ├── entidad/route.ts
 │    │    ├── entidad/[id]/route.ts
 │    └── page.tsx (entrypoints de vistas)
/components
 │    ├── catalogo/
 │    ├── clientes/
 │    ├── usuarios/
 │    └── comunes/ (ConfirmDialog, LogoutButton, Sidebar, etc.)
/lib
 │    ├── services/
 │    │    ├── catalogoEquipo.ts
 │    │    ├── catalogoServicio.ts
 │    │    └── cliente.ts ...
 │    └── prisma.ts (instancia de Prisma)
/types
 │    ├── modelos.ts
 │    ├── payloads.ts
 │    ├── next-auth.d.ts
 │    └── index.ts
/public
 │    └── logo.png
```

---

## 📚 Explicación de carpetas principales

| Carpeta | Función |
|:--------|:--------|
| `/app/` | Rutas del frontend y API backend. Estructura moderna de Next.js 13/14. |
| `/app/api/` | Endpoints de APIs (por entidad), con rutas `/api/entidad/route.ts` y `/api/entidad/[id]/route.ts`. |
| `/components/` | Componentes React reutilizables (formularios, listas, selects, diálogos, botones). |
| `/components/catalogo/` | Componentes especializados en gestión de catálogo de equipos y servicios. |
| `/components/comunes/` | Componentes genéricos para UI como `ConfirmDialog`, `Sidebar`, `LogoutButton`. |
| `/lib/services/` | Servicios cliente que conectan con las APIs usando `fetch`. CRUD y utilidades auxiliares. |
| `/lib/prisma.ts` | Configuración de la instancia de Prisma ORM para DB. |
| `/types/` | Tipos de datos TypeScript: respuestas API (`modelos.ts`), payloads (`payloads.ts`), sesión (`next-auth.d.ts`). |
| `/public/` | Recursos estáticos como imágenes (logo, íconos, etc.). |

---

## 🎯 Buenas prácticas en estructura

- **Rutas API** limpias y predecibles en `/app/api/`.
- **Componentes modularizados** por contexto funcional.
- **Servicios centralizados** para consumo API.
- **Separación clara de types** (`/types/`) para escalabilidad.
- **Código limpio** siguiendo principios de separación de responsabilidades.

---

## 📄 Archivo recomendado

Guardar este documento como:
- `FOLDERS_GYS.md`
- o `FOLDER_STRUCTURE_GYS.md`

Para futuras referencias de la arquitectura de carpetas en GYS App. ✅

