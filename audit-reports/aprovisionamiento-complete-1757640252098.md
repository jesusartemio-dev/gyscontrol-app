# 📊 Reporte Completo - Páginas de Aprovisionamiento

**Fecha:** 11/9/2025, 8:24:12 p. m.

## 🌐 Tiempos de Carga por Página

| Página | Tiempo Total | Query DB | Registros | Relaciones | Estado |
|--------|-------------|----------|-----------|------------|--------|
| dashboard | 387ms | 187ms | 5 | 5 | 🟡 Medio |
| proyectos | 427ms | 177ms | 2 | 5 | 🟡 Medio |
| listas | 500ms | 200ms | 2 | 14 | 🟡 Medio |
| pedidos | 465ms | 185ms | 3 | 5 | 🟡 Medio |
| timeline | 529ms | 179ms | 7 | 7 | 🔴 Lento |

## 📈 Resumen General

- **Total páginas:** 5
- **Tiempo promedio:** 461ms
- **Página más lenta:** timeline
- **Página más rápida:** dashboard

## 🔍 Análisis Detallado

### DASHBOARD

- **URL:** http://localhost:3000/finanzas/aprovisionamiento
- **Tiempo de carga:** 387ms
- **Query DB:** 187ms
- **Volumen de datos:** 5 registros, 5 relaciones
- **Sin cuellos de botella detectados**

### PROYECTOS

- **URL:** http://localhost:3000/finanzas/aprovisionamiento/proyectos
- **Tiempo de carga:** 427ms
- **Query DB:** 177ms
- **Volumen de datos:** 2 registros, 5 relaciones
- **Sin cuellos de botella detectados**

### LISTAS

- **URL:** http://localhost:3000/finanzas/aprovisionamiento/listas
- **Tiempo de carga:** 500ms
- **Query DB:** 200ms
- **Volumen de datos:** 2 registros, 14 relaciones
- **Sin cuellos de botella detectados**

### PEDIDOS

- **URL:** http://localhost:3000/finanzas/aprovisionamiento/pedidos
- **Tiempo de carga:** 465ms
- **Query DB:** 185ms
- **Volumen de datos:** 3 registros, 5 relaciones
- **Sin cuellos de botella detectados**

### TIMELINE

- **URL:** http://localhost:3000/finanzas/aprovisionamiento/timeline
- **Tiempo de carga:** 529ms
- **Query DB:** 179ms
- **Volumen de datos:** 7 registros, 7 relaciones
- **Sin cuellos de botella detectados**


## 💡 Recomendaciones

1. 💡 Implementar React Query para cache entre páginas
2. 💡 Considerar paginación en todas las listas
3. 💡 Optimizar includes con select específicos

---

*Reporte generado automáticamente por el sistema de monitoreo GYS*
