# 📘 **GUÍA COMPLETA DE USUARIO: SISTEMA HORAS-HOMBRE**

## 🎯 **DESCRIPCIÓN GENERAL**

El **Sistema de Horas-Hombre** es una plataforma integral para la gestión de tiempos y productividad, inspirada en Odoo y adaptada específicamente para nuestro sistema de cronogramas de 5 niveles. Proporciona registro de horas, análisis de productividad, reportes de equipo y gestión de tareas personales.

---

## 🚀 **ACCESO AL SISTEMA**

### **Accesos desde el Sidebar Principal**

#### **Sección "Horas Hombre"**
- **🕐 Mi Timesheet** - Vista semanal de registro de horas
- **📝 Registrar Horas** - Formulario de registro estructurado
- **📊 Análisis Transversal** - Dashboard de horas por EDT

#### **Sección "Mis Tareas"**
- **✅ Tareas Asignadas** - Dashboard personal de tareas
- **📈 Mi Progreso** - Seguimiento de productividad personal
- **👥 Equipo** - Vista de equipo y coordinación

### **Integración en Proyectos**
- **Tab "Tareas"** en cronograma de proyecto
- **Vista jerárquica** Fases → EDTs → Actividades → Tareas
- **Asignación de responsables** en tiempo real

---

## 🕐 **MI TIMESHEET - REGISTRO SEMANAL**

### **¿Qué es?**
Vista semanal interactiva tipo calendario donde puedes registrar, ver y gestionar tus horas trabajadas de forma intuitiva.

### **¿Cómo acceder?**
1. Haz clic en **"Horas Hombre"** en el sidebar
2. Selecciona **"Mi Timesheet"**

### **Funcionalidades Principales**

#### **📅 Vista Calendario Semanal**
```
🗓️ SEMANA DEL 13 AL 19 ENERO 2025

LUN 13 | MAR 14 | MIÉ 15 | JUE 16 | VIE 17 | SÁB 18 | DOM 19
8.0h   | 7.5h   | 6.0h  | 8.0h  | 2.5h  | 0.0h   | 0.0h
```

#### **📊 Resumen Semanal**
- **Total Horas:** 32h (vs objetivo 40h)
- **Promedio Diario:** 4.6h
- **Días Trabajados:** 5/7
- **Eficiencia:** 80%

#### **🔧 Proyectos de la Semana**
- **Proyecto ABC:** 20h (Centro de Datos)
- **Proyecto XYZ:** 12h (Oficinas Corporativas)

### **Navegación**
- **⬅️ Semana Anterior** - Ver semana pasada
- **➡️ Semana Siguiente** - Ver semana siguiente
- **📅 Hoy** - Regresar a semana actual
- **🔄 Actualizar** - Refrescar datos

---

## 📝 **REGISTRO DE HORAS ESTRUCTURADO**

### **¿Qué es?**
Wizard inteligente que guía el proceso de registro de horas, verificando automáticamente la jerarquía y validando datos.

### **¿Cómo acceder?**
1. Desde **"Horas Hombre"** → **"Registrar Horas"**
2. Desde el **calendario de timesheet** → **Clic en día**
3. Desde el **cronograma de proyecto** → **Clic en EDT/Tarea**

### **Flujo de Registro**

#### **Paso 1: Seleccionar Proyecto**
- Lista de proyectos activos
- Filtrado automático por acceso del usuario
- Información de cliente y fechas

#### **Paso 2: Seleccionar EDT**
- **PLC** - Programación y Lógica
- **HMI** - Interfaces de Usuario  
- **ING** - Ingeniería y Diseño
- Buscador inteligente por nombre

#### **Paso 3: Completar Información**
- **Horas Trabajadas:** (1-24 horas)
- **Fecha de Trabajo:** (calendario interactivo)
- **Descripción:** (obligatoria, 10+ caracteres)
- **Ubicación:** Oficina / Campo
- **Proyecto/Tarea:** (opcional para mayor precisión)

#### **Paso 4: Validación y Envío**
- Validación automática de datos
- Cálculo de costos en tiempo real
- Confirmación de registro
- Feedback visual de éxito/error

### **Validaciones Automáticas**
- ✅ Proyecto activo y accesible
- ✅ EDT válido para el proyecto
- ✅ Horas dentro del rango permitido
- ✅ Fecha no futura
- ✅ Descripción completa

---

## 📊 **ANÁLISIS TRANSVERSAL POR EDT**

### **¿Qué es?**
Dashboard avanzado que muestra horas trabajadas por EDT (PLC, HMI, ING) a través de múltiples proyectos, permitiendo análisis histórico y proyecciones para cotizaciones.

### **¿Cómo acceder?**
1. **"Horas Hombre"** → **"Análisis Transversal"**
2. URL directa: `/horas-hombre/analisis-transversal`

### **Funcionalidades Principales**

#### **🎯 Vista Unificada de EDTs**
```
📊 RESUMEN POR EDT (2025)

PLC | 250h reales | 300h plan | 83% | $6,250 | 📈 +5%
HMI | 180h reales | 200h plan | 90% | $4,500 | 📈 +8%  
ING | 95h reales  | 120h plan | 79% | $2,375 | 📈 -2%
```

#### **📈 Gráficos Interactivos**
- **Horas Planificadas vs Reales** (gráfico de barras)
- **Distribución por Proyectos** (gráfico de torta)
- **Tendencia Temporal** (línea de tiempo)
- **Eficiencia por EDT** (gráfico de velocímetro)

#### **🔍 Filtros Avanzados**
- **Período:** Última semana, mes, trimestre, año
- **Proyectos:** Seleccionar proyectos específicos
- **EDTs:** Filtrar por tipo de EDT
- **Rango de fechas:** Personalizado

#### **📊 Métricas Clave**
- **Total Horas Reales:** 525h
- **Total Horas Planificadas:** 620h
- **Eficiencia General:** 85%
- **Costo Total Real:** $13,125
- **Variación vs Plan:** -15h (-2.4%)

### **Análisis de Proyección para Cotizaciones**
- **Historical Data:** Proyectos anteriores por EDT
- **Proyección:** Estimación para nuevos proyectos
- **Precision Score:** Confiabilidad de la proyección
- **Cost Trends:** Evolución de costos por EDT

---

## ✅ **MIS TAREAS - GESTIÓN PERSONAL**

### **¿Qué es?**
Dashboard personal que centraliza todas las tareas asignadas, progreso de trabajo y métricas de productividad individual.

### **¿Cómo acceder?**
1. **"Mis Tareas"** en el sidebar
2. **Tareas Asignadas** - Vista principal
3. **Mi Progreso** - Métricas personales
4. **Equipo** - Vista de coordinación

### **TAREAS ASIGNADAS**

#### **📋 Vista de Lista**
```
🎯 TAREAS ASIGNADAS

🔴 ALTA PRIORIDAD
• Tarea 1.1.1 - Preparación cableado (Proyecto ABC)
  📅 Vence: 2025-01-20 | ⏱️ 8h estimadas | 📊 75% completada
  
• Actividad 2.3 - Instalación eléctrica (Proyecto XYZ)  
  📅 Vence: 2025-01-25 | ⏱️ 24h estimadas | 📊 45% completada

🟡 MEDIA PRIORIDAD
• EDT 3.1 - Configuración PLC (Proyecto DEF)
  📅 Vence: 2025-02-01 | ⏱️ 16h estimadas | 📊 20% completada
```

#### **📊 Resumen Personal**
- **Tareas Activas:** 12
- **Completadas esta semana:** 5
- **Próximas fechas límite:** 3
- **Horas estimadas pendientes:** 78h
- **Promedio de eficiencia:** 85%

#### **🎨 Estados Visuales**
- 🔴 **Rojo:** Alta prioridad, fecha cercana
- 🟡 **Amarillo:** Media prioridad
- 🟢 **Verde:** Baja prioridad, sin urgencia
- ⚪ **Gris:** Completada o cancelada

### **MI PROGRESO**

#### **📈 Métricas de Productividad**
- **Horas Trabajadas:** 40h (vs 40h objetivo)
- **Eficiencia:** 88.9%
- **Días Trabajados:** 5/7
- **Proyectos Activos:** 3
- **Tareas Completadas:** 8

#### **📊 Gráficos Personales**
- **Eficiencia Semanal:** Línea de tiempo
- **Horas por Proyecto:** Gráfico de barras
- **Distribución de Tiempo:** Gráfico de torta
- **Comparativa vs Objetivos:** Velocímetro

#### **⚠️ Alertas Personales**
- **Eficiencia baja:** Menos del 70%
- **Horas excesivas:** Más de 10h/día
- **Fechas límite:** Próximas 48h
- **Objetivos pendientes:** Semanales/mensuales

### **EQUIPO**

#### **👥 Vista de Coordinación**
- **Miembros del equipo:** Lista con estado
- **Carga de trabajo:** Horas por persona
- **Productividad relativa:** Comparativa
- **Alertas de equipo:** Problemas detectados

#### **📋 Gestión de Responsabilidades**
- **Asignar tareas** a miembros del equipo
- **Transferir responsabilidades** entre miembros
- **Comunicación directa** con alertas
- **Vista de equipo manager** para coordinadores

---

## ⚙️ **CRONOGRAMA INTEGRADO**

### **¿Qué es?**
Vista jerárquica completa dentro de cada proyecto, mostrando la estructura Fases → EDTs → Actividades → Tareas con integración de horas-hombre.

### **¿Cómo acceder?**
1. **Ir a Proyecto**
2. **Tab "Cronograma"**
3. **Tab "Tareas"** (nuevo)

### **Vista Jerárquica**

#### **🏗️ Estructura Completa**
```
🏢 PROYECTO: Centro de Datos ABC

📋 CRONOGRAMA EJECUCIÓN (Activo)

📂 Fase 1: Infraestructura [120h plan, 95h real, 79%]
👤 Responsable: Juan Pérez | ⏱️ Estado: En Progreso

  ├── 📁 EDT 1: Servicio Eléctrico [45h plan, 38h real, 84%]
  👤 Responsable: María García | ⏱️ Estado: En Progreso

    ├── ⚙️ Actividad 1.1: Cableado Principal [25h plan, 22h real, 88%]
    👤 Responsable: Carlos López | ⏱️ Estado: Completada

      ├── ✅ Tarea 1.1.1: Preparación [8h plan, 12h real, 150%]
      👤 Responsable: Carlos López | ⏱️ Estado: Completada
      ⏱️ Horas: Juan(6h), María(4h), Carlos(2h)

      └── ✅ Tarea 1.1.2: Instalación [12h plan, 10h real, 83%]
      👤 Responsable: Ana Rodríguez | ⏱️ Estado: En Progreso
      ⏱️ Horas: Ana(8h), Carlos(2h)
```

#### **🎨 Indicadores Visuales**
- **Progreso por Barras:** Visual del avance
- **Estados por Color:** Verde (completo), Amarillo (en progreso), Rojo (retrasado)
- **Horas Reales vs Plan:** Métricas en tiempo real
- **Responsables Asignados:** Iconos de usuario

#### **⚡ Acciones Rápidas**
- **Clic en EDT:** Registrar horas directamente
- **Clic en Tarea:** Ver detalles y progreso
- **Asignar Responsable:** Desde el cronograma
- **Actualizar Progreso:** Modificar porcentajes
- **Agregar Notas:** Comentarios y observaciones

---

## 📊 **REPORTES AVANZADOS**

### **DASHBOARD DE PRODUCTIVIDAD**

#### **¿Qué es?**
Panel personal de métricas y análisis de rendimiento, con gráficos interactivos y alertas inteligentes.

#### **Métricas Principales**
- **Horas Totales:** 40h (vs 45h planificadas)
- **Eficiencia:** 88.9%
- **Días Trabajados:** 5/7
- **Proyectos Activos:** 3
- **Cumplimiento Objetivo:** 100%

#### **Gráficos Interactivos**
- **Comparativa Histórica:** Últimas 4 semanas
- **Horas por Proyecto:** Distribución de tiempo
- **Eficiencia por Día:** Patrones de trabajo
- **Objetivos vs Real:** Seguimiento de metas

#### **Alertas Inteligentes**
- **Bajo rendimiento:** Eficiencia < 70%
- **Horas excesivas:** Más de 50h/semana
- **Días faltantes:** Menos de 4 días trabajados
- **Proyectos críticos:** Fechas límite cercanas

### **REPORTES DE EQUIPO**

#### **¿Qué es?**
Dashboard para gestores y coordinadores que muestra productividad de todo el equipo, comparativas y alertas de gestión.

#### **Métricas de Equipo**
- **Miembros Activos:** 8/10
- **Horas Totales:** 320h en el período
- **Eficiencia Promedio:** 85.2%
- **Alertas Activas:** 3 (requieren atención)

#### **Vista por Miembro**
```
👥 ESTADO DE MIEMBROS DEL EQUIPO

Carlos López    40h    95%    5 días    3 proyectos   ✅
Ana García      38h    85%    4 días    2 proyectos   ⚠️ 1
Juan Pérez      35h    78%    4 días    2 proyectos   ✅
María López     42h    105%   5 días    4 proyectos   🔥
```

#### **Gestión de Equipo**
- **Comparativas de rendimiento**
- **Alertas de bajo rendimiento**
- **Plan de capacitación personalizado**
- **Exportación de reportes**

---

## 🎯 **FUNCIONALIDADES AVANZADAS**

### **UNIFICACIÓN DE EDTs**
- **Base de datos única:** Tabla `Edt` como referencia maestra
- **Sincronización automática:** Entre cotización y proyecto
- **Análisis transversal:** Consulta unificada por código EDT
- **Proyecciones precisas:** Para futuras cotizaciones

### **ANÁLISIS HISTÓRICO**
- **Base de datos temporal:** Registros históricos por EDT
- **Tendencias de costo:** Evolución de precios por servicio
- **Proyecciones inteligentes:** Machine learning para cotizaciones
- **Benchmarking:** Comparación entre proyectos similares

### **ALERTAS Y NOTIFICACIONES**
- **Alertas automáticas:** Bajo rendimiento, fechas límite
- **Notificaciones push:** Cambios críticos en proyectos
- **Reportes programados:** Emails automáticos semanales
- **Dashboard de alertas:** Centro de notificaciones

### **EXPORTACIÓN Y REPORTES**
- **PDF Reports:** Reportes ejecutivos imprimibles
- **Excel Export:** Datos para análisis externos
- **Dashboard APIs:** Integración con BI tools
- **Programación:** Reportes automáticos

---

## 🔧 **FLUJOS DE TRABAJO COMPLETOS**

### **FLUJO 1: REGISTRO DIARIO DE HORAS**

#### **Paso 1: Acceso Rápido**
1. Clic en **"Mi Timesheet"** en el sidebar
2. Ver calendario de la semana actual

#### **Paso 2: Registro de Horas**
1. **Clic en el día** de trabajo
2. **Seleccionar proyecto** de la lista
3. **Elegir EDT** (PLC, HMI, ING)
4. **Ingresar horas** y descripción
5. **Guardar registro**

#### **Paso 3: Seguimiento**
1. **Verificar** registro en el calendario
2. **Revisar resumen** semanal
3. **Ajustar** si es necesario

### **FLUJO 2: ANÁLISIS SEMANAL**

#### **Paso 1: Revisión de Productividad**
1. Ir a **"Mi Progreso"**
2. **Revisar métricas** de la semana
3. **Analizar gráficos** de eficiencia

#### **Paso 2: Análisis de Equipo (Gestores)**
1. Ir a **"Equipo"**
2. **Comparar rendimiento** del equipo
3. **Identificar problemas** o oportunidades

#### **Paso 3: Acciones Correctivas**
1. **Asignar tareas** adicionales
2. **Reasignar recursos** si es necesario
3. **Comunicar** hallazgos al equipo

### **FLUJO 3: PREPARACIÓN DE COTIZACIONES**

#### **Paso 1: Análisis Histórico**
1. Ir a **"Análisis Transversal"**
2. **Seleccionar EDT** a cotizar
3. **Revisar datos históricos** de proyectos similares

#### **Paso 2: Proyección**
1. **Ingresar horas estimadas** para el nuevo proyecto
2. **Revisar proyección** de costo
3. **Verificar precisión** del modelo

#### **Paso 3: Documentación**
1. **Exportar datos** de soporte
2. **Generar reporte** de análisis
3. **Incluir en** propuesta comercial

---

## ❓ **PREGUNTAS FRECUENTES**

### **¿Cómo registro horas en un proyecto?**
1. Ve a "Horas Hombre" → "Registrar Horas"
2. Selecciona proyecto y EDT
3. Ingresa horas, fecha y descripción
4. Confirma el registro

### **¿Puedo registrar horas en más de un proyecto por día?**
Sí, puedes hacer múltiples registros en el mismo día, cada uno en su proyecto correspondiente.

### **¿Cómo veo mi productividad?**
Ve a "Mis Tareas" → "Mi Progreso" para ver métricas, gráficos y alertas de tu rendimiento.

### **¿Qué significa "Análisis Transversal"?**
Es un análisis que agrupa las horas por tipo de EDT (PLC, HMI, ING) a través de todos tus proyectos, para identificar patrones y hacer proyecciones.

### **¿Cómo asigno responsables en un proyecto?**
Ve al cronograma del proyecto, pestaña "Tareas", y haz clic en los elementos para asignar responsables.

### **¿Puedo exportar mis reportes?**
Sí, todos los dashboards tienen opciones de exportación a PDF y Excel.

### **¿Qué pasa si registro horas incorrectamente?**
Puedes editar los registros desde "Mi Timesheet" haciendo clic en el registro específico.

### **¿Cómo funciona la unificación de EDTs?**
Todos los EDTs se basan en una tabla maestra única, asegurando consistencia entre cotizaciones y proyectos.

---

## 🆘 **SOPORTE Y AYUDA**

### **Recursos de Ayuda**
- **Documentación técnica:** En el sistema
- **Videos tutoriales:** Canal de capacitación
- **Soporte técnico:** helpdesk@empresa.com
- **Capacitación:** sesiones semanales

### **Mejoras Continuas**
- **Feedback del usuario:** Formularios integrados
- **Roadmap público:** Funcionalidades planificadas
- **Versionado:** Actualizaciones transparentes
- **Testing:** Pruebas continuas del sistema

---

**¡Gracias por usar el Sistema de Horas-Hombre!** 🎯

*Para soporte adicional, contacta al equipo de desarrollo o consulta la documentación técnica disponible en el sistema.*