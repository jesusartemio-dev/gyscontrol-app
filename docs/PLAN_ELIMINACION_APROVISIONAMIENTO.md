# 🗑️ Plan de Eliminación del Sistema de Aprovisionamiento

## 📋 Resumen Ejecutivo

Este documento describe el plan estructurado para eliminar completamente el sistema de aprovisionamiento del proyecto GYS, incluyendo los modelos `OrdenCompra`, `Recepcion`, `Pago`, `AprovisionamientoFinanciero` e `HistorialAprovisionamiento`.

**Total de archivos afectados:** 27 archivos (verificado)  
**Tiempo estimado:** 2-3 días de desarrollo  
**Riesgo:** Medio (requiere pruebas exhaustivas)

> ✅ **FASE 1 COMPLETADA** - Análisis detallado realizado, dependencias críticas identificadas

---

## 🎯 Objetivos

- ✅ Eliminar completamente las entidades de aprovisionamiento del sistema
- ✅ Mantener la integridad del código restante
- ✅ Evitar errores de compilación TypeScript
- ✅ Preservar funcionalidades no relacionadas
- ✅ Documentar cambios para futuras referencias

---

## 📊 Análisis de Impacto

### Archivos Identificados por Categoría

| Categoría | Cantidad | Archivos |
|-----------|----------|----------|
| **APIs** | 7 | Rutas de aprovisionamiento |
| **Servicios** | 4 | Lógica de negocio |
| **Componentes** | 3 | UI y formularios |
| **Páginas** | 3 | Vistas de usuario |
| **Tipos** | 4 | Definiciones TypeScript |
| **Tests/Mocks** | 3 | Pruebas unitarias |
| **Hooks/Utils** | 2 | Utilidades |
| **Configuración** | 1 | Notificaciones |

---

## 🚀 Plan de Eliminación por Fases (OPTIMIZADO)

> ⚠️ **ORDEN OPTIMIZADO:** Eliminación de dependencias de arriba hacia abajo para evitar errores en cascada

### **FASE 1: Preparación y Análisis** ✅ COMPLETADA
**Duración:** 2-3 horas  
**Riesgo:** Bajo

#### 1.1 Backup y Documentación
- ✅ Crear backup completo del proyecto
- ✅ Documentar funcionalidades que se perderán → `docs/FUNCIONALIDADES_PERDIDAS_APROVISIONAMIENTO.md`
- ✅ Identificar dependencias críticas → `docs/DEPENDENCIAS_CRITICAS_APROVISIONAMIENTO.md`
- ✅ Verificar que no hay datos en producción → Prisma Studio verificado

#### 1.2 Análisis de Dependencias
- ✅ Revisar imports y exports entre archivos
- ✅ Identificar componentes que dependen de otros → 27 archivos mapeados
- ✅ Mapear relaciones en base de datos → `docs/RELACIONES_BD_APROVISIONAMIENTO.md`
- ✅ Verificar tests que fallarán → Identificados en análisis

**Documentos generados:**
- `docs/FASE1_COMPLETADA_APROVISIONAMIENTO.md`
- `docs/FUNCIONALIDADES_PERDIDAS_APROVISIONAMIENTO.md`
- `docs/DEPENDENCIAS_CRITICAS_APROVISIONAMIENTO.md`
- `docs/RELACIONES_BD_APROVISIONAMIENTO.md`

---

### **FASE 2: Eliminación de Páginas y Navegación** ✅ COMPLETADA
**Duración:** 1-2 horas  
**Riesgo:** Bajo - Sin dependencias hacia abajo

#### 2.1 Páginas de Aprovisionamiento (3 archivos identificados)
```bash
# Eliminar estas páginas:
src/app/(logistica)/aprovisionamientos/ordenes-compra/[id]/page.tsx    # Detalle orden
src/app/(logistica)/aprovisionamientos/recepciones/[id]/page.tsx        # Detalle recepción
src/app/(logistica)/aprovisionamientos/ordenes-compra/nuevo/page.tsx    # Nueva orden
```

**Funcionalidades de páginas:**
- ✅ Formularios OrdenCompraForm y RecepcionForm eliminados
- ✅ Breadcrumbs de navegación actualizados
- ✅ Enlaces a aprovisionamientos relacionados removidos

#### 2.2 Actualizar Navegación
- ✅ Remover rutas del router
- ✅ Actualizar breadcrumbs
- ✅ Verificar enlaces internos
- ✅ Eliminar referencias en Sidebar.tsx

---

### **FASE 3: Eliminación de Componentes UI** ✅ COMPLETADA
**Duración:** 2-3 horas  
**Riesgo:** Medio - Dependen de servicios pero no de APIs

#### 3.1 Componentes Principales (8 archivos identificados)
```bash
# Eliminar/Actualizar estos componentes:
src/components/logistica/PagoForm.tsx                    # ✅ ELIMINADO COMPLETO
src/components/aprovisionamientos/AprovisionamientoList.tsx      # ✅ ELIMINADO COMPLETO
src/components/aprovisionamientos/AprovisionamientoForm.tsx      # ✅ ELIMINADO COMPLETO
src/components/aprovisionamientos/AprovisionamientoCard.tsx      # ✅ ELIMINADO COMPLETO
src/components/aprovisionamientos/AprovisionamientoSelect.tsx    # ✅ ELIMINADO COMPLETO
src/components/aprovisionamientos/AprovisionamientosDashboard.tsx # ✅ ELIMINADO COMPLETO
src/components/NotificationSettings.tsx                  # ✅ ACTUALIZADO (alertas removidas)
src/components/Sidebar.tsx                              # ✅ ACTUALIZADO (enlaces removidos)
```

#### 3.2 Actualizaciones Específicas

**NotificationSettings.tsx:**
- ✅ Eliminar referencias a "recepciones y pagos"
- ✅ Remover alertas de "Recepciones pendientes"
- ✅ Quitar "Pagos vencidos o por vencer"

**Sidebar.tsx:**
- ✅ Eliminar enlace `/logistica/recepciones`
- ✅ Remover enlace `/finanzas/pagos`
- ✅ Quitar badges `recepciones-pendientes` y `pagos-vencidos`

---

### **FASE 4: Limpieza de Hooks y Utilidades** ✅ COMPLETADA
**Duración:** 1 hora  
**Riesgo:** Bajo - Solo referencias a servicios

#### 4.1 Hooks Afectados (2 archivos identificados)
```bash
# Actualizar estos archivos:
src/lib/hooks/useNotifications.ts                      # ✅ ACTUALIZADO (fetch removido)
src/app/configuracion/notificaciones/page.tsx          # ✅ ACTUALIZADO (menciones removidas)
```

**Funcionalidades específicas removidas:**
- ✅ Fetch de recepciones pendientes
- ✅ Fetch de pagos vencidos o por vencer
- ✅ Alertas de estado de órdenes, recepciones y pagos
- ✅ Configuración de notificaciones de aprovisionamiento

#### 4.2 Actualizaciones
- ✅ Remover fetch de recepciones pendientes
- ✅ Eliminar fetch de pagos vencidos
- ✅ Actualizar documentación de notificaciones

---

### **FASE 5: Limpieza de Servicios** ✅ COMPLETADA
**Duración:** 2-3 horas  
**Riesgo:** Medio - Dependen de tipos y modelos

#### 5.1 Servicios de Aprovisionamiento (4 archivos identificados)
```bash
# Eliminar estos servicios:
src/lib/services/ordenCompra.ts      # ✅ ELIMINADO COMPLETO
src/lib/services/ordenesCompra.ts    # ✅ ELIMINADO COMPLETO
src/lib/services/recepcion.ts        # ✅ ELIMINADO COMPLETO
src/lib/services/recepciones.ts      # ✅ ELIMINADO COMPLETO
```

**Funcionalidades críticas eliminadas:**
- ✅ CRUD completo de órdenes de compra
- ✅ Workflows de aprobación/cancelación/rechazo
- ✅ Gestión de recepciones e inspecciones
- ✅ Cálculos de métricas y estadísticas
- ✅ Generación de números de recepción
- ✅ Procesamiento de pagos aprobados

#### 5.2 Actualizar Servicios Dependientes
- ✅ Revisar `src/lib/services/producto.ts` - referencias removidas
- ✅ Limpiar imports huérfanos en otros servicios
- ✅ Actualizar índices de exportación

---

### **FASE 6: Eliminación de Tipos y Payloads** ✅ COMPLETADA
**Duración:** 1-2 horas  
**Riesgo:** Bajo - Solo definiciones

#### 6.1 Tipos de Aprovisionamiento (4 archivos identificados)
```bash
# Actualizar estos archivos:
src/types/modelos.ts                                   # ✅ ACTUALIZADO (tipos removidos)
src/types/payloads.ts                                  # ✅ ACTUALIZADO (payloads removidos)
src/types/modelos-generated.ts                         # ✅ ACTUALIZADO (comentarios limpiados)
src/types/payloads-generated.ts                        # ✅ ACTUALIZADO (comentarios limpiados)
src/lib/validators/base-generated.ts                    # ✅ ACTUALIZADO (validadores removidos)
```

**Tipos específicos eliminados:**
- ✅ `AprovisionamientoFinanciero`
- ✅ `OrdenCompraPayload`
- ✅ `RecepcionPayload`
- ✅ `PagoPayload`
- ✅ Esquemas de validación Zod relacionados

#### 6.2 Limpieza de Imports
- ✅ Revisar imports huérfanos en otros archivos
- ✅ Actualizar índices de exportación
- ✅ Verificar que no hay referencias TypeScript rotas

---

### **FASE 7: Eliminación de APIs** ✅ COMPLETADA
**Duración:** 3-4 horas  
**Riesgo:** Medio - Ya no hay dependencias hacia arriba

#### 7.1 APIs de Aprovisionamiento (7 archivos identificados)
```bash
# Eliminar estas rutas API:
src/app/api/ordenes-compra/route.ts                    # ✅ ELIMINADO COMPLETO
src/app/api/ordenes-compra/[id]/route.ts               # ✅ ELIMINADO COMPLETO
src/app/api/recepciones/route.ts                       # ✅ ELIMINADO COMPLETO
src/app/api/recepciones/[id]/route.ts                  # ✅ ELIMINADO COMPLETO
src/app/api/pagos/route.ts                             # ✅ ELIMINADO COMPLETO
src/app/api/pagos/[id]/route.ts                        # ✅ ELIMINADO COMPLETO
src/app/api/pagos/[id]/procesar/route.ts               # ✅ ELIMINADO COMPLETO
```

**Dependencias eliminadas:**
- ✅ Todas las APIs que referencian modelos `OrdenCompra`, `Recepcion`, `Pago`
- ✅ Estados en `aprovisionamientos` relacionados
- ✅ Verificaciones de existencia de recepciones/pagos activos

#### 7.2 Verificación Post-Eliminación
- ✅ Verificar que no hay rutas huérfanas
- ✅ Comprobar que el servidor arranca sin errores
- ✅ Revisar logs de errores 404 (esperados)

---

### **FASE 8: Eliminación de Modelos Prisma** 🔄 EN PROGRESO
**Duración:** 2-3 horas  
**Riesgo:** Alto - Requiere migración de base de datos

#### 8.1 Modelos de Aprovisionamiento (5 modelos identificados)
```prisma
# Eliminar estos modelos del schema.prisma:
model OrdenCompra {
  // Modelo completo a eliminar
}

model Recepcion {
  // Modelo completo a eliminar
}

model Pago {
  // Modelo completo a eliminar
}

model AprovisionamientoFinanciero {
  // Modelo completo a eliminar
}

model HistorialAprovisionamiento {
  // Modelo completo a eliminar
}
```

#### 8.2 Proceso de Migración
- [ ] Revisar modelos en `prisma/schema.prisma`
- [ ] Eliminar modelos de aprovisionamiento
- [ ] Limpiar relaciones en otros modelos (User, Proveedor, etc.)
- [ ] Crear migración de eliminación: `npx prisma migrate dev --name remove-aprovisionamiento`
- [ ] Verificar que la migración es correcta
- [ ] Aplicar migración en desarrollo
- [ ] Regenerar cliente Prisma: `npx prisma generate`

**⚠️ ADVERTENCIA:** Esta fase eliminará datos permanentemente. Hacer backup antes.

---

### **FASE 9: Verificación Final y Limpieza** ✅
**Duración:** 1-2 horas  
**Riesgo:** Bajo - Solo verificación

#### 9.1 Verificaciones Finales
- [ ] Ejecutar `npm run build` para verificar compilación
- [ ] Ejecutar `npm run test` para verificar que no hay tests rotos
- [ ] Verificar que no hay imports huérfanos
- [ ] Comprobar que no hay referencias TypeScript rotas
- [ ] Revisar que el servidor arranca correctamente

#### 9.2 Limpieza de Documentación
- [ ] Actualizar README.md si menciona aprovisionamiento
- [ ] Revisar documentación técnica
- [ ] Actualizar diagramas de arquitectura si aplica

#### 9.3 Comunicación
- [ ] Notificar al equipo sobre la eliminación completada
- [ ] Documentar cambios en changelog
- [ ] Actualizar documentación de usuario si aplica

---

### **FASE 10: Verificación y Testing** ✅
**Duración:** 3-4 horas  
**Riesgo:** Medio

#### 10.1 Compilación TypeScript
- [ ] `npm run type-check`
- [ ] Corregir errores de tipos
- [ ] Verificar imports/exports
- [ ] Validar definiciones de tipos

#### 10.2 Testing Completo
- [ ] `npm run test`
- [ ] `npm run test:e2e`
- [ ] Verificar que no hay tests fallidos
- [ ] Actualizar tests que dependían del sistema

#### 10.3 Verificación de Funcionalidad
- [ ] `npm run dev`
- [ ] Probar navegación principal
- [ ] Verificar que no hay errores 404
- [ ] Comprobar funcionalidades restantes

---

## ⚠️ Consideraciones de Riesgo

### Riesgos Altos
1. **Pérdida de datos:** Si hay información en producción
2. **Dependencias ocultas:** Código que usa estos modelos indirectamente
3. **Errores de compilación:** TypeScript puede fallar en cascada
4. **Funcionalidades críticas:** Pérdida de workflows importantes

### Mitigaciones
1. **Backup completo** antes de iniciar
2. **Testing exhaustivo** en cada fase
3. **Rollback plan** preparado
4. **Documentación detallada** de cambios

---

## 📋 Checklist de Verificación Final

### Pre-Eliminación ✅ COMPLETADO
- ✅ Backup completo realizado
- ✅ Documentación de funcionalidades completada → `docs/FUNCIONALIDADES_PERDIDAS_APROVISIONAMIENTO.md`
- ✅ Plan de rollback preparado
- ✅ Equipo notificado del cambio
- ✅ Dependencias críticas identificadas → `docs/DEPENDENCIAS_CRITICAS_APROVISIONAMIENTO.md`
- ✅ Relaciones de BD mapeadas → `docs/RELACIONES_BD_APROVISIONAMIENTO.md`
- ✅ Datos de producción verificados → Sin datos críticos

### Post-Eliminación
- [ ] Compilación TypeScript exitosa
- [ ] Tests unitarios pasando
- [ ] Tests E2E funcionando
- [ ] Aplicación arranca sin errores
- [ ] Navegación principal funcional
- [ ] No hay errores 404
- [ ] Logs limpios de errores

### Documentación
- [ ] Changelog actualizado
- [ ] README actualizado
- [ ] Arquitectura documentada
- [ ] Equipo informado de cambios

---

## 🔄 Plan de Rollback

En caso de problemas críticos:

1. **Restaurar desde backup**
2. **Revertir migración de BD**
3. **Restaurar archivos eliminados**
4. **Ejecutar tests de verificación**
5. **Notificar al equipo**

---

## 📞 Contactos y Responsables

- **Desarrollador Principal:** [Nombre]
- **DevOps:** [Nombre]
- **QA Lead:** [Nombre]
- **Product Owner:** [Nombre]

---

## 📅 Cronograma Actualizado

| Fase | Descripción | Duración | Dependencias | Responsable | Estado |
|------|-------------|----------|--------------|-------------|--------|
| 1 | Preparación y Análisis | 2-3h | - | Dev | ✅ COMPLETADA |
| 2 | Eliminación de Páginas y Navegación | 1-2h | Fase 1 | Dev | ✅ COMPLETADA |
| 3 | Eliminación de Componentes UI | 2-3h | Fase 2 | Dev | ✅ COMPLETADA |
| 4 | Limpieza de Hooks y Utilidades | 1h | Fase 3 | Dev | ✅ COMPLETADA |
| 5 | Limpieza de Servicios | 2-3h | Fase 4 | Dev | ✅ COMPLETADA |
| 6 | Eliminación de Tipos y Payloads | 1-2h | Fase 5 | Dev | ✅ COMPLETADA |
| 7 | Eliminación de APIs | 3-4h | Fase 6 | Dev | ✅ COMPLETADA |
| 8 | Eliminación de Modelos Prisma | 2-3h | Fase 7 | Dev | 🔄 EN PROGRESO |
| 9 | Verificación Final y Limpieza | 1-2h | Fase 8 | QA + Dev | ⏳ PENDIENTE |
| 10 | Verificación y Testing | 3-4h | Fase 9 | QA + Dev | ⏳ PENDIENTE |

**Progreso actual:** 7/10 fases completadas (70%)  
**Tiempo invertido:** ~15-20 horas  
**Tiempo restante estimado:** 6-9 horas

---

---

## 📚 Documentación de Referencia

### Documentos Generados en FASE 1
1. **`docs/FASE1_COMPLETADA_APROVISIONAMIENTO.md`** - Resumen de completación
2. **`docs/FUNCIONALIDADES_PERDIDAS_APROVISIONAMIENTO.md`** - Funcionalidades eliminadas
3. **`docs/DEPENDENCIAS_CRITICAS_APROVISIONAMIENTO.md`** - Análisis de dependencias
4. **`docs/RELACIONES_BD_APROVISIONAMIENTO.md`** - Mapeo de base de datos

### Archivos Identificados para Eliminación
- **Total:** 27 archivos verificados
- **APIs:** 7 rutas específicas
- **Servicios:** 4 archivos con funcionalidades críticas
- **Componentes:** 8 componentes UI afectados
- **Modelos BD:** 5 principales + 7 enums
- **Tests:** 6 archivos de pruebas

---

*Documento actualizado con progreso real*  
*Versión: 3.0 - FASES 1-7 COMPLETADAS*  
*Estado: FASE 8 EN PROGRESO*  
*Próximo paso: Eliminación de Modelos Prisma*  
*Progreso: 70% completado*