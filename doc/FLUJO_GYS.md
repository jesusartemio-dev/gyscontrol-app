// ===================================================
// 📁 Documento: FLUJO_GYS.md
// 📌 Descripción: Guía estandarizada para implementar entidades en el sistema GYS.
// 🧠 Uso: Referencia paso a paso para crear modelos, APIs, tipos, servicios, componentes y páginas.
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-04-21
// ===================================================

 GENERAL (nuevo paso 0.1): Nomenclatura y Convenciones
      - Nombres de archivos en **APIs**: `kebab-case`  
      (ej. `plantilla-gasto-item.ts`, `cotizacion-servicio.ts`)

      - Nombres de archivos de **componentes**: `PascalCase`  
      (ej. `PlantillaGastoForm.tsx`, `CotizacionGastoItemAccordion.tsx`)

      - Nombres de archivos de **servicios**: `camelCase`  
      (ej. `plantillaEquipo.ts`, `plantillaEquipoItem.ts`)

      - Nombres de archivos de **utils**: `camelCase`  
      (ej. `formatearFecha.ts`, `calcularTotales.ts`)

      - Interfaces de **TypeScript**: `PascalCase` con sufijos claros  
      (ej. `PlantillaGastoPayload`, `CotizacionServicioItem`, `ProyectoUpdatePayload`)


      -Relaciones Prisma deben usar @relation(..., onDelete: Cascade) donde se espera comportamiento encadenado.


PASO 0 COMENTARIOS: Estándar de Documentación de Archivos
   - Todos los archivos deben iniciar con un bloque de comentarios con la siguiente estructura:
        // ===================================================
        // 📁 Archivo: nombre-del-archivo.ext
        // 📌 Ubicación: ruta/del/archivo
        // 🔧 Descripción: Breve descripción funcional del archivo
        //
        // 🧠 Uso: Explicación de cómo y dónde se usa este archivo
        // ✍️ Autor: Nombre del desarrollador (si aplica)
        // 📅 Última actualización: YYYY-MM-DD (si aplica)
        // ===================================================
   - Comentar partes importantes del código:
        - Funciones principales → // ✅ Crear entidad
        - Secciones clave → // 🔁 Lógica de carga, // 📡 Llamada a API, // 🎯 Validaciones, etc.

PASO 1 ESTILOS: Estándar de Estilo Visual y Comportamiento (GYS UI/UX)
   - 📦 Estilo base: Tailwind CSS (clases utilitarias), enfoque minimalista, ágil y moderno.
   - 🎨 Componentes visuales:
       - Inputs: `border`, `rounded`, `ring-gray-300`, `focus:ring-blue-500`
       - Botones:
         - Acción primaria: `bg-blue-600`, hover azul oscuro
         - Crear ítem: `bg-green-600`, texto blanco
         - Eliminar: `text-red-500`, íconos 🗑️ o ❌
       - Layouts: `grid` para formularios, `flex` para filas de ítems
       - Acordeones para agrupar secciones: `shadow-md`, `rounded-2xl`, `border-gray-200`
   - 🧠 Comportamientos:
       - Formularios con validación inline (`toast.error` o mensaje rojo)
       - Edición inline: con `contentEditable` o inputs embebidos
       - Feedback inmediato de acciones (`loading`, `disabled`, `error`)
       - Íconos: se permite uso de `lucide-react` y emojis (✏️, 🗑️, 💾, etc.)
       - Componentes controlados con props estándar (`onCreated`, `onUpdated`, `onDeleted`)
   - 🧩 Componentes principales:
       - Tablas o tarjetas para listas (`hover:shadow`, `rounded`, `transition`)
       - Selector de entidad con `Select` y opciones filtradas
       - Botones de acción visibles y directos (sin menús ocultos innecesarios)
   - 🎯 Meta: Interfaz limpia, con foco en productividad, comprensión inmediata y sin sobrecarga visual.

PASO 2 MODELOS: Modelo (schema.prisma):
   - Definir la entidad en `schema.prisma`
   - Incluir relaciones necesarias (ej. ítems, recursos, unidades)
   - Incluir campos auditables: `createdAt`, `updatedAt`
   - Ejecutar `npx prisma migrate dev` o `prisma generate` según el cambio

PASO 3 TYPE MODELOS: respuesta desde la API:
   - Archivo: `src/types/modelos.ts`
   - Exportar desde: `src/types/index.ts`
   - Interface `NombreEntidad` con:
        - Campos base
        - Relaciones anidadas según `.include()` de la API

PASO 4 TYPES PAYLOADS: lo que se envía (payloads.ts):
   - Archivo: `src/types/payloads.ts`
   - Exportar desde: `src/types/index.ts`
   - Interfaces:
        - `NombreEntidadPayload` (para POST)
        - `NombreEntidadUpdatePayload extends NombreEntidadPayload` (para PUT)
   - Usar todos los campos necesarios en cada payload
   - Validaciones de campos requeridos y opcionales (por ejemplo: `horaUnidad`, `horaFijo`, etc.)

PASO 5 API: API Routes (con relaciones anidadas):
   - Crear archivo: `/api/**nombre-entidad**/route.ts`
         - Implementar metodo GET con .include() con todas las relaciones
         - Implementar metodo POST con payload.propiedad
         - Incluir manejo de errores con detalle: String(error)
   - Crear archivo: `/api/**nombre-entidad**/[id]/route.ts`
         - Implementar metodo GET con .include() con todas las relaciones
         - Implementar metodo PUT con payload, si hay reacalculos incluir
         - Implementar DELETE si hay recalculos incluirlos
         - Retornar status "OK" en vez de 204
   - usar {} para: import { prisma } from '@/lib/prisma'
   - Implementar métodos:
        - GET (listar con `.include()`)
        - POST (crear)
        - PUT (actualizar)
        - DELETE (eliminar)
   - Retornar relaciones necesarias anidadas desde Prisma
   - En los métodos POST y PUT de las rutas API, se debe usar el tipado Payload correspondiente para validar y estructurar correctamente los datos recibidos.
   - Todos los métodos (GET, POST, PUT, DELETE) deben estar envueltos en try/catch para manejo de errores.
   - En caso de error, retornar un mensaje claro con NextResponse.json({ error: 'mensaje' }, { status: 500 })
   - Esto evita que el servidor de Next.js caiga por errores no controlados y mejora la depuración.
   - Usar await context.params en rutas dinámicas para evitar errores en consola o fallos en producción al acceder a id
   - const { id } = await context.params  // ✅ Obligatorio en GYS
   - No usar const { id } = context.params directo — puede generar errores de acceso en Next.js App Router.

PASO 6 SERVICIOS: Servicios con fetch (src/lib/services/nombreEntidad.ts):
   - Archivo: `src/lib/services/**nombreEntidad**.ts`
   - Usar funciones async con try/catch
   - Incluir if (!res.ok) throw new Error(...) en todos los métodos
   - Usar tipado fuerte (Model, Payload) para entrada y salida
   - Agregar headers Content-Type: application/json en POST/PUT
   - Devolver null o undefined en caso de error controlado (no romper frontend)
   - Comentarios claros de propósito (// ✅ Crear nueva sección...)
   - Código limpio y reutilizable (BASE_URL Hardcodeado /api/nombreEntidad)
   - Implementar funciones:
        - `getNombreEntidad()`
        - `getNombreEntidadById(id)`
        - `createNombreEntidad(payload)`
        - `updateNombreEntidad(id, payload)`
        - `deleteNombreEntidad(id)`

PASO 7 COMPONENTES: Componentes cliente:
   - Carpeta: `src/components/**contexto**/` (Ej: `catalogo`, `proyectos`, `admin`)
   - Crear componentes:
        - `NombreEntidadList.tsx` (con filtros, edición inline y control de cambios)
        - `NombreEntidadForm.tsx` (para creación, preferible no usar para edición)
        - `NombreEntidadSelect.tsx` (para selección en formularios relacionados)
        - `NombreEntidadAccordion.tsx` (para visualizar el resumen y cuando se extienda el detalle)
   - Props estándar recomendadas:
        - Formulario: `onCreated`, `defaultValue`, `isEditMode`
        - Listado: `data`, `onUpdate`, `onDelete`
        - Select: `value`, `onChange`, `disabled`
        - Accordion: `onCreated`, `onDeleted`, `onUpdated`, `onDeletedGrupo`, `onUpdatedNombre`

   🧠 Mejores prácticas aplicadas:
   - Se usan `SelectItem` con `__ALL__` como opción para aplicar filtros.
   - El botón "Guardar" solo se activa si se detectan cambios (`valoresEditados[id]`).
   - Inputs numéricos (`horaBase`, `horaFijo`, etc.) permiten editar valores inline y tienen `labels` visibles.
   - Validaciones antes de enviar los cambios con `toast.error()` si faltan campos clave.
   - Los cambios en campos se rastrean en `valoresEditados: Record<string, Payload>`.
   - Componentes UI base (de ShadCN), Select, Input , Button
   - En botones de guardar/cancelar: ahora solo se habilitan si detectan un cambio real (no siempre activos).
   - Placeholder claro en Select y Input si aún no hay selección o texto.
   - Agrupación de filtros en una flex-wrap gap-4 para que en móvil no se rompa la vista.
   - Los formularios que tengan validaciones con zod, integración con react-hook-form

   -Props estándar: data, onUpdate, onDelete.
   -Botones de guardar (💾) y cancelar (❌) visibles solo en modo edición.
   -Filtros agrupados con flex-wrap gap-4.
   -Filtros Select usando opción "__ALL__" para no restringir.
   -Edición inline de precioInterno, margen, estado.
   -Actualiza localmente los datos después de edición sin recargar toda la página.
   -Toasts (sonner) en acciones: éxito y errores visibles.
   -Código ordenado, separado en bloques claros (filtros, tabla, acciones).
   -Fechas de creación y actualización formateadas.
   -Agrupación compacta de headers (thead) y filas (tbody).
   -Comentarios claros de propósito en la cabecera del archivo.
   -Botón Guardar 🔵 solo habilitado si hay cambios.
   -Actualización reactiva de la lista.
   -Filtros, edición inline y control de estado (onUpdate, onDelete).

PASO 8 PAGINAS: Página cliente:
   - Crear archivo: `/app/**contexto**/**nombre-entidad**/page.tsx`
   - Importar y usar componentes definidos
   - Incluir `'use client'` si se usan hooks o estado
   - Consumir servicios y enviar props (`onUpdate`, `onDelete`, etc.)
   - Layout básico: título, formulario de creación, lista

PASO 9 MENU: Registro en Sidebar/Navegación:
   - Archivo: `src/components/Sidebar.tsx`
   - Añadir nueva ruta en la sección correspondiente
   - Mostrar solo si el `session.user.role` tiene acceso
   - Verificar visibilidad y navegación correcta

PASO 10 PRUEBAS: Prueba del flujo completo:
   - Crear nuevo ítem desde el formulario
   - Editar ítem con edición inline
   - Guardar cambios solo si se modificó el valor
   - Eliminar ítem
   - Confirmar que los datos se reflejan en la API y frontend
   - Validar filtros por categoría, unidad, recurso y búsqueda por texto

---


✅ Ejemplo paso para pedir a ChatGPT paso 5 5: Paso 6 de **nombre-entidad** segun el FLUJO GYS
