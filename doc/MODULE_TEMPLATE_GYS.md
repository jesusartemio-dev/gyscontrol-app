# 📑 MODULE_TEMPLATE_GYS.md — Plantilla para Crear Nuevos Módulos en GYS App

---

## 🧠 Concepto general

Cuando crees un **nuevo módulo** (por ejemplo, `Ordenes`, `Reportes`, `Mantenimientos`), debes seguir esta plantilla para **mantener la coherencia total** con el sistema GYS.

---

## 🚀 Pasos para crear un nuevo módulo

| Paso | Descripción |
|:-----|:------------|
| 1 | **Crear modelo Prisma** en `schema.prisma` |
| 2 | **Generar migración** con `npx prisma migrate dev` |
| 3 | **Crear APIs** en `/app/api/nombre-entidad/route.ts` y `/app/api/nombre-entidad/[id]/route.ts` |
| 4 | **Crear types de modelo y payloads** en `/types/modelos.ts` y `/types/payloads.ts` |
| 5 | **Crear servicios cliente** en `/lib/services/nombreEntidad.ts` |
| 6 | **Crear componentes**: formulario (`NombreEntidadForm.tsx`), lista (`NombreEntidadList.tsx`), select (`NombreEntidadSelect.tsx` si aplica) |
| 7 | **Crear página de listado** en `/app/contexto/nombre-entidad/page.tsx` |
| 8 | **Registrar en Sidebar** si es una entidad navegable |
| 9 | **Probar flujo completo**: alta, edición, borrado, filtros |
| 10 | **Documentar** en el `README_GYS.md` o actualizar estructura si es necesario |

---

## 📚 Estructura estándar esperada

Supongamos que el nuevo módulo se llama **Orden de Trabajo** (`OrdenTrabajo`).

Deberías crear:

```plaintext
/schema.prisma
  model OrdenTrabajo {
    id String @id @default(cuid())
    nombre String
    descripcion String
    estado String
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
  }

/app/api/orden-trabajo/route.ts
/app/api/orden-trabajo/[id]/route.ts

/types/modelos.ts
  export interface OrdenTrabajo { ... }

/types/payloads.ts
  export interface OrdenTrabajoPayload { ... }

/lib/services/ordenTrabajo.ts
  export async function getOrdenesTrabajo() { ... }

/components/orden-trabajo/OrdenTrabajoForm.tsx
/components/orden-trabajo/OrdenTrabajoList.tsx

/app/comercial/orden-trabajo/page.tsx
```

---

## 🎯 Buenas prácticas a seguir

- **Tipado fuerte** en todos los servicios, componentes y APIs.
- **Estructura visual** basada en Tailwind CSS (inputs, selects, botones).
- **Feedback inmediato** (sonner o react-hot-toast).
- **Validaciones** con Zod + React Hook Form si es formulario complejo.
- **Relaciones** modeladas en Prisma si la entidad depende de otras.
- **Organización clara** siguiendo `/components/`, `/lib/services/`, `/types/`, `/app/`.

---

## 📄 Archivo recomendado

Guardar este documento como:
- `MODULE_TEMPLATE_GYS.md`

Para futuras ampliaciones del proyecto GYS App. ✅

