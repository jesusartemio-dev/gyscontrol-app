# 📚 GUÍA DE FORMACIÓN: Sistema de Horas Hombre y Gestión de Tareas

## 🎯 Objetivo
Esta guía proporciona formación completa para el uso del sistema de horas hombre y gestión de tareas, adaptada por roles de usuario.

---

## 👥 ROLES Y RESPONSABILIDADES

### 1. **GESTOR DE PROYECTO** 👔
**Responsabilidades principales:**
- Supervisar el progreso general del proyecto
- Gestionar asignación de responsables
- Aprobar horas y revisar reportes
- Tomar decisiones sobre ajustes al cronograma

**Funcionalidades clave:**
- ✅ Dashboard de proyecto con métricas generales
- ✅ Vista completa del cronograma (6 niveles)
- ✅ Reportes de productividad por equipo
- ✅ Aprobación de registros de horas
- ✅ Gestión de asignaciones de personal

### 2. **COORDINADOR TÉCNICO** 🔧
**Responsabilidades principales:**
- Gestionar EDTs y zonas específicas
- Asignar tareas a técnicos
- Supervisar progreso técnico
- Reportar avances al gestor

**Funcionalidades clave:**
- ✅ Gestión de EDTs asignados
- ✅ Creación y asignación de tareas
- ✅ Seguimiento de progreso por zona
- ✅ Registro de horas técnicas
- ✅ Timesheet semanal

### 3. **TÉCNICO ESPECIALISTA** ⚙️
**Responsabilidades principales:**
- Ejecutar tareas asignadas
- Registrar horas trabajadas
- Reportar progreso real
- Comunicar impedimentos

**Funcionalidades clave:**
- ✅ Dashboard personal de tareas
- ✅ Registro flexible de horas
- ✅ Timesheet semanal intuitivo
- ✅ Actualización de progreso
- ✅ Comunicación con coordinadores

---

## 📋 MANUAL DE USUARIO POR ROL

### **GESTOR DE PROYECTO** 👔

#### **1. Acceso al Sistema**
```
URL: /horas-hombre/dashboard
Menú: Proyectos → [Proyecto] → Cronograma → Tareas
```

#### **2. Dashboard Principal**
- **Métricas generales:** Progreso total, horas registradas vs planificadas
- **Alertas críticas:** Proyectos atrasados, miembros con bajo rendimiento
- **Vista rápida:** Estado de EDTs, zonas y actividades principales

#### **3. Gestión del Cronograma**
```
Proyecto → Cronograma → Tareas
```
- **Selector de vista:** Automática (simplificada) vs Completa (técnica)
- **Jerarquía completa:** Proyecto → Fases → EDTs → Zonas → Actividades → Tareas
- **Asignación de responsables:** Click derecho en cualquier elemento
- **Registro de horas:** Desde cualquier nivel de la jerarquía

#### **4. Reportes de Productividad**
```
Reportes → Productividad
```
- **Análisis por proyecto:** Eficiencia, horas, miembros activos
- **Análisis por miembro:** Rendimiento individual, cumplimiento
- **Tendencias:** Evolución semanal/mensual
- **Alertas:** Miembros con rendimiento < 75%

#### **5. Aprobación de Horas**
- **Timesheets pendientes:** Revisar y aprobar registros
- **Políticas de aprobación:** Máximo 12h/día, justificación requerida
- **Correcciones:** Solicitar ajustes cuando sea necesario

---

### **COORDINADOR TÉCNICO** 🔧

#### **1. Gestión de EDTs**
```
Proyecto → Cronograma → EDTs
```
- **EDTs asignados:** Lista de EDTs bajo su responsabilidad
- **Creación de zonas:** Dentro de cada EDT
- **Asignación de actividades:** Directas al EDT o dentro de zonas

#### **2. Creación y Asignación de Tareas**
```
EDT → Zona → Actividades → Tareas
```
- **Nueva tarea:** Botón "Crear Tarea" en cualquier actividad
- **Asignación:** Seleccionar responsable de la lista
- **Estimación:** Horas planificadas y fecha límite
- **Dependencias:** Vincular con otras tareas si es necesario

#### **3. Seguimiento de Progreso**
- **Vista por zona:** Progreso de cada zona asignada
- **Alertas:** Tareas atrasadas, miembros sin reportar horas
- **Reasignaciones:** Cambiar responsables según necesidad

#### **4. Timesheet Semanal**
```
Horas Hombre → Timesheet
```
- **Vista semanal:** Calendario con horas registradas
- **Registro rápido:** Desde la vista de tareas
- **Aprobación automática:** Para coordinadores (opcional)

---

### **TÉCNICO ESPECIALISTA** ⚙️

#### **1. Dashboard Personal**
```
Tareas → Asignadas
```
- **Tareas activas:** Lista con prioridad y fecha límite
- **Métricas personales:** Horas trabajadas, eficiencia
- **Próximas tareas:** Vista de lo que viene

#### **2. Registro de Horas**
**Método 1: Desde Timesheet**
```
Horas Hombre → Timesheet
```
- **Calendario semanal:** Click en día para registrar
- **Búsqueda inteligente:** Encontrar tareas por nombre/código
- **Registro múltiple:** Mismo día, diferentes tareas

**Método 2: Desde Tareas**
```
Tarea → "Registrar Horas"
```
- **Registro directo:** Sin salir de la vista de tareas
- **Actualización automática:** Progreso se calcula solo

#### **3. Actualización de Progreso**
- **Marcar completada:** Cuando termine una tarea
- **Actualización parcial:** Porcentaje de avance
- **Comentarios:** Explicar retrasos o problemas

#### **4. Comunicación**
- **Reportes de impedimentos:** A través de comentarios
- **Solicitudes de ayuda:** Mencionar en registros de horas
- **Coordinación:** Ver tareas de compañeros en el mismo EDT

---

## 🔧 PROCEDIMIENTOS OPERATIVOS

### **Registro de Horas - Flujo Estándar**

#### **Diario (Recomendado)**
1. **Acceder al timesheet:** `/horas-hombre/timesheet`
2. **Seleccionar día:** Click en la fecha correspondiente
3. **Buscar tarea:** Usar búsqueda inteligente
4. **Registrar horas:** Ingresar tiempo y descripción
5. **Guardar:** Automáticamente actualiza progreso

#### **Semanal (Mínimo)**
1. **Revisar semana completa**
2. **Registrar todos los días trabajados**
3. **Verificar totales:** Máximo 48h/semana
4. **Enviar para aprobación** (si aplica)

### **Aprobación de Horas - Gestores**

#### **Revisión Diaria**
1. **Acceder a timesheets pendientes**
2. **Verificar políticas:**
   - Máximo 12h/día
   - Descripción detallada
   - Proyecto correcto
3. **Aprobar o rechazar** con comentarios
4. **Notificación automática** al técnico

#### **Reportes de Incumplimiento**
- **Ausencia de registros:** Alertas automáticas
- **Horas excesivas:** Revisión especial
- **Inconsistencias:** Verificación cruzada

---

## 📊 REPORTES Y ANALYTICS

### **Para Gestores**
- **Dashboard ejecutivo:** Progreso general, alertas críticas
- **Reporte de productividad:** Eficiencia por proyecto/miembro
- **Tendencias:** Evolución mensual de métricas
- **Análisis de cuello de botella:** Zonas con bajo rendimiento

### **Para Coordinadores**
- **Progreso por EDT:** Avance técnico detallado
- **Rendimiento del equipo:** Por zona asignada
- **Cumplimiento de plazos:** Tareas atrasadas
- **Distribución de carga:** Balance de trabajo

### **Para Técnicos**
- **Rendimiento personal:** Comparación con objetivos
- **Historial de tareas:** Completadas vs asignadas
- **Eficiencia por tipo:** Diferentes categorías de trabajo
- **Progreso semanal:** Tendencias personales

---

## 🚨 GESTIÓN DE INCIDENTES

### **Problemas Comunes**

#### **1. Horas no registradas**
**Síntoma:** Progreso no se actualiza
**Solución:**
- Verificar que la tarea esté correctamente asignada
- Revisar permisos de acceso
- Contactar al coordinador para reasignación

#### **2. Tareas duplicadas**
**Síntoma:** Múltiples tareas para el mismo trabajo
**Solución:**
- Coordinar con el responsable del EDT
- Consolidar tareas similares
- Actualizar descripciones para claridad

#### **3. Conflictos de asignación**
**Síntoma:** Múltiples responsables para una tarea
**Solución:**
- El gestor decide el responsable principal
- Coordinadores ajustan asignaciones
- Comunicación clara de responsabilidades

#### **4. Progreso inconsistente**
**Síntoma:** Números no coinciden entre vistas
**Solución:**
- Recalcular progreso desde el EDT
- Verificar registros de horas
- Revisar jerarquía de dependencias

---

## 📞 SOPORTE Y CONTACTOS

### **Soporte Técnico**
- **Email:** soporte@gyscontrol.com
- **Chat interno:** Canal #soporte-horas-hombre
- **Teléfono:** Ext. 1234

### **Coordinadores por Área**
- **Eléctrica:** Juan Pérez (jperez@gyscontrol.com)
- **Mecánica:** María García (mgarcia@gyscontrol.com)
- **Civil:** Carlos López (clopez@gyscontrol.com)

### **Documentación Adicional**
- **Manual completo:** `/docs/GYS_PROCEDIMIENTO_IMPLEMENTACION_HORAS_HOMBRE.md`
- **Videos tutoriales:** Portal de capacitación
- **Preguntas frecuentes:** Base de conocimientos

---

## ✅ CHECKLIST DE ADOPCIÓN

### **Para Nuevos Usuarios**
- [ ] ✅ Leer esta guía completa
- [ ] ✅ Completar tutorial interactivo
- [ ] ✅ Configurar preferencias personales
- [ ] ✅ Registrar primera semana de horas
- [ ] ✅ Recibir aprobación del gestor

### **Para Gestores**
- [ ] ✅ Revisar configuración de EDTs y responsables
- [ ] ✅ Establecer políticas de aprobación
- [ ] ✅ Configurar alertas y reportes
- [ ] ✅ Capacitar al equipo asignado
- [ ] ✅ Monitorear adopción durante primer mes

### **Para Coordinadores**
- [ ] ✅ Verificar asignaciones de EDTs
- [ ] ✅ Crear estructura de zonas y actividades
- [ ] ✅ Asignar tareas iniciales
- [ ] ✅ Establecer comunicación con técnicos
- [ ] ✅ Configurar seguimiento semanal

---

## 🎯 METAS DE ADOPCIÓN

### **Semana 1-2: Configuración**
- ✅ 100% de EDTs con responsables asignados
- ✅ 100% de tareas iniciales creadas
- ✅ 80% de usuarios capacitados

### **Mes 1: Adopción**
- ✅ 90% de registros diarios de horas
- ✅ 95% de aprobaciones en < 24h
- ✅ 85% de progreso actualizado automáticamente

### **Mes 2: Optimización**
- ✅ 95% de registros cumpliendo políticas
- ✅ < 5% de correcciones requeridas
- ✅ Reportes utilizados activamente

### **Mantenimiento Continuo**
- ✅ Revisiones mensuales de configuración
- ✅ Actualizaciones según feedback
- ✅ Capacitación para nuevos miembros

---

*Esta guía se actualiza automáticamente con cada mejora del sistema. Última actualización: 2025-01-15*