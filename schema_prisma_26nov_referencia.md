# 📋 SCHEMA DE REFERENCIA - 26 NOVIEMBRE 2025
## schema_prisma_26nov.prisma (Versión antes de la falla)

**Fecha:** 26 de Noviembre de 2025  
**Estado:** Schema completo antes de la falla de base de datos local  
**Propósito:** Referencia para comparación y recuperación  

---

## 📊 EXTRACTO DE MODELOS Y TABLAS

### **TOTAL DE MODELOS: 89**
### **TOTAL DE ENUMS: 17**

### **LISTA COMPLETA DE MODELOS:**

| # | Modelo | Tabla ( @@map ) | Campos Principales |
|---|--------|-----------------|-------------------|
| **SISTEMA BASE** |
| 1 | User | "User" | id, name, email, password, role, metaMensual, metaTrimestral |
| 2 | Account | "Account" | id, userId, provider, providerAccountId, refresh_token |
| 3 | Session | "Session" | id, sessionToken, userId, expires |
| 4 | VerificationToken | "VerificationToken" | identifier, token, expires |
| 5 | Cliente | "Cliente" | id, codigo, nombre, ruc, sector, estadoRelacion |
| **CATÁLOGOS** |
| 6 | Unidad | "Unidad" | id, nombre |
| 7 | UnidadServicio | "UnidadServicio" | id, nombre |
| 8 | CategoriaEquipo | "CategoriaEquipo" | id, nombre, descripcion |
| 9 | CategoriaServicio | "CategoriaServicio" | id, nombre, descripcion |
| 10 | Recurso | "Recurso" | id, nombre, costoHora |
| 11 | CatalogoEquipo | "CatalogoEquipo" | id, codigo, descripcion, precioInterno, margen |
| 12 | CatalogoServicio | "CatalogoServicio" | id, nombre, descripcion, formula, horaBase |
| **PLANTILLAS** |
| 13 | Plantilla | "Plantilla" | id, nombre, estado, tipo, totalInterno, totalCliente |
| 14 | PlantillaEquipo | "PlantillaEquipo" | id, nombre, subtotalInterno, subtotalCliente |
| 15 | PlantillaEquipoItem | "PlantillaEquipoItem" | id, codigo, descripcion, precioInterno, cantidad |
| 16 | PlantillaServicio | "PlantillaServicio" | id, nombre, categoria, subtotalInterno |
| 17 | PlantillaServicioItem | "PlantillaServicioItem" | id, nombre, formula, costoHora, horaTotal |
| 18 | PlantillaGasto | "PlantillaGasto" | id, nombre, subtotalInterno, subtotalCliente |
| 19 | PlantillaGastoItem | "PlantillaGastoItem" | id, nombre, cantidad, precioUnitario |
| **PLANTILLAS INDEPENDIENTES** |
| 20 | PlantillaEquipoIndependiente | "plantilla_equipo_independiente" | id, nombre, estado, totalInterno, totalCliente |
| 21 | PlantillaEquipoItemIndependiente | "plantilla_equipo_item_independiente" | id, codigo, descripcion, precioInterno, cantidad |
| 22 | PlantillaServicioIndependiente | "plantilla_servicio_independiente" | id, nombre, categoria, estado, totalInterno |
| 23 | PlantillaServicioItemIndependiente | "plantilla_servicio_item_independiente" | id, nombre, formula, costoHora, horaTotal |
| 24 | PlantillaGastoIndependiente | "plantilla_gasto_independiente" | id, nombre, estado, totalInterno, totalCliente |
| 25 | PlantillaGastoItemIndependiente | "plantilla_gasto_item_independiente" | id, nombre, cantidad, precioUnitario |
| **COTIZACIONES** |
| 26 | Cotizacion | "Cotizacion" | id, codigo, nombre, totalInterno, totalCliente, estado |
| 27 | CotizacionEquipo | "CotizacionEquipo" | id, nombre, subtotalInterno, subtotalCliente |
| 28 | CotizacionEquipoItem | "CotizacionEquipoItem" | id, codigo, descripcion, precioInterno, cantidad |
| 29 | CotizacionServicio | "CotizacionServicio" | id, nombre, categoria, subtotalInterno |
| 30 | CotizacionServicioItem | "CotizacionServicioItem" | id, nombre, formula, costoHora, horaTotal |
| 31 | CotizacionGasto | "CotizacionGasto" | id, nombre, subtotalInterno, subtotalCliente |
| 32 | CotizacionGastoItem | "CotizacionGastoItem" | id, nombre, cantidad, precioUnitario |
| 33 | CotizacionFase | "cotizacion_fase" | id, nombre, orden, fechaInicioPlan, estado |
| 34 | CotizacionEdt | "cotizacion_edt" | id, nombre, zona, horasEstimadas, estado |
| 35 | CotizacionTarea | "cotizacion_tarea" | id, nombre, fechaInicio, fechaFin, horasEstimadas |
| **PROYECTOS** |
| 36 | Proyecto | "Proyecto" | id, nombre, totalInterno, totalCliente, estado, fechaInicio |
| 37 | ProyectoFase | "proyecto_fase" | id, nombre, orden, fechaInicioPlan, estado |
| 38 | FaseDefault | "fase_default" | id, nombre, orden, duracionDias, activo |
| 39 | ProyectoCronograma | "proyecto_cronograma" | id, tipo, nombre, esBaseline, version |
| 40 | ProyectoEdt | "proyecto_edt" | id, nombre, zona, horasPlan, estado |
| 41 | ProyectoTarea | "proyecto_tarea" | id, nombre, fechaInicio, fechaFin, horasEstimadas |
| 42 | ProyectoSubtarea | "proyecto_subtarea" | id, nombre, fechaInicio, fechaFin, horasEstimadas |
| 43 | ProyectoDependenciaTarea | "proyecto_dependencias_tarea" | id, tipo, tareaOrigenId, tareaDependienteId |
| **PROYECTOS COTIZADOS** |
| 44 | ProyectoEquipoCotizado | "ProyectoEquipoCotizado" | id, nombre, subtotalInterno, subtotalCliente, subtotalReal |
| 45 | ProyectoEquipoCotizadoItem | "ProyectoEquipoCotizadoItem" | id, codigo, descripcion, precioInterno, cantidad, precioReal |
| 46 | ProyectoServicioCotizado | "ProyectoServicioCotizado" | id, nombre, categoria, subtotalInterno, subtotalReal |
| 47 | ProyectoServicioCotizadoItem | "ProyectoServicioCotizadoItem" | id, categoria, costoHoraInterno, cantidadHoras, costoReal |
| 48 | ProyectoGastoCotizado | "ProyectoGastoCotizado" | id, nombre, subtotalInterno, subtotalCliente, subtotalReal |
| 49 | ProyectoGastoCotizadoItem | "ProyectoGastoCotizadoItem" | id, nombre, cantidad, precioUnitario, costoReal |
| **LISTAS Y PEDIDOS** |
| 50 | ListaEquipo | "ListaEquipo" | id, codigo, nombre, numeroSecuencia, estado |
| 51 | ListaEquipoItem | "ListaEquipoItem" | id, codigo, descripcion, cantidad, precioElegido, estado |
| 52 | Proveedor | "Proveedor" | id, nombre, ruc, direccion |
| 53 | CotizacionProveedor | "CotizacionProveedor" | id, codigo, numeroSecuencia, estado |
| 54 | CotizacionProveedorItem | "CotizacionProveedorItem" | id, codigo, descripcion, cantidadOriginal, precioUnitario |
| 55 | PedidoEquipo | "PedidoEquipo" | id, codigo, numeroSecuencia, estado, fechaPedido |
| 56 | PedidoEquipoItem | "PedidoEquipoItem" | id, cantidadPedida, precioUnitario, costoTotal, estado |
| **VALORIZACIONES Y HORAS** |
| 57 | Valorizacion | "Valorizacion" | id, nombre, periodoInicio, periodoFin, montoTotal |
| 58 | RegistroHoras | "RegistroHoras" | id, categoria, nombreServicio, fechaTrabajo, horasTrabajadas |
| **CRONOGRAMAS** |
| 59 | Tarea | "tareas" | id, nombre, fechaInicio, fechaFin, horasEstimadas |
| 60 | Subtarea | "subtareas" | id, nombre, fechaInicio, fechaFin, horasEstimadas |
| 61 | DependenciaTarea | "dependencias_tarea" | id, tipo, tareaOrigenId, tareaDependienteId |
| 62 | AsignacionRecurso | "asignaciones_recurso" | id, rol, horasAsignadas |
| 63 | RegistroProgreso | "registros_progreso" | id, fecha, horasTrabajadas, porcentajeCompletado |
| **EXCLUSIONES Y CONDICIONES** |
| 64 | CotizacionExclusion | "cotizacion_exclusion" | id, descripcion, orden |
| 65 | CotizacionCondicion | "cotizacion_condicion" | id, tipo, descripcion, orden |
| 66 | PlantillaExclusion | "plantilla_exclusion" | id, nombre, categoria, activo, orden |
| 67 | PlantillaExclusionItem | "plantilla_exclusion_item" | id, descripcion, orden, activo |
| 68 | PlantillaCondicion | "plantilla_condicion" | id, nombre, categoria, tipo, activo, orden |
| 69 | PlantillaCondicionItem | "plantilla_condicion_item" | id, descripcion, tipo, orden, activo |
| **CRM** |
| 70 | CrmOportunidad | "crm_oportunidad" | id, nombre, valorEstimado, probabilidad, estado |
| 71 | CrmActividad | "crm_actividad" | id, tipo, descripcion, fecha, resultado |
| 72 | CrmCompetidorLicitacion | "crm_competidor_licitacion" | id, nombreEmpresa, propuestaEconomica, resultado |
| 73 | CrmContactoCliente | "crm_contacto_cliente" | id, nombre, cargo, email, esDecisionMaker |
| 74 | CrmHistorialProyecto | "crm_historial_proyecto" | id, nombreProyecto, tipoProyecto, valorContrato |
| 75 | CrmMetricaComercial | "crm_metrica_comercial" | id, periodo, cotizacionesGeneradas, valorTotalVendido |
| 76 | MetricaComercial | "metrica_comercial" | id, periodo, tipo, cotizacionesGeneradas, valorTotalVendido |
| **VERSIONADO** |
| 77 | CotizacionVersion | "cotizacion_version" | id, cotizacionId, version, nombre, estado |
| **NOTIFICACIONES** |
| 78 | Notificacion | "notificaciones" | id, titulo, mensaje, tipo, prioridad, leida |
| **AUDITORÍA** |
| 79 | AuditLog | "audit_log" | id, entidadTipo, entidadId, accion, usuarioId |
| **IMPORTACIONES** |
| 80 | CotizacionPlantillaImport | "cotizacion_plantilla_import" | id, cotizacionId, plantillaId, tipoImportacion |
| **PERMISOS** |
| 81 | Permission | "permissions" | id, name, description, resource, action |
| 82 | UserPermission | "user_permissions" | id, userId, permissionId, type |
| **ANALYTICS** |
| 83 | AnalyticsEvent | "analytics_events" | id, event, category, action, timestamp |
| **CALENDARIO** |
| 84 | CalendarioLaboral | "calendario_laboral" | id, nombre, descripcion, horasPorDia, diasLaborables |
| 85 | DiaCalendario | "dia_calendario" | id, calendarioLaboralId, diaSemana, esLaborable |
| 86 | ExcepcionCalendario | "excepcion_calendario" | id, calendarioLaboralId, fecha, tipo, nombre |
| 87 | ConfiguracionCalendario | "configuracion_calendario" | id, calendarioLaboralId, tipoConfiguracion, entidadId |

### **LISTA COMPLETA DE ENUMS:**

| # | Enum | Valores |
|---|------|---------|
| 1 | EstadoEquipo | pendiente, revisado_tecnico, aprobado_coordinador, aprobado_gestor, en_lista, comprado, reemplazado, entregado |
| 2 | EstadoEquipoItem | pendiente, en_lista, reemplazado, descartado |
| 3 | EstadoListaItem | borrador, por_revisar, por_cotizar, por_validar, por_aprobar, aprobado, rechazado |
| 4 | OrigenListaItem | cotizado, nuevo, reemplazo |
| 5 | EstadoListaEquipo | borrador, enviada, por_revisar, por_cotizar, por_validar, por_aprobar, aprobada, rechazada, completada |
| 6 | EstadoPedido | borrador, enviado, atendido, parcial, entregado, cancelado |
| 7 | EstadoPedidoItem | pendiente, atendido, parcial, entregado |
| 8 | EstadoEntregaItem | pendiente, en_proceso, parcial, entregado, retrasado, cancelado |
| 9 | EstadoCotizacionProveedor | pendiente, solicitado, cotizado, rechazado, seleccionado |
| 10 | Role | colaborador, comercial, presupuestos, proyectos, coordinador, logistico, gestor, gerente, admin |
| 11 | ProyectoEstado | creado, listas_pendientes, listas_aprobadas, pedidos_creados, en_ejecucion, completado, pausado, cancelado, en_planificacion |
| 12 | EstadoEdt | planificado, en_progreso, detenido, completado, cancelado |
| 13 | EstadoFase | planificado, en_progreso, completado, pausado, cancelado |
| 14 | PrioridadEdt | baja, media, alta, critica |
| 15 | OrigenTrabajo | oficina, campo |
| 16 | EstadoOportunidad | prospecto, contacto_inicial, propuesta_enviada, negociacion, cerrada_ganada, cerrada_perdida |
| 17 | EstadoCotizacion | borrador, enviada, aprobada, rechazada |
| 18 | EstadoTarea | pendiente, en_progreso, completada, pausada, cancelada |
| 19 | PrioridadTarea | baja, media, alta, critica |
| 20 | TipoDependencia | finish_to_start, start_to_start, finish_to_finish, start_to_finish |
| 21 | TipoNotificacion | info, warning, success, error |
| 22 | PrioridadNotificacion | baja, media, alta, critica |
| 23 | PlantillaTipo | completa, equipos, servicios, gastos |

---

## 🏗️ CARACTERÍSTICAS ARQUITECTÓNICAS

### **Convenciones de Nomenclatura:**
- **Modelos:** PascalCase (User, Proyecto, Cotizacion)
- **Tablas:** snake_case o PascalCase según @@map
- **Campos:** camelCase (createdAt, fechaInicio, etc.)
- **Relaciones:** PascalCase para referencias

### **Sistemas Principales:**
1. **🔐 Sistema Base:** User, Account, Session, Cliente
2. **📦 Catálogos:** Unidad, Categoria, Recurso, CatalogoEquipo/Servicio
3. **📋 Plantillas:** Plantilla, PlantillaEquipo/Servicio/Gasto (+ Independientes)
4. **💰 Cotizaciones:** Cotizacion + sub-módulos (Equipos, Servicios, Gastos, Fases, EDT, Tareas)
5. **🏗️ Proyectos:** Proyecto + sub-módulos (Fases, Cronogramas, EDT, Tareas, Dependencias)
6. **📋 Listas y Pedidos:** ListaEquipo, PedidoEquipo + Proveedores
7. **⏱️ Tracking:** RegistroHoras, Valorizacion, Tareas/Subtareas
8. **🧾 CRM:** Oportunidades, Actividades, Competidores, Contactos, Historial, Métricas
9. **🔔 Sistema de Notificaciones**
10. **📊 Auditoría y Analytics**
11. **🔐 Sistema de Permisos**
12. **📅 Sistema de Calendario**

### **Estado Completo:** 
- ✅ **89 modelos** funcionales
- ✅ **23 enums** para validación
- ✅ **Relaciones complejas** implementadas
- ✅ **Índices optimizados** definidos
- ✅ **Funcionalidades avanzadas** completas

**Este schema representa el estado COMPLETO del sistema al 26 de noviembre de 2025.**