# 📅 Guía de Usuario - Cronograma Comercial GYS

## 🎯 ¿Qué es el Cronograma Comercial?

El **Cronograma Comercial** es una herramienta que te permite crear y gestionar planes de trabajo estimados durante la fase de cotización. Estos planes se convierten automáticamente en cronogramas de proyecto cuando la cotización es aprobada y convertida.

## 🚀 Primeros Pasos

### **Acceder al Cronograma**
1. Ve a **Comercial → Cotizaciones**
2. Selecciona una cotización existente
3. Haz clic en el tab **"Cronograma"**

### **Crear tu Primer EDT**
1. En el tab Cronograma, haz clic en **"Nuevo EDT"**
2. Selecciona una **Categoría de Servicio**
3. Define la **zona** (opcional, ej: "Zona 1", "Planta", "Oficina")
4. Establece las **fechas comerciales** (inicio y fin)
5. Asigna **horas estimadas**
6. Selecciona un **responsable** (opcional)
7. Agrega una **descripción** (opcional)
8. Elige la **prioridad** (Baja, Media, Alta, Crítica)
9. Haz clic en **"Crear EDT"**

## 📋 Gestión de EDTs

### **Estados de un EDT**
- 🟢 **Planificado**: EDT creado pero no iniciado
- 🟡 **En Progreso**: EDT en ejecución
- 🟠 **Detenido**: EDT pausado temporalmente
- 🔴 **Cancelado**: EDT cancelado
- ✅ **Completado**: EDT finalizado

### **Operaciones con EDTs**
- **Editar**: Modificar fechas, horas, responsable, etc.
- **Ver Tareas**: Expandir para gestionar tareas del EDT
- **Eliminar**: Remover EDT y todas sus tareas

## 📝 Gestión de Tareas

### **Crear una Tarea**
1. Selecciona un EDT
2. Haz clic en **"Ver Tareas"**
3. Click en **"Nueva Tarea"**
4. Completa el formulario:
   - **Nombre**: Descripción breve
   - **Fechas**: Inicio y fin de la tarea
   - **Horas estimadas**: Tiempo planificado
   - **Responsable**: Persona asignada
   - **Dependencia**: Tarea precedente (opcional)
   - **Descripción**: Detalles adicionales

### **Estados de Tareas**
- 📋 **Pendiente**: Tarea creada pero no iniciada
- 🔄 **En Progreso**: Tarea en ejecución
- ✅ **Completada**: Tarea finalizada
- ⏸️ **Pausada**: Tarea detenida temporalmente
- ❌ **Cancelada**: Tarea cancelada

## 📊 Vistas Disponibles

### **Vista de Lista**
- Lista completa de EDTs
- Información resumida por EDT
- Acceso rápido a operaciones
- Filtros por estado, responsable, fechas

### **Vista Gantt** *(Próximamente)*
- Representación visual del cronograma
- Líneas de tiempo por EDT
- Dependencias entre tareas
- Vista panorámica del proyecto

### **Métricas**
- Total de EDTs y tareas
- Horas estimadas totales
- Distribución por responsables
- Indicadores de progreso

## 🔍 Filtros y Búsqueda

### **Filtros Disponibles**
- **Buscar**: Por nombre de EDT o descripción
- **Categoría**: Filtrar por tipo de servicio
- **Estado**: Planificado, En Progreso, etc.
- **Responsable**: Filtrar por persona asignada
- **Fechas**: Rango de fechas de inicio/fin
- **Prioridad**: Baja, Media, Alta, Crítica

### **Uso de Filtros**
1. Ve al tab **"Filtros"**
2. Selecciona los criterios deseados
3. Haz clic en **"Aplicar Filtros"**
4. Los resultados se actualizarán automáticamente

## 🔄 Conversión a Proyecto

### **¿Cómo funciona?**
Cuando una cotización es **aprobada** y convertida en proyecto:

1. **EDTs comerciales** → **EDTs de proyecto**
2. **Tareas comerciales** → **Registros de horas iniciales**
3. **Fechas comerciales** → **Fechas planificadas**
4. **Horas estimadas** → **Horas planificadas**

### **Información Preservada**
- ✅ Categorías de servicio
- ✅ Zonas definidas
- ✅ Responsables asignados
- ✅ Descripciones y prioridades
- ✅ Dependencias entre tareas

## 📱 Uso en Dispositivos Móviles

### **Responsive Design**
- ✅ Interfaz adaptada para móviles y tablets
- ✅ Navegación por tabs optimizada
- ✅ Formularios touch-friendly
- ✅ Listas scrollables

### **Recomendaciones Móvil**
- Usa el navegador en modo horizontal para mejor experiencia
- Los formularios se adaptan automáticamente
- Navegación por gestos disponible

## 🚨 Alertas y Notificaciones

### **Tipos de Alertas**
- ⚠️ **Retrasos**: EDTs que superan fechas estimadas
- 👤 **Sin responsable**: EDTs sin persona asignada
- 📅 **Sin fechas**: EDTs sin fechas definidas
- 🔄 **Dependencias**: Conflictos en dependencias de tareas

### **Dónde ver Alertas**
- Dashboard principal del sistema
- Tab de Métricas del cronograma
- Notificaciones push (próximamente)

## 📊 Reportes y Métricas

### **Métricas Disponibles**
- **Total EDTs**: Número de estructuras creadas
- **Total Tareas**: Número de tareas planificadas
- **Horas Estimadas**: Tiempo total planificado
- **Responsables**: Distribución de carga de trabajo
- **Eficiencia**: Relación horas estimadas vs reales

### **Exportación de Datos**
- 📊 **Excel**: Datos completos del cronograma
- 📋 **PDF**: Reportes formateados
- 📈 **Gráficos**: Visualizaciones del progreso

## ❓ Preguntas Frecuentes

### **¿Puedo modificar un EDT después de creado?**
Sí, puedes editar fechas, horas, responsable y descripción en cualquier momento.

### **¿Qué pasa si elimino un EDT?**
Se eliminan el EDT y todas sus tareas asociadas. Esta acción no se puede deshacer.

### **¿Las tareas tienen dependencias?**
Sí, puedes establecer dependencias entre tareas para crear flujos de trabajo lógicos.

### **¿Cómo se convierten los EDTs a proyecto?**
Automáticamente al convertir la cotización. Los EDTs comerciales se mapean a EDTs de proyecto preservando toda la información.

### **¿Puedo ver el progreso en tiempo real?**
Actualmente se muestran métricas generales. El seguimiento en tiempo real estará disponible próximamente.

## 🆘 Solución de Problemas

### **No puedo crear un EDT**
- Verifica que la cotización esté en estado "Borrador" o "Enviada"
- Asegúrate de seleccionar una categoría de servicio válida
- Revisa que las fechas sean coherentes (fin ≥ inicio)

### **Las tareas no se muestran**
- Verifica que el EDT esté seleccionado
- Recarga la página si es necesario
- Contacta al soporte si persiste el problema

### **Error al guardar cambios**
- Verifica conexión a internet
- Revisa que todos los campos requeridos estén completos
- Intenta nuevamente o contacta al soporte

## 📞 Contactos de Soporte

### **Soporte Técnico**
- **Email**: soporte@gys.com
- **Teléfono**: (01) 123-4567
- **Horario**: Lunes a Viernes, 8:00 AM - 6:00 PM

### **Equipo de Desarrollo**
- **Tech Lead**: [Nombre del Tech Lead]
- **Especialista Cronogramas**: [Nombre del especialista]

## 📚 Recursos Adicionales

- 📖 **Documentación Técnica**: Para desarrolladores
- 🎥 **Videos Tutoriales**: Guías paso a paso
- 💬 **Foro de Usuarios**: Comunidad GYS
- 📧 **Newsletter**: Novedades y actualizaciones

---

**💡 Tip**: El cronograma comercial es tu herramienta para planificar con precisión y convertir cotizaciones en proyectos exitosos.

**🎯 Recuerda**: Un buen cronograma = Proyecto exitoso

**📅 Versión**: 1.0.0 | **📆 Actualización**: Diciembre 2024