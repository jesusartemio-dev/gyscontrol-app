# Procedimiento de Implementación - Cronograma Comercial
## Sistema GYS - Opción A

**Versión:** 1.0
**Fecha:** 2025-09-16
**Responsable:** Equipo de Desarrollo GYS
**Duración Estimada:** 8 semanas

---

## 📋 **RESUMEN EJECUTIVO**

Este documento detalla el procedimiento paso a paso para implementar el sistema de cronograma comercial en las cotizaciones del sistema GYS. La implementación sigue una arquitectura modular que permite capturar fechas y horas estimadas durante la fase comercial, creando un snapshot auditable que se mapea automáticamente a `ProyectoEdt` al convertir cotizaciones en proyectos.

### 🎯 **Objetivos**
- ✅ Implementar entidades `CotizacionEdt` y `CotizacionTarea`
- ✅ Crear APIs REST para gestión completa del cronograma
- ✅ Desarrollar interfaz de usuario integrada en cotizaciones
- ✅ Automatizar mapeo comercial → proyecto
- ✅ Garantizar trazabilidad completa y auditoría

### 📊 **Alcance Técnico**
- **Nuevos Modelos:** 2 entidades Prisma + relaciones
- **APIs:** 8 endpoints REST
- **Componentes UI:** 10+ componentes React
- **Servicios:** Lógica de negocio completa
- **Testing:** Cobertura 85% mínimo

---

## 🏗️ **FASES DE IMPLEMENTACIÓN**

### **FASE 1: PREPARACIÓN DE BASE DE DATOS Y MODELOS**
**Duración:** 2-3 días
**Responsable:** Backend Developer
**Dependencias:** Ninguna

#### 🎯 **Objetivos**
Configurar la estructura de datos base para el sistema de cronograma comercial.

#### 📋 **Checklist de Actividades**

##### 1.1 Actualización del Schema Prisma
- [ ] Crear modelo `CotizacionEdt` con campos requeridos
- [ ] Crear modelo `CotizacionTarea` con relaciones
- [ ] Actualizar modelo `Cotizacion` (agregar relación `cronograma`)
- [ ] Actualizar modelo `User` (agregar relación `cotizacionEdtsResponsable`)
- [ ] Definir índices y constraints de rendimiento
- [ ] Validar integridad referencial

##### 1.2 Migración de Base de Datos
- [ ] Generar migración con `npx prisma migrate dev --name add-cotizacion-cronograma`
- [ ] Crear script de rollback automático
- [ ] Ejecutar migración en entorno de desarrollo
- [ ] Validar estructura en base de datos staging
- [ ] Preparar deployment para producción

##### 1.3 Actualización de Types y Validadores
- [ ] Actualizar `src/types/modelos.ts` con nuevas interfaces
- [ ] Actualizar `src/types/payloads.ts` con DTOs
- [ ] Regenerar cliente Prisma (`npx prisma generate`)
- [ ] Crear validadores Zod en `src/lib/validators/cronograma.ts`
- [ ] Validar tipado TypeScript completo

#### ✅ **Criterios de Éxito**
- [ ] Migración ejecutada sin errores en desarrollo
- [ ] Todas las interfaces TypeScript compilando
- [ ] Validadores Zod funcionando correctamente
- [ ] Base de datos con estructura correcta

#### 📦 **Deliverables**
- Schema Prisma actualizado
- Tipos TypeScript completos
- Validadores implementados
- Migración lista para deployment

---

### **FASE 2: DESARROLLO DE APIs BACKEND**
**Duración:** 3-4 días
**Responsable:** Backend Developer
**Dependencias:** Fase 1 completada

#### 🎯 **Objetivos**
Implementar la capa de APIs REST para gestión completa del cronograma comercial.

#### 📋 **Checklist de Actividades**

##### 2.1 APIs de CotizacionEdt
- [ ] `GET /api/cotizacion/[id]/cronograma` - Obtener cronograma completo
- [ ] `POST /api/cotizacion/[id]/cronograma` - Crear nuevo EDT comercial
- [ ] `PUT /api/cotizacion/[id]/cronograma/[edtId]` - Actualizar EDT existente
- [ ] `DELETE /api/cotizacion/[id]/cronograma/[edtId]` - Eliminar EDT

##### 2.2 APIs de CotizacionTarea
- [ ] `GET /api/cotizacion/cronograma/[edtId]/tareas` - Listar tareas de EDT
- [ ] `POST /api/cotizacion/cronograma/[edtId]/tareas` - Crear nueva tarea
- [ ] `PUT /api/cotizacion/cronograma/tarea/[tareaId]` - Actualizar tarea
- [ ] `DELETE /api/cotizacion/cronograma/tarea/[tareaId]` - Eliminar tarea

##### 2.3 Servicios de Negocio
- [ ] `src/lib/services/cotizacionCronograma.ts` - Servicio principal
- [ ] Validaciones con Zod integradas
- [ ] Manejo de errores y logging completo
- [ ] Transacciones de base de datos

##### 2.4 Actualización del Proceso de Conversión
- [ ] Modificar `/api/proyecto/from-cotizacion/route.ts`
- [ ] Implementar mapeo `CotizacionEdt` → `ProyectoEdt`
- [ ] Preservar snapshot comercial inmutable
- [ ] Crear registros de progreso iniciales

#### ✅ **Criterios de Éxito**
- [ ] Todas las APIs respondiendo correctamente (200/201/400/404/500)
- [ ] Validaciones funcionando en todos los endpoints
- [ ] Logs de auditoría generándose
- [ ] Conversión proyecto incluyendo cronograma

#### 📦 **Deliverables**
- 8 endpoints API funcionales
- Servicio de negocio completo
- API de conversión actualizada
- Documentación de APIs generada

---

### **FASE 3: COMPONENTES UI BASE**
**Duración:** 4-5 días
**Responsable:** Frontend Developer
**Dependencias:** Fase 2 completada

#### 🎯 **Objetivos**
Desarrollar los componentes de interfaz de usuario para gestión del cronograma comercial.

#### 📋 **Checklist de Actividades**

##### 3.1 Componentes de Cronograma
- [ ] `CronogramaComercialTab.tsx` - Componente principal del tab
- [ ] `CotizacionEdtList.tsx` - Lista de EDTs con filtros
- [ ] `CotizacionEdtForm.tsx` - Formulario creación/edición EDT
- [ ] `CotizacionTareaList.tsx` - Lista de tareas por EDT
- [ ] `CotizacionTareaForm.tsx` - Formulario tareas

##### 3.2 Componentes de Vista
- [ ] `CronogramaGanttView.tsx` - Vista Gantt simplificada
- [ ] `CronogramaListView.tsx` - Vista de lista detallada
- [ ] `CronogramaMetrics.tsx` - Métricas y KPIs del cronograma
- [ ] `CronogramaFilters.tsx` - Filtros y búsqueda avanzada

##### 3.3 Componentes de Interacción
- [ ] `EdtAccordion.tsx` - Acordeón para EDTs
- [ ] `TareaCard.tsx` - Tarjeta individual de tarea
- [ ] `DependenciaSelector.tsx` - Selector de dependencias entre tareas
- [ ] `ResponsableSelector.tsx` - Selector de usuarios responsables

##### 3.4 Componentes de Feedback
- [ ] Skeleton loaders para estados de carga
- [ ] Animaciones con Framer Motion
- [ ] Toast notifications para acciones
- [ ] Validaciones en tiempo real

#### ✅ **Criterios de Éxito**
- [ ] Todos los componentes renderizando correctamente
- [ ] Formularios con validación completa
- [ ] Estados de carga y error manejados
- [ ] Responsive design funcionando en móvil/tablet

#### 📦 **Deliverables**
- 15+ componentes React funcionales
- Formularios con validación completa
- Estados de UI consistentes
- Diseño responsive implementado

---

### **FASE 4: INTEGRACIÓN EN PÁGINA DE DETALLE**
**Duración:** 2-3 días
**Responsable:** Frontend Developer
**Dependencias:** Fase 3 completada

#### 🎯 **Objetivos**
Integrar completamente el tab de cronograma en la página de detalle de cotizaciones.

#### 📋 **Checklist de Actividades**

##### 4.1 Modificación de la Página Principal
- [ ] Actualizar `src/app/comercial/cotizaciones/[id]/page.tsx`
- [ ] Agregar tab "Cronograma" después de "Gastos"
- [ ] Implementar navegación por tabs
- [ ] Mantener estado de cotización sincronizado

##### 4.2 Integración del Tab Cronograma
- [ ] Cargar datos de cronograma al abrir tab
- [ ] Implementar CRUD completo desde UI
- [ ] Sincronizar cambios con estado global
- [ ] Validaciones en tiempo real integradas

##### 4.3 Mejora del Modal de Conversión
- [ ] Actualizar `CrearProyectoDesdeCotizacionModal.tsx`
- [ ] Agregar sección "Cronograma Comercial"
- [ ] Mostrar resumen de EDTs antes de conversión
- [ ] Permitir ajustes de fechas si necesario

##### 4.4 Responsive Design y UX
- [ ] Adaptar para móviles y tablets
- [ ] Optimizar rendimiento de componentes
- [ ] Implementar lazy loading
- [ ] Mejorar accesibilidad (ARIA labels, navegación por teclado)

#### ✅ **Criterios de Éxito**
- [ ] Tab cronograma integrado en navegación
- [ ] CRUD funcionando desde interfaz
- [ ] Modal de conversión mostrando cronograma
- [ ] Funcionalidad completa en dispositivos móviles

#### 📦 **Deliverables**
- Página de cotización con tab cronograma
- Modal de conversión mejorado
- Navegación fluida entre secciones
- UX optimizada para todos los dispositivos

---

### **FASE 5: TESTING Y VALIDACIÓN**
**Duración:** 3-4 días
**Responsable:** QA + Developers
**Dependencias:** Fases 1-4 completadas

#### 🎯 **Objetivos**
Validar completamente la funcionalidad del sistema de cronograma comercial.

#### 📋 **Checklist de Actividades**

##### 5.1 Tests Unitarios
- [ ] Tests de servicios backend (85% cobertura)
- [ ] Tests de componentes React
- [ ] Tests de hooks personalizados
- [ ] Tests de utilidades y helpers

##### 5.2 Tests de Integración
- [ ] Tests de APIs completas
- [ ] Tests de flujo conversión cotización → proyecto
- [ ] Tests de UI end-to-end con Playwright
- [ ] Validación de datos en base de datos

##### 5.3 Tests de Performance
- [ ] Carga de cronogramas grandes (100+ EDTs)
- [ ] Rendimiento de componentes React
- [ ] Optimización de queries de base de datos
- [ ] Métricas de UX (Core Web Vitals)

##### 5.4 Tests de Seguridad y Autorización
- [ ] Validación de permisos por rol
- [ ] Tests de acceso no autorizado
- [ ] Validación de datos de entrada
- [ ] Tests de inyección SQL/XSS

##### 5.5 Validación Funcional Completa
- [ ] Flujo completo: Crear EDT → Agregar tareas → Convertir proyecto
- [ ] Validaciones de negocio
- [ ] Manejo de errores edge cases
- [ ] Compatibilidad con datos existentes

#### ✅ **Criterios de Éxito**
- [ ] Cobertura de tests > 85%
- [ ] Todos los tests pasando en CI/CD
- [ ] Performance aceptable (< 2s carga)
- [ ] Flujo funcional completo validado

#### 📦 **Deliverables**
- Suite completa de tests
- Reportes de cobertura
- Documentación de casos de prueba
- Validación funcional completa

---

### **FASE 6: DOCUMENTACIÓN Y PREPARACIÓN**
**Duración:** 1-2 días
**Responsable:** Tech Lead
**Dependencias:** Fase 5 completada

#### 🎯 **Objetivos**
Documentar completamente el sistema implementado y preparar para deployment.

#### 📋 **Checklist de Actividades**

##### 6.1 Documentación Técnica
- [ ] Actualizar README del proyecto
- [ ] Documentar nuevas APIs en API_DOCUMENTATION.md
- [ ] Crear guías de uso de componentes
- [ ] Documentar modelos de datos y relaciones

##### 6.2 Documentación de Usuario
- [ ] Manual de uso del cronograma comercial
- [ ] Guía paso a paso para comerciales
- [ ] FAQ y troubleshooting
- [ ] Videos tutoriales (opcional)

##### 6.3 Preparación de Deployment
- [ ] Scripts de migración listos
- [ ] Variables de entorno configuradas
- [ ] Checklist de deployment preparado
- [ ] Plan de rollback validado

##### 6.4 Capacitación del Equipo
- [ ] Sesión de capacitación para comerciales
- [ ] Documentación para soporte técnico
- [ ] Guías de mantenimiento
- [ ] Contactos de responsables

#### ✅ **Criterios de Éxito**
- [ ] Documentación completa y actualizada
- [ ] Equipo capacitado en nueva funcionalidad
- [ ] Scripts de deployment listos
- [ ] Checklist de go-live completo

#### 📦 **Deliverables**
- Documentación técnica completa
- Manuales de usuario
- Scripts de deployment
- Plan de capacitación

---

### **FASE 7: DEPLOYMENT Y MONITOREO**
**Duración:** 1-2 días
**Responsable:** DevOps + Tech Lead
**Dependencias:** Todas las fases anteriores completadas

#### 🎯 **Objetivos**
Desplegar el sistema en producción y monitorear su funcionamiento inicial.

#### 📋 **Checklist de Actividades**

##### 7.1 Pre-Deployment
- [ ] Backup completo de base de datos producción
- [ ] Validar tests en staging
- [ ] Revisar logs de staging
- [ ] Confirmar recursos de servidor
- [ ] Notificar stakeholders

##### 7.2 Deployment
- [ ] Ejecutar migraciones en producción
- [ ] Desplegar código de aplicación
- [ ] Verificar integridad de datos
- [ ] Ejecutar smoke tests automatizados

##### 7.3 Post-Deployment
- [ ] Monitorear logs por 2 horas
- [ ] Verificar funcionalidades críticas
- [ ] Validar métricas de negocio
- [ ] Comunicar éxito a stakeholders

##### 7.4 Monitoreo Continuo
- [ ] Configurar alertas de error
- [ ] Monitorear performance
- [ ] Seguimiento de uso por usuarios
- [ ] Plan de soporte post-lanzamiento

#### ✅ **Criterios de Éxito**
- [ ] Deployment exitoso sin downtime
- [ ] Funcionalidades críticas operativas
- [ ] Usuarios pueden crear cronogramas
- [ ] Métricas de error en rangos normales

#### 📦 **Deliverables**
- Sistema en producción operativo
- Reporte de deployment
- Métricas iniciales de uso
- Plan de monitoreo continuo

---

## 📊 **MÉTRICAS DE ÉXITO**

### **Funcionales**
- ✅ **Adopción**: >80% de cotizaciones con cronograma comercial
- ✅ **Precisión**: <20% desviación promedio comercial vs plan
- ✅ **Conversión**: 100% de proyectos creados incluyen cronograma mapeado

### **Técnicas**
- ✅ **Performance**: <2s tiempo de carga de cronogramas
- ✅ **Disponibilidad**: >99.5% uptime del sistema
- ✅ **Testing**: >85% cobertura de código

### **Usuario**
- ✅ **Satisfacción**: >4.5/5 en encuestas de usuario
- ✅ **Usabilidad**: <5% de tickets de soporte relacionados
- ✅ **Productividad**: Reducción de tiempo en planificación

---

## 🚨 **PLAN DE CONTINGENCIA**

### **Riesgos Identificados**
1. **Migración fallida**: Rollback automático disponible
2. **Performance degradada**: Optimizaciones identificadas
3. **Resistencia al cambio**: Plan de capacitación completo
4. **Datos incorrectos**: Validaciones estrictas implementadas

### **Escalada de Problemas**
- **Bajo**: Resolver en 24h con equipo actual
- **Medio**: Escalada a Tech Lead (48h)
- **Alto**: Rollback completo (72h máximo)

---

## 📞 **CONTACTOS Y RESPONSABLES**

| Rol | Nombre | Contacto |
|-----|--------|----------|
| Tech Lead | [Nombre] | [Email] |
| Backend Dev | [Nombre] | [Email] |
| Frontend Dev | [Nombre] | [Email] |
| QA | [Nombre] | [Email] |
| Product Owner | [Nombre] | [Email] |

---

## 📋 **CHECKLIST FINAL DE GO-LIVE**

### **Pre-Launch**
- [ ] Todas las fases completadas
- [ ] Tests pasando en CI/CD
- [ ] Documentación actualizada
- [ ] Equipo capacitado
- [ ] Stakeholders informados

### **Launch Day**
- [ ] Backup de base de datos
- [ ] Deployment ejecutado
- [ ] Smoke tests pasados
- [ ] Usuarios notificados

### **Post-Launch**
- [ ] Monitoreo 24/7 primera semana
- [ ] Soporte disponible
- [ ] Métricas recolectadas
- [ ] Retroalimentación recopilada

---

**🎯 Este procedimiento garantiza una implementación controlada, traceable y exitosa del sistema de cronograma comercial en GYS.**