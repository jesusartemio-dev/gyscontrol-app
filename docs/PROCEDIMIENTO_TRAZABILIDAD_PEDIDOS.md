# 📋 Procedimiento de Implementación: Trazabilidad de Pedidos

## 🎯 Objetivo
Implementar un sistema completo de trazabilidad para pedidos de equipos que permita:
- Seguimiento detallado de entregas parciales por item
- Dashboard de reportes y métricas
- Actualización de páginas existentes con nueva funcionalidad

---

## ✅ Estado Actual del Proyecto (Enero 2025)

### 🗄️ Base de Datos - COMPLETAMENTE IMPLEMENTADO ✅
- **Esquema Prisma**: Los modelos `PedidoEquipo` y `PedidoEquipoItem` incluyen campos completos de trazabilidad
- **Campos implementados en PedidoEquipoItem**: 
  - `fechaEntregaEstimada: DateTime?` - Fecha estimada de entrega del item
  - `fechaEntregaReal: DateTime?` - Fecha real de entrega del item
  - `estadoEntrega: EstadoEntregaItem` - Estado granular de entrega (pendiente, en_proceso, parcial, entregado, retrasado, cancelado)
  - `observacionesEntrega: String?` - Comentarios sobre la entrega
  - `cantidadAtendida: Float?` - Cantidad ya entregada (campo existente)
  - `comentarioLogistica: String?` - Comentarios logísticos (campo existente)
- **Enum EstadoEntregaItem**: Implementado con valores: pendiente, en_proceso, parcial, entregado, retrasado, cancelado
- **Migración**: Aplicada exitosamente (20250909223932_add_item_delivery_tracking)

### 🔧 TypeScript Types - REQUIERE ACTUALIZACIÓN ⚠️
- **Existente**: `MetricasPedidos` interface en `SeguimientoPedidos.tsx`
- **Faltante**: Actualizar `src/types/modelos.ts` con nuevos campos de trazabilidad
- **Requerido**: 
  - Agregar `EstadoEntregaItem` enum
  - Actualizar interface `PedidoEquipoItem` con campos: `fechaEntregaEstimada`, `fechaEntregaReal`, `estadoEntrega`, `observacionesEntrega`
  - Crear interface `TrazabilidadItem` para métricas
- **Estado**: Los tipos base existen pero necesitan sincronización con el esquema actualizado

### 🌐 APIs - NO IMPLEMENTADO ❌
- **Faltante**: `/api/pedido-equipo/entregas/route.ts`
- **Faltante**: `/api/reportes/pedidos/route.ts`
- **Existente**: APIs base de `pedido-equipo` y `pedido-equipo-item`

### 🎨 Componentes UI - PARCIALMENTE IMPLEMENTADO ⚠️
- **Existente**: `PedidoEquipoTable`, `PedidoEquipoForm`, `SeguimientoPedidos`
- **Faltante**: `EntregaItemForm`, `TrazabilidadTimeline`, `EstadoEntregaBadge`
- **Funcionalidad**: Componentes actuales no incluyen gestión de entregas

## 📊 Páginas a Actualizar/Crear

### 🏗️ PROYECTOS - EXISTENTE, REQUIERE ACTUALIZACIÓN
- **Página**: `/proyectos/[id]/pedidos-equipo` (ya existe)
- **Estado**: Funcionalidad básica implementada
- **Pendiente**: Integrar vista de estado de entrega

### 🚚 LOGÍSTICA - NO IMPLEMENTADO ❌
- **Página**: `/logistica/entregas` (no existe)
- **Funcionalidad**: Gestión de entregas y actualización de estados
- **Componentes**: `EntregaItemForm`, `TrazabilidadTimeline`

### 📊 GESTIÓN - PARCIALMENTE IMPLEMENTADO ⚠️
- **Página**: `/gestion/reportes/pedidos` (no existe)
- **Existente**: Componente `SeguimientoPedidos` con métricas básicas
- **Pendiente**: Dashboard completo con reportes avanzados

---

## 🚀 FASE 1: Completar Implementación de Trazabilidad

### ✅ Paso 1.1: Schema Prisma - COMPLETAMENTE IMPLEMENTADO ✅

**Estado Actual**: El esquema incluye TODOS los campos necesarios para trazabilidad completa

**Campos Implementados en PedidoEquipoItem**:
- `fechaEntregaEstimada: DateTime?` - Fecha estimada de entrega del item
- `fechaEntregaReal: DateTime?` - Fecha real de entrega del item  
- `estadoEntrega: EstadoEntregaItem @default(pendiente)` - Estado granular de entrega
- `observacionesEntrega: String?` - Comentarios sobre la entrega
- `cantidadAtendida: Float?` - Cantidad ya entregada (campo existente)
- `comentarioLogistica: String?` - Comentarios logísticos (campo existente)
- `estado: EstadoPedidoItem` - Estado general del item (PENDIENTE, APROBADO, RECHAZADO)

**Enum EstadoEntregaItem Implementado**:
- `pendiente` - Item pendiente de entrega
- `en_proceso` - Item en proceso de entrega
- `parcial` - Item con entrega parcial
- `entregado` - Item completamente entregado
- `retrasado` - Item con retraso en entrega
- `cancelado` - Item cancelado

**Check**: ✅ Schema completamente implementado con trazabilidad granular

### ✅ Paso 1.2: Migración - APLICADA EXITOSAMENTE ✅

```bash
# Migración aplicada:
# 20250909223932_add_item_delivery_tracking
# Incluye: EstadoEntregaItem enum + campos de trazabilidad

# Para regenerar cliente si es necesario:
npx prisma generate
```

**Check**: ✅ Migración aplicada correctamente - Base de datos actualizada

### ⚠️ Paso 1.3: Types TypeScript - REQUIERE ACTUALIZACIÓN ⚠️

**Estado Actual**: 
- ✅ `MetricasPedidos` interface existe en `SeguimientoPedidos.tsx`
- ❌ Falta sincronizar `src/types/modelos.ts` con nuevos campos del schema
- ❌ Faltan tipos específicos para trazabilidad granular

**Acción Requerida**: Actualizar `src/types/modelos.ts`

```typescript
// 🆕 ENUM A AGREGAR
export enum EstadoEntregaItem {
  PENDIENTE = 'pendiente',
  EN_PROCESO = 'en_proceso', 
  PARCIAL = 'parcial',
  ENTREGADO = 'entregado',
  RETRASADO = 'retrasado',
  CANCELADO = 'cancelado'
}

// 🔄 ACTUALIZAR INTERFACE EXISTENTE
export interface PedidoEquipoItem {
  // ... campos existentes ...
  
  // 🆕 Nuevos campos de trazabilidad
  fechaEntregaEstimada?: Date;
  fechaEntregaReal?: Date;
  estadoEntrega: EstadoEntregaItem;
  observacionesEntrega?: string;
  
  // Campos existentes actualizados
  cantidadAtendida?: number; // Ya existe
  comentarioLogistica?: string; // Ya existe
}

// 🆕 NUEVA INTERFACE PARA MÉTRICAS
export interface TrazabilidadItem {
  itemId: string;
  equipoNombre: string;
  cantidadSolicitada: number;
  cantidadEntregada: number;
  porcentajeCompletitud: number;
  diasRetraso: number;
  estadoEntrega: EstadoEntregaItem;
  fechaEntregaEstimada?: Date;
  fechaEntregaReal?: Date;
}

// Mover desde SeguimientoPedidos.tsx
export interface MetricasPedidos {
  totalPedidos: number;
  pedidosCompletos: number;
  pedidosParciales: number;
  pedidosRetrasados: number;
  tiempoPromedioEntrega: number;
  valorTotalPedidos: number;
  pedidosVencidos: number;
}

// Función auxiliar para métricas
export function calcularTiempoPromedioEntrega(pedidos: PedidoEquipo[]): number {
  const pedidosCompletados = pedidos.filter(p => p.fechaEntregaReal);
  if (pedidosCompletados.length === 0) return 0;
  
  const tiempos = pedidosCompletados.map(p => {
    const inicio = new Date(p.fechaCreacion);
    const fin = new Date(p.fechaEntregaReal!);
    return Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  });
  
  return Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length);
}
```

**Check**: ⚠️ Requiere implementación de tipos centralizados

---

## 🔧 FASE 2: Servicios y APIs - NO IMPLEMENTADO ❌

### ✅ Paso 2.1: Servicio de Pedidos - EXISTENTE, REQUIERE EXTENSIÓN ⚠️

**Estado Actual**: 
- ✅ Servicio base `pedidoEquipo.ts` implementado con CRUD básico
- ❌ Faltan funciones específicas de trazabilidad
- ❌ Faltan funciones específicas para logística

**Funciones Faltantes a Implementar**:

```typescript
// NUEVAS FUNCIONES REQUERIDAS EN src/lib/services/pedidoEquipo.ts

// 📦 Actualizar entrega de item - ACTUALIZADO PARA NUEVOS CAMPOS
export async function actualizarEntregaItem(
  itemId: string,
  datos: {
    cantidadAtendida: number;
    fechaEntregaReal?: Date;
    observacionesEntrega?: string; // 🆕 Nuevo campo
    usuarioEntrega: string;
  }
) {
  const item = await prisma.pedidoEquipoItem.findUnique({
    where: { id: itemId },
    include: { pedido: true }
  });

  if (!item) throw new Error('Item no encontrado');

  // 🆕 Determinar nuevo estadoEntrega basado en cantidadAtendida vs cantidadPedida
  let nuevoEstadoEntrega: EstadoEntregaItem = 'pendiente';
  if (datos.cantidadAtendida >= item.cantidadPedida) {
    nuevoEstadoEntrega = 'entregado'; // Completamente entregado
  } else if (datos.cantidadAtendida > 0) {
    nuevoEstadoEntrega = 'parcial'; // Parcialmente entregado
  }

  // Verificar si está retrasado
  if (item.fechaEntregaEstimada && new Date() > new Date(item.fechaEntregaEstimada) && nuevoEstadoEntrega !== 'entregado') {
    nuevoEstadoEntrega = 'retrasado';
  }

  // 🆕 Actualizar item con nuevos campos
  const itemActualizado = await prisma.pedidoEquipoItem.update({
    where: { id: itemId },
    data: {
      cantidadAtendida: datos.cantidadAtendida,
      fechaEntregaReal: datos.fechaEntregaReal,
      estadoEntrega: nuevoEstadoEntrega, // 🆕 Nuevo campo
      observacionesEntrega: datos.observacionesEntrega, // 🆕 Nuevo campo
      updatedAt: new Date()
    }
  });

  // Verificar completitud del pedido
  await verificarCompletitudPedido(item.pedidoId);

  return itemActualizado;
}

// 🔍 Verificar si pedido está completo - ACTUALIZADO
export async function verificarCompletitudPedido(pedidoId: string) {
  const items = await prisma.pedidoEquipoItem.findMany({
    where: { pedidoId }
  });

  // 🆕 Verificar completitud usando nuevos campos
  const todosEntregados = items.every(item => 
    item.estadoEntrega === 'entregado' || 
    (item.cantidadAtendida && item.cantidadAtendida >= item.cantidadPedida)
  );

  const algunosParciales = items.some(item => 
    item.estadoEntrega === 'parcial' || item.estadoEntrega === 'en_proceso'
  );

  // Determinar estado del pedido
  let estadoPedido = 'EN_PROCESO';
  if (todosEntregados) {
    estadoPedido = 'COMPLETADO';
  } else if (algunosParciales) {
    estadoPedido = 'EN_PROCESO';
  }

  await prisma.pedidoEquipo.update({
    where: { id: pedidoId },
    data: {
      fechaEntregaReal: todosEntregados ? new Date() : null,
      estado: estadoPedido
    }
  });
}

// 📊 Obtener métricas de pedidos
export async function obtenerMetricasPedidos(proyectoId?: string): Promise<MetricasPedidos> {
  const whereClause = proyectoId ? { proyectoId } : {};
  
  const pedidos = await prisma.pedidoEquipo.findMany({
    where: whereClause,
    include: { items: true }
  });

  return {
    totalPedidos: pedidos.length,
    pedidosCompletos: pedidos.filter(p => p.estado === 'COMPLETADO').length,
    pedidosParciales: pedidos.filter(p => p.estado === 'EN_PROCESO').length,
    pedidosRetrasados: pedidos.filter(p => 
      p.fechaEntregaEstimada && 
      new Date(p.fechaEntregaEstimada) < new Date() && 
      p.estado !== 'COMPLETADO'
    ).length,
    tiempoPromedioEntrega: calcularTiempoPromedioEntrega(pedidos),
    valorTotalPedidos: 0, // Calcular según items
    pedidosVencidos: 0
  };
}

// 🚚 Funciones específicas para LOGÍSTICA
export async function obtenerPedidosLogistica(filtros?: {
  estado?: string;
  proyecto?: string;
}) {
  const whereClause: any = {
    estado: { notIn: ['BORRADOR', 'CANCELADO'] }
  };

  if (filtros?.estado && filtros.estado !== 'todos') {
    whereClause.estado = filtros.estado;
  }

  if (filtros?.proyecto) {
    whereClause.proyectoId = filtros.proyecto;
  }

  return await prisma.pedidoEquipo.findMany({
    where: whereClause,
    include: {
      proyecto: { select: { nombre: true, codigo: true } },
      responsable: { select: { nombre: true, email: true } },
      items: {
        include: {
          listaEquipoItem: {
            include: { equipo: true }
          }
        }
      }
    },
    orderBy: { fechaCreacion: 'desc' }
  });
}
```

**Check**: ❌ Requiere implementación de funciones de trazabilidad
    where: whereClause,
    include: {
      proyecto: {
        select: { nombre: true, codigo: true }
      },
      items: {
        include: {
          equipo: {
            select: { nombre: true, codigo: true }
          }
        }
      }
    },
    orderBy: [
      { fechaEntregaEstimada: 'asc' },
      { fechaCreacion: 'desc' }
    ]
  });
}

export async function obtenerPedidoLogisticaDetalle(pedidoId: string) {
  return await prisma.pedidoEquipo.findUnique({
    where: { id: pedidoId },
    include: {
      proyecto: {
        select: { nombre: true, codigo: true }
      },
      items: {
        include: {
          equipo: {
            select: { id: true, nombre: true, codigo: true }
          }
        },
        orderBy: { fechaCreacion: 'asc' }
      }
    }
  });
}
```

**Check**: ☐ Servicio actualizado con nuevas funciones

### ✅ Paso 2.2: Crear APIs de Trazabilidad

**Archivo**: `src/app/api/pedidos/[id]/entregas/route.ts` - ACTUALIZADO

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { actualizarEntregaItem } from '@/lib/services/pedidoEquipo';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// 🆕 Schema de validación con nuevos campos
const EntregaSchema = z.object({
  cantidadAtendida: z.number().min(0),
  fechaEntregaReal: z.string().datetime().optional(),
  observacionesEntrega: z.string().optional() // 🆕 Nuevo campo
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const datos = EntregaSchema.parse(body);
    
    const resultado = await actualizarEntregaItem(params.id, {
      cantidadAtendida: datos.cantidadAtendida,
      fechaEntregaReal: datos.fechaEntregaReal ? new Date(datos.fechaEntregaReal) : undefined,
      observacionesEntrega: datos.observacionesEntrega, // 🆕 Nuevo campo
      usuarioEntrega: session.user.email
    });

    return NextResponse.json(resultado);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al actualizar entrega' },
      { status: 500 }
    );
  }
}
```

**Check**: ☐ API de entregas creada

**Archivo**: `src/app/api/reportes/pedidos/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { obtenerMetricasPedidos } from '@/lib/services/pedidoEquipo';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const proyectoId = searchParams.get('proyectoId') || undefined;
    
    const metricas = await obtenerMetricasPedidos(proyectoId);
    return NextResponse.json(metricas);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener métricas' },
      { status: 500 }
    );
  }
}
```

**Check**: ☐ API de reportes creada

---

## 🎨 FASE 3: Componentes UI

### ✅ Paso 3.1: Componente de Entrega de Items

**Archivo**: `src/components/equipos/EntregaItemForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { PedidoEquipoItem } from '@/types/modelos';

interface EntregaItemFormProps {
  item: PedidoEquipoItem;
  onEntregaRegistrada: () => void;
}

export function EntregaItemForm({ item, onEntregaRegistrada }: EntregaItemFormProps) {
  const [cantidadEntregada, setCantidadEntregada] = useState(0);
  const [observaciones, setObservaciones] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState(''); // 🆕 Nuevo campo
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/pedidos/${item.id}/entregas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidadAtendida: cantidadEntregada, // 🔄 Campo actualizado
          fechaEntregaReal: fechaEntrega || undefined, // 🆕 Nuevo campo
          observacionesEntrega: observaciones // 🔄 Campo actualizado
        })
      });

      if (!response.ok) throw new Error('Error al registrar entrega');

      toast({
        title: 'Entrega registrada',
        description: 'La entrega se ha registrado correctamente'
      });

      onEntregaRegistrada();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo registrar la entrega',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Usar cantidadAtendida en lugar de cantidadEntregada
  const cantidadPendiente = item.cantidadPedida - (item.cantidadAtendida || 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Cantidad Solicitada</Label>
          <Input value={item.cantidadPedida} disabled /> {/* 🔄 Campo actualizado */}
        </div>
        <div>
          <Label>Cantidad Atendida</Label>
          <Input value={item.cantidadAtendida || 0} disabled /> {/* 🔄 Campo actualizado */}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nueva Entrega</Label>
          <Input
            type="number"
            min="0"
            max={cantidadPendiente}
            value={cantidadEntregada}
            onChange={(e) => setCantidadEntregada(Number(e.target.value))}
            placeholder={`Máximo: ${cantidadPendiente}`}
          />
        </div>
        <div>
          <Label>Fecha de Entrega</Label> {/* 🆕 Nuevo campo */}
          <Input
            type="datetime-local"
            value={fechaEntrega}
            onChange={(e) => setFechaEntrega(e.target.value)}
          />
        </div>
      </div>
      
      <div>
        <Label>Observaciones de Entrega</Label> {/* 🔄 Label actualizado */}
        <Textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Observaciones sobre esta entrega..."
        />
      </div>
      
      <Button type="submit" disabled={loading || cantidadEntregada <= 0}>
        {loading ? 'Registrando...' : 'Registrar Entrega'}
      </Button>
    </form>
  );
}
```

**Check**: ☐ Componente de entrega creado

### ✅ Paso 3.2: Componente de Progreso de Items

**Archivo**: `src/components/equipos/ProgresoItemCard.tsx`

```typescript
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PedidoEquipoItem } from '@/types/modelos';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProgresoItemCardProps {
  item: PedidoEquipoItem;
}

export function ProgresoItemCard({ item }: ProgresoItemCardProps) {
  // 🔄 Usar cantidadAtendida y cantidadPedida
  const porcentaje = ((item.cantidadAtendida || 0) / item.cantidadPedida) * 100;
  
  // 🆕 Actualizar estados para el nuevo enum
  const getEstadoBadge = (estado: string) => {
    const variants = {
      'pendiente': 'secondary',
      'en_proceso': 'default', 
      'parcial': 'outline',
      'entregado': 'default',
      'retrasado': 'destructive',
      'cancelado': 'destructive'
    } as const;
    
    return variants[estado as keyof typeof variants] || 'secondary';
  };

  // 🆕 Función para mostrar estado legible
  const getEstadoTexto = (estado: string) => {
    const textos = {
      'pendiente': 'Pendiente',
      'en_proceso': 'En Proceso',
      'parcial': 'Entrega Parcial',
      'entregado': 'Entregado',
      'retrasado': 'Retrasado',
      'cancelado': 'Cancelado'
    } as const;
    
    return textos[estado as keyof typeof textos] || estado;
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{item.listaEquipoItem?.equipo?.nombre || item.descripcion}</h4> {/* 🔄 Campo actualizado */}
          <p className="text-sm text-muted-foreground">
            {item.cantidadAtendida || 0} / {item.cantidadPedida} unidades {/* 🔄 Campos actualizados */}
          </p>
        </div>
        <Badge variant={getEstadoBadge(item.estadoEntrega)}>
          {getEstadoTexto(item.estadoEntrega)} {/* 🆕 Texto mejorado */}
        </Badge>
      </div>
      
      <Progress value={porcentaje} className="h-2" />
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        {item.fechaEntregaEstimada && (
          <div>
            <span className="text-muted-foreground">Estimada:</span>
            <p>{format(new Date(item.fechaEntregaEstimada), 'dd/MM/yyyy', { locale: es })}</p>
          </div>
        )}
        {item.fechaEntregaReal && (
          <div>
            <span className="text-muted-foreground">Entregada:</span>
            <p>{format(new Date(item.fechaEntregaReal), 'dd/MM/yyyy', { locale: es })}</p>
          </div>
        )}
      </div>
      
      {item.observacionesEntrega && (
        <div className="text-sm">
          <span className="text-muted-foreground">Observaciones de Entrega:</span> {/* 🔄 Label actualizado */}
          <p className="mt-1">{item.observacionesEntrega}</p>
        </div>
      )}
      
      {/* 🆕 Mostrar también comentarios logísticos si existen */}
      {item.comentarioLogistica && (
        <div className="text-sm">
          <span className="text-muted-foreground">Comentarios Logística:</span>
          <p className="mt-1">{item.comentarioLogistica}</p>
        </div>
      )}
    </div>
  );
}
```

**Check**: ☐ Componente de progreso creado

---

## 📱 FASE 4: Actualización de Páginas

**Estado**: REQUIERE ACTUALIZACIÓN

**Acciones Requeridas**:
- Actualizar imports para usar nuevos tipos de `src/types/modelos.ts`
- Integrar componentes actualizados con campos de trazabilidad
- Verificar que las páginas muestren correctamente los nuevos estados
- Actualizar filtros y búsquedas para incluir `estadoEntrega`

### 🔄 Paso 4.1: Actualizar Página Master de Pedidos (PROYECTOS)
**Estado**: REQUIERE ACTUALIZACIÓN

**Archivo**: `src/app/proyectos/[id]/equipos/pedidos/page.tsx`

```typescript
// 🔄 Agregar columnas de trazabilidad actualizadas
const columnas = [
  // ... columnas existentes ...
  {
    accessorKey: 'progreso',
    header: 'Progreso de Entrega', // 🔄 Header actualizado
    cell: ({ row }) => {
      const pedido = row.original;
      const totalItems = pedido.items?.length || 0;
      // 🔄 Usar estadoEntrega en lugar de cantidades
      const itemsEntregados = pedido.items?.filter(
        item => item.estadoEntrega === 'entregado'
      ).length || 0;
      const itemsParciales = pedido.items?.filter(
        item => item.estadoEntrega === 'parcial'
      ).length || 0;
      
      const porcentaje = totalItems > 0 ? (itemsEntregados / totalItems) * 100 : 0;
      
      return (
        <div className="space-y-1">
          <Progress value={porcentaje} className="h-2" />
          <span className="text-xs text-muted-foreground">
            {itemsEntregados} entregados, {itemsParciales} parciales / {totalItems} items
          </span>
        </div>
      );
    }
  },
  {
    accessorKey: 'fechaEntregaEstimada',
    header: 'Fecha Estimada', // 🔄 Header simplificado
    cell: ({ row }) => {
      const fecha = row.getValue('fechaEntregaEstimada') as Date;
      return fecha ? format(fecha, 'dd/MM/yyyy', { locale: es }) : '-';
    }
  },
  // 🆕 Nueva columna para estado general
  {
    accessorKey: 'estadoGeneral',
    header: 'Estado',
    cell: ({ row }) => {
      const pedido = row.original;
      const estados = pedido.items?.map(item => item.estadoEntrega) || [];
      
      let estadoGeneral = 'pendiente';
      if (estados.every(e => e === 'entregado')) estadoGeneral = 'entregado';
      else if (estados.some(e => e === 'entregado' || e === 'parcial')) estadoGeneral = 'parcial';
      else if (estados.some(e => e === 'retrasado')) estadoGeneral = 'retrasado';
      
      const variants = {
        'pendiente': 'secondary',
        'parcial': 'outline',
        'entregado': 'default',
        'retrasado': 'destructive'
      } as const;
      
      return (
        <Badge variant={variants[estadoGeneral as keyof typeof variants]}>
          {estadoGeneral.charAt(0).toUpperCase() + estadoGeneral.slice(1)}
        </Badge>
      );
    }
  }
];
```

**Check**: ☐ Página master actualizada con progreso

### 🔄 Paso 4.2: Actualizar Página Detalle de Pedido (PROYECTOS)
**Estado**: REQUIERE ACTUALIZACIÓN

**Archivo**: `src/app/proyectos/[id]/equipos/pedidos/[pedidoId]/page.tsx`

```typescript
// Agregar sección de trazabilidad
export default function PedidoDetallePage({ params }: { params: { id: string; pedidoId: string } }) {
  // ... código existente ...
  
  return (
    <div className="space-y-6">
      {/* ... contenido existente ... */}
      
      {/* Nueva sección de trazabilidad */}
      <Card>
        <CardHeader>
          <CardTitle>Trazabilidad de Entregas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {pedido.items?.map((item) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <ProgresoItemCard item={item} />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Registrar Entrega
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Registrar Entrega</DialogTitle>
                      </DialogHeader>
                      <EntregaItemForm 
                        item={item} 
                        onEntregaRegistrada={() => {
                          // Refrescar datos
                          window.location.reload();
                        }} 
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Check**: ☐ Página detalle actualizada con trazabilidad

### 🔄 Paso 4.3: Crear Página Master de Entregas (LOGÍSTICA)
**Estado**: REQUIERE ACTUALIZACIÓN

**Archivo**: `src/app/logistica/pedidos/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Search, Package, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

interface PedidoLogistica {
  id: string;
  codigo: string;
  proyecto: { nombre: string; codigo: string };
  fechaCreacion: Date;
  fechaEntregaEstimada?: Date;
  estado: string;
  items: Array<{
    id: string;
    cantidadPedida: number; // 🔄 Campo actualizado
    cantidadAtendida?: number; // 🔄 Campo actualizado
    fechaEntregaEstimada?: Date; // 🆕 Nuevo campo
    fechaEntregaReal?: Date; // 🆕 Nuevo campo
    observacionesEntrega?: string; // 🆕 Nuevo campo
    listaEquipoItem?: { // 🔄 Relación actualizada
      equipo: { nombre: string };
    };
    descripcion?: string; // 🆕 Campo alternativo
    estadoEntrega: 'pendiente' | 'en_proceso' | 'parcial' | 'entregado' | 'retrasado' | 'cancelado'; // 🔄 Enum actualizado
  }>;
}

export default function LogisticaPedidosPage() {
  const [pedidos, setPedidos] = useState<PedidoLogistica[]>([]);
  const [filtro, setFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarPedidos();
  }, []);

  const cargarPedidos = async () => {
    try {
      const response = await fetch('/api/logistica/pedidos');
      const datos = await response.json();
      setPedidos(datos);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const pedidosFiltrados = pedidos.filter(pedido => {
    const coincideTexto = pedido.codigo.toLowerCase().includes(filtro.toLowerCase()) ||
                         pedido.proyecto.nombre.toLowerCase().includes(filtro.toLowerCase());
    const coincideEstado = estadoFiltro === 'todos' || pedido.estado === estadoFiltro;
    return coincideTexto && coincideEstado;
  });

  // 🔄 Función actualizada para usar estadoEntrega
  const calcularProgreso = (items: PedidoLogistica['items']) => {
    if (!items.length) return 0;
    const itemsEntregados = items.filter(item => item.estadoEntrega === 'entregado').length;
    return (itemsEntregados / items.length) * 100;
  };
  
  // 🆕 Función para contar items por estado
  const contarItemsPorEstado = (items: PedidoLogistica['items']) => {
    return {
      pendientes: items.filter(item => item.estadoEntrega === 'pendiente').length,
      enProceso: items.filter(item => item.estadoEntrega === 'en_proceso').length,
      parciales: items.filter(item => item.estadoEntrega === 'parcial').length,
      entregados: items.filter(item => item.estadoEntrega === 'entregado').length,
      retrasados: items.filter(item => item.estadoEntrega === 'retrasado').length
    };
  };

  const getEstadoBadge = (estado: string) => {
    const variants = {
      'BORRADOR': 'secondary',
      'ENVIADO': 'default',
      'ATENDIDO': 'outline',
      'PARCIAL': 'outline',
      'ENTREGADO': 'default',
      'CANCELADO': 'destructive'
    } as const;
    return variants[estado as keyof typeof variants] || 'secondary';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8" />
          Gestión de Entregas
        </h1>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por código o proyecto..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="todos">Todos los estados</option>
          <option value="ENVIADO">Enviado</option>
          <option value="ATENDIDO">Atendido</option>
          <option value="PARCIAL">Parcial</option>
          <option value="ENTREGADO">Entregado</option>
        </select>
      </div>

      {/* Lista de pedidos */}
      <div className="grid gap-4">
        {pedidosFiltrados.map((pedido) => {
          const progreso = calcularProgreso(pedido.items);
          const estadosItems = contarItemsPorEstado(pedido.items); // 🔄 Usar nueva función

          return (
            <Card key={pedido.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{pedido.codigo}</h3>
                      <Badge variant={getEstadoBadge(pedido.estado)}>
                        {pedido.estado}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {pedido.proyecto.nombre} ({pedido.proyecto.codigo})
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Creado: {format(new Date(pedido.fechaCreacion), 'dd/MM/yyyy', { locale: es })}
                    </p>
                  </div>
                  
                  <div className="text-right space-y-2">
                    {pedido.fechaEntregaEstimada && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {format(new Date(pedido.fechaEntregaEstimada), 'dd/MM/yyyy', { locale: es })}
                      </div>
                    )}
                    <Link href={`/logistica/pedidos/${pedido.id}`}>
                      <Button variant="outline" size="sm">
                        Gestionar Entrega
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Progreso */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Progreso de entrega</span>
                    <span className="font-medium">{Math.round(progreso)}%</span>
                  </div>
                  <Progress value={progreso} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{pedido.items.length} items total</span>
                    <div className="flex gap-3">
                      {estadosItems.entregados > 0 && (
                        <span className="text-green-600">{estadosItems.entregados} entregados</span>
                      )}
                      {estadosItems.parciales > 0 && (
                        <span className="text-blue-600">{estadosItems.parciales} parciales</span>
                      )}
                      {estadosItems.pendientes > 0 && (
                        <span>{estadosItems.pendientes} pendientes</span>
                      )}
                      {estadosItems.retrasados > 0 && (
                        <span className="text-red-600">{estadosItems.retrasados} retrasados</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {pedidosFiltrados.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay pedidos</h3>
            <p className="text-muted-foreground">
              {filtro || estadoFiltro !== 'todos' 
                ? 'No se encontraron pedidos con los filtros aplicados'
                : 'No hay pedidos para gestionar en este momento'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Check**: ☐ Página master de logística creada

### 🔄 Paso 4.4: Crear Página Detalle de Entrega (LOGÍSTICA)
**Estado**: REQUIERE ACTUALIZACIÓN

**Archivo**: `src/app/logistica/pedidos/[pedidoId]/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Package, Truck, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { EntregaItemForm } from '@/components/equipos/EntregaItemForm';
import { ProgresoItemCard } from '@/components/equipos/ProgresoItemCard';

interface PedidoDetalle {
  id: string;
  codigo: string;
  proyecto: { nombre: string; codigo: string };
  fechaCreacion: Date;
  fechaEntregaEstimada?: Date;
  fechaEntregaReal?: Date;
  estado: string;
  observaciones?: string;
  items: Array<{
    id: string;
    cantidadPedida: number; // 🔄 Campo actualizado
    cantidadAtendida?: number; // 🔄 Campo actualizado
    fechaEntregaEstimada?: Date;
    fechaEntregaReal?: Date;
    observacionesEntrega?: string;
    estadoEntrega: 'pendiente' | 'en_proceso' | 'parcial' | 'entregado' | 'retrasado' | 'cancelado'; // 🔄 Enum actualizado
    listaEquipoItem?: { // 🔄 Relación actualizada
      equipo: {
        id: string;
        nombre: string;
        codigo: string;
      };
    };
    descripcion?: string; // 🆕 Campo alternativo
  }>;
}

export default function LogisticaPedidoDetallePage({ 
  params 
}: { 
  params: { pedidoId: string } 
}) {
  const [pedido, setPedido] = useState<PedidoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    cargarPedido();
  }, [params.pedidoId]);

  const cargarPedido = async () => {
    try {
      const response = await fetch(`/api/logistica/pedidos/${params.pedidoId}`);
      const datos = await response.json();
      setPedido(datos);
    } catch (error) {
      console.error('Error al cargar pedido:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el pedido',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Función actualizada para nuevos campos
  const registrarEntrega = async (itemId: string, datos: {
    cantidadAtendida: number; // 🔄 Campo actualizado
    fechaEntregaReal?: string; // 🆕 Nuevo campo
    observacionesEntrega?: string;
  }) => {
    setActualizando(true);
    try {
      const response = await fetch(`/api/pedidos/${itemId}/entregas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });

      if (!response.ok) throw new Error('Error al registrar entrega');

      toast({
        title: 'Entrega registrada',
        description: 'La entrega se ha registrado correctamente'
      });

      // Recargar datos
      await cargarPedido();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo registrar la entrega',
        variant: 'destructive'
      });
    } finally {
      setActualizando(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Pedido no encontrado</h2>
        <p className="text-muted-foreground mb-4">El pedido solicitado no existe o no tienes permisos para verlo.</p>
        <Link href="/logistica/pedidos">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a pedidos
          </Button>
        </Link>
      </div>
    );
  }

  // 🔄 Cálculo actualizado usando estadoEntrega
  const progresoPedido = pedido.items.length > 0 
    ? (pedido.items.filter(item => item.estadoEntrega === 'entregado').length / pedido.items.length) * 100
    : 0;
    
  // 🆕 Contadores por estado
  const estadosItems = {
    entregados: pedido.items.filter(item => item.estadoEntrega === 'entregado').length,
    parciales: pedido.items.filter(item => item.estadoEntrega === 'parcial').length,
    pendientes: pedido.items.filter(item => item.estadoEntrega === 'pendiente').length,
    enProceso: pedido.items.filter(item => item.estadoEntrega === 'en_proceso').length,
    retrasados: pedido.items.filter(item => item.estadoEntrega === 'retrasado').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/logistica/pedidos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8" />
            {pedido.codigo}
          </h1>
          <p className="text-muted-foreground">
            {pedido.proyecto.nombre} ({pedido.proyecto.codigo})
          </p>
        </div>
      </div>

      {/* Información del pedido */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Información del Pedido</span>
            <Badge variant={pedido.estado === 'ENTREGADO' ? 'default' : 'outline'}>
              {pedido.estado}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Fecha Creación</Label>
              <p>{format(new Date(pedido.fechaCreacion), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
            </div>
            {pedido.fechaEntregaEstimada && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Entrega Estimada</Label>
                <p>{format(new Date(pedido.fechaEntregaEstimada), 'dd/MM/yyyy', { locale: es })}</p>
              </div>
            )}
            {pedido.fechaEntregaReal && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Entrega Real</Label>
                <p className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {format(new Date(pedido.fechaEntregaReal), 'dd/MM/yyyy HH:mm', { locale: es })}
                </p>
              </div>
            )}
          </div>
          
          {/* Progreso general */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Progreso General</Label>
              <span className="text-sm font-medium">{Math.round(progresoPedido)}%</span>
            </div>
            <Progress value={progresoPedido} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{pedido.items.length} items total</span>
              <div className="flex gap-3">
                {estadosItems.entregados > 0 && (
                  <span className="text-green-600">{estadosItems.entregados} entregados</span>
                )}
                {estadosItems.parciales > 0 && (
                  <span className="text-blue-600">{estadosItems.parciales} parciales</span>
                )}
                {estadosItems.enProceso > 0 && (
                  <span className="text-orange-600">{estadosItems.enProceso} en proceso</span>
                )}
                {estadosItems.pendientes > 0 && (
                  <span>{estadosItems.pendientes} pendientes</span>
                )}
                {estadosItems.retrasados > 0 && (
                  <span className="text-red-600">{estadosItems.retrasados} retrasados</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items del pedido */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items del Pedido ({pedido.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {pedido.items.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-4">
                <ProgresoItemCard item={item} />
                
                {/* 🔄 Formulario de entrega actualizado */}
                {item.estadoEntrega !== 'entregado' && item.estadoEntrega !== 'cancelado' && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Registrar Nueva Entrega</h4>
                    <EntregaItemForm 
                      item={item}
                      onEntregaRegistrada={() => cargarPedido()}
                      disabled={actualizando}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Check**: ☐ Página detalle de logística creada

---

## 📊 FASE 5: Dashboard de Reportes (GESTIÓN)

### 🔄 Paso 5.1: Crear Página de Dashboard
**Estado**: REQUIERE ACTUALIZACIÓN

**Archivo**: `src/app/gestion/pedidos/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MetricasPedido } from '@/types/modelos';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

export default function DashboardPedidosPage() {
  const [metricas, setMetricas] = useState<MetricasPedido | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarMetricas = async () => {
      try {
        const response = await fetch('/api/reportes/pedidos');
        const datos = await response.json();
        setMetricas(datos);
      } catch (error) {
        console.error('Error al cargar métricas:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarMetricas();
  }, []);

  if (loading) return <div>Cargando...</div>;
  if (!metricas) return <div>Error al cargar datos</div>;

  const datosGrafico = [
    { nombre: 'Completos', valor: metricas.pedidosCompletos },
    { nombre: 'Parciales', valor: metricas.pedidosParciales },
    { nombre: 'Retrasados', valor: metricas.pedidosRetrasados }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard de Pedidos</h1>
      
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metricas.totalPedidos}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Completos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {metricas.pedidosCompletos}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Parciales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {metricas.pedidosParciales}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Retrasados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {metricas.pedidosRetrasados}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Gráfico de estados */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Estados</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="valor" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Check**: ☐ Dashboard de reportes creado

### 🔄 Paso 5.2: Crear API para Logística
**Estado**: REQUIERE ACTUALIZACIÓN

**Archivo**: `src/app/api/logistica/pedidos/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { obtenerPedidosLogistica } from '@/lib/services/pedidoEquipo';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar rol de logística
    if (!['Admin', 'Gerente', 'Logistica'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || undefined;
    const proyecto = searchParams.get('proyecto') || undefined;

    const pedidos = await obtenerPedidosLogistica({ estado, proyecto });
    return NextResponse.json(pedidos);
  } catch (error) {
    console.error('Error al obtener pedidos logística:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

**Check**: ☐ API de logística creada

**Archivo**: `src/app/api/logistica/pedidos/[pedidoId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { obtenerPedidoLogisticaDetalle } from '@/lib/services/pedidoEquipo';

export async function GET(
  request: NextRequest,
  { params }: { params: { pedidoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar rol de logística
    if (!['Admin', 'Gerente', 'Logistica'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const pedido = await obtenerPedidoLogisticaDetalle(params.pedidoId);
    
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    return NextResponse.json(pedido);
  } catch (error) {
    console.error('Error al obtener pedido logística:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

**Check**: ☐ API detalle de logística creada

### 🔄 Paso 5.3: Actualizar Sidebar con Nuevas Rutas
**Estado**: REQUIERE ACTUALIZACIÓN

**Archivo**: `src/components/Sidebar.tsx`

```typescript
// Agregar rutas por rol
const rutasProyectos = [
  // ... rutas existentes ...
  {
    href: '/proyectos',
    label: 'Pedidos de Equipos',
    icon: Package,
    roles: ['Admin', 'Gerente', 'Proyectos']
  }
];

const rutasLogistica = [
  // ... rutas existentes ...
  {
    href: '/logistica/pedidos',
    label: 'Gestión de Entregas',
    icon: Truck,
    roles: ['Admin', 'Gerente', 'Logistica']
  }
];

const rutasGestion = [
  // ... rutas existentes ...
  {
    href: '/gestion/pedidos',
    label: 'Dashboard Pedidos',
    icon: BarChart3,
    roles: ['Admin', 'Gerente', 'Gestion']
  }
];
```

**Check**: ☐ Sidebar actualizado con nuevas rutas

---

## 🧪 FASE 6: Testing

### 🔄 Paso 6.0: Configurar Entorno de Testing
**Estado**: REQUIERE ACTUALIZACIÓN

**Archivo**: `jest.config.js` (actualizar configuración existente)

```javascript
module.exports = {
  // ... configuración existente ...
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**/*'
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    }
  }
};
```

**Check**: ☐ Configuración de testing actualizada

### 🔄 Paso 6.1: Tests de Servicios
**Estado**: REQUIERE ACTUALIZACIÓN

**Archivo**: `src/__tests__/services/trazabilidad-pedidos.test.ts`

```typescript
import { actualizarEntregaItem, verificarCompletitudPedido } from '@/lib/services/pedidoEquipo';
import { prismaMock } from '@/lib/__mocks__/prisma';

describe('Trazabilidad de Pedidos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('actualizarEntregaItem', () => {
    it('debe actualizar correctamente una entrega parcial', async () => {
      const mockItem = {
      id: '1',
      pedidoId: 'pedido1',
      cantidad: 10,
      cantidadEntregada: 0,
      estadoEntrega: 'PENDIENTE' as const
    };

      prismaMock.pedidoEquipoItem.findUnique.mockResolvedValue(mockItem as any);
      prismaMock.pedidoEquipoItem.update.mockResolvedValue({
        ...mockItem,
        cantidadEntregada: 5,
        estadoEntrega: 'ENTREGADO_PARCIAL'
      } as any);

      const resultado = await actualizarEntregaItem('1', {
        cantidadEntregada: 5,
        usuarioEntrega: 'test@test.com'
      });

      expect(resultado.estadoEntrega).toBe('ENTREGADO_PARCIAL');
      expect(prismaMock.pedidoEquipoItem.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          cantidadEntregada: 5,
          estadoEntrega: 'ENTREGADO_PARCIAL'
        })
      });
    });
  });
});
```

**Check**: ☐ Tests de servicios creados

### 🔄 Paso 6.2: Tests de Componentes
**Estado**: REQUIERE ACTUALIZACIÓN

**Archivo**: `src/__tests__/components/EntregaItemForm.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EntregaItemForm } from '@/components/equipos/EntregaItemForm';
import { toast } from '@/hooks/use-toast';

jest.mock('@/hooks/use-toast');

const mockItem = {
  id: '1',
  cantidad: 10,
  cantidadEntregada: 3,
  estadoEntrega: 'ENTREGADO_PARCIAL' as const,
  equipo: { nombre: 'Equipo Test' }
};

describe('EntregaItemForm', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  it('debe renderizar correctamente el formulario', () => {
    render(
      <EntregaItemForm 
        item={mockItem as any} 
        onEntregaRegistrada={jest.fn()} 
      />
    );

    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Máximo: 7')).toBeInTheDocument();
  });

  it('debe registrar entrega correctamente', async () => {
    const mockOnEntregaRegistrada = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({})
    });

    render(
      <EntregaItemForm 
        item={mockItem as any} 
        onEntregaRegistrada={mockOnEntregaRegistrada} 
      />
    );

    const input = screen.getByPlaceholderText('Máximo: 7');
    const button = screen.getByText('Registrar Entrega');

    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/pedidos/1/entregas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidadEntregada: 5, observacionesEntrega: '' })
      });
    });

    expect(mockOnEntregaRegistrada).toHaveBeenCalled();
  });
});
```

**Check**: ☐ Tests de componentes creados

### 🔄 Paso 6.3: Tests de APIs
**Estado**: REQUIERE ACTUALIZACIÓN

**Archivo**: `src/__tests__/api/logistica-pedidos.test.ts`

```typescript
import { GET } from '@/app/api/logistica/pedidos/route';
import { getServerSession } from 'next-auth';
import { obtenerPedidosLogistica } from '@/lib/services/pedidoEquipo';

jest.mock('next-auth');
jest.mock('@/lib/services/pedidoEquipo');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockObtenerPedidosLogistica = obtenerPedidosLogistica as jest.MockedFunction<typeof obtenerPedidosLogistica>;

describe('/api/logistica/pedidos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe retornar 401 si no hay sesión', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new Request('http://localhost/api/logistica/pedidos');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('No autorizado');
  });

  it('debe retornar pedidos para usuario con rol logística', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { role: 'Logistica', email: 'test@test.com' }
    } as any);

    const mockPedidos = [{ id: '1', codigo: 'PED-001' }];
    mockObtenerPedidosLogistica.mockResolvedValue(mockPedidos as any);

    const request = new Request('http://localhost/api/logistica/pedidos');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockPedidos);
  });
});
```

**Check**: ☐ Tests de APIs creados

---

## 🚀 FASE 7: Despliegue y Verificación

### 🔄 Paso 7.1: Instalar Dependencias de Testing
**Estado**: REQUIERE ACTUALIZACIÓN

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom recharts
```

**Check**: ☐ Dependencias de testing instaladas

### 🔄 Paso 7.2: Ejecutar Tests
**Estado**: REQUIERE ACTUALIZACIÓN

```bash
npm run test
```

**Check**: ☐ Todos los tests pasan correctamente

### 🔄 Paso 7.3: Verificar Funcionalidad
**Estado**: REQUIERE ACTUALIZACIÓN

1. **Página Master** (`/proyectos/[id]/equipos/pedidos`):
   - ☐ Se muestra columna de progreso
   - ☐ Se muestra fecha de entrega estimada
   - ☐ Navegación a detalle funciona

2. **Página Detalle** (`/proyectos/[id]/equipos/pedidos/[pedidoId]`):
   - ☐ Se muestra sección de trazabilidad
   - ☐ Formulario de entrega funciona
   - ☐ Progreso se actualiza correctamente

3. **Dashboard** (`/gestion/pedidos`):
   - ☐ Métricas se cargan correctamente
   - ☐ Gráficos se renderizan
   - ☐ Datos son precisos

### 🔄 Paso 7.4: Documentación
**Estado**: REQUIERE ACTUALIZACIÓN

**Archivo**: `docs/TRAZABILIDAD_PEDIDOS.md`

```markdown
# Manual de Usuario: Trazabilidad de Pedidos

## Registro de Entregas
1. Navegar al detalle del pedido
2. Hacer clic en "Registrar Entrega" del item correspondiente
3. Ingresar cantidad entregada y observaciones
4. Confirmar registro

## Dashboard de Reportes
- Acceder desde el menú lateral: Gestión > Dashboard Pedidos
- Visualizar métricas generales y gráficos
- Filtrar por proyecto si es necesario

## Estados de Entrega
- **PENDIENTE**: Sin entregas registradas
- **EN_TRANSITO**: En proceso de entrega
- **ENTREGADO_PARCIAL**: Entrega parcial completada
- **ENTREGADO_COMPLETO**: Entrega total completada
- **RETRASADO**: Superó fecha estimada sin completar
```

**Check**: ☐ Documentación creada

---

## ✅ CHECKLIST FINAL

### Base de Datos
- ☐ Schema actualizado con campos de trazabilidad
- ☐ Migración ejecutada correctamente
- ☐ Types TypeScript actualizados

### Backend
- ☐ Servicios de trazabilidad implementados
- ☐ APIs de entregas y reportes creadas
- ☐ Lógica de negocio para completitud de pedidos

### Frontend
- ☐ Componentes de entrega y progreso creados
- ☐ Página master actualizada con progreso
- ☐ Página detalle actualizada con trazabilidad
- ☐ Dashboard de reportes implementado
- ☐ Sidebar actualizado con nueva ruta

### Testing
- ☐ Tests de servicios implementados
- ☐ Tests de componentes implementados
- ☐ Todos los tests pasan

### Verificación
- ☐ Funcionalidad probada en las 3 páginas
- ☐ Flujo completo de entrega funciona
- ☐ Métricas y reportes son precisos
- ☐ Documentación completada

---

## 🎯 Resultado Esperado

Al completar este procedimiento, el sistema tendrá:

1. **Trazabilidad completa** de entregas por item
2. **Dashboard de métricas** para seguimiento ejecutivo
3. **Páginas actualizadas** con nueva funcionalidad
4. **Flujo operativo** para registro de entregas parciales
5. **Reportes visuales** para toma de decisiones

**Tiempo estimado de implementación**: 2-3 días de desarrollo
**Recursos necesarios**: 1 desarrollador fullstack
**Dependencias**: Base de datos PostgreSQL, Next.js 14+, @testing-library/react, recharts

---

## 🔧 Correcciones Aplicadas

### ✅ Importaciones Corregidas
- Agregado `calcularTiempoPromedioEntrega` en servicios
- Importaciones completas en componentes UI
- Iconos de Lucide agregados en dashboard

### ✅ Tipos TypeScript Mejorados
- Propiedades opcionales marcadas correctamente
- Tipos `as const` para enums
- Interface `MetricasPedido` completamente definida

### ✅ Configuración de Testing
- Configuración Jest actualizada
- Dependencias de testing especificadas
- Umbrales de cobertura definidos

### ✅ Consistencia de Rutas
- Rutas del sidebar alineadas con páginas
- Patrones de URL consistentes
- Referencias corregidas en navegación