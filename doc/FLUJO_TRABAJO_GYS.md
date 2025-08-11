# 🔄 Flujo de Trabajo Completo - Sistema GYS App

## 📋 Descripción General

Este documento describe el flujo de trabajo completo del Sistema GYS (Gestión y Servicios), una aplicación web desarrollada en Next.js que gestiona proyectos industriales desde la cotización inicial hasta la entrega final, pasando por la gestión de equipos, servicios, logística y facturación.

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico
- **Frontend**: Next.js 14+ con App Router, React, TypeScript
- **Backend**: Next.js API Routes con Prisma ORM
- **Base de Datos**: PostgreSQL
- **Autenticación**: NextAuth.js
- **Estilos**: Tailwind CSS
- **Validación**: Zod + React Hook Form
- **Notificaciones**: React Hot Toast

### Estructura Modular
```
📦 Sistema GYS
├── 🔧 Módulo de Configuración (Catálogo)
├── 💼 Módulo Comercial (Plantillas y Cotizaciones)
├── 📁 Módulo de Proyectos (Ejecución)
├── 🚚 Módulo de Logística (Compras y Pedidos)
├── 📊 Módulo de Gestión (Reportes y Valorizaciones)
└── 👥 Módulo de Administración (Usuarios)
```

---

## 🎯 Roles y Permisos del Sistema

### Jerarquía de Roles
1. **Admin** - Acceso total al sistema
2. **Gerente** - Acceso a todos los módulos operativos
3. **Comercial** - Plantillas y cotizaciones
4. **Presupuestos** - Apoyo en cotizaciones
5. **Proyectos** - Gestión de proyectos
6. **Coordinador** - Coordinación de proyectos
7. **Logístico** - Gestión de compras y pedidos
8. **Gestor** - Reportes y valorizaciones
9. **Colaborador** - Acceso básico

### Control de Acceso
- **Middleware de autenticación** valida roles por ruta
- **Sidebar dinámico** muestra opciones según permisos
- **Redirección automática** a `/denied` si no tiene permisos

---

## 🔄 Flujo Principal del Negocio

### 1️⃣ Fase de Configuración
**Responsables**: Admin, Gerente

#### Configuración del Catálogo
1. **Categorías de Equipos y Servicios**
   - Crear categorías para organizar el catálogo
   - Definir unidades de medida

2. **Recursos Humanos**
   - Registrar recursos (técnicos, ingenieros, etc.)
   - Definir costos por hora de cada recurso

3. **Catálogo de Equipos**
   - Importar/crear equipos con:
     - Código único
     - Descripción y marca
     - Precio interno y margen
     - Precio de venta calculado
   - Categorización por tipo

4. **Catálogo de Servicios**
   - Crear servicios con fórmulas de cálculo:
     - Hora base, repetida, por unidad, fija
     - Asignación de recursos
     - Cálculo automático de costos

#### Gestión de Usuarios y Clientes
- Crear usuarios con roles específicos
- Registrar clientes con datos de contacto
- Configurar proveedores para logística

### 2️⃣ Fase Comercial
**Responsables**: Comercial, Presupuestos

#### Creación de Plantillas
1. **Plantilla Base**
   - Crear plantilla con nombre descriptivo
   - Definir estructura en 3 secciones:
     - 🛠️ **Equipos**: Items del catálogo de equipos
     - 🔧 **Servicios**: Items del catálogo de servicios
     - 💰 **Gastos**: Items adicionales (viáticos, materiales, etc.)

2. **Configuración de Secciones**
   - **Equipos**: Seleccionar del catálogo, definir cantidades
   - **Servicios**: Configurar horas y recursos necesarios
   - **Gastos**: Agregar costos adicionales con márgenes

3. **Cálculos Automáticos**
   - Subtotales por sección (interno/cliente)
   - Total general con descuentos
   - Márgenes de ganancia

#### Generación de Cotizaciones
1. **Desde Plantilla**
   - Seleccionar plantilla base
   - Asignar cliente específico
   - Personalizar items según proyecto

2. **Gestión de Cotización**
   - Estados: Borrador → Enviada → Aprobada/Rechazada
   - Seguimiento de probabilidad y fechas
   - Notas y observaciones

3. **Generación de PDF**
   - Documento profesional para cliente
   - Desglose detallado por secciones
   - Términos y condiciones

### 3️⃣ Fase de Proyectos
**Responsables**: Proyectos, Coordinador, Gestor

#### Conversión Cotización → Proyecto
1. **Creación del Proyecto**
   - Convertir cotización aprobada en proyecto
   - Asignar gestor y coordinador
   - Definir fechas de inicio y entrega

2. **Planificación de Equipos**
   - Revisar lista de equipos necesarios
   - Estados de equipos:
     - `pendiente` → `revisado_tecnico` → `aprobado_coordinador` → `aprobado_gestor`
     - `en_lista` → `comprado` → `entregado`

3. **Gestión de Requerimientos**
   - Crear listas de requerimientos técnicos
   - Validar especificaciones con cliente
   - Aprobar cambios y modificaciones

#### Control de Ejecución
- **Seguimiento de avance** por fases
- **Registro de horas** por recurso y actividad
- **Control de costos** vs presupuesto
- **Gestión de cambios** y órdenes adicionales

### 4️⃣ Fase de Logística
**Responsables**: Logístico

#### Gestión de Listas Técnicas
1. **Creación desde Proyecto**
   - Generar lista técnica desde equipos del proyecto
   - Filtrar por estado y prioridad
   - Agrupar por categorías

2. **Estados de Lista**
   - `borrador` → `por_revisar` → `por_cotizar`
   - `por_validar` → `por_aprobar` → `aprobado`

3. **Gestión de Items**
   - Origen: `cotizado`, `nuevo`, `reemplazo`
   - Selección de cotizaciones de proveedores
   - Reemplazo de equipos cuando sea necesario

#### Proceso de Cotizaciones con Proveedores
1. **Solicitud de Cotizaciones**
   - Enviar lista técnica a proveedores
   - Estados: `pendiente` → `solicitado` → `cotizado`
   - Seguimiento de respuestas

2. **Evaluación y Selección**
   - Comparar ofertas de proveedores
   - Validar especificaciones técnicas
   - Seleccionar mejor opción (precio/calidad)

3. **Generación de Pedidos**
   - Crear pedido de compra
   - Estados: `borrador` → `enviado` → `atendido` → `entregado`
   - Control de entregas parciales

#### Gestión de Inventario
- **Catálogo logístico** con precios reales
- **Sincronización** con catálogo comercial
- **Control de stock** y disponibilidad
- **Trazabilidad** de equipos por proyecto

### 5️⃣ Fase de Gestión
**Responsables**: Gestor, Gerente

#### Valorizaciones
1. **Cálculo Mensual**
   - Avance físico del proyecto
   - Costos reales vs presupuestados
   - Facturación por hitos

2. **Control Financiero**
   - Márgenes reales vs planificados
   - Desviaciones de costos
   - Proyección de rentabilidad

#### Reportes y Análisis
- **Dashboard ejecutivo** con KPIs
- **Reportes de rentabilidad** por proyecto
- **Análisis de desviaciones** de tiempo y costo
- **Indicadores de gestión** operativa

---

## 🔧 Flujos Técnicos del Sistema

### Arquitectura de Datos

#### Modelos Principales
```typescript
// Configuración
User, Cliente, Proveedor
CategoriaEquipo, CategoriaServicio
Unidad, UnidadServicio, Recurso
CatalogoEquipo, CatalogoServicio

// Comercial
Plantilla, PlantillaEquipo, PlantillaServicio, PlantillaGasto
Cotizacion, CotizacionEquipo, CotizacionServicio, CotizacionGasto

// Proyectos
Proyecto, ProyectoEquipo, ProyectoServicio, ProyectoGasto
Valorizacion, RegistroHoras

// Logística
ListaEquipo, ListaEquipoItem
PedidoEquipo, PedidoEquipoItem
CotizacionProveedor, CotizacionProveedorItem
```

#### Relaciones Clave
- **Plantilla** → **Cotizacion** → **Proyecto** (flujo principal)
- **CatalogoEquipo** → **PlantillaEquipoItem** → **CotizacionEquipoItem** → **ProyectoEquipoItem**
- **Proyecto** → **ListaEquipo** → **PedidoEquipo** (flujo logístico)

### API Routes y Servicios

#### Estructura de APIs
```
/api/
├── catalogo-equipo/          # CRUD equipos
├── catalogo-servicio/        # CRUD servicios
├── plantilla/                # CRUD plantillas
├── cotizacion/               # CRUD cotizaciones
├── proyecto/                 # CRUD proyectos
├── lista-equipo/             # CRUD listas técnicas
├── pedido-equipo/            # CRUD pedidos
└── cotizacion-proveedor/     # CRUD cotizaciones proveedores
```

#### Servicios Frontend
- **Servicios de datos** en `/lib/services/`
- **Validadores** con Zod en `/lib/validators/`
- **Utilidades** de cálculo en `/lib/utils/`
- **Componentes reutilizables** por módulo

### Estados y Transiciones

#### Estados de Equipos
```
pendiente → revisado_tecnico → aprobado_coordinador → aprobado_gestor
    ↓
en_lista → comprado → entregado
    ↓
reemplazado (si es necesario)
```

#### Estados de Listas
```
borrador → por_revisar → por_cotizar → por_validar → por_aprobar → aprobado
```

#### Estados de Pedidos
```
borrador → enviado → atendido → parcial → entregado
```

---

## 📊 Métricas y KPIs del Sistema

### Indicadores Comerciales
- **Tasa de conversión** cotización → proyecto
- **Tiempo promedio** de respuesta a cotizaciones
- **Margen promedio** por tipo de proyecto
- **Pipeline comercial** por etapa

### Indicadores de Proyectos
- **Cumplimiento de plazos** de entrega
- **Desviación de costos** vs presupuesto
- **Eficiencia de recursos** (horas planificadas vs reales)
- **Satisfacción del cliente** por proyecto

### Indicadores Logísticos
- **Tiempo de respuesta** de proveedores
- **Cumplimiento de entregas** de equipos
- **Variación de precios** vs catálogo
- **Rotación de inventario** por categoría

---

## 🔄 Procesos de Integración

### Sincronización de Datos
1. **Catálogo Comercial ↔ Logístico**
   - Actualización de precios reales
   - Sincronización de especificaciones
   - Control de disponibilidad

2. **Proyecto ↔ Lista Técnica**
   - Generación automática de listas
   - Actualización de estados
   - Trazabilidad de cambios

3. **Cotización Proveedor ↔ Pedido**
   - Conversión de cotizaciones seleccionadas
   - Transferencia de especificaciones
   - Control de cantidades y precios

### Importación/Exportación
- **Excel Import/Export** para catálogos
- **PDF Generation** para cotizaciones y reportes
- **API Integration** con sistemas externos
- **Backup automático** de datos críticos

---

## 🛡️ Seguridad y Auditoría

### Control de Acceso
- **Autenticación** con NextAuth.js
- **Autorización** basada en roles
- **Middleware** de protección de rutas
- **Validación** de permisos en APIs

### Auditoría
- **Timestamps** automáticos (createdAt, updatedAt)
- **Trazabilidad** de cambios por usuario
- **Log de acciones** críticas
- **Backup** periódico de datos

### Validación de Datos
- **Esquemas Zod** para validación
- **TypeScript** para tipado estricto
- **Prisma** para integridad referencial
- **Sanitización** de inputs del usuario

---

## 🚀 Flujo de Desarrollo

### Metodología de Implementación
Siguiendo el **FLUJO_GYS.md**, cada nueva funcionalidad sigue estos pasos:

1. **Modelo Prisma** - Definir entidad en schema
2. **Types** - Crear interfaces en TypeScript
3. **API Routes** - Implementar CRUD endpoints
4. **Servicios** - Crear funciones de acceso a datos
5. **Componentes** - Desarrollar UI reutilizable
6. **Páginas** - Integrar componentes en rutas
7. **Navegación** - Actualizar sidebar y permisos
8. **Pruebas** - Validar flujo completo

### Estándares de Código
- **Nomenclatura**: kebab-case para APIs, PascalCase para componentes
- **Comentarios**: Documentación estándar en cada archivo
- **Estilos**: Tailwind CSS con componentes UI consistentes
- **Validación**: Try/catch en todas las operaciones
- **Performance**: Optimización de queries y componentes

---

## 📈 Roadmap y Mejoras Futuras

### Funcionalidades Planificadas
1. **Dashboard Analytics** - Métricas en tiempo real
2. **Mobile App** - Aplicación móvil para campo
3. **API Externa** - Integración con sistemas ERP
4. **IA/ML** - Predicción de costos y tiempos
5. **Workflow Engine** - Automatización de procesos

### Optimizaciones Técnicas
- **Caching** con Redis para mejor performance
- **Microservicios** para escalabilidad
- **Real-time** updates con WebSockets
- **Testing** automatizado con Jest/Cypress
- **CI/CD** pipeline para despliegues

---

## 📞 Soporte y Mantenimiento

### Documentación
- **RESUMEN_GYS.md** - Visión general del proyecto
- **ESTRUCTURA_PROYECTO.md** - Arquitectura detallada
- **FLUJO_GYS.md** - Guía de desarrollo
- **TYPES_GYS.md** - Documentación de tipos
- **Este documento** - Flujo de trabajo completo

### Contacto Técnico
- **Arquitecto**: Jesús Artemio (Master Experto 🧙‍♂️)
- **Repositorio**: Sistema GYS App Next.js
- **Última actualización**: Enero 2025

---

*Este documento describe el flujo de trabajo completo del Sistema GYS, desde la configuración inicial hasta la entrega final de proyectos, incluyendo todos los procesos técnicos y de negocio involucrados.*