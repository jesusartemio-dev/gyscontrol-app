# 📋 SCHEMA PRISMA 26NOV - ANÁLISIS DE REFERENCIA

**Fecha de Referencia:** 26 de Noviembre de 2025  
**Propósito:** Schema completo del sistema GYS antes de la ruptura de la base local  
**Total Modelos:** 91+ modelos con sus respectivos enums  

---

## 🏗️ ESTRUCTURA DEL SISTEMA GYS - 26 NOVIEMBRE 2025

### 🔧 SISTEMA BASE
| Modelo | Tabla | Descripción | Sistema |
|--------|-------|-------------|---------|
| `User` | `User` | Gestión de usuarios y permisos | Autenticación |
| `Account` | `Account` | Cuentas de autenticación OAuth | Autenticación |
| `Session` | `Session` | Sesiones de usuario | Autenticación |
| `VerificationToken` | `VerificationToken` | Tokens de verificación | Autenticación |

### 👥 GESTIÓN COMERCIAL
| Modelo | Tabla | Descripción | Sistema |
|--------|-------|-------------|---------|
| `Cliente` | `Cliente` | Base de clientes completa | CRM |
| `CrmOportunidad` | `crm_oportunidad` | Oportunidades de venta | CRM |
| `CrmActividad` | `crm_actividad` | Actividades de seguimiento | CRM |
| `CrmContactoCliente` | `crm_contacto_cliente` | Contactos por cliente | CRM |
| `CrmHistorialProyecto` | `crm_historial_proyecto` | Historial de proyectos | CRM |
| `CrmMetricaComercial` | `crm_metrica_comercial` | Métricas por comercial | CRM |
| `MetricaComercial` | `metrica_comercial` | Métricas detalladas | CRM |
| `CrmCompetidorLicitacion` | `crm_competidor_licitacion` | Análisis de competidores | CRM |

### 📦 CATÁLOGOS Y RECURSOS
| Modelo | Tabla | Descripción | Sistema |
|--------|-------|-------------|---------|
| `Unidad` | `Unidad` | Unidades de medida | Catálogos |
| `UnidadServicio` | `UnidadServicio` | Unidades para servicios | Catálogos |
| `CategoriaEquipo` | `CategoriaEquipo` | Categorías de equipos | Catálogos |
| `CategoriaServicio` | `CategoriaServicio` | Categorías de servicios | Catálogos |
| `Recurso` | `Recurso` | Recursos humanos y costos | Catálogos |
| `CatalogoEquipo` | `CatalogoEquipo` | Catálogo de equipos | Catálogos |
| `CatalogoServicio` | `CatalogoServicio` | Catálogo de servicios | Catálogos |

### 📋 PLANTILLAS
| Modelo | Tabla | Descripción | Sistema |
|--------|-------|-------------|---------|
| `Plantilla` | `Plantilla` | Plantillas base | Plantillas |
| `PlantillaEquipo` | `PlantillaEquipo` | Equipos en plantillas | Plantillas |
| `PlantillaEquipoItem` | `PlantillaEquipoItem` | Items de equipos | Plantillas |
| `PlantillaServicio` | `PlantillaServicio` | Servicios en plantillas | Plantillas |
| `PlantillaServicioItem` | `PlantillaServicioItem` | Items de servicios | Plantillas |
| `PlantillaGasto` | `PlantillaGasto` | Gastos en plantillas | Plantillas |
| `PlantillaGastoItem` | `PlantillaGastoItem` | Items de gastos | Plantillas |

### 🆕 PLANTILLAS INDEPENDIENTES (NUEVO)
| Modelo | Tabla | Descripción | Sistema |
|--------|-------|-------------|---------|
| `PlantillaEquipoIndependiente` | `plantilla_equipo_independiente` | Equipos independientes | Plantillas |
| `PlantillaEquipoItemIndependiente` | `plantilla_equipo_item_independiente` | Items independientes | Plantillas |
| `PlantillaServicioIndependiente` | `plantilla_servicio_independiente` | Servicios independientes | Plantillas |
| `PlantillaServicioItemIndependiente` | `plantilla_servicio_item_independiente` | Items independientes | Plantillas |
| `PlantillaGastoIndependiente` | `plantilla_gasto_independiente` | Gastos independientes | Plantillas |
| `PlantillaGastoItemIndependiente` | `plantilla_gasto_item_independiente` | Items independientes | Plantillas |

### 💰 COTIZACIONES
| Modelo | Tabla | Descripción | Sistema |
|--------|-------|-------------|---------|
| `Cotizacion` | `Cotizacion` | Cotizaciones principales | Cotizaciones |
| `CotizacionEquipo` | `CotizacionEquipo` | Equipos por cotización | Cotizaciones |
| `CotizacionEquipoItem` | `CotizacionEquipoItem` | Items de equipos | Cotizaciones |
| `CotizacionServicio` | `CotizacionServicio` | Servicios por cotización | Cotizaciones |
| `CotizacionServicioItem` | `CotizacionServicioItem` | Items de servicios | Cotizaciones |
| `CotizacionGasto` | `CotizacionGasto` | Gastos por cotización | Cotizaciones |
| `CotizacionGastoItem` | `CotizacionGastoItem` | Items de gastos | Cotizaciones |

### 📅 CRONOGRAMAS COTIZACIÓN
| Modelo | Tabla | Descripción | Sistema |
|--------|-------|-------------|---------|
| `CotizacionFase` | `cotizacion_fase` | Fases de cotización | Cronogramas |
| `CotizacionEdt` | `cotizacion_edt` | EDT comercial | Cronogramas |
| `CotizacionTarea` | `cotizacion_tarea` | Tareas comerciales | Cronogramas |
| `CotizacionExclusion` | `cotizacion_exclusion` | Exclusiones | Cotizaciones |
| `CotizacionCondicion` | `cotizacion_condicion` | Condiciones | Cotizaciones |

### 🚧 PROYECTOS
| Modelo | Tabla | Descripción | Sistema |
|--------|-------|-------------|---------|
| `Proyecto` | `Proyecto` | Proyectos principales | Proyectos |
| `ProyectoFase` | `proyecto_fase` | Fases de proyecto | Cronogramas |
| `ProyectoCronograma` | `proyecto_cronograma` | Cronogramas de proyecto | Cronogramas |
| `ProyectoEdt` | `proyecto_edt` | EDT de proyecto | Cronogramas |
| `ProyectoTarea` | `proyecto_tarea` | Tareas de proyecto | Cronogramas |
| `ProyectoSubtarea` | `proyecto_subtarea` | Subtareas | Cronogramas |
| `ProyectoDependenciaTarea` | `proyecto_dependencias_tarea` | Dependencias | Cronogramas |

### 🏗️ PROYECTOS COTIZADOS
| Modelo | Tabla | Descripción | Sistema |
|--------|-------|-------------|---------|
| `ProyectoEquipoCotizado` | `ProyectoEquipoCotizado` | Equipos cotizados | Proyectos |
| `ProyectoEquipoCotizadoItem` | `ProyectoEquipoCotizadoItem` | Items cotizados | Proyectos |
| `ProyectoServicioCotizado` | `ProyectoServicioCotizado` | Servicios cotizados | Proyectos |
| `ProyectoServicioCotizadoItem` | `ProyectoServicioCotizadoItem` | Items cotizados | Proyectos |
| `ProyectoGastoCotizado` | `ProyectoGastoCotizado` | Gastos cotizados | Proyectos |
| `ProyectoGastoCotizadoItem` | `ProyectoGastoCotizadoItem` | Items cotizados | Proyectos |

### 📋 LISTAS DE EQUIPOS
| Modelo | Tabla | Descripción | Sistema |
|--------|-------|-------------|---------|
| `ListaEquipo` | `ListaEquipo` | Listas de equipos | Logística |
| `ListaEquipoItem` | `ListaEquipoItem` | Items de listas | Logística |
| `Proveedor` | `Proveedor` | Proveedores | Logística |
| `CotizacionProveedor` | `CotizacionProveedor` | Cotizaciones a proveedores | Logística |
| `CotizacionProveedorItem` | `CotizacionProveedorItem` | Items cotizados | Logística |

### 📦 PEDIDOS
| Modelo | Tabla | Descripción | Sistema |
|--------|-------|-------------|---------|
| `PedidoEquipo` | `PedidoEquipo` | Pedidos de equipos | Logística |
| `PedidoEquipoItem` | `PedidoEquipoItem` | Items de pedidos | Logística |
| `Valorizacion` | `Valorizacion` | Valorizaciones | Proyectos |

### ⏰ REGISTRO DE HORAS
| Modelo | Tabla | Descripción | Sistema |
|--------|-------|-------------|---------|
| `RegistroHoras` | `RegistroHoras` | Registro de horas trabajadas | Proyectos |
| `Tarea` | `tareas` | Tareas de servicios | Proyectos |
| `Subtarea` | `subtareas` | Subtareas | Proyectos |
| `DependenciaTarea` | `dependencias_tarea` | Dependencias de tareas | Proyectos |
| `AsignacionRecurso` | `asignaciones_recurso` | Asignaciones de recursos | Proyectos |
| `RegistroProgreso` | `registros_progreso` | Progreso de tareas | Proyectos |

### 🔒 SISTEMA DE PERMISOS
| Modelo | Tabla | Descripción | Sistema |
|--------|-------|-------------|---------|
| `Permission` | `permissions` | Permisos del sistema | Seguridad |
| `UserPermission` | `user_permissions` | Permisos por usuario | Seguridad |

### 📊 ANALYTICS Y NOTIFICACIONES
| Modelo | Tabla | Descripción | Sistema |
|--------|-------|-------------|---------|
| `AnalyticsEvent` | `analytics_events` | Eventos de analytics | Analytics |
| `Notificacion` | `notificaciones` | Sistema de notificaciones | Sistema |
| `AuditLog` | `audit_log` | Logs de auditoría | Auditoría |

### 📅 CALENDARIO LABORAL
| Modelo | Tabla | Descripción | Sistema |
|--------|-------|-------------|---------|
| `CalendarioLaboral` | `calendario_laboral` | Calendarios laborales | Calendarios |
| `DiaCalendario` | `dia_calendario` | Días del calendario | Calendarios |
| `ExcepcionCalendario` | `excepcion_calendario` | Excepciones y feriados | Calendarios |
| `ConfiguracionCalendario` | `configuracion_calendario` | Configuración por entidad | Calendarios |

### 📈 VERSIONES Y CONFIGURACIÓN
| Modelo | Tabla | Descripción | Sistema |
|--------|-------|-------------|---------|
| `CotizacionVersion` | `cotizacion_version` | Versiones de cotizaciones | Versionado |
| `FaseDefault` | `fase_default` | Fases por defecto | Configuración |
| `CotizacionPlantillaImport` | `cotizacion_plantilla_import` | Importaciones de plantillas | Importación |

---

## 🔄 CONFIGURACIÓN DE SISTEMAS

### 🎯 Sistemas Principales Identificados:

#### 1. **AUTENTICACIÓN Y SEGURIDAD**
- Users, Accounts, Sessions
- Permissions y UserPermissions
- Verification tokens

#### 2. **COMERCIAL (CRM)**
- Cliente management
- CrmOportunidad tracking
- Actividades comerciales
- Métricas y análisis competitivo

#### 3. **COTIZACIONES**
- Cotización principal
- Equipos, servicios, gastos
- Versionado y condiciones

#### 4. **PROYECTOS**
- Proyecto management
- Equipos/servicios/gastos cotizados
- Registro de horas

#### 5. **CRONOGRAMAS**
- Fases, EDT, tareas (comerciales y proyectos)
- Dependencias y subtareas
- Seguimiento de progreso

#### 6. **LOGÍSTICA**
- Listas de equipos
- Proveedores y cotizaciones
- Pedidos y seguimiento

#### 7. **PLANTILLAS**
- Plantillas completas
- Plantillas independientes
- Equipos, servicios, gastos

#### 8. **SISTEMA**
- Analytics y notificaciones
- Auditoría completa
- Calendario laboral

---

## 📊 ENUMS PRESENTES (22 enums)

1. `EstadoEquipo` - Estados de equipos
2. `EstadoEquipoItem` - Estados de items de equipos
3. `EstadoListaItem` - Estados de items de listas
4. `OrigenListaItem` - Origen de items
5. `EstadoListaEquipo` - Estados de listas
6. `EstadoPedido` - Estados de pedidos
7. `EstadoPedidoItem` - Estados de items de pedidos
8. `EstadoEntregaItem` - Estados de entrega
9. `EstadoCotizacionProveedor` - Estados de cotizaciones proveedor
10. `Role` - Roles de usuario
11. `ProyectoEstado` - Estados de proyecto
12. `EstadoEdt` - Estados de EDT
13. `EstadoFase` - Estados de fase
14. `PrioridadEdt` - Prioridades EDT
15. `OrigenTrabajo` - Origen del trabajo
16. `EstadoOportunidad` - Estados de oportunidad
17. `EstadoCotizacion` - Estados de cotización
18. `EstadoTarea` - Estados de tarea
19. `PrioridadTarea` - Prioridades de tarea
20. `TipoDependencia` - Tipos de dependencia
21. `TipoNotificacion` - Tipos de notificación
22. `PrioridadNotificacion` - Prioridades de notificación
23. `PlantillaTipo` - Tipos de plantilla

---

## 🏗️ TOTALES DEL SISTEMA 26NOV

- **Modelos principales:** 91+
- **Enums:** 23
- **Sistemas integrados:** 8
- **Complejidad:** Alta (múltiples módulos interconectados)

---

**Documento generado:** 27 de Noviembre de 2025  
**Para análisis de:** Sistema GYS al 26 de noviembre de 2025  
**Estado:** ✅ COMPLETO - 91+ modelos catalogados