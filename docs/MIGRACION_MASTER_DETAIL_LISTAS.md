# 🚀 Migración a Master-Detail: Listas de Equipos

## 📋 Resumen

Este documento describe la migración paso a paso de la arquitectura actual de listas de equipos (integrada) hacia un patrón **Master-Detail con rutas anidadas** para mejorar la escalabilidad, performance y UX.

## 🎯 Objetivo

Transformar:
- **Actual**: `/proyectos/[id]/equipos/listas` (todo integrado)
- **Nuevo**: 
  - `/proyectos/[id]/equipos/listas` → Vista Master (resumen)
  - `/proyectos/[id]/equipos/listas/[listaId]` → Vista Detail (gestión completa)

---

## 📊 Análisis de Impacto

### ✅ Beneficios
- **Performance**: Carga solo datos necesarios por vista
- **UX**: Navegación más intuitiva y menos cluttered
- **SEO**: URLs únicas y bookmarkeables
- **Escalabilidad**: Maneja proyectos con 20+ listas sin problemas
- **Mobile**: Mejor experiencia en dispositivos móviles

### ⚠️ Consideraciones
- **Refactoring**: ~15 archivos afectados
- **Testing**: Nuevos tests para rutas y componentes
- **Backward compatibility**: URLs existentes deben redirigir

---

## 🗂️ Estructura de Archivos

### Antes
```
src/app/proyectos/[id]/equipos/listas/
├── page.tsx                    # Todo integrado
└── components/
    ├── ListaEquipoList.tsx
    ├── ListaEquipoForm.tsx
    └── ListaEquipoItemList.tsx
```

### Después
```
src/app/proyectos/[id]/equipos/listas/
├── page.tsx                    # Vista Master (resumen)
├── [listaId]/
│   └── page.tsx               # Vista Detail (gestión)
└── components/
    ├── ListaEquipoMasterView.tsx    # Nuevo: Vista resumen
    ├── ListaEquipoDetailView.tsx    # Nuevo: Vista detalle
    ├── ListaEquipoCard.tsx          # Nuevo: Card compacta
    ├── ListaEquipoForm.tsx          # Reutilizado
    └── ListaEquipoItemList.tsx      # Reutilizado
```

---

## 🚦 Plan de Implementación por Fases

### **FASE 1: Preparación y Análisis** ⏱️ 2-3 horas

#### 1.1 Backup y Documentación
```bash
# Crear backup de archivos actuales
cp -r src/app/proyectos/[id]/equipos/listas src/app/proyectos/[id]/equipos/listas_backup

# Documentar componentes actuales
npm run test -- --coverage src/components/equipos/
```

#### 1.2 Análisis de Dependencias
- [ ] Revisar imports en `ListaEquipoList.tsx`
- [ ] Identificar props compartidas entre Master/Detail
- [ ] Mapear servicios API utilizados
- [ ] Documentar estados y efectos actuales

#### 1.3 Definir Interfaces
```typescript
// types/listas-equipos.ts
interface ListaEquipoMasterProps {
  proyectoId: string;
  listas: ListaEquipo[];
  onCreateLista: (data: CreateListaEquipoPayload) => Promise<void>;
  onNavigateToDetail: (listaId: string) => void;
}

interface ListaEquipoDetailProps {
  proyectoId: string;
  listaId: string;
  lista: ListaEquipo;
  items: ListaEquipoItem[];
  onUpdateLista: (data: UpdateListaEquipoPayload) => Promise<void>;
  onDeleteLista: () => Promise<void>;
}
```

---

### **FASE 2: Crear Componentes Master** ⏱️ 4-5 horas

#### 2.1 Crear `ListaEquipoCard.tsx`
```typescript
// components/equipos/ListaEquipoCard.tsx
// Card compacta para vista Master
// - Información esencial: código, nombre, estado, items count, costo
// - Botones: Ver Detalle, Acciones rápidas
// - Estados visuales: draft, active, completed
```

#### 2.2 Crear `ListaEquipoMasterView.tsx`
```typescript
// components/equipos/ListaEquipoMasterView.tsx
// Vista principal con:
// - Header con estadísticas del proyecto
// - Filtros: estado, responsable, fecha
// - Grid de ListaEquipoCard
// - Paginación si >20 listas
// - Botón "Nueva Lista"
```

#### 2.3 Refactorizar `page.tsx` (Master)
```typescript
// app/proyectos/[id]/equipos/listas/page.tsx
// Simplificar a vista Master:
// - Cargar solo datos esenciales de listas
// - Usar ListaEquipoMasterView
// - Mantener formulario de creación
```

#### 2.4 Testing Fase 2
```bash
# Tests para componentes Master
npm test src/components/equipos/ListaEquipoCard.test.tsx
npm test src/components/equipos/ListaEquipoMasterView.test.tsx
npm test src/app/proyectos/[id]/equipos/listas/page.test.tsx
```

---

### **FASE 3: Crear Ruta y Vista Detail** ⏱️ 5-6 horas

#### 3.1 Crear estructura de carpetas
```bash
mkdir -p src/app/proyectos/[id]/equipos/listas/[listaId]
```

#### 3.2 Crear `[listaId]/page.tsx`
```typescript
// app/proyectos/[id]/equipos/listas/[listaId]/page.tsx
// Vista Detail completa:
// - Breadcrumb navigation
// - Header con info de lista y proyecto
// - Tabs: Items, Historial, Configuración
// - Gestión completa de items (tabla expandida)
// - Acciones: Agregar equipos, Cotizar, Crear pedido
```

#### 3.3 Crear `ListaEquipoDetailView.tsx`
```typescript
// components/equipos/ListaEquipoDetailView.tsx
// Componente principal de detalle:
// - Reutilizar ListaEquipoItemList existente
// - Agregar navegación y contexto
// - Optimizar para vista completa
```

#### 3.4 Configurar rutas dinámicas
```typescript
// Validar parámetros de ruta
// Manejar casos de lista no encontrada
// Implementar redirecciones si es necesario
```

#### 3.5 Testing Fase 3
```bash
# Tests para vista Detail
npm test src/app/proyectos/[id]/equipos/listas/[listaId]/page.test.tsx
npm test src/components/equipos/ListaEquipoDetailView.test.tsx
```

---

### **FASE 4: Integración y Navegación** ⏱️ 3-4 horas

#### 4.1 Implementar navegación
```typescript
// Botones "Ver Detalle" en Master
// Botón "Volver a Listas" en Detail
// Breadcrumbs dinámicos
// Navegación por teclado (accesibilidad)
```

#### 4.2 Optimizar servicios API
```typescript
// lib/services/listaEquipo.ts
// Separar endpoints:
// - getListasResumen() → Para vista Master
// - getListaCompleta(id) → Para vista Detail
// - Implementar caché inteligente
```

#### 4.3 Estados compartidos
```typescript
// Implementar Context o Zustand si es necesario
// Sincronizar cambios entre Master y Detail
// Manejar navegación con datos actualizados
```

#### 4.4 Testing Fase 4
```bash
# Tests de integración
npm test src/lib/services/listaEquipo.test.ts
npm test -- --testNamePattern="navigation"
```

---

### **FASE 5: UX/UI y Performance** ⏱️ 4-5 horas

#### 5.1 Animaciones y transiciones
```typescript
// Framer Motion para:
// - Transición Master → Detail
// - Loading states
// - Hover effects en cards
// - Stagger animations en grids
```

#### 5.2 Loading y Error states
```typescript
// Skeleton loaders específicos
// Error boundaries
// Retry mechanisms
// Empty states con ilustraciones
```

#### 5.3 Responsive design
```typescript
// Mobile-first approach
// Breakpoints optimizados
// Touch interactions
// Navegación móvil mejorada
```

#### 5.4 Performance optimizations
```typescript
// React.memo en componentes pesados
// useMemo para cálculos complejos
// Lazy loading de componentes
// Prefetch de datos en hover
```

---

### **FASE 6: Testing y Validación** ⏱️ 3-4 horas

#### 6.1 Testing completo
```bash
# Unit tests
npm test src/components/equipos/
npm test src/app/proyectos/[id]/equipos/listas/

# Integration tests
npm test -- --testNamePattern="integration"

# E2E tests (si aplica)
npm run test:e2e
```

#### 6.2 Validación manual
- [ ] Navegación Master → Detail → Master
- [ ] Creación de lista desde Master
- [ ] Gestión completa desde Detail
- [ ] Responsive en móvil/tablet
- [ ] Performance con 20+ listas
- [ ] Accesibilidad (navegación por teclado)

#### 6.3 Cleanup
```bash
# Remover archivos backup
rm -rf src/app/proyectos/[id]/equipos/listas_backup

# Limpiar imports no utilizados
npm run lint -- --fix
```

---

### **FASE 7: Deployment y Monitoreo** ⏱️ 2-3 horas

#### 7.1 Preparar deployment
```bash
# Build y verificación
npm run build
npm run start

# Verificar rutas en producción
curl http://localhost:3000/proyectos/1/equipos/listas
curl http://localhost:3000/proyectos/1/equipos/listas/123
```

#### 7.2 Configurar redirects (si es necesario)
```javascript
// next.config.ts
module.exports = {
  async redirects() {
    return [
      {
        source: '/proyectos/:id/equipos/lista-equipos',
        destination: '/proyectos/:id/equipos/listas',
        permanent: true,
      },
    ];
  },
};
```

#### 7.3 Monitoreo post-deployment
- [ ] Verificar métricas de performance
- [ ] Monitorear errores en Sentry/logs
- [ ] Feedback de usuarios
- [ ] Métricas de uso de nuevas rutas

---

## 📋 Checklist de Validación

### Funcionalidad
- [ ] ✅ Vista Master muestra resumen de listas
- [ ] ✅ Vista Detail permite gestión completa
- [ ] ✅ Navegación fluida entre vistas
- [ ] ✅ Formularios funcionan correctamente
- [ ] ✅ APIs responden según vista
- [ ] ✅ Estados de loading/error manejados

### Performance
- [ ] ✅ Vista Master carga <2s con 20+ listas
- [ ] ✅ Vista Detail carga <3s con 100+ items
- [ ] ✅ Navegación sin re-renders innecesarios
- [ ] ✅ Memoria estable durante uso prolongado

### UX/UI
- [ ] ✅ Diseño consistente con sistema GYS
- [ ] ✅ Responsive en móvil/tablet/desktop
- [ ] ✅ Animaciones fluidas y no intrusivas
- [ ] ✅ Accesibilidad (WCAG 2.1 AA)
- [ ] ✅ Breadcrumbs y navegación clara

### Testing
- [ ] ✅ Cobertura >90% en componentes nuevos
- [ ] ✅ Tests de integración pasando
- [ ] ✅ No regresiones en funcionalidad existente

---

## 🚨 Riesgos y Mitigaciones

### Riesgo: Pérdida de contexto entre vistas
**Mitigación**: Implementar breadcrumbs claros y botones de navegación prominentes

### Riesgo: Performance degradada con muchos items
**Mitigación**: Paginación, virtualización y lazy loading

### Riesgo: Complejidad de testing aumentada
**Mitigación**: Tests incrementales por fase y mocks bien definidos

### Riesgo: Usuarios confundidos con nueva navegación
**Mitigación**: Tooltips, onboarding sutil y documentación actualizada

---

## 📈 Métricas de Éxito

- **Performance**: Tiempo de carga <3s en vista Detail
- **UX**: Reducción 40% en clics para gestionar items
- **Escalabilidad**: Soporte para 50+ listas sin degradación
- **Adopción**: 90% de usuarios usan nueva navegación en 2 semanas

---

## 🔄 Rollback Plan

En caso de problemas críticos:

1. **Inmediato**: Revertir deployment a versión anterior
2. **Temporal**: Restaurar archivos desde `listas_backup`
3. **Comunicación**: Notificar a usuarios sobre mantenimiento
4. **Análisis**: Identificar causa raíz antes de re-deployment

---

## 📚 Recursos Adicionales

- [FLUJO_GYS.md](./FLUJO_GYS.md) - Estándares de desarrollo
- [MEJORAS_UX_UI.md](./MEJORAS_UX_UI.md) - Guías de diseño
- [Next.js Dynamic Routes](https://nextjs.org/docs/routing/dynamic-routes)
- [React Performance Patterns](https://react.dev/learn/render-and-commit)

---

**Autor**: Agente TRAE GYS  
**Fecha**: Enero 2025  
**Versión**: 1.0  
**Estado**: Pendiente de implementación