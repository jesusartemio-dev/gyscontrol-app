# 👥 Guía de Usuario - Sistema de Cronograma de 4 Niveles

## 🎯 Introducción

Bienvenido al **Sistema de Cronograma de 4 Niveles** de GYS Proyectos. Esta guía te ayudará a entender y utilizar todas las funcionalidades del sistema para gestionar tus proyectos de manera eficiente.

## 📋 Navegación Principal

### Acceso al Sistema
1. Ve a **Proyectos** en el menú lateral
2. Selecciona un proyecto existente
3. Haz clic en la pestaña **"Cronograma"**

## 🏗️ Jerarquía del Sistema

```
📁 PROYECTO
    ├── 📋 FASES (Etapas del proyecto)
    │   ├── 🔧 EDTs (Elementos de trabajo)
    │   │   └── ✅ TAREAS (Actividades específicas)
    └── 📊 MÉTRICAS (KPIs y reportes)
```

## 📋 Gestión de Fases

### Ver Fases del Proyecto
- **Vista**: Lista todas las fases con su progreso
- **Estados**: Planificado, En Progreso, Completado, Pausado, Cancelado
- **Información**: Nombre, descripción, fechas, progreso (%)

### Crear Nueva Fase
1. Haz clic en **"Nueva Fase"**
2. Completa los campos:
   - **Nombre**: Identificador de la fase
   - **Descripción**: Detalles adicionales
   - **Fechas**: Inicio y fin planificadas
3. Haz clic en **"Crear Fase"**

### Editar Fase
1. En la lista de fases, haz clic en el botón **"Editar"** (✏️)
2. Modifica la información necesaria
3. Guarda los cambios

### Eliminar Fase
1. Haz clic en el botón **"Eliminar"** (🗑️)
2. Confirma la eliminación
3. **Nota**: Solo puedes eliminar fases sin EDTs asociados

## 🔧 Gestión de EDTs

### Ver EDTs
- **Vista**: Lista filtrada por fase
- **Estados**: Planificado, En Progreso, Completado, etc.
- **Información**: Nombre, responsable, horas, progreso

### Crear Nuevo EDT
1. Haz clic en **"Nuevo EDT"**
2. Selecciona la **Fase** correspondiente
3. Completa la información:
   - **Categoría de Servicio**: Tipo de trabajo
   - **Zona**: Ubicación específica
   - **Responsable**: Persona asignada
   - **Horas Estimadas**: Tiempo planificado
4. Guarda el EDT

### Editar EDT
1. En la lista, haz clic en **"Editar"** (✏️)
2. Modifica la información
3. Actualiza el registro

### Eliminar EDT
1. Selecciona uno o múltiples EDTs
2. Haz clic en **"Eliminar"**
3. Confirma la eliminación masiva

## 📊 Dashboard de Métricas

### KPIs Principales
- **Total EDTs**: Número total de elementos de trabajo
- **Progreso General**: Porcentaje completado del proyecto
- **Eficiencia**: Relación horas reales vs planificadas
- **Cumplimiento**: Tareas completadas a tiempo

### Estados de EDTs
- **Planificados**: Trabajo pendiente
- **En Progreso**: Trabajo activo
- **Completados**: Trabajo terminado
- **Retrasados**: Trabajo con demora

### Control de Horas
- **Horas Planificadas**: Tiempo estimado
- **Horas Reales**: Tiempo ejecutado
- **Eficiencia**: Porcentaje de eficiencia

## 🎨 Interfaz de Usuario

### Navegación por Pestañas
- **Fases**: Gestión de etapas del proyecto
- **Lista EDTs**: Vista completa de elementos de trabajo
- **Métricas**: Dashboard de KPIs y reportes

### Estados Visuales
- 🟢 **Verde**: Estados positivos (Completado, En Progreso)
- 🟡 **Amarillo**: Estados de atención (Pausado, Retrasado)
- 🔴 **Rojo**: Estados críticos (Cancelado, Error)

### Indicadores de Progreso
- **Barras de progreso**: Visualización del avance
- **Porcentajes**: Métricas cuantitativas
- **Colores**: Codificación visual del estado

## 🔍 Funcionalidades Avanzadas

### Filtrado y Búsqueda
- **Por Estado**: Filtrar EDTs por estado
- **Por Responsable**: Ver trabajo asignado
- **Por Categoría**: Agrupar por tipo de servicio
- **Por Zona**: Filtrar por ubicación

### Exportación de Datos
- **Reportes**: Exportar métricas en PDF
- **Datos**: Descargar información en Excel
- **Historial**: Registros de cambios

## 👥 Gestión de Usuarios y Permisos

### Roles del Sistema
- **Administrador**: Control total del sistema
- **Gerente**: Gestión completa de proyectos
- **Proyectos**: Creación y edición de elementos
- **Usuario**: Vista y consulta de información

### Permisos por Operación
| Operación | Admin | Gerente | Proyectos | Usuario |
|-----------|-------|---------|-----------|---------|
| Ver Fases | ✅ | ✅ | ✅ | ✅ |
| Crear Fases | ✅ | ✅ | ✅ | ❌ |
| Editar Fases | ✅ | ✅ | ✅ | ❌ |
| Eliminar Fases | ✅ | ✅ | ❌ | ❌ |
| Ver EDTs | ✅ | ✅ | ✅ | ✅ |
| Crear EDTs | ✅ | ✅ | ✅ | ❌ |
| Editar EDTs | ✅ | ✅ | ✅ | ❌ |
| Eliminar EDTs | ✅ | ✅ | ❌ | ❌ |
| Ver Métricas | ✅ | ✅ | ✅ | ✅ |

## 📱 Uso en Dispositivos Móviles

### Optimización Mobile
- **Vista Responsive**: Adaptada a pantallas pequeñas
- **Navegación Táctil**: Botones optimizados para touch
- **Scroll Horizontal**: Tablas adaptables
- **Menús Colapsables**: Espacio optimizado

### Funcionalidades Móviles
- ✅ Crear y editar elementos
- ✅ Ver métricas y KPIs
- ✅ Navegación completa
- ✅ Notificaciones push

## 🚨 Manejo de Errores y Problemas

### Errores Comunes

#### "No se puede eliminar la fase"
**Causa**: La fase tiene EDTs asociados
**Solución**: Elimina primero los EDTs de la fase

#### "Error al crear EDT"
**Causa**: Combinación proyecto+categoría+zona ya existe
**Solución**: Modifica la zona o categoría

#### "Sin permisos para esta operación"
**Causa**: Rol insuficiente para la acción
**Solución**: Contacta al administrador

### Recuperación de Datos
- **Auto-guardado**: Cambios guardados automáticamente
- **Historial**: Registro de todas las modificaciones
- **Backup**: Respaldos automáticos del sistema

## 📞 Soporte y Ayuda

### Canales de Soporte
- **Email**: soporte@gys.com
- **Chat**: Disponible en la plataforma
- **Teléfono**: +57 XXX XXX XXXX
- **Documentación**: docs.gys.com

### Recursos Adicionales
- **Tutoriales**: Videoguías paso a paso
- **FAQ**: Preguntas frecuentes
- **Foro**: Comunidad de usuarios
- **Webinars**: Sesiones de capacitación

## 🎯 Mejores Prácticas

### Planificación del Proyecto
1. **Define fases claras**: Divide el proyecto en etapas lógicas
2. **Estima tiempos realistas**: Basado en experiencia previa
3. **Asigna responsables**: Personas específicas por EDT
4. **Establece prioridades**: Alta, Media, Baja

### Seguimiento Continuo
1. **Actualiza estados**: Mantén información al día
2. **Registra horas**: Control preciso del tiempo
3. **Identifica riesgos**: Anticipa problemas potenciales
4. **Revisa métricas**: Monitoreo semanal del progreso

### Comunicación Efectiva
1. **Reuniones regulares**: Alineación del equipo
2. **Reportes automáticos**: KPIs semanales
3. **Alertas tempranas**: Notificación de desviaciones
4. **Feedback continuo**: Mejora basada en retroalimentación

## 📊 Reportes y Analytics

### Tipos de Reporte
- **Progreso del Proyecto**: Avance general
- **Eficiencia por Responsable**: Productividad individual
- **Cumplimiento de Fechas**: Análisis temporal
- **Distribución de Trabajo**: Balance de carga

### Frecuencia de Reportes
- **Diarios**: Alertas críticas
- **Semanales**: Progreso general
- **Mensuales**: KPIs consolidados
- **Trimestrales**: Análisis estratégico

## 🔄 Actualizaciones del Sistema

### Versiones Recientes
- **v1.0.0**: Sistema completo de 4 niveles
- **v0.9.0**: APIs y componentes básicos
- **v0.8.0**: Schema y migraciones iniciales

### Próximas Funcionalidades
- **Integración con calendario**: Sincronización con Outlook/Google
- **Notificaciones avanzadas**: Alertas inteligentes
- **Análisis predictivo**: Estimaciones basadas en IA
- **Colaboración en tiempo real**: Edición simultánea

---

## 🎉 ¡Comienza a Gestionar tus Proyectos!

El Sistema de Cronograma de 4 Niveles está diseñado para hacer la gestión de proyectos más eficiente y efectiva. Sigue esta guía y aprovecha todas las funcionalidades disponibles.

**¿Necesitas ayuda?** Contacta al equipo de soporte técnico.

---

**📅 Última actualización**: 23 de septiembre de 2025
**📧 Contacto**: soporte@gys.com
**🌐 Documentación**: docs.gys.com/cronograma