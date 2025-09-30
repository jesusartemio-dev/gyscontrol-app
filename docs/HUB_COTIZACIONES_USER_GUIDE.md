# 📋 Guía del Usuario - Hub Unificado de Gestión de Cotizaciones

## 🎯 Introducción

El **Hub Unificado de Gestión de Cotizaciones** es una herramienta integral diseñada para optimizar el proceso de cotización y selección de proveedores en proyectos de GYS Control. Esta guía te ayudará a aprovechar al máximo todas las funcionalidades disponibles.

## 📋 Índice

- [Acceso al Sistema](#acceso-al-sistema)
- [Navegación Principal](#navegación-principal)
- [Modo de Actualización](#modo-de-actualización)
- [Modo de Selección](#modo-de-selección)
- [Gestión de Estados](#gestión-de-estados)
- [Búsqueda y Filtros](#búsqueda-y-filtros)
- [Operaciones Masivas](#operaciones-masivas)
- [Reportes y Analytics](#reportes-y-analytics)
- [Solución de Problemas](#solución-de-problemas)

## 🔐 Acceso al Sistema

### Requisitos de Acceso
- **Rol**: Usuario de Logística
- **Permisos**: Lectura y escritura en listas de equipos
- **Navegador**: Chrome 90+, Firefox 88+, Safari 14+

### Cómo Acceder
1. Inicia sesión en GYS Control
2. Ve a **Logística → Listas**
3. Selecciona una lista de equipos
4. Haz clic en **"Gestionar Cotizaciones"**

## 🧭 Navegación Principal

### Barra de Modos
```
┌─────────────────────────────────────┐
│ 📝 Actualización │ 🎯 Selección     │
└─────────────────────────────────────┘
```

- **Modo Actualización**: Gestiona estados y datos de cotizaciones
- **Modo Selección**: Compara y selecciona proveedores ganadores

### Panel de Información
- **Estadísticas en tiempo real**: Total de ítems, progreso, ahorros
- **Indicadores de estado**: Completitud, calidad de selecciones
- **Alertas**: Ítems pendientes, errores de sistema

## 📝 Modo de Actualización

### Vista General
El modo de actualización te permite gestionar el ciclo de vida completo de las cotizaciones.

### Estados de Cotización
| Estado | Descripción | Acciones Disponibles |
|--------|-------------|---------------------|
| 🕒 **Borrador** | Cotización en preparación | Editar, enviar |
| 📧 **Solicitado** | Enviado al proveedor | Marcar como recibido |
| ✅ **Cotizado** | Datos completos | Editar, seleccionar |
| ❌ **Rechazado** | Proveedor no disponible | Archivar |

### Gestión Individual
1. **Seleccionar cotización**: Click en la fila
2. **Editar datos**: Modificar precio, tiempo de entrega, estado
3. **Guardar cambios**: Automático o manual
4. **Historial**: Ver cambios anteriores

### Campos Editables
- **Precio Unitario**: Valor por unidad del ítem
- **Tiempo de Entrega**: Días hábiles estimados
- **Estado**: Ciclo de vida de la cotización
- **Notas**: Información adicional del proveedor

## 🎯 Modo de Selección

### Comparación Inteligente
El sistema compara automáticamente todas las cotizaciones disponibles para cada ítem.

### Tabla de Comparación
```
Proveedor A    $100.50    30 días    ✅ Mejor precio
Proveedor B    $105.25    25 días    ⚡ Más rápido
Proveedor C    $98.75     35 días    ⭐ Recomendado
```

### Algoritmo de Recomendación
**Fórmula**: `(PrecioScore × 70%) + (TiempoScore × 30%)`

- **PrecioScore**: Basado en diferencia vs precio promedio
- **TiempoScore**: Basado en velocidad de entrega
- **Resultado**: Proveedor con mejor balance precio/tiempo

### Proceso de Selección
1. **Revisar recomendaciones**: El sistema marca proveedores óptimos
2. **Seleccionar ganadores**: Dropdown por ítem
3. **Verificar selección**: Panel de resumen con métricas
4. **Confirmar**: Operación irreversible que actualiza la base de datos

### Métricas de Selección
- **Completitud**: Porcentaje de ítems con ganador
- **Ahorro Total**: Diferencia vs precio promedio
- **Tiempo Promedio**: Entrega estimada de selecciones
- **Calidad**: Ítems con mejor precio vs mejor entrega

## 🔍 Búsqueda y Filtros

### Filtros Disponibles
- **Por estado**: Todos, borrador, solicitado, cotizado, rechazado
- **Por proveedor**: Búsqueda por nombre de empresa
- **Por descripción**: Texto en nombre del ítem
- **Por código**: Identificador único del ítem

### Búsqueda Avanzada
```
Buscar: "eléctrico" → Muestra todos los ítems eléctricos
Buscar: "Proveedor A" → Muestra cotizaciones de Proveedor A
Buscar: "Q001" → Muestra cotización con código Q001
```

### Filtros Combinados
Los filtros funcionan de manera acumulativa:
1. Aplicar filtro de estado
2. Agregar búsqueda de texto
3. Resultado: Intersección de ambos criterios

## ⚡ Operaciones Masivas

### Acciones Disponibles
- **Marcar como Recibidas**: Cambia estado a "solicitado"
- **Marcar como Cotizadas**: Cambia estado a "cotizado"
- **Limpiar Selección**: Deselecciona todos los ítems

### Proceso de Operaciones Masivas
1. **Seleccionar ítems**: Checkboxes individuales o "Seleccionar todo"
2. **Elegir acción**: Botón correspondiente en la barra de acciones
3. **Confirmar**: Diálogo de confirmación con resumen
4. **Ejecutar**: Procesamiento automático con feedback

### Validaciones
- **Mínimo 1 ítem**: Debe seleccionar al menos un ítem
- **Estados válidos**: Solo ítems en estado correcto
- **Permisos**: Usuario debe tener permisos de escritura

## 📊 Reportes y Analytics

### Métricas en Tiempo Real
- **Rendimiento del sistema**: Tiempos de carga, errores
- **Uso del usuario**: Acciones realizadas, tiempo en plataforma
- **Efectividad**: Conversiones, ahorros generados

### Dashboard de Selección
```
┌─────────────────────────────────────┐
│ 📈 Progreso: 75%                   │
│ 💰 Ahorro: $2,450.00              │
│ ⏱️  Entrega: 28 días promedio      │
│ ⭐ Calidad: 80% óptimas            │
└─────────────────────────────────────┘
```

### Exportación de Datos
- **Formato**: Excel, CSV, PDF
- **Contenido**: Cotizaciones completas, selecciones, métricas
- **Filtros**: Aplicar filtros antes de exportar

## 🔧 Solución de Problemas

### Problemas Comunes

#### ❌ "Error al cargar cotizaciones"
**Causa**: Problema de conectividad o permisos
**Solución**:
1. Verificar conexión a internet
2. Recargar la página
3. Contactar al administrador si persiste

#### ❌ "No se pueden guardar cambios"
**Causa**: Conflicto de concurrencia o permisos insuficientes
**Solución**:
1. Recargar los datos
2. Verificar permisos de usuario
3. Intentar nuevamente

#### ❌ "Selección no disponible"
**Causa**: Ítem ya asignado o estado inválido
**Solución**:
1. Verificar estado del ítem
2. Recargar la página
3. Contactar al equipo técnico

### Contacto de Soporte
- **Email**: soporte@gyscontrol.com
- **Teléfono**: (01) 123-4567
- **Horario**: Lunes a Viernes, 8:00 AM - 6:00 PM

## 🎨 Interfaz de Usuario

### Tema y Accesibilidad
- **Modo oscuro**: Automático según preferencias del sistema
- **Contraste alto**: Para usuarios con discapacidades visuales
- **Tamaño de fuente**: Ajustable según necesidades
- **Navegación por teclado**: Soporte completo para accesibilidad

### Atajos de Teclado
- `Ctrl + F`: Buscar
- `Ctrl + A`: Seleccionar todo
- `Enter`: Confirmar selección
- `Escape`: Cancelar operación
- `Tab`: Navegar entre elementos

### Indicadores Visuales
- 🟢 **Verde**: Estados positivos (cotizado, seleccionado)
- 🟡 **Amarillo**: Estados pendientes (borrador, solicitado)
- 🔴 **Rojo**: Estados problemáticos (rechazado, error)
- 🔵 **Azul**: Estados neutros (en proceso)

## 📈 Mejores Prácticas

### Para Eficiencia
1. **Trabajar en lotes**: Procesar cotizaciones similares juntas
2. **Usar filtros**: Reducir ruido visual con búsquedas específicas
3. **Guardar frecuentemente**: Evitar pérdida de trabajo
4. **Revisar recomendaciones**: El sistema optimiza automáticamente

### Para Calidad
1. **Verificar datos**: Asegurar precios y tiempos realistas
2. **Comparar proveedores**: No seleccionar automáticamente
3. **Documentar decisiones**: Usar notas para justificaciones
4. **Revisar métricas**: Monitorear ahorros y calidad

### Para Colaboración
1. **Comunicar cambios**: Informar al equipo sobre actualizaciones
2. **Usar estados claros**: Facilitar seguimiento del proceso
3. **Documentar rechazos**: Explicar razones de decisiones
4. **Compartir reportes**: Mantener al equipo informado

## 🔄 Actualizaciones y Mantenimiento

### Versiones del Sistema
- **v1.0**: Funcionalidad básica de cotizaciones
- **v1.1**: Modo de selección inteligente
- **v1.2**: Analytics y reportes avanzados
- **v1.3**: Interfaz mejorada y accesibilidad

### Próximas Funcionalidades
- **Integración con ERP**: Sincronización automática
- **IA predictiva**: Recomendaciones basadas en historial
- **Colaboración en tiempo real**: Trabajo simultáneo
- **API pública**: Integración con sistemas externos

---

## 📞 Soporte Técnico

¿Necesitas ayuda adicional? Contacta a nuestro equipo de soporte técnico:

- 📧 **Email**: soporte.tecnico@gyscontrol.com
- 📱 **WhatsApp**: +51 987 654 321
- 🖥️ **Chat en vivo**: Disponible en la plataforma
- 📚 **Base de conocimientos**: docs.gyscontrol.com

---

*Esta documentación se actualiza regularmente. Última actualización: Diciembre 2024*