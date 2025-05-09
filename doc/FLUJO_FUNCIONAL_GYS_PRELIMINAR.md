# 📑 FLUJO_FUNCIONAL_GYS_PRELIMINAR.md — Boceto de Flujo Funcional GYS App

---

## 🧠 Visión General del Flujo

El proyecto GYS gestiona el flujo de trabajo desde la **captura de clientes**, pasando por la **cotización**, **plantillas**, **proyectos** y **gestión logística**, todo organizado en áreas comerciales, de proyectos, de logística y administrativas.

---

## 🔵 Flujo Principal del Negocio (Tentativo)

```plaintext
Clientes ➔ Plantillas ➔ Cotizaciones ➔ Proyectos ➔ Logística
```

---

## 📚 Detalle Tentativo de Flujo

### 1. Área Comercial

| Acción | Descripción | Entidad / Pantalla relacionada |
|:-------|:------------|:-------------------------------|
| Crear Cliente | Registrar un nuevo cliente | `/comercial/clientes/page.tsx` |
| Crear Plantilla | Crear plantillas base de proyectos (equipos/servicios) | `/comercial/plantillas/page.tsx` |
| Generar Cotización | Crear cotizaciones usando clientes y plantillas | `/comercial/cotizaciones/page.tsx` |

---

### 2. Área de Proyectos

| Acción | Descripción | Entidad / Pantalla relacionada |
|:-------|:------------|:-------------------------------|
| Crear Proyecto | Crear un proyecto basado en cotizaciones aprobadas | `/proyectos/page.tsx` |
| Asignar equipos/servicios | Detallar ejecución usando equipos y servicios cotizados | `/proyectos/page.tsx` |

---

### 3. Área de Logística

| Acción | Descripción | Entidad / Pantalla relacionada |
|:-------|:------------|:-------------------------------|
| Gestionar Logística | Cotizar compras de equipos/servicios | `/logistica/page.tsx` |
| Seguimiento de Entregas | Gestionar recepción de materiales, tiempos de entrega | `/logistica/page.tsx` |

---

### 4. Área Administrativa

| Acción | Descripción | Entidad / Pantalla relacionada |
|:-------|:------------|:-------------------------------|
| Gestión de Usuarios | Alta, edición y roles de usuarios | `/admin/usuarios/page.tsx` |
| Control de Accesos | Mostrar menús según `session.user.role` | `Sidebar.tsx` dinámico |

---

## 🔐 Roles de Usuario (Tentativo)

| Rol | Permisos tentativos |
|:----|:--------------------|
| **Admin** | Todo acceso, gestión de usuarios, catálogo, proyectos. |
| **Comercial** | Crear clientes, cotizaciones, plantillas. |
| **Proyectos** | Crear proyectos, asignar recursos. |
| **Logística** | Gestionar compras, proveedores, tiempos de entrega. |

---

## 🛡️ Reglas Tentativas

- Validaciones en formularios (correo, RUC, márgenes, horas, etc.).
- Restricciones de acciones según rol de usuario.
- Estado inicial de datos (`pendiente`, `aprobado`, `rechazado` en catálogos).
- Flujos de alta → edición → eliminación con confirmaciones.

---

# 📄 Notas Importantes

- Este flujo es un **boceto preliminar** basado en lo que ya conocemos del proyecto GYS.
- **Faltan integrar** detalles reales cuando recibamos:
  - Todos los componentes (`Form`, `List`, `Selects` faltantes).
  - Todas las páginas (`/comercial/...`, `/proyectos/...`, `/logistica/...`).

---

# 🚀 Plan siguiente

✅ Hoy tenemos el esquema general armado.
🛠️ Luego, **cuando subas todo lo que falta**, lo actualizamos y generamos:

- Versión final de **FLUJO FUNCIONAL GYS**.
- Diagrama de flujo visual si deseas.
- Archivo `FLUJO_FUNCIONAL_GYS.md` formal final.

