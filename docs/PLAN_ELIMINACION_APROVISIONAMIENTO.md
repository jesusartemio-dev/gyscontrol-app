# 🗑️ Plan de Eliminación del Sistema de Aprovisionamiento

## 📋 Resumen Ejecutivo

Este documento describe el plan estructurado para eliminar completamente el sistema de aprovisionamiento del proyecto GYS, incluyendo los modelos `OrdenCompra`, `Recepcion`, `Pago`, `AprovisionamientoFinanciero` e `HistorialAprovisionamiento`.

**Total de archivos afectados:** 27 archivos  
**Tiempo estimado:** 2-3 días de desarrollo  
**Riesgo:** Medio (requiere pruebas exhaustivas)

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

## 🚀 Plan de Eliminación por Fases

### **FASE 1: Preparación y Análisis** ⚠️
**Duración:** 2-3 horas  
**Riesgo:** Bajo

#### 1.1 Backup y Documentación
- [ ] Crear backup completo del proyecto
- [ ] Documentar funcionalidades que se perderán
- [ ] Identificar dependencias críticas
- [ ] Verificar que no hay datos en producción

#### 1.2 Análisis de Dependencias
- [ ] Revisar imports y exports entre archivos
- [ ] Identificar componentes que dependen de otros
- [ ] Mapear relaciones en base de datos
- [ ] Verificar tests que fallarán

---

### **FASE 2: Eliminación de APIs** 🔥
**Duración:** 3-4 horas  
**Riesgo:** Alto

#### 2.1 APIs de Aprovisionamiento
```bash
# Eliminar estas rutas API:
src/app/api/aprovisionamientos/ordenes-compra/[id]/aprobar/route.ts
src/app/api/aprovisionamientos/ordenes-compra/[id]/cancelar/route.ts
src/app/api/aprovisionamientos/ordenes-compra/[id]/rechazar/route.ts
src/app/api/aprovisionamientos/pagos/[id]/aprobar/route.ts
src/app/api/aprovisionamientos/pagos/[id]/procesar/route.ts
src/app/api/aprovisionamientos/recepciones/[id]/completar/route.ts
src/app/api/aprovisionamientos/recepciones/[id]/inspeccionar/route.ts
```

#### 2.2 Verificación Post-Eliminación
- [ ] Verificar que no hay rutas huérfanas
- [ ] Comprobar que el servidor arranca sin errores
- [ ] Revisar logs de errores 404

---

### **FASE 3: Limpieza de Servicios** 🛠️
**Duración:** 2-3 horas  
**Riesgo:** Medio

#### 3.1 Servicios de Aprovisionamiento
```bash
# Eliminar estos servicios:
src/lib/services/ordenCompra.ts
src/lib/services/ordenesCompra.ts
src/lib/services/recepcion.ts
src/lib/services/recepciones.ts
```

#### 3.2 Actualizar Servicios Dependientes
- [ ] Revisar `src/lib/services/producto.ts`
- [ ] Limpiar imports huérfanos en otros servicios
- [ ] Actualizar índices de exportación

---

### **FASE 4: Eliminación de Componentes UI** 🎨
**Duración:** 2-3 horas  
**Riesgo:** Medio

#### 4.1 Componentes Principales
```bash
# Eliminar/Actualizar estos componentes:
src/components/aprovisionamientos/PagoForm.tsx  # ELIMINAR
src/components/NotificationSettings.tsx         # ACTUALIZAR
src/components/Sidebar.tsx                      # ACTUALIZAR
```

#### 4.2 Actualizaciones Específicas

**NotificationSettings.tsx:**
- [ ] Eliminar referencias a "recepciones y pagos"
- [ ] Remover alertas de "Recepciones pendientes"
- [ ] Quitar "Pagos vencidos o por vencer"

**Sidebar.tsx:**
- [ ] Eliminar enlace `/logistica/recepciones`
- [ ] Remover enlace `/finanzas/pagos`
- [ ] Quitar badges `recepciones-pendientes` y `pagos-vencidos`

---

### **FASE 5: Eliminación de Páginas** 📄
**Duración:** 1-2 horas  
**Riesgo:** Bajo

#### 5.1 Páginas de Aprovisionamiento
```bash
# Eliminar estas páginas:
src/app/(logistica)/aprovisionamientos/ordenes-compra/[id]/page.tsx
src/app/(logistica)/aprovisionamientos/recepciones/[id]/page.tsx
src/app/(logistica)/aprovisionamientos/ordenes-compra/nuevo/page.tsx
```

#### 5.2 Actualizar Navegación
- [ ] Remover rutas del router
- [ ] Actualizar breadcrumbs
- [ ] Verificar enlaces internos

---

### **FASE 6: Limpieza de Tipos y Validadores** 📝
**Duración:** 2-3 horas  
**Riesgo:** Alto

#### 6.1 Archivos de Tipos
```bash
# Limpiar estos archivos:
src/types/modelos.ts                    # LIMPIAR comentarios
src/types/payloads.ts                   # LIMPIAR comentarios
src/lib/validators/base-generated.ts    # LIMPIAR comentarios
src/types/modelos-generated.ts          # LIMPIAR comentarios
```

#### 6.2 Acciones Específicas
- [ ] Eliminar comentarios sobre tipos removidos
- [ ] Limpiar imports huérfanos
- [ ] Actualizar exports
- [ ] Verificar que no hay referencias TypeScript

---

### **FASE 7: Limpieza de Tests y Mocks** 🧪
**Duración:** 1-2 horas  
**Riesgo:** Bajo

#### 7.1 Archivos de Testing
```bash
# Limpiar estos archivos:
src/__tests__/__mocks__/fixtures.ts     # LIMPIAR mocks
src/__tests__/__mocks__/services.ts     # LIMPIAR mocks
src/lib/__mocks__/cotizaciones.ts       # ACTUALIZAR
```

#### 7.2 Acciones de Limpieza
- [ ] Eliminar mocks de `OrdenCompra`, `Recepcion`, `Pago`
- [ ] Limpiar comentarios sobre mocks removidos
- [ ] Actualizar fixtures de prueba
- [ ] Verificar que tests restantes funcionan

---

### **FASE 8: Limpieza de Hooks y Utilidades** 🔧
**Duración:** 1 hora  
**Riesgo:** Bajo

#### 8.1 Hooks Afectados
```bash
# Actualizar estos archivos:
src/lib/hooks/useNotifications.ts           # ACTUALIZAR
src/app/configuracion/notificaciones/page.tsx  # ACTUALIZAR
```

#### 8.2 Actualizaciones
- [ ] Remover fetch de recepciones pendientes
- [ ] Eliminar fetch de pagos vencidos
- [ ] Actualizar documentación de notificaciones

---

### **FASE 9: Limpieza de Base de Datos** 🗄️
**Duración:** 2-3 horas  
**Riesgo:** Crítico

#### 9.1 Schema Prisma
```bash
# Archivo: prisma/schema.prisma
```

#### 9.2 Modelos a Eliminar
- [ ] `model OrdenCompra`
- [ ] `model ItemOrdenCompra`
- [ ] `model Recepcion`
- [ ] `model RecepcionItem`
- [ ] `model Pago`
- [ ] `model PagoItem`
- [ ] `model AprovisionamientoFinanciero`
- [ ] `model HistorialAprovisionamiento`

#### 9.3 Enums a Eliminar
- [ ] `enum EstadoOrdenCompra`
- [ ] `enum TipoOrdenCompra`
- [ ] `enum EstadoRecepcion`
- [ ] `enum TipoRecepcion`
- [ ] `enum EstadoPago`
- [ ] `enum TipoPago`
- [ ] `enum EstadoAprovisionamiento`

#### 9.4 Migración de Base de Datos
- [ ] Crear migración de eliminación
- [ ] Backup de datos existentes
- [ ] Ejecutar migración en desarrollo
- [ ] Verificar integridad referencial

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

### Pre-Eliminación
- [ ] Backup completo realizado
- [ ] Documentación de funcionalidades completada
- [ ] Plan de rollback preparado
- [ ] Equipo notificado del cambio

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

## 📅 Cronograma Sugerido

| Fase | Duración | Dependencias | Responsable |
|------|----------|--------------|-------------|
| 1 | 2-3h | - | Dev |
| 2 | 3-4h | Fase 1 | Dev |
| 3 | 2-3h | Fase 2 | Dev |
| 4 | 2-3h | Fase 3 | Dev + UI |
| 5 | 1-2h | Fase 4 | Dev |
| 6 | 2-3h | Fase 5 | Dev |
| 7 | 1-2h | Fase 6 | QA |
| 8 | 1h | Fase 7 | Dev |
| 9 | 2-3h | Fase 8 | DevOps + Dev |
| 10 | 3-4h | Fase 9 | QA + Dev |

**Total estimado:** 19-28 horas (2-3 días de trabajo)

---

*Documento generado el: [Fecha]*  
*Versión: 1.0*  
*Estado: Borrador*