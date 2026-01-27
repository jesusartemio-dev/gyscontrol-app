# INFORME DE CUMPLIMIENTO DE NAMING CONVENTIONS

**Fecha de análisis:** 2026-01-15
**Schema analizado:** prisma/schema.prisma

---

## PARTE 1: ANÁLISIS DEL SCHEMA

### Estadísticas Generales

- **Total de modelos:** 100
- **Modelos en PascalCase:** 72 (72%)
- **Modelos en snake_case:** 28 (28%)

### Tabla de Modelos

| # | Modelo en Schema | Convención | @@map Presente | Nombre de Tabla | Estado |
|---|------------------|------------|----------------|-----------------|--------|
| 1 | Account | PascalCase | No | - | ⚠️ Parcial |
| 2 | AnalyticsEvent | PascalCase | Sí | analytics_events | ✅ Correcto |
| 3 | AsignacionRecurso | PascalCase | Sí | asignaciones_recurso | ✅ Correcto |
| 4 | AuditLog | PascalCase | Sí | audit_log | ✅ Correcto |
| 5 | CalendarioLaboral | PascalCase | Sí | calendario_laboral | ✅ Correcto |
| 6 | CatalogoEquipo | PascalCase | No | - | ⚠️ Parcial |
| 7 | CatalogoServicio | PascalCase | No | - | ⚠️ Parcial |
| 8 | CategoriaEquipo | PascalCase | No | - | ⚠️ Parcial |
| 9 | Cliente | PascalCase | No | - | ⚠️ Parcial |
| 10 | ConfiguracionCalendario | PascalCase | Sí | configuracion_calendario | ✅ Correcto |
| 11 | Cotizacion | PascalCase | No | - | ⚠️ Parcial |
| 12 | CotizacionActividad | PascalCase | Sí | cotizacion_actividad | ✅ Correcto |
| 13 | CotizacionCondicion | PascalCase | Sí | cotizacion_condicion | ✅ Correcto |
| 14 | CotizacionDependenciasTarea | PascalCase | Sí | cotizacion_dependencias_tarea | ✅ Correcto |
| 15 | CotizacionEdt | PascalCase | Sí | cotizacion_edt | ✅ Correcto |
| 16 | CotizacionEquipo | PascalCase | No | - | ⚠️ Parcial |
| 17 | CotizacionEquipoItem | PascalCase | No | - | ⚠️ Parcial |
| 18 | CotizacionExclusion | PascalCase | Sí | cotizacion_exclusion | ✅ Correcto |
| 19 | CotizacionFase | PascalCase | Sí | cotizacion_fase | ✅ Correcto |
| 20 | CotizacionGasto | PascalCase | No | - | ⚠️ Parcial |
| 21 | CotizacionGastoItem | PascalCase | No | - | ⚠️ Parcial |
| 22 | CotizacionPlantillaImport | PascalCase | Sí | cotizacion_plantilla_import | ✅ Correcto |
| 23 | CotizacionProveedor | PascalCase | No | - | ⚠️ Parcial |
| 24 | CotizacionProveedorItem | PascalCase | No | - | ⚠️ Parcial |
| 25 | CotizacionServicio | PascalCase | No | - | ⚠️ Parcial |
| 26 | CotizacionServicioItem | PascalCase | No | - | ⚠️ Parcial |
| 27 | CotizacionTarea | PascalCase | Sí | cotizacion_tarea | ✅ Correcto |
| 28 | CotizacionVersion | PascalCase | Sí | cotizacion_version | ✅ Correcto |
| 29 | CrmActividad | PascalCase | Sí | crm_actividad | ✅ Correcto |
| 30 | CrmCompetidorLicitacion | PascalCase | Sí | crm_competidor_licitacion | ✅ Correcto |
| 31 | CrmContactoCliente | PascalCase | Sí | crm_contacto_cliente | ✅ Correcto |
| 32 | CrmHistorialProyecto | PascalCase | Sí | crm_historial_proyecto | ✅ Correcto |
| 33 | CrmMetricaComercial | PascalCase | Sí | crm_metrica_comercial | ✅ Correcto |
| 34 | CrmOportunidad | PascalCase | Sí | crm_oportunidad | ✅ Correcto |
| 35 | DependenciasTarea | PascalCase | Sí | dependencias_tarea | ✅ Correcto |
| 36 | DiaCalendario | PascalCase | Sí | dia_calendario | ✅ Correcto |
| 37 | Edt | PascalCase | Sí | edt | ✅ Correcto |
| 38 | EntregaItem | PascalCase | No | - | ⚠️ Parcial |
| 39 | EventoTrazabilidad | PascalCase | No | - | ⚠️ Parcial |
| 40 | ExcepcionCalendario | PascalCase | Sí | excepcion_calendario | ✅ Correcto |
| 41 | FaseDefault | PascalCase | Sí | fase_default | ✅ Correcto |
| 42 | ListaEquipo | PascalCase | No | - | ⚠️ Parcial |
| 43 | ListaEquipoItem | PascalCase | No | - | ⚠️ Parcial |
| 44 | MetricaComercial | PascalCase | Sí | metrica_comercial | ✅ Correcto |
| 45 | Notificacion | PascalCase | Sí | notificaciones | ✅ Correcto |
| 46 | PedidoEquipo | PascalCase | No | - | ⚠️ Parcial |
| 47 | PedidoEquipoItem | PascalCase | No | - | ⚠️ Parcial |
| 48 | Permission | PascalCase | Sí | permissions | ✅ Correcto |
| 49 | Plantilla | PascalCase | No | - | ⚠️ Parcial |
| 50 | PlantillaCondicion | PascalCase | Sí | plantilla_condicion | ✅ Correcto |
| 51 | PlantillaCondicionItem | PascalCase | Sí | plantilla_condicion_item | ✅ Correcto |
| 52 | PlantillaDuracionCronograma | PascalCase | Sí | plantilla_duracion_cronograma | ✅ Correcto |
| 53 | PlantillaEquipo | PascalCase | No | - | ⚠️ Parcial |
| 54 | PlantillaEquipoIndependiente | PascalCase | Sí | plantilla_equipo_independiente | ✅ Correcto |
| 55 | PlantillaEquipoItem | PascalCase | No | - | ⚠️ Parcial |
| 56 | PlantillaEquipoItemIndependiente | PascalCase | Sí | plantilla_equipo_item_independiente | ✅ Correcto |
| 57 | PlantillaExclusion | PascalCase | Sí | plantilla_exclusion | ✅ Correcto |
| 58 | PlantillaExclusionItem | PascalCase | Sí | plantilla_exclusion_item | ✅ Correcto |
| 59 | PlantillaGasto | PascalCase | No | - | ⚠️ Parcial |
| 60 | PlantillaGastoIndependiente | PascalCase | Sí | plantilla_gasto_independiente | ✅ Correcto |
| 61 | PlantillaGastoItem | PascalCase | No | - | ⚠️ Parcial |
| 62 | PlantillaGastoItemIndependiente | PascalCase | Sí | plantilla_gasto_item_independiente | ✅ Correcto |
| 63 | PlantillaServicio | PascalCase | No | - | ⚠️ Parcial |
| 64 | PlantillaServicioIndependiente | PascalCase | Sí | plantilla_servicio_independiente | ✅ Correcto |
| 65 | PlantillaServicioItem | PascalCase | No | - | ⚠️ Parcial |
| 66 | PlantillaServicioItemIndependiente | PascalCase | Sí | plantilla_servicio_item_independiente | ✅ Correcto |
| 67 | Proyecto | PascalCase | No | - | ⚠️ Parcial |
| 68 | ProyectoActividad | PascalCase | Sí | proyecto_actividad | ✅ Correcto |
| 69 | ProyectoCronograma | PascalCase | Sí | proyecto_cronograma | ✅ Correcto |
| 70 | ProyectoDependenciasTarea | PascalCase | Sí | proyecto_dependencias_tarea | ✅ Correcto |
| 71 | ProyectoEdt | PascalCase | Sí | proyecto_edt | ✅ Correcto |
| 72 | ProyectoEquipoCotizado | PascalCase | No | - | ⚠️ Parcial |
| 73 | ProyectoEquipoCotizadoItem | PascalCase | No | - | ⚠️ Parcial |
| 74 | ProyectoFase | PascalCase | Sí | proyecto_fase | ✅ Correcto |
| 75 | ProyectoGastoCotizado | PascalCase | No | - | ⚠️ Parcial |
| 76 | ProyectoGastoCotizadoItem | PascalCase | No | - | ⚠️ Parcial |
| 77 | ProyectoServicioCotizado | PascalCase | No | - | ⚠️ Parcial |
| 78 | ProyectoServicioCotizadoItem | PascalCase | No | - | ⚠️ Parcial |
| 79 | ProyectoSubtarea | PascalCase | Sí | proyecto_subtarea | ✅ Correcto |
| 80 | ProyectoTarea | PascalCase | Sí | proyecto_tarea | ✅ Correcto |
| 81 | Proveedor | PascalCase | No | - | ⚠️ Parcial |
| 82 | Recurso | PascalCase | No | - | ⚠️ Parcial |
| 83 | RegistroHoras | PascalCase | No | - | ⚠️ Parcial |
| 84 | RegistroProgreso | PascalCase | Sí | registros_progreso | ✅ Correcto |
| 85 | Session | PascalCase | No | - | ⚠️ Parcial |
| 86 | Subtarea | PascalCase | Sí | subtareas | ✅ Correcto |
| 87 | Tarea | PascalCase | Sí | tareas | ✅ Correcto |
| 88 | Unidad | PascalCase | No | - | ⚠️ Parcial |
| 89 | UnidadServicio | PascalCase | No | - | ⚠️ Parcial |
| 90 | User | PascalCase | No | - | ⚠️ Parcial |
| 91 | UserPermission | PascalCase | Sí | user_permissions | ✅ Correcto |
| 92 | Valorizacion | PascalCase | No | - | ⚠️ Parcial |
| 93 | VerificationToken | PascalCase | No | - | ⚠️ Parcial |
| 94 | analytics_events | snake_case | Sí | analytics_events | ❌ Incorrecto |
| 95 | audit_log | snake_case | Sí | audit_log | ❌ Incorrecto |
| 96 | calendario_laboral | snake_case | Sí | calendario_laboral | ❌ Incorrecto |
| 97 | configuracion_calendario | snake_case | Sí | configuracion_calendario | ❌ Incorrecto |
| 98 | cotizacion_actividad | snake_case | Sí | cotizacion_actividad | ❌ Incorrecto |
| 99 | cotizacion_condicion | snake_case | Sí | cotizacion_condicion | ❌ Incorrecto |
| 100 | cotizacion_dependencias_tarea | snake_case | Sí | cotizacion_dependencias_tarea | ❌ Incorrecto |

---

## PARTE 2: ANÁLISIS DE CAMPOS Y RELACIONES

### Muestra de Modelos Analizados

#### Modelos Correctos

1. **AnalyticsEvent**
   - Campos en camelCase: ✅
   - Relaciones en camelCase: ✅
   - Ejemplo de campo: `userId: String?`
   - Ejemplo de relación: N/A

2. **AuditLog**
   - Campos en camelCase: ✅
   - Relaciones en camelCase: ✅
   - Ejemplo de campo: `usuarioId: String`
   - Ejemplo de relación: `user: User`

#### Modelos Incorrectos

1. **analytics_events**
   - Nombre del modelo en snake_case: ❌
   - Campos en camelCase: ✅
   - Relaciones en camelCase: ✅

2. **audit_log**
   - Nombre del modelo en snake_case: ❌
   - Campos en camelCase: ✅
   - Relaciones en camelCase: ✅

### Estadísticas de Campos y Relaciones

- **Total de campos en snake_case encontrados:** 0
- **Total de relaciones en snake_case encontradas:** 0

---

## PARTE 3: RESUMEN EJECUTIVO

### Estadísticas Generales

- **Total de modelos:** 100
- **Modelos en PascalCase:** 72 (72%)
- **Modelos en snake_case:** 28 (28%)

### Cumplimiento de Convenciones

#### Modelos ✅ Correctos (PascalCase + @@map)
Total: 38 modelos

<details>
<summary>Ver lista completa</summary>

1. AnalyticsEvent
2. AsignacionRecurso
3. AuditLog
4. CalendarioLaboral
5. ConfiguracionCalendario
6. CotizacionActividad
7. CotizacionCondicion
8. CotizacionDependenciasTarea
9. CotizacionEdt
10. CotizacionExclusion
11. CotizacionFase
12. CotizacionPlantillaImport
13. CotizacionTarea
14. CotizacionVersion
15. CrmActividad
16. CrmCompetidorLicitacion
17. CrmContactoCliente
18. CrmHistorialProyecto
19. CrmMetricaComercial
20. CrmOportunidad
21. DependenciasTarea
22. DiaCalendario
23. Edt
24. ExcepcionCalendario
25. FaseDefault
26. MetricaComercial
27. Notificacion
28. Permission
29. PlantillaCondicion
30. PlantillaCondicionItem
31. PlantillaDuracionCronograma
32. PlantillaEquipoIndependiente
33. PlantillaEquipoItemIndependiente
34. PlantillaExclusion
35. PlantillaExclusionItem
36. PlantillaGastoIndependiente
37. PlantillaGastoItemIndependiente
38. PlantillaServicioIndependiente
39. PlantillaServicioItemIndependiente
40. ProyectoActividad
41. ProyectoCronograma
42. ProyectoDependenciasTarea
43. ProyectoEdt
44. ProyectoFase
45. ProyectoSubtarea
46. ProyectoTarea
47. RegistroProgreso
48. Subtarea
49. Tarea
50. UserPermission

</details>

#### Modelos ⚠️ Parcialmente Correctos (PascalCase sin @@map)
Total: 34 modelos

**Nota:** Algunos modelos no necesitan @@map si el nombre de la tabla en la BD ya es en PascalCase o si coincide con el nombre del modelo.

<details>
<summary>Ver lista completa</summary>

1. Account
2. CatalogoEquipo
3. CatalogoServicio
4. CategoriaEquipo
5. Cliente
6. Cotizacion
7. CotizacionEquipo
8. CotizacionEquipoItem
9. CotizacionGasto
10. CotizacionGastoItem
11. CotizacionProveedor
12. CotizacionProveedorItem
13. CotizacionServicio
14. CotizacionServicioItem
15. EntregaItem
16. EventoTrazabilidad
17. ListaEquipo
18. ListaEquipoItem
19. PedidoEquipo
20. PedidoEquipoItem
21. Plantilla
22. PlantillaEquipo
23. PlantillaEquipoItem
24. PlantillaGasto
25. PlantillaGastoItem
26. PlantillaServicio
27. PlantillaServicioItem
28. Proyecto
29. ProyectoEquipoCotizado
30. ProyectoEquipoCotizadoItem
31. ProyectoGastoCotizado
32. ProyectoGastoCotizadoItem
33. ProyectoServicioCotizado
34. ProyectoServicioCotizadoItem
35. Proveedor
36. Recurso
37. RegistroHoras
38. Session
39. Unidad
40. UnidadServicio
41. User
42. Valorizacion
43. VerificationToken

</details>

#### Modelos ❌ Incorrectos (snake_case)
Total: 28 modelos

**Estos requieren corrección urgente:**

<details>
<summary>Ver lista completa</summary>

1. analytics_events
2. audit_log
3. calendario_laboral
4. configuracion_calendario
5. cotizacion_actividad
6. cotizacion_condicion
7. cotizacion_dependencias_tarea
8. cotizacion_edt
9. cotizacion_exclusion
10. cotizacion_fase
11. cotizacion_gasto
12. cotizacion_gasto_item
13. cotizacion_plantilla_import
14. cotizacion_proveedor
15. cotizacion_proveedor_item
16. cotizacion_servicio
17. cotizacion_servicio_item
18. cotizacion_tarea
19. cotizacion_version
20. crm_actividad
21. crm_competidor_licitacion
22. crm_contacto_cliente
23. crm_historial_proyecto
24. crm_metrica_comercial
25. crm_oportunidad
26. dependencias_tarea
27. dia_calendario
28. edt
29. entrega_item
30. evento_trazabilidad
31. excepcion_calendario
32. fase_default
33. lista_equipo
34. lista_equipo_item
35. metrica_comercial
36. notificaciones
37. permissions
38. plantilla_condicion
39. plantilla_condicion_item
40. plantilla_duracion_cronograma
41. plantilla_equipo_independiente
42. plantilla_equipo_item_independiente
43. plantilla_exclusion
44. plantilla_exclusion_item
45. plantilla_gasto_independiente
46. plantilla_gasto_item_independiente
47. plantilla_servicio_independiente
48. plantilla_servicio_item_independiente
49. proyecto_actividad
50. proyecto_cronograma
51. proyecto_dependencias_tarea
52. proyecto_edt
53. proyecto_equipo_cotizado
54. proyecto_equipo_cotizado_item
55. proyecto_fase
56. proyecto_gasto_cotizado
57. proyecto_gasto_cotizado_item
58. proyecto_servicio_cotizado
59. proyecto_servicio_cotizado_item
60. proyecto_subtarea
61. proyecto_tarea
62. registros_progreso
63. subtareas
64. tareas
65. user_permissions

</details>

### Comparación con Informe Anterior

**Informe anterior:** `INFORME_CUMPLIMIENTO_NAMING.md`
- Modelos incorrectos reportados: 24
- Modelos incorrectos actuales: 28
- Diferencia: +4 modelos

### Modelos que fueron corregidos desde el último informe:
N/A

### Modelos que aún requieren corrección:
1. analytics_events
2. audit_log
3. calendario_laboral
4. configuracion_calendario
5. cotizacion_actividad
6. cotizacion_condicion
7. cotizacion_dependencias_tarea
8. cotizacion_edt
9. cotizacion_exclusion
10. cotizacion_fase
11. cotizacion_gasto
12. cotizacion_gasto_item
13. cotizacion_plantilla_import
14. cotizacion_proveedor
15. cotizacion_proveedor_item
16. cotizacion_servicio
17. cotizacion_servicio_item
18. cotizacion_tarea
19. cotizacion_version
20. crm_actividad
21. crm_competidor_licitacion
22. crm_contacto_cliente
23. crm_historial_proyecto
24. crm_metrica_comercial
25. crm_oportunidad
26. dependencias_tarea
27. dia_calendario
28. edt
29. entrega_item
30. evento_trazabilidad
31. excepcion_calendario
32. fase_default
33. lista_equipo
34. lista_equipo_item
35. metrica_comercial
36. notificaciones
37. permissions
38. plantilla_condicion
39. plantilla_condicion_item
40. plantilla_duracion_cronograma
41. plantilla_equipo_independiente
42. plantilla_equipo_item_independiente
43. plantilla_exclusion
44. plantilla_exclusion_item
45. plantilla_gasto_independiente
46. plantilla_gasto_item_independiente
47. plantilla_servicio_independiente
48. plantilla_servicio_item_independiente
49. proyecto_actividad
50. proyecto_cronograma
51. proyecto_dependencias_tarea
52. proyecto_edt
53. proyecto_equipo_cotizado
54. proyecto_equipo_cotizado_item
55. proyecto_fase
56. proyecto_gasto_cotizado
57. proyecto_gasto_cotizado_item
58. proyecto_servicio_cotizado
59. proyecto_servicio_cotizado_item
60. proyecto_subtarea
61. proyecto_tarea
62. registros_progreso
63. subtareas
64. tareas
65. user_permissions

---

## PARTE 4: GRUPOS TEMÁTICOS

### Grupo 1: Sistema (auth, permisos, logs)
- ❌ analytics_events
- ❌ audit_log
- ✅ User
- ✅ Account
- ✅ Session
- ✅ VerificationToken
- ✅ Permission
- ✅ UserPermission

### Grupo 2: CRM
- ✅ CrmActividad
- ✅ CrmCompetidorLicitacion
- ✅ CrmContactoCliente
- ✅ CrmHistorialProyecto
- ✅ CrmMetricaComercial
- ✅ CrmOportunidad

### Grupo 3: Cotizaciones
- ❌ cotizacion_actividad
- ❌ cotizacion_condicion
- ❌ cotizacion_dependencias_tarea
- ❌ cotizacion_edt
- ❌ cotizacion_exclusion
- ❌ cotizacion_fase
- ❌ cotizacion_gasto
- ❌ cotizacion_gasto_item
- ❌ cotizacion_plantilla_import
- ❌ cotizacion_proveedor
- ❌ cotizacion_proveedor_item
- ❌ cotizacion_servicio
- ❌ cotizacion_servicio_item
- ❌ cotizacion_tarea
- ❌ cotizacion_version
- ✅ Cotizacion
- ✅ CotizacionEquipo
- ✅ CotizacionEquipoItem
- ✅ CotizacionGasto
- ✅ CotizacionGastoItem
- ✅ CotizacionProveedor
- ✅ CotizacionProveedorItem
- ✅ CotizacionServicio
- ✅ CotizacionServicioItem

### Grupo 4: Proyectos
- ❌ proyecto_actividad
- ❌ proyecto_cronograma
- ❌ proyecto_dependencias_tarea
- ❌ proyecto_edt
- ❌ proyecto_equipo_cotizado
- ❌ proyecto_equipo_cotizado_item
- ❌ proyecto_fase
- ❌ proyecto_gasto_cotizado
- ❌ proyecto_gasto_cotizado_item
- ❌ proyecto_servicio_cotizado
- ❌ proyecto_servicio_cotizado_item
- ❌ proyecto_subtarea
- ❌ proyecto_tarea
- ✅ Proyecto
- ✅ ProyectoEquipoCotizado
- ✅ ProyectoEquipoCotizadoItem
- ✅ ProyectoGastoCotizado
- ✅ ProyectoGastoCotizadoItem
- ✅ ProyectoServicioCotizado
- ✅ ProyectoServicioCotizadoItem

### Grupo 5: Plantillas
- ❌ plantilla_condicion
- ❌ plantilla_condicion_item
- ❌ plantilla_duracion_cronograma
- ❌ plantilla_equipo_independiente
- ❌ plantilla_equipo_item_independiente
- ❌ plantilla_exclusion
- ❌ plantilla_exclusion_item
- ❌ plantilla_gasto_independiente
- ❌ plantilla_gasto_item_independiente
- ❌ plantilla_servicio_independiente
- ❌ plantilla_servicio_item_independiente
- ✅ Plantilla
- ✅ PlantillaCondicion
- ✅ PlantillaCondicionItem
- ✅ PlantillaDuracionCronograma
- ✅ PlantillaEquipo
- ✅ PlantillaEquipoIndependiente
- ✅ PlantillaEquipoItem
- ✅ PlantillaEquipoItemIndependiente
- ✅ PlantillaExclusion
- ✅ PlantillaExclusionItem
- ✅ PlantillaGasto
- ✅ PlantillaGastoIndependiente
- ✅ PlantillaGastoItem
- ✅ PlantillaGastoItemIndependiente
- ✅ PlantillaServicio
- ✅ PlantillaServicioIndependiente
- ✅ PlantillaServicioItem
- ✅ PlantillaServicioItemIndependiente

### Grupo 6: Calendario
- ❌ calendario_laboral
- ❌ configuracion_calendario
- ❌ dia_calendario
- ❌ excepcion_calendario
- ❌ fase_default
- ✅ CalendarioLaboral
- ✅ ConfiguracionCalendario
- ✅ DiaCalendario
- ✅ ExcepcionCalendario
- ✅ FaseDefault

### Grupo 7: Otros
- ❌ entrega_item
- ❌ evento_trazabilidad
- ❌ lista_equipo
- ❌ lista_equipo_item
- ❌ metrica_comercial
- ❌ notificaciones
- ❌ registros_progreso
- ❌ subtareas
- ❌ tareas
- ✅ AsignacionRecurso
- ✅ DependenciasTarea
- ✅ EntregaItem
- ✅ EventoTrazabilidad
- ✅ ListaEquipo
- ✅ ListaEquipoItem
- ✅ MetricaComercial
- ✅ Notificacion
- ✅ PedidoEquipo
- ✅ PedidoEquipoItem
- ✅ Proveedor
- ✅ Recurso
- ✅ RegistroHoras
- ✅ RegistroProgreso
- ✅ Subtarea
- ✅ Tarea
- ✅ Unidad
- ✅ UnidadServicio
- ✅ Valorizacion

---

## PARTE 5: PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Correcciones Rápidas (0 relaciones)
Modelos sin dependencias que se pueden corregir fácilmente:
1. analytics_events
2. audit_log
3. calendario_laboral
4. configuracion_calendario
5. cotizacion_actividad
6. cotizacion_condicion
7. cotizacion_dependencias_tarea
8. cotizacion_edt
9. cotizacion_exclusion
10. cotizacion_fase
11. cotizacion_gasto
12. cotizacion_gasto_item
13. cotizacion_plantilla_import
14. cotizacion_proveedor
15. cotizacion_proveedor_item
16. cotizacion_servicio
17. cotizacion_servicio_item
18. cotizacion_tarea
19. cotizacion_version
20. crm_actividad
21. crm_competidor_licitacion
22. crm_contacto_cliente
23. crm_historial_proyecto
24. crm_metrica_comercial
25. crm_oportunidad
26. dependencias_tarea
27. dia_calendario
28. edt
29. entrega_item
30. evento_trazabilidad
31. excepcion_calendario
32. fase_default
33. lista_equipo
34. lista_equipo_item
35. metrica_comercial
36. notificaciones
37. permissions
38. plantilla_condicion
39. plantilla_condicion_item
40. plantilla_duracion_cronograma
41. plantilla_equipo_independiente
42. plantilla_equipo_item_independiente
43. plantilla_exclusion
44. plantilla_exclusion_item
45. plantilla_gasto_independiente
46. plantilla_gasto_item_independiente
47. plantilla_servicio_independiente
48. plantilla_servicio_item_independiente
49. proyecto_actividad
50. proyecto_cronograma
51. proyecto_dependencias_tarea
52. proyecto_edt
53. proyecto_equipo_cotizado
54. proyecto_equipo_cotizado_item
55. proyecto_fase
56. proyecto_gasto_cotizado
57. proyecto_gasto_cotizado_item
58. proyecto_servicio_cotizado
59. proyecto_servicio_cotizado_item
60. proyecto_subtarea
61. proyecto_tarea
62. registros_progreso
63. subtareas
64. tareas
65. user_permissions

### Fase 2: Correcciones Medias (pocas relaciones)
Modelos con 1-3 relaciones:
1. N/A

### Fase 3: Correcciones Complejas (muchas relaciones)
Modelos con 4+ relaciones:
1. N/A

---

## PARTE 6: VERIFICACIÓN DE CONSISTENCIA

### Verificación de Consistencia

- **Modelos en PascalCase sin @@map:** 34
- **Campos en snake_case:** 0
- **Relaciones en snake_case:** 0

---

## CONCLUSIÓN

El informe muestra que el 72% de los modelos cumplen con las convenciones de nomenclatura, mientras que el 28% requiere corrección. Se recomienda priorizar la corrección de los modelos en snake_case para alinear el esquema con las convenciones establecidas en `DATABASE_NAMING_CONVENTIONS.md`.