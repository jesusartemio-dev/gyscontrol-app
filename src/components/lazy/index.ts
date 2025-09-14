/**
 * 🚀 Lazy Components Index
 * 
 * Exportaciones centralizadas de todos los componentes lazy loading.
 * Parte de la Fase 3 del Plan de Optimización de Performance.
 * 
 * @author TRAE AI - Senior Fullstack Developer
 * @version 1.0.0
 */

// ✅ Componentes lazy para tablas pesadas
export { LazyListaEquipoTable } from './LazyListaEquipoTable';
export { LazyPedidoEquipoTable } from './LazyPedidoEquipoTable';
export { LazyProyectoAprovisionamientoTable } from './LazyProyectoAprovisionamientoTable';

// 🔄 Exports por defecto para compatibilidad
export { default as LazyListaEquipoTableDefault } from './LazyListaEquipoTable';
export { default as LazyPedidoEquipoTableDefault } from './LazyPedidoEquipoTable';
export { default as LazyProyectoAprovisionamientoTableDefault } from './LazyProyectoAprovisionamientoTable';

// 📊 Métricas de componentes lazy (desarrollo)
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 Lazy Components: Índice cargado - 3 componentes disponibles');
}

// 📡 Tipos para TypeScript
export type LazyComponentProps = {
  [key: string]: any;
};

// 🔧 Utilidades para lazy loading
export const LAZY_COMPONENTS = {
  LISTA_EQUIPO_TABLE: 'LazyListaEquipoTable',
  PEDIDO_EQUIPO_TABLE: 'LazyPedidoEquipoTable',
  PROYECTO_APROVISIONAMIENTO_TABLE: 'LazyProyectoAprovisionamientoTable',
} as const;

export type LazyComponentType = typeof LAZY_COMPONENTS[keyof typeof LAZY_COMPONENTS];