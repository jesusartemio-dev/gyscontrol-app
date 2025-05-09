# 📑 TYPES_GYS.md — Guía de Tipos y Payloads GYS App

---

## 📚 Concepto general

En el proyecto GYS, usamos **tipado fuerte** para:

- Definir **modelos de respuesta** (`modelos.ts`) basados en las entidades de la base de datos.
- Definir **payloads de envío** (`payloads.ts`) para crear y actualizar entidades.
- Extender **tipos de sesión** con NextAuth (`next-auth.d.ts`).

---

## 🧠 Organización de archivos

| Archivo | Propósito |
|:--------|:----------|
| `/types/modelos.ts` | Define interfaces de las entidades que responde la API (`Cliente`, `Proyecto`, `Plantilla`, etc.). |
| `/types/payloads.ts` | Define interfaces de los datos que envía el cliente en `POST` y `PUT` (creación y edición). |
| `/types/next-auth.d.ts` | Extiende el tipo `Session` para incluir `id`, `name`, `email`, `role` en el `session.user`. |
| `/types/index.ts` | Punto central de exportación de todos los types. |

---

## 📝 Detalle de cada archivo

### 1. `/types/modelos.ts`

- **Responsabilidad:** Tipar las respuestas que regresan las APIs.
- **Ejemplo de uso:**
  ```typescript
  export interface Cliente {
    id: string
    nombre: string
    ruc: string
    direccion?: string
    telefono?: string
    correo?: string
    createdAt: Date
    updatedAt: Date
  }
  ```
- **Notas:**
  - Incluyen `createdAt` y `updatedAt`.
  - Se modelan relaciones si corresponde (por ejemplo: Plantilla → PlantillaEquipo[]).

---

### 2. `/types/payloads.ts`

- **Responsabilidad:** Tipar la información que se envía en `POST` y `PUT`.
- **Ejemplo de uso:**
  ```typescript
  export interface ClientePayload {
    nombre: string
    ruc: string
    direccion?: string
    telefono?: string
    correo?: string
  }

  export interface ClienteUpdatePayload extends ClientePayload {}
  ```
- **Notas:**
  - `ClientePayload` define los campos necesarios para crear.
  - `ClienteUpdatePayload` extiende `ClientePayload` (puede ser igual, salvo en casos que luego quieras diferenciar).

---

### 3. `/types/next-auth.d.ts`

- **Responsabilidad:** Extender tipos de sesión en NextAuth.
- **Ejemplo de extensión:**
  ```typescript
  declare module 'next-auth' {
    interface Session {
      user: {
        id: string
        name: string
        email: string
        role: string
      }
    }
  }
  ```
- **Notas:**
  - Permite acceder a `session.user.role` y hacer control de permisos por rol.

---

### 4. `/types/index.ts`

- **Responsabilidad:** Centralizar y reexportar los tipos.
- **Ejemplo:**
  ```typescript
  export * from './modelos'
  export * from './payloads'
  ```

---

## 🎯 Buenas prácticas aplicadas en los Types

- Tipado fuerte en servicios, componentes y APIs.
- Consistencia entre modelos de base de datos y modelos de respuesta.
- Separación clara de tipos de respuesta vs. tipos de payloads.
- Extensibilidad para nuevos roles o cambios futuros en entidades.

---

## 📄 Archivo recomendado

Guardar este documento como:
- `TYPES_GYS.md`
- o `TYPES_REFERENCE_GYS.md`

Para futuras referencias del esquema de types en GYS App. ✅

