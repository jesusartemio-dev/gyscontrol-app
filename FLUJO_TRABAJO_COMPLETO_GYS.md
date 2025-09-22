# 🔄 **FLUJO DE TRABAJO COMPLETO - SISTEMA GYS APP**

## 📋 **Descripción General**

El **Sistema GYS (Gestión y Servicios)** es una plataforma integral de gestión empresarial desarrollada en **Next.js 14+** con **TypeScript**, diseñada para gestionar proyectos industriales desde la oportunidad comercial inicial hasta la entrega final, pasando por planificación, ejecución, logística y facturación.

---

## 🏗️ **Arquitectura del Sistema**

### **Stack Tecnológico**
- **Frontend**: Next.js 14+ con App Router, React 18+, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes con Prisma ORM + PostgreSQL
- **Autenticación**: NextAuth.js con roles granulares
- **Validación**: Zod + React Hook Form
- **UI/UX**: Shadcn/ui + Framer Motion + Lucide Icons

### **Estructura Modular**
```
📦 Sistema GYS
├── 🔧 Módulo de Configuración (Catálogo)
├── 💼 Módulo Comercial (CRM + Plantillas + Cotizaciones)
├── 📁 Módulo de Proyectos (Ejecución + Cronogramas)
├── 🚚 Módulo de Logística (Listas + Pedidos + Proveedores)
├── 📊 Módulo de Gestión (Valorizaciones + Reportes)
└── 👥 Módulo de Administración (Usuarios + Roles)
```

---

## 👥 **Sistema de Roles y Permisos**

### **Jerarquía de Roles**
1. **👑 Admin** - Acceso total al sistema
2. **🏢 Gerente** - Acceso a todos los módulos operativos
3. **💼 Comercial** - CRM, plantillas y cotizaciones
4. **📋 Presupuestos** - Apoyo en cotizaciones
5. **📁 Proyectos** - Gestión y ejecución de proyectos
6. **🎯 Coordinador** - Coordinación de proyectos
7. **🚚 Logístico** - Gestión de compras y pedidos
8. **📊 Gestor** - Reportes y valorizaciones
9. **👤 Colaborador** - Acceso básico de consulta

### **Control de Acceso**
- **Middleware de autenticación** valida roles por ruta
- **Sidebar dinámico** muestra opciones según permisos
- **Redirección automática** a `/denied` si no tiene permisos

---

## 🔄 **FLUJO PRINCIPAL DEL NEGOCIO**

### **FASE 1: CONFIGURACIÓN DEL SISTEMA**
**👥 Responsables**: Admin, Gerente

#### **1.1 Gestión del Catálogo**
**📍 Ubicación**: `/catalogo/`

**Procesos**:
1. **Categorías de Equipos y Servicios**
   - Crear categorías para organizar el catálogo
   - Definir unidades de medida y recursos humanos

2. **Catálogo de Equipos** (`CatalogoEquipo`)
   ```typescript
   // Estructura básica
   {
     codigo: string,           // Código único
     descripcion: string,      // Descripción técnica
     marca: string,           // Marca del fabricante
     precioInterno: number,   // Costo interno
     margen: number,          // Porcentaje de ganancia
     precioVenta: number,     // Precio calculado
     categoriaId: string      // Relación con categoría
   }
   ```

3. **Catálogo de Servicios** (`CatalogoServicio`)
   ```typescript
   // Estructura con fórmulas
   {
     nombre: string,
     formula: string,         // "horaBase + horaRepetido * cantidad"
     horaBase: number,        // Costo base por hora
     horaRepetido: number,    // Costo por hora adicional
     recursoId: string       // Recurso asignado
   }
   ```

4. **Recursos Humanos** (`Recurso`)
   - Registro de técnicos, ingenieros, especialistas
   - Definición de costos por hora por rol

#### **1.2 Gestión de Clientes y Proveedores**
**📍 Ubicación**: `/comercial/clientes/`, `/logistica/proveedores/`

- **Clientes** (`Cliente`): Datos comerciales, sector industrial, calificación
- **Proveedores** (`Proveedor`): Información de contacto, especialización

---

### **FASE 2: MÓDULO COMERCIAL**
**👥 Responsables**: Comercial, Presupuestos

#### **2.1 CRM - Gestión de Oportunidades**
**📍 Ubicación**: `/crm/`

**Flujo de Oportunidades**:
```
📞 Contacto Inicial → 🤝 Reunión → 📋 Propuesta → ⚖️ Negociación → ✅ Cierre
```

**Modelo de Datos** (`CrmOportunidad`):
```typescript
{
  clienteId: string,          // Cliente relacionado
  nombre: string,             // Nombre de la oportunidad
  valorEstimado: number,      // Valor potencial
  probabilidad: number,       // 0-100%
  estado: EstadoOportunidad,  // prospecto → contacto_inicial → propuesta_enviada → negociacion → cerrada_ganada/perdida
  comercialId: string,        // Responsable comercial
  fechaCierreEstimada: Date,
  fuente: string             // "licitación", "referido", "prospección"
}
```

**Actividades de Seguimiento** (`CrmActividad`):
- Llamadas telefónicas, emails, reuniones
- Registro de resultados y próximos pasos

#### **2.2 Creación de Plantillas**
**📍 Ubicación**: `/comercial/plantillas/`

**Estructura de Plantilla** (`Plantilla`):
```
🛠️ Equipos (PlantillaEquipo)
├── Item 1: Generador 500kVA
├── Item 2: Transformador 1000kVA
└── Item 3: Cableado eléctrico

🔧 Servicios (PlantillaServicio)
├── Item 1: Instalación eléctrica
├── Item 2: Puesta en marcha
└── Item 3: Capacitación

💰 Gastos (PlantillaGasto)
├── Item 1: Viáticos
├── Item 2: Materiales consumibles
└── Item 3: Transporte
```

**Cálculos Automáticos**:
- Subtotales por sección (interno/cliente)
- Total general con descuentos
- Márgenes de ganancia configurables

#### **2.3 Generación de Cotizaciones**
**📍 Ubicación**: `/comercial/cotizaciones/`

**Proceso de Cotización**:
1. **Seleccionar Plantilla Base**
2. **Asignar Cliente Específico**
3. **Personalizar Items** según requerimientos del proyecto
4. **Aplicar Descuentos y Condiciones Especiales**
5. **Generar PDF Profesional**

**Estados de Cotización** (`EstadoCotizacion`):
```
borrador → enviada → aprobada → rechazada
```

**Modelo de Cotización** (`Cotizacion`):
```typescript
{
  clienteId: string,
  comercialId: string,
  plantillaId: string,        // Plantilla base
  codigo: string,             // GYS-XXXX-YY (auto-generado)
  estado: EstadoCotizacion,
  totalEquiposCliente: number,
  totalServiciosCliente: number,
  totalCliente: number,
  descuento: number,
  grandTotal: number
}
```

---

### **FASE 3: MÓDULO DE PROYECTOS**
**👥 Responsables**: Proyectos, Coordinador, Gestor

#### **3.1 Conversión Cotización → Proyecto**
**📍 Ubicación**: `/proyectos/`

**Proceso de Conversión**:
1. **Cotización Aprobada** → Seleccionar para conversión
2. **Crear Proyecto** con datos básicos
3. **Asignar Equipos del Proyecto** desde cotización
4. **Configurar Fechas** de inicio y entrega
5. **Asignar Responsables** (Comercial, Gestor, Coordinador)

**Jerarquía de 4 Niveles en Proyectos**:
```
🏗️ Proyecto
   ├── 📋 ProyectoFase (Planificación, Ejecución, Cierre)
   │   ├── 🔧 ProyectoEdt (Elementos de Trabajo)
   │   │   └── 📝 ProyectoTarea (Tareas específicas)
   │   │       └── 📋 ProyectoSubtarea (Subtareas opcionales)
   └── 🔗 ProyectoDependenciaTarea (Dependencias entre tareas)
```

#### **3.2 Gestión de Cronogramas (4 Niveles)**
**📍 Ubicación**: `/proyectos/[id]/cronograma/`

**Vista de 3 Cronogramas Paralelos**:
- **📊 Cronograma Comercial**: Estimaciones de venta (±30%)
- **📋 Cronograma Planificado**: Plan de ejecución (±15%)
- **⚡ Cronograma Real**: Ejecución actual (±5%)

**Registro de Horas** (`RegistroHoras`):
```typescript
{
  proyectoId: string,
  proyectoServicioId: string,
  proyectoEdtId?: string,        // EDT específico (opcional)
  proyectoTareaId?: string,      // Tarea específica (opcional)
  usuarioId: string,             // Quién registra
  fechaTrabajo: Date,
  horasTrabajadas: number,
  descripcion: string
}
```

#### **3.3 Control de Ejecución**
**📍 Ubicación**: `/proyectos/[id]/`

**Estados de Avance**:
- **Equipos**: `pendiente` → `revisado_tecnico` → `aprobado_coordinador` → `aprobado_gestor` → `en_lista` → `comprado` → `entregado`
- **Servicios**: Seguimiento por EDT y tareas específicas
- **Proyecto General**: `en_planificacion` → `en_ejecucion` → `completado`

---

### **FASE 4: MÓDULO DE LOGÍSTICA**
**👥 Responsables**: Logístico

#### **4.1 Gestión de Listas Técnicas**
**📍 Ubicación**: `/logistica/listas/`

**Proceso de Lista Técnica**:
1. **Generar desde Proyecto** - Convertir equipos del proyecto en lista técnica
2. **Filtrar y Organizar** - Por estado, prioridad, categorías
3. **Validar Especificaciones** - Asegurar requisitos técnicos correctos

**Estados de Lista** (`EstadoListaEquipo`):
```
borrador → por_revisar → por_cotizar → por_validar → por_aprobar → aprobado → completada
```

#### **4.2 Proceso de Cotizaciones con Proveedores**
**📍 Ubicación**: `/logistica/cotizaciones/`

**Flujo de Cotización a Proveedores**:
1. **Enviar Lista Técnica** a proveedores seleccionados
2. **Recibir Respuestas** y comparar ofertas
3. **Evaluar Ofertas** (precio, calidad, plazo de entrega)
4. **Seleccionar Mejor Opción** y registrar decisión

**Modelo de Cotización Proveedor** (`CotizacionProveedor`):
```typescript
{
  proveedorId: string,
  proyectoId: string,
  estado: EstadoCotizacionProveedor,  // pendiente → solicitado → cotizado → seleccionado
  items: CotizacionProveedorItem[]
}
```

#### **4.3 Gestión de Pedidos**
**📍 Ubicación**: `/logistica/pedidos/`

**Proceso de Pedido**:
1. **Crear Pedido** desde cotización proveedor seleccionada
2. **Seguimiento de Entregas** con estados detallados
3. **Control de Pagos** y recepción de mercancía

**Estados de Pedido** (`EstadoPedido`):
```
borrador → enviado → atendido → parcial → entregado → cancelado
```

**Estados de Entrega por Item** (`EstadoEntregaItem`):
```
pendiente → en_proceso → parcial → entregado → retrasado → cancelado
```

---

### **FASE 5: MÓDULO DE GESTIÓN**
**👥 Responsables**: Gestor, Gerente

#### **5.1 Valorizaciones**
**📍 Ubicación**: `/gestion/valorizaciones/`

**Cálculo Mensual**:
- **Avance Físico**: Porcentaje completado del proyecto
- **Costos Reales**: Gastos incurridos vs presupuestados
- **Facturación**: Valorizaciones por hitos cumplidos

**Modelo de Valorización** (`Valorizacion`):
```typescript
{
  proyectoId: string,
  periodoInicio: Date,
  periodoFin: Date,
  montoTotal: number,
  estado: string  // pendiente, aprobado, facturado
}
```

#### **5.2 Reportes y Analytics**
**📍 Ubicación**: `/gestion/reportes/`

**Dashboards Disponibles**:
- **Dashboard Ejecutivo**: KPIs generales del negocio
- **Reportes por Proyecto**: Rentabilidad, desviaciones, eficiencia
- **Análisis de Tendencias**: Evolución de márgenes, tiempos de entrega
- **Métricas Comerciales**: Tasa de conversión, pipeline por etapa

---

## 🔧 **ARQUITECTURA TÉCNICA DETALLADA**

### **Modelo de Datos Principal**

```typescript
// 📊 Modelo de Datos Completo GYS
{
  // 👥 Usuarios y Autenticación
  User: { id, name, email, role, accounts[], sessions[] },

  // 🏢 Clientes y Proveedores
  Cliente: { id, codigo, nombre, ruc, sector, potencialAnual },
  Proveedor: { id, nombre, ruc, contacto, especializacion },

  // 🔧 Catálogo de Productos/Servicios
  CatalogoEquipo: { id, codigo, descripcion, precioInterno, precioVenta },
  CatalogoServicio: { id, nombre, formula, horaBase, recursoId },
  Recurso: { id, nombre, costoHora },

  // 💼 Módulo Comercial
  CrmOportunidad: { clienteId, nombre, valorEstimado, probabilidad, estado },
  Plantilla: { nombre, equipos[], servicios[], gastos[], totales },
  Cotizacion: { clienteId, plantillaId, codigo, estado, totales },

  // 📁 Módulo de Proyectos
  Proyecto: { clienteId, cotizacionId, nombre, estado, fechas },
  ProyectoFase: { proyectoId, nombre, orden, fechasPlan, fechasReal },
  ProyectoEdt: { proyectoFaseId, nombre, horasPlan, horasReales },
  ProyectoTarea: { proyectoEdtId, nombre, horasEstimadas, horasReales },

  // 🚚 Módulo de Logística
  ListaEquipo: { proyectoId, codigo, estado, items[] },
  CotizacionProveedor: { proveedorId, proyectoId, estado, items[] },
  PedidoEquipo: { listaId, codigo, estado, items[] },

  // 📊 Módulo de Gestión
  Valorizacion: { proyectoId, periodoInicio, periodoFin, montoTotal },
  RegistroHoras: { proyectoId, usuarioId, fechaTrabajo, horasTrabajadas }
}
```

### **APIs Principales por Módulo**

| **Módulo** | **APIs Principales** | **Funcionalidad** |
|------------|---------------------|-------------------|
| **Catálogo** | `/api/catalogo-equipo`, `/api/catalogo-servicio` | CRUD de productos/servicios |
| **Comercial** | `/api/crm/oportunidades`, `/api/plantilla`, `/api/cotizacion` | Gestión comercial completa |
| **Proyectos** | `/api/proyecto`, `/api/proyecto-edt`, `/api/proyecto-tarea` | Gestión de proyectos y cronogramas |
| **Logística** | `/api/lista-equipo`, `/api/cotizacion-proveedor`, `/api/pedido-equipo` | Supply chain management |
| **Gestión** | `/api/valorizacion`, `/api/registro-horas` | Control financiero y tiempos |

### **Servicios de Lógica de Negocio**

```typescript
// 📍 Ubicación: /src/lib/services/

// Servicios principales por dominio
export class CatalogoService {}      // Gestión de catálogo
export class CrmService {}           // Gestión de oportunidades
export class PlantillaService {}     // Creación de plantillas
export class CotizacionService {}    // Generación de cotizaciones
export class ProyectoService {}      // Gestión de proyectos
export class CronogramaConversionService {} // Conversión cotización → proyecto
export class ListaEquipoService {}   // Gestión de listas técnicas
export class PedidoService {}        // Gestión de pedidos
export class ValorizacionService {}  // Cálculos financieros
```

---

## 📊 **MÉTRICAS Y KPIs DEL SISTEMA**

### **Indicadores Comerciales**
- **Tasa de Conversión**: Oportunidades → Cotizaciones → Proyectos
- **Tiempo de Respuesta**: Promedio de respuesta a cotizaciones
- **Margen Promedio**: Por tipo de proyecto y cliente
- **Pipeline por Etapa**: Valor acumulado en cada fase

### **Indicadores de Proyectos**
- **Cumplimiento de Plazos**: % proyectos entregados a tiempo
- **Desviación de Costos**: Real vs Presupuestado
- **Eficiencia de Recursos**: Horas planificadas vs reales
- **Satisfacción del Cliente**: Encuestas post-entrega

### **Indicadores Logísticos**
- **Tiempo de Respuesta Proveedores**: Días promedio de respuesta
- **Cumplimiento de Entregas**: % entregas en fecha
- **Variación de Precios**: Comparación catálogo vs mercado
- **Rotación de Inventario**: Por categoría de equipo

### **Indicadores Financieros**
- **Rentabilidad por Proyecto**: Márgenes reales obtenidos
- **ROI por Cliente**: Retorno de inversión por cuenta
- **Cash Flow**: Flujo de caja por periodos
- **Deuda Proveedores**: Control de cuentas por pagar

---

## 🔄 **INTEGRACIONES Y FLUJOS DE DATOS**

### **Sincronización entre Módulos**

1. **Catálogo → Plantillas → Cotizaciones**
   ```
   CatalogoEquipo/Servicio → PlantillaItem → CotizacionItem
   ```

2. **Cotización → Proyecto → Lista Técnica**
   ```
   Cotizacion → Proyecto → ListaEquipo → PedidoEquipo
   ```

3. **Proyecto → Cronograma → Registro de Horas**
   ```
   Proyecto → ProyectoFase → ProyectoEdt → ProyectoTarea → RegistroHoras
   ```

### **Importación/Exportación**
- **Excel Import**: Catálogos, listas de precios, datos maestros
- **PDF Export**: Cotizaciones, reportes, valorizaciones
- **API Integration**: Con sistemas ERP externos

---

## 🛡️ **SEGURIDAD Y AUDITORÍA**

### **Control de Acceso**
- **Autenticación**: NextAuth.js con múltiples proveedores
- **Autorización**: Middleware de validación por rutas
- **Encriptación**: Datos sensibles en BD
- **Auditoría**: Log completo de acciones críticas

### **Validación de Datos**
- **Zod Schemas**: Validación en cliente y servidor
- **TypeScript**: Tipado estricto end-to-end
- **Prisma**: Constraints e integridad referencial

---

## 🚀 **FLUJO DE DESARROLLO**

### **Metodología GYS**
1. **Modelo Prisma** → Definir entidad en schema
2. **Types** → Crear interfaces TypeScript
3. **API Routes** → Implementar endpoints CRUD
4. **Servicios** → Lógica de negocio con Prisma
5. **Componentes** → UI/UX con React
6. **Páginas** → Integración en rutas Next.js
7. **Testing** → Cobertura completa
8. **Documentación** → Actualizar guías

### **Estandares de Código**
- **Nomenclatura**: kebab-case (APIs), PascalCase (componentes)
- **Commits**: Conventional commits (feat, fix, docs)
- **Testing**: Jest + React Testing Library + Playwright
- **Performance**: Lighthouse score > 90

---

## 📚 **DOCUMENTACIÓN COMPLEMENTARIA**

- [🏗️ Arquitectura Técnica](./docs/ARQUITECTURA_SISTEMA.md)
- [🧪 Guía de Testing](./docs/GUIA_TESTING.md)
- [📋 API Documentation](./docs/API_DOCUMENTATION.md)
- [🔄 Flujo de Trabajo](./doc/FLUJO_TRABAJO_GYS.md)
- [📊 Métricas y KPIs](./docs/METRICAS_KPI.md)
- [🚀 Guía de Deployment](./docs/GUIA_DEPLOYMENT.md)

---

## 🎯 **CONCLUSIÓN**

El **Sistema GYS** proporciona una **solución integral** para la gestión completa de proyectos industriales, desde la oportunidad comercial inicial hasta la entrega final, con énfasis en:

- ✅ **Integración perfecta** entre módulos comerciales, proyectos y logística
- ✅ **Trazabilidad completa** desde cotización hasta facturación
- ✅ **Control granular** de costos, tiempos y recursos
- ✅ **Escalabilidad** para manejar múltiples proyectos simultáneamente
- ✅ **User Experience** optimizada para cada rol del negocio

**El flujo de trabajo GYS garantiza eficiencia operativa, control financiero y satisfacción del cliente en proyectos industriales complejos.**

---

**✍️ Autor**: Jesús Artemio (Master Experto 🧙‍♂️)  
**📅 Fecha**: Septiembre 2025  
**📍 Versión**: 2.0 - Flujo Completo con Cronograma 4 Niveles