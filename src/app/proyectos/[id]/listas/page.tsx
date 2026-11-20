/**
 * 🎯 Equipment Lists Page - Minimalist Version
 * Focuses on showing equipment lists clearly
 */

'use client';

import { useEffect, useState, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import { getProyectoById } from '@/lib/services/proyecto';
import { getListaEquiposPorProyecto, reordenarListasEquipo } from '@/lib/services/listaEquipo';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  List,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Eye,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
  AlignJustify,
} from 'lucide-react';
import { useVistaCompacta, CONTENEDOR_TABLA_SCROLL, CABECERA_FIJA, CABECERA_FIJA_PAGINA } from '@/hooks/useVistaCompacta';

/** Avance en campo de una lista: cuántos ítems ya llegaron completos y cuántos están pedidos. */
function avanceLista(items: any[] = []) {
  const total = items.length;
  const llegaron = items.filter((i) => (i.cantidad || 0) > 0 && (i.cantidadEntregada || 0) >= i.cantidad).length;
  const pedidos = items.filter((i) => (i.cantidadPedida || 0) > 0).length;
  return { total, llegaron, pedidos };
}

/**
 * Cuántos ítems ya tienen su precio cerrado con un proveedor.
 *
 * Es distinto de contar cotizaciones recibidas, que es lo que mostraba la
 * columna "Cotiz.": QRM15-LST-018 marcaba 56 teniendo 59 ítems, y esos 3 sin
 * cotizar no se veían por ningún lado. Lo que importa para saber si la lista
 * está lista es cuántos ítems quedan sin resolver.
 */
function itemsCotizados(items: any[] = []) {
  return items.filter((i) => i.cotizacionSeleccionadaId).length;
}
import Link from 'next/link';
import { toast } from 'sonner';
import ModalCrearListaEquipo from '@/components/equipos/ModalCrearListaEquipo';
import { BarraAvance } from '@/components/shared/BarraAvance';
import { useDeleteWithValidation } from '@/hooks/useDeleteWithValidation';
import { DeleteWithValidationDialog } from '@/components/DeleteWithValidationDialog';
import { abreviarNombre } from '@/lib/utils';
import type { Proyecto } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Skeleton minimalista
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-32 ml-auto" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="border rounded-lg">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 border-b last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SortableListaRow({ lista, disabled, onClick, children }: {
  lista: any;
  disabled: boolean;
  onClick: () => void;
  children: (dragHandle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lista.id,
    disabled,
  });
  const dragHandle = (
    <TableCell className="w-6 p-0 pl-1" onClick={(e) => e.stopPropagation()}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
        <GripVertical className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100" />
      </div>
    </TableCell>
  );
  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="group cursor-pointer hover:bg-muted/50"
      onClick={onClick}
    >
      {children(dragHandle)}
    </TableRow>
  );
}

/**
 * Los grupos de equipo cotizado de los que salen los ítems de la lista, sin
 * repetir. Un mismo grupo aparece en muchos ítems y la lista puede juntar
 * varios, así que se deduplica por id.
 */
function gruposCotizados(lista: any): string[] {
  return [...new Map<string, string>(
    (lista.items || [])
      .filter((i: any) => i.proyectoEquipoCotizado || i.proyectoEquipoItem?.proyectoEquipoCotizado)
      .map((i: any) => {
        const grupo = i.proyectoEquipoCotizado || i.proyectoEquipoItem?.proyectoEquipoCotizado;
        return [grupo.id as string, grupo.nombre as string];
      })
  ).values()];
}

/** Ítems con precio cerrado, de cuántos tiene la lista. */
function CeldaCotizado({ lista }: { lista: any }) {
  const items = lista.items || [];
  return (
    <TableCell className="py-2">
      <BarraAvance hechos={itemsCotizados(items)} total={items.length} concepto="ítems cotizados" />
    </TableCell>
  );
}

/** El responsable, abreviado para que no empuje la tabla. */
function CeldaResponsable({ lista }: { lista: any }) {
  const persona = lista.responsable || lista.user;
  const nombre = persona?.name || persona?.email || null;
  return (
    <TableCell className="py-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap" title={nombre ?? undefined}>
        {nombre ? abreviarNombre(nombre) : '—'}
      </span>
    </TableCell>
  );
}

/** El código en su propia columna, igual que en la tabla de pedidos. */
function CeldaCodigo({ codigo }: { codigo?: string | null }) {
  return (
    <TableCell className="font-mono text-xs text-muted-foreground py-2 whitespace-nowrap">
      {codigo || '-'}
    </TableCell>
  );
}

/** Nombre de la lista arriba y los grupos cotizados debajo, como "Nombre / Proveedor" en pedidos. */
function CeldaNombreYGrupos({ lista }: { lista: any }) {
  const grupos = gruposCotizados(lista);
  return (
    <TableCell className="py-2">
      <div>
        <span className="text-xs font-medium line-clamp-2 block" title={lista.nombre ?? undefined}>
          {lista.nombre}
        </span>
        {grupos.length > 0 ? (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {grupos.map((nombre, idx) => (
              // max-w + truncate: los nombres de grupo llegan a 56 caracteres
              // ("TABLEROS DE COMUNICACIÓN DE FILTROS BANDA DE LIXIVIACIÓN") y
              // con nowrap le ponían un piso de 330 px a esta columna, que
              // apretaba todas las demás. El nombre completo va en el title.
              <Badge
                key={idx}
                variant="outline"
                className="max-w-[180px] truncate text-[10px] px-1.5 py-0 font-normal"
                title={nombre}
              >
                {nombre}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Sin equipo cotizado</span>
        )}
      </div>
    </TableCell>
  );
}

// Componente de tabla de listas
const ListasTable = memo(function ListasTable({
  listas,
  proyectoId,
  onRefresh,
  loading
}: {
  listas: any[];
  proyectoId: string;
  onRefresh: () => void;
  loading: boolean;
}) {
  const router = useRouter();
  // El mismo flujo que pedidos: antes de confirmar se consulta /api/can-delete
  // y el diálogo dice por qué no se puede, en vez de dejar al usuario confirmar
  // un borrado que el servidor va a rechazar con un "Error al eliminar" pelado.
  const deleteValidation = useDeleteWithValidation({
    entity: 'listaEquipo',
    deleteEndpoint: (id) => `/api/lista-equipo/${id}`,
    onSuccess: () => {
      toast.success('Lista eliminada');
      onRefresh();
    },
    onError: (error) => toast.error(error),
  });
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [localListas, setLocalListas] = useState<any[]>([]);
  // Compacta (campo): nombre, ítems y cuántos llegaron, fecha necesaria y estado; sin montos ni acciones.
  const [vista, setVista] = useVistaCompacta('proyectoListas.vista');

  useEffect(() => {
    setLocalListas([...listas].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
  }, [listas]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const canDrag = !search && filterEstado === 'all';

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localListas.findIndex(l => l.id === active.id);
    const newIdx = localListas.findIndex(l => l.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordenados = arrayMove(localListas, oldIdx, newIdx).map((l, i) => ({ ...l, orden: i }));
    setLocalListas(reordenados);
    try {
      await reordenarListasEquipo(reordenados.map(l => ({ id: l.id, orden: l.orden })));
    } catch {
      toast.error('Error al guardar el orden');
      setLocalListas([...listas].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
    }
  };

  const filteredListas = useMemo(() => {
    let result = canDrag ? localListas : [...localListas];

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(lista =>
        lista.codigo?.toLowerCase().includes(term) ||
        lista.nombre?.toLowerCase().includes(term) ||
        lista.descripcion?.toLowerCase().includes(term)
      );
    }

    if (filterEstado !== 'all') {
      result = result.filter(lista => lista.estado === filterEstado);
    }

    return result;
  }, [localListas, search, filterEstado, canDrag]);

  const sortedListas = useMemo(() => {
    if (canDrag) return filteredListas; // preserve drag order
    return [...filteredListas].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal == null || bVal == null) return 0;
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredListas, sortField, sortDir, canDrag]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const getEstadoBadge = (estado: string) => {
    const estados: Record<string, { icon: any; className: string; label: string }> = {
      borrador: { icon: FileText, className: 'bg-gray-100 text-gray-700', label: 'Borrador' },
      por_revisar: { icon: Clock, className: 'bg-yellow-100 text-yellow-700', label: 'Por Revisar' },
      por_cotizar: { icon: Clock, className: 'bg-orange-100 text-orange-700', label: 'Por Cotizar' },
      por_aprobar: { icon: AlertCircle, className: 'bg-purple-100 text-purple-700', label: 'Por Aprobar' },
      aprobada: { icon: CheckCircle2, className: 'bg-green-100 text-green-700', label: 'Aprobada' },
      anulada: { icon: AlertCircle, className: 'bg-red-100 text-red-700', label: 'Anulada' },
    };

    const config = estados[estado] || estados.borrador;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} text-xs font-normal`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // timeZone UTC a propósito: fechaNecesaria y createdAt son campos de día
  // guardados como medianoche UTC; sin esto en Lima se leen un día antes.
  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', timeZone: 'UTC' });
  };

  return (
    <div className="space-y-3">
      {/* Filtros compactos */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="por_revisar">Por Revisar</SelectItem>
            <SelectItem value="por_cotizar">Por Cotizar</SelectItem>
            <SelectItem value="por_aprobar">Por Aprobar</SelectItem>
            <SelectItem value="aprobada">Aprobada</SelectItem>
            <SelectItem value="anulada">Anulada</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="h-9"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>

        <div className="flex items-center border rounded-md">
          <Button
            variant={vista === 'compacta' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setVista('compacta')}
            className="h-7 px-2 rounded-r-none"
            title="Compacta (campo): ítems, cuántos llegaron, fecha necesaria y estado"
          >
            <AlignJustify className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={vista === 'completa' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setVista('completa')}
            className="h-7 px-2 rounded-l-none"
            title="Completa: con montos, cotizaciones y acciones"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {sortedListas.length} de {listas.length} listas
        </span>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-clip">
        {vista === 'compacta' ? (
          <div>
            <table className="w-full text-xs">
              <thead className={CABECERA_FIJA_PAGINA}>
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-gray-600">Lista</th>
                  <th className="w-20 px-1 py-2 text-center font-medium text-gray-600">Ítems</th>
                  <th className="w-24 px-1 py-2 text-center font-medium text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedListas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                      {search || filterEstado !== 'all' ? 'No se encontraron listas' : 'Sin listas de equipos'}
                    </td>
                  </tr>
                ) : sortedListas.map((lista, idx) => {
                  const av = avanceLista(lista.items);
                  const vencida = lista.fechaNecesaria && new Date(lista.fechaNecesaria).getTime() < Date.now() && av.llegaron < av.total;
                  return (
                    <tr
                      key={lista.id}
                      className={`cursor-pointer align-top hover:bg-muted/50 ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}
                      onClick={() => router.push(`/proyectos/${proyectoId}/listas/${lista.id}`)}
                    >
                      <td className="px-2 py-2 min-w-0">
                        <p className="text-xs font-medium text-gray-900 leading-snug">{lista.nombre}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-gray-500">
                          <span className="font-mono">{lista.codigo || '-'}</span>
                          {lista.fechaNecesaria && (
                            <span className={vencida ? 'font-medium text-red-600' : ''}>· necesaria {formatDate(lista.fechaNecesaria)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-1 py-2 text-center whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{av.total}</div>
                        {av.total > 0 && (
                          <div className={`text-[10px] ${av.llegaron === av.total ? 'text-green-600' : av.llegaron > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                            {av.llegaron > 0 ? `llegaron ${av.llegaron}` : av.pedidos > 0 ? `${av.pedidos} pedidos` : 'sin pedir'}
                          </div>
                        )}
                      </td>
                      <td className="px-1 py-2 text-center">{getEstadoBadge(lista.estado)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
        <Table wrapperClassName={CONTENEDOR_TABLA_SCROLL}>
          <TableHeader className={CABECERA_FIJA}>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {canDrag && <TableHead className="w-6 p-0" />}
              {/* Mismo arranque que la tabla de pedidos: el código solo, en su
                  propia columna y en una línea. Antes iba debajo del nombre en
                  letra de 10 px y se partía. */}
              <TableHead className="w-[120px]">
                <button
                  onClick={() => handleSort('codigo')}
                  className="flex items-center text-xs font-medium"
                >
                  Código<SortIcon field="codigo" />
                </button>
              </TableHead>
              {/* Sin ancho mínimo, las columnas de ancho fijo la aprietan. */}
              <TableHead className="min-w-[220px]">
                <button
                  onClick={() => handleSort('nombre')}
                  className="flex items-center text-xs font-medium"
                >
                  Nombre / Equipo Cot.<SortIcon field="nombre" />
                </button>
              </TableHead>
              <TableHead className="w-[80px] text-right">
                <button
                  onClick={() => handleSort('totalItems')}
                  className="flex items-center justify-end w-full text-xs font-medium"
                >
                  Items<SortIcon field="totalItems" />
                </button>
              </TableHead>
              <TableHead className="w-[110px] text-right text-xs font-medium">Cotizado</TableHead>
              <TableHead className="w-[100px] text-right text-xs font-medium">Total</TableHead>
              <TableHead className="w-[100px] text-xs font-medium">Responsable</TableHead>
              <TableHead className="w-[90px]">
                <button
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center text-xs font-medium"
                >
                  Fecha<SortIcon field="createdAt" />
                </button>
              </TableHead>
              <TableHead className="w-[90px]">
                <button
                  onClick={() => handleSort('fechaNecesaria')}
                  className="flex items-center text-xs font-medium"
                >
                  F. Necesaria<SortIcon field="fechaNecesaria" />
                </button>
              </TableHead>
              <TableHead className="w-[110px] text-xs font-medium">Estado</TableHead>
              <TableHead className="w-[80px] text-xs font-medium">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedListas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canDrag ? 11 : 10} className="text-center py-8 text-muted-foreground text-sm">
                  {search || filterEstado !== 'all' ? 'No se encontraron listas' : 'Sin listas de equipos'}
                </TableCell>
              </TableRow>
            ) : canDrag ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortedListas.map(l => l.id)} strategy={verticalListSortingStrategy}>
                  {sortedListas.map((lista) => (
                    <SortableListaRow
                      key={lista.id}
                      lista={lista}
                      disabled={false}
                      onClick={() => router.push(`/proyectos/${proyectoId}/listas/${lista.id}`)}
                    >
                      {(dragHandle) => (<>
                      {dragHandle}
                  <CeldaCodigo codigo={lista.codigo} />
                  <CeldaNombreYGrupos lista={lista} />
                  <TableCell className="text-right font-mono text-sm py-2">
                    {lista.totalItems || lista.items?.length || 0}
                  </TableCell>
                  <CeldaCotizado lista={lista} />
                  <TableCell className="text-right font-mono text-xs text-muted-foreground py-2">
                    ${(lista.montoEstimado || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <CeldaResponsable lista={lista} />
                  <TableCell className="text-xs text-muted-foreground py-2">
                    {formatDate(lista.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-2">
                    {lista.fechaNecesaria ? formatDate(lista.fechaNecesaria) : '—'}
                  </TableCell>
                  <TableCell className="py-2">
                    {getEstadoBadge(lista.estado)}
                  </TableCell>
                  <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => router.push(`/proyectos/${proyectoId}/listas/${lista.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {/* Solo en borrador: es lo único que el servidor permite
                          borrar, y además bloquea si hay pedidos u OCs. */}
                      {lista.estado === 'borrador' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteValidation.requestDelete(lista.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                    </>)}
                    </SortableListaRow>
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              sortedListas.map((lista) => (
                <TableRow
                  key={lista.id}
                  className="group cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/proyectos/${proyectoId}/listas/${lista.id}`)}
                >
                  <CeldaCodigo codigo={lista.codigo} />
                  <CeldaNombreYGrupos lista={lista} />
                  <TableCell className="text-right font-mono text-sm py-2">
                    {lista.totalItems || lista.items?.length || 0}
                  </TableCell>
                  <CeldaCotizado lista={lista} />
                  <TableCell className="text-right font-mono text-xs text-muted-foreground py-2">
                    ${(lista.montoEstimado || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <CeldaResponsable lista={lista} />
                  <TableCell className="text-xs text-muted-foreground py-2">
                    {formatDate(lista.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-2">
                    {lista.fechaNecesaria ? formatDate(lista.fechaNecesaria) : '—'}
                  </TableCell>
                  <TableCell className="py-2">
                    {getEstadoBadge(lista.estado)}
                  </TableCell>
                  <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => router.push(`/proyectos/${proyectoId}/listas/${lista.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {/* Solo en borrador: es lo único que el servidor permite
                          borrar, y además bloquea si hay pedidos u OCs. */}
                      {lista.estado === 'borrador' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteValidation.requestDelete(lista.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        )}
      </div>

      <DeleteWithValidationDialog
        open={deleteValidation.dialogOpen}
        onOpenChange={(open) => !open && deleteValidation.cancelDelete()}
        checking={deleteValidation.checking}
        deleting={deleteValidation.deleting}
        allowed={deleteValidation.canDeleteResult?.allowed ?? null}
        blockers={deleteValidation.canDeleteResult?.blockers ?? []}
        message={deleteValidation.canDeleteResult?.message ?? ''}
        onConfirm={deleteValidation.confirmDelete}
        onCancel={deleteValidation.cancelDelete}
        entityLabel="lista"
      />
    </div>
  );
});

export default function EquipmentListsPage({ params }: PageProps) {
  const router = useRouter();
  const [proyectoId, setProyectoId] = useState<string>('');
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [listas, setListas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => setProyectoId(p.id));
  }, [params]);

  const fetchData = async () => {
    if (!proyectoId) return;

    try {
      setLoading(true);
      const [proyectoData, listasData] = await Promise.all([
        getProyectoById(proyectoId),
        getListaEquiposPorProyecto(proyectoId)
      ]);

      setProyecto(proyectoData);
      setListas(listasData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (proyectoId) fetchData();
  }, [proyectoId]);

  if (loading && !proyecto) return <LoadingSkeleton />;

  const totalListas = listas.length;
  const listasAprobadas = listas.filter(l => l.estado === 'aprobada').length;
  const totalItems = listas.reduce((sum, l) => sum + (l.totalItems || l.items?.length || 0), 0);
  const totalPresupuesto = listas.reduce((sum, l) => sum + (l.montoEstimado || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-semibold">Listas de Equipos</h1>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{totalListas} listas</span>
            <span className="text-green-600">{listasAprobadas} aprobadas</span>
            <span>{totalItems} items</span>
            <span className="font-mono">${totalPresupuesto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <ModalCrearListaEquipo
          proyectoId={proyectoId}
          onCreated={(lista: any) => {
            toast.success('Lista creada');
            router.push(`/proyectos/${proyectoId}/listas/${lista.id}`);
          }}
          triggerClassName="h-8"
        />
      </div>

      {/* Tabla de listas - El foco principal */}
      <ListasTable
        listas={listas}
        proyectoId={proyectoId}
        onRefresh={fetchData}
        loading={loading}
      />
    </div>
  );
}
