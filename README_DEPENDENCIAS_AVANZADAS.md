# 🎯 Dependencias Avanzadas GYS - Guía de Usuario

## 📋 Información General

**Versión:** 1.0.0
**Fecha de Lanzamiento:** Diciembre 2025
**Estado:** ✅ Producción

Las **Dependencias Avanzadas** permiten crear relaciones complejas entre tareas en cronogramas, más allá de la secuenciación automática por defecto.

## 🚀 Funcionalidades Principales

### ✅ Tipos de Dependencia Soportados

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| **FS (Finish-to-Start)** | Tarea B inicia cuando A termina | Desarrollo → Testing |
| **SS (Start-to-Start)** | Tarea B inicia cuando A inicia | Kickoff conjunto |
| **FF (Finish-to-Finish)** | Tarea B termina cuando A termina | Sincronización de entregas |
| **SF (Start-to-Finish)** | Tarea B termina cuando A inicia | Reversión de dependencias |

### ✅ Características Técnicas

- **Lags precisos:** Control en minutos (ej: +120 min, -60 min)
- **Validación automática:** Detección de ciclos
- **Calendario laboral:** Respeta días hábiles y horarios
- **Integración MS Project:** Exportación completa con TaskLinks
- **Hitos automáticos:** Identificación de tareas con duración 0

## 🎨 Cómo Usar las Dependencias

### 1. Acceder al Gestor de Dependencias

1. Ve a una cotización con cronograma
2. En la pestaña **"Cronograma"** → **"Vista Jerárquica"**
3. Haz clic en **"Gestionar Dependencias"**

### 2. Crear una Nueva Dependencia

1. En el modal, haz clic **"Nueva Dependencia"**
2. **Selecciona tarea origen:** La tarea que controla la dependencia
3. **Selecciona tarea destino:** La tarea que depende de la origen
4. **Elige tipo de dependencia:** FS, SS, FF, o SF
5. **Configura lag (opcional):** Minutos de retraso/avance
6. **Crea la dependencia**

### 3. Gestionar Dependencias Existentes

- **Ver lista completa:** Todas las dependencias con detalles
- **Editar:** Modificar tipo o lag
- **Eliminar:** Remover dependencias no deseadas
- **Indicadores visuales:** 🎯 para hitos, ➡️ para tipos de dependencia

## 📊 Validaciones y Reglas

### ✅ Validaciones Automáticas

- **No dependencias consigo mismo:** Una tarea no puede depender de sí misma
- **No ciclos:** Se previene A→B→A automáticamente
- **Tareas válidas:** Solo tareas existentes en el cronograma
- **Permisos:** Solo usuarios autorizados pueden crear dependencias

### ⚠️ Advertencias

- **Lags extremos:** Sistema alerta si lags > 8 horas o < -8 horas
- **Dependencias complejas:** Recomendación de revisar lógica para >10 dependencias
- **Calendario laboral:** Las dependencias respetan días hábiles

## 🔧 Integración con Cronograma

### ✅ Aplicación Automática

Las dependencias se aplican automáticamente cuando:
- **Generas cronograma:** `/generar` aplica todas las dependencias
- **Importas datos:** `/importar` considera dependencias existentes
- **Actualizas fechas:** Recálculo automático de fechas dependientes

### ✅ Exportación MS Project

- **TaskLinks completos:** Todas las dependencias incluidas
- **Tipos nativos:** FS=1, SS=2, FF=3, SF=4
- **Lags precisos:** En minutos según especificación MS Project
- **Compatibilidad:** Funciona con MS Project 2016+

## 📈 Monitoreo y Métricas

### ✅ KPIs de Salud

- **Disponibilidad:** >99% uptime del servicio
- **Performance:** <2 segundos respuesta APIs críticas
- **Error Rate:** <5% de requests con error
- **Ciclos detectados:** 0 (validación preventiva)

### 📊 Dashboard de Métricas

Accede a métricas en tiempo real:
- **Grafana:** `http://localhost:3001` (desarrollo)
- **Prometheus:** `http://localhost:9090` (métricas técnicas)
- **AlertManager:** `http://localhost:9093` (alertas)

## 🆘 Solución de Problemas

### Problema: "No se puede crear dependencia"

**Posibles causas:**
- Tarea origen = tarea destino
- Ya existe dependencia entre estas tareas
- Ciclo detectado en dependencias existentes

**Solución:** Verifica las tareas seleccionadas y dependencias existentes

### Problema: "Error al aplicar dependencias"

**Posibles causas:**
- Calendario laboral no configurado
- Fechas inconsistentes en cronograma
- Problemas de permisos

**Solución:** Verifica configuración de calendario y permisos de usuario

### Problema: "Ciclos detectados"

**Causa:** Dependencias circulares (A→B→C→A)

**Solución:** Revisa y elimina la dependencia que causa el ciclo

## 📞 Soporte

### Contactos de Emergencia

- **Issues críticos:** dev@gys.com
- **Soporte funcional:** support@gys.com
- **Documentación:** docs@gys.com

### Canales de Comunicación

- **Slack:** #dependencias-avanzadas
- **Issues:** GitHub repository
- **Wiki:** Documentación técnica completa

## 🔄 Actualizaciones y Mantenimiento

### Versiones Recientes

- **v1.0.0:** Lanzamiento inicial con FS/SS/FF/SF
- **Próximas:** Lags en días, dependencias entre fases

### Mantenimiento

- **Monitoreo continuo:** 24/7 por sistemas automatizados
- **Updates:** Deploy automático con zero-downtime
- **Backups:** Diarios con retención 30 días

## 📚 Recursos Adicionales

- **Documentación Técnica:** `docs/IMPLEMENTACION_DEPENDENCIAS_AVANZADAS.md`
- **Tests:** `__tests__/cotizacion-dependencias*`
- **Scripts de Deploy:** `scripts/deploy-dependencias-avanzadas.sh`
- **Monitor:** `scripts/monitor-dependencias-avanzadas.js`

---

**¿Necesitas ayuda?** Contacta al equipo de desarrollo o revisa la documentación técnica completa.