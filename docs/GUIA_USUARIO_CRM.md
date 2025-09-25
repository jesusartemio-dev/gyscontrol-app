# 📋 Guía de Usuario - Sistema CRM GYS

## 🎯 Introducción

El Sistema CRM (Customer Relationship Management) de GYS está diseñado para mejorar la gestión de relaciones comerciales con clientes, optimizando el seguimiento de oportunidades de venta y el análisis de rendimiento comercial.

### 📊 ¿Qué puedes hacer con el CRM?

- **Gestionar oportunidades de venta** desde el pipeline hasta el cierre
- **Registrar actividades** con clientes (llamadas, reuniones, emails)
- **Analizar competidores** en procesos de licitación
- **Mantener historial completo** de proyectos por cliente
- **Visualizar métricas** de rendimiento comercial
- **Gestionar contactos** por cliente

---

## 🧭 Navegación del Sistema

### 📍 Acceso al CRM

1. Inicia sesión en el sistema GYS
2. Ve al menú lateral izquierdo
3. Busca la sección **"CRM"**
4. Selecciona la opción deseada

### 📋 Secciones Disponibles

```
CRM
├── 📊 Dashboard          # Vista general y métricas
├── 🎯 Oportunidades      # Gestión del pipeline
├── 👥 Clientes          # Gestión de clientes y contactos
├── 📝 Actividades       # Registro de interacciones
├── 📈 Métricas          # Reportes y análisis
└── 📋 Reportes          # Reportes avanzados
```

---

## 📊 Dashboard CRM

### 🎯 Vista General

El dashboard muestra:
- **Métricas principales**: Oportunidades activas, valor del pipeline, tasa de conversión
- **Pipeline por etapas**: Distribución de oportunidades
- **Actividades recientes**: Últimas interacciones con clientes
- **Alertas**: Recordatorios de seguimientos pendientes

### 📈 KPIs Principales

| Métrica | Descripción | Frecuencia |
|---------|-------------|------------|
| **Valor Pipeline** | Suma total de oportunidades activas | Actualización automática |
| **Tasa Conversión** | % oportunidades → proyectos | Mensual |
| **Tiempo en Pipeline** | Días promedio en cada etapa | Semanal |
| **Actividades/Mes** | Número de interacciones | Mensual |

---

## 🎯 Gestión de Oportunidades

### 📝 Crear Nueva Oportunidad

1. Ve a **CRM → Oportunidades**
2. Haz clic en **"Nueva Oportunidad"**
3. Completa los campos:
   - **Cliente**: Selecciona de la lista
   - **Nombre**: Descripción de la oportunidad
   - **Valor estimado**: Monto aproximado
   - **Probabilidad**: % de cerrar el negocio (0-100)
   - **Fecha cierre estimada**: Fecha probable de cierre
   - **Fuente**: Cómo se generó (licitación, referido, prospección)
   - **Responsable**: Usuario a cargo

### 🔄 Estados de Oportunidad

| Estado | Descripción | Color |
|--------|-------------|-------|
| **Prospecto** | Cliente potencial identificado | Gris |
| **Contacto Inicial** | Primer contacto establecido | Azul |
| **Propuesta Enviada** | Cotización entregada | Amarillo |
| **Negociación** | En proceso de negociación | Naranja |
| **Cerrada Ganada** | Proyecto adjudicado | Verde |
| **Cerrada Perdida** | Proyecto perdido | Rojo |

### 📊 Vista de Pipeline (Kanban)

- **Columnas**: Cada estado representa una columna
- **Tarjetas**: Cada oportunidad es una tarjeta arrastrable
- **Arrastrar**: Mueve oportunidades entre etapas
- **Colores**: Codificación por prioridad y tiempo

### 🔍 Filtros y Búsqueda

- **Por cliente**: Ver oportunidades de un cliente específico
- **Por responsable**: Filtrar por usuario asignado
- **Por estado**: Ver solo oportunidades en cierta etapa
- **Por fecha**: Rango de fechas de cierre estimado
- **Por valor**: Rango de montos estimados

---

## 👥 Gestión de Clientes

### 📋 Información del Cliente

Cada cliente tiene campos adicionales para CRM:
- **Sector industrial**: Minería, manufactura, energía, etc.
- **Tamaño de empresa**: Pequeña, mediana, grande, multinacional
- **Frecuencia de compra**: Histórica de pedidos
- **Estado de relación**: Prospecto, cliente activo, inactivo

### 📞 Contactos por Cliente

1. Ve a **CRM → Clientes**
2. Selecciona un cliente
3. Haz clic en **"Contactos"**
4. Agrega contactos con:
   - Nombre y cargo
   - Información de contacto
   - Nivel de influencia (decisor, influencer, usuario)
   - Notas específicas

### 📚 Historial de Proyectos

- **Vista cronológica** de todos los proyectos por cliente
- **Valor total** acumulado
- **Calificación de satisfacción** del cliente
- **Éxitos y problemas** identificados
- **Recomendaciones** para futuros proyectos

---

## 📝 Registro de Actividades

### 🎯 Tipos de Actividades

| Tipo | Descripción | Frecuencia |
|------|-------------|------------|
| **Llamada** | Conversación telefónica | Inmediata |
| **Email** | Correo electrónico | Diaria |
| **Reunión** | Encuentro presencial/virtual | Semanal |
| **Propuesta** | Envío de cotización | Por oportunidad |
| **Seguimiento** | Contacto de seguimiento | Variable |

### 📝 Registrar Nueva Actividad

1. Desde una oportunidad específica
2. O desde **CRM → Actividades → Nueva**
3. Selecciona:
   - **Tipo** de actividad
   - **Fecha y hora**
   - **Descripción** detallada
   - **Resultado**: Positivo, neutro, negativo
   - **Notas** adicionales

### 📊 Seguimiento de Actividades

- **Timeline visual** por oportunidad
- **Recordatorios automáticos** para seguimientos
- **Estadísticas** de efectividad por tipo
- **Historial completo** de interacciones

---

## 📈 Análisis de Competidores

### 🎯 Gestión en Licitaciones

Cuando participas en un proceso de licitación:

1. Ve a la oportunidad relacionada
2. Haz clic en **"Competidores"**
3. Agrega cada competidor:
   - **Nombre de empresa**
   - **Contacto** del competidor
   - **Propuesta económica** (si conocida)
   - **Propuesta técnica** (muy buena, buena, regular, deficiente)
   - **Fortalezas y debilidades**
   - **Precio vs nuestro** (más caro, igual, más barato)

### 📊 Análisis Comparativo

- **Matriz de comparación** técnica vs precio
- **Análisis de fortalezas** de la competencia
- **Estrategias de diferenciación**
- **Razones de pérdida/ganancia** de licitaciones

---

## 📊 Reportes y Métricas

### 📈 Dashboard Ejecutivo

**Métricas principales:**
- Pipeline total por etapas
- Valor del pipeline
- Tasa de conversión
- Rendimiento por comercial

### 📊 Reporte de Pipeline

- Oportunidades por etapa
- Valor por etapa
- Tiempo en cada etapa
- Cuellos de botella identificados

### 📈 Reporte de Rendimiento

- Métricas por comercial:
  - Número de oportunidades creadas
  - Tasa de cierre
  - Valor promedio de proyectos
  - Tiempo promedio de cierre
- Comparativo entre vendedores
- Tendencias mensuales

### 📋 Reporte de Clientes

- Historial de proyectos por cliente
- Valor total por cliente
- Frecuencia de proyectos
- Satisfacción del cliente

---

## 🔗 Integración con Sistema Existente

### 📋 Desde Cotizaciones

- **Creación automática**: Las cotizaciones aprobadas sugieren crear oportunidades
- **Sincronización**: Actualización automática del estado
- **Enlace bidireccional**: Navegación fluida entre cotización y oportunidad

### 🏗️ Desde Proyectos

- **Oportunidades post-venta**: Crear oportunidades de mantenimiento o upselling
- **Historial automático**: Registro de proyectos completados
- **Métricas actualizadas**: KPIs actualizados automáticamente

### 👥 Desde Clientes

- **Enriquecimiento**: Información adicional para segmentación
- **Historial unificado**: Vista completa de relación comercial
- **Contactos centralizados**: Gestión unificada de contactos

---

## 🎯 Mejores Prácticas

### 📝 Registro de Oportunidades

- **Crear inmediatamente**: Al identificar un prospecto interesante
- **Actualizar regularmente**: Cambiar estados y probabilidades
- **Registrar actividades**: Documentar toda interacción
- **Revisar semanalmente**: Limpiar oportunidades obsoletas

### 📞 Gestión de Contactos

- **Información completa**: Nombre, cargo, contacto múltiple
- **Nivel de influencia**: Identificar decisores clave
- **Historial de interacciones**: Notas de conversaciones previas
- **Actualización regular**: Mantener información al día

### 📊 Seguimiento de Métricas

- **Revisión semanal**: Dashboard y KPIs principales
- **Análisis mensual**: Tendencias y rendimiento
- **Ajustes estratégicos**: Basados en datos de conversión
- **Objetivos realistas**: Metas alcanzables y medibles

### 🔄 Flujo de Trabajo Recomendado

```
1. Identificar oportunidad
   ↓
2. Crear en CRM con información básica
   ↓
3. Registrar primera actividad (llamada/email)
   ↓
4. Desarrollar relación (múltiples actividades)
   ↓
5. Enviar propuesta cuando esté madura
   ↓
6. Negociar términos
   ↓
7. Cerrar como ganado o perdido
   ↓
8. Analizar lecciones aprendidas
```

---

## ❓ Solución de Problemas

### 🔍 Problemas Comunes

**No veo oportunidades asignadas:**
- Verifica permisos con administrador
- Confirma que eres el responsable asignado

**No puedo crear actividades:**
- Asegúrate de tener una oportunidad abierta
- Verifica permisos de escritura

**Métricas no se actualizan:**
- Las métricas se calculan automáticamente
- Espera a la próxima actualización (diaria)

**Contactos duplicados:**
- Usa la búsqueda antes de crear nuevos
- Contacta al administrador para consolidar

### 📞 Soporte

Para problemas técnicos o consultas:
1. Revisa esta guía primero
2. Consulta con tu supervisor inmediato
3. Contacta al equipo de soporte técnico
4. Usa el sistema de tickets para reportes

---

## 📚 Glosario

- **CRM**: Customer Relationship Management (Gestión de Relaciones con Clientes)
- **Pipeline**: Embudo de ventas con todas las oportunidades
- **Lead**: Prospecto o cliente potencial
- **Conversión**: Tasa de oportunidades que se convierten en proyectos
- **Ciclo de Ventas**: Tiempo desde identificación hasta cierre
- **KPI**: Key Performance Indicator (Indicador Clave de Rendimiento)

---

*Última actualización: Septiembre 2025*
*Versión: 1.0*