/**
 * 🎯 Equipment Lists Page - Minimalist Version
 * Focuses on showing equipment lists clearly
 */

'use client';

import { useEffect, useState, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import { getProyectoById } from '@/lib/services/proyecto';
import { getListaEquiposPorProyecto, deleteListaEquipo } from '@/lib/services/listaEquipo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  ShoppingCart
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import ModalCrearListaEquipo from '@/components/equipos/ModalCrearListaEquipo';
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

// Componente de tabla de listas
const ListasTable = memo(function ListasTable({
  listas,
  proyectoId,
  onDelete,
  onRefresh,
  loading
}: {
  listas: any[];
  proyectoId: string;
  onDelete: (lista: any) => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filteredListas = useMemo(() => {
    let result = listas;

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
  }, [listas, search, filterEstado]);

  const sortedListas = useMemo(() => {
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
  }, [filteredListas, sortField, sortDir]);

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
      por_validar: { icon: AlertCircle, className: 'bg-blue-100 text-blue-700', label: 'Por Validar' },
      por_aprobar: { icon: AlertCircle, className: 'bg-purple-100 text-purple-700', label: 'Por Aprobar' },
      aprobado: { icon: CheckCircle2, className: 'bg-green-100 text-green-700', label: 'Aprobado' },
      rechazado: { icon: AlertCircle, className: 'bg-red-100 text-red-700', label: 'Rechazado' }
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

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
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
            <SelectItem value="por_validar">Por Validar</SelectItem>
            <SelectItem value="por_aprobar">Por Aprobar</SelectItem>
            <SelectItem value="aprobado">Aprobado</SelectItem>
            <SelectItem value="rechazado">Rechazado</SelectItem>
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

        <span className="text-xs text-muted-foreground ml-auto">
          {sortedListas.length} de {listas.length} listas
        </span>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[140px]">
                <button
                  onClick={() => handleSort('codigo')}
                  className="flex items-center text-xs font-medium"
                >
                  Código<SortIcon field="codigo" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('nombre')}
                  className="flex items-center text-xs font-medium"
                >
                  Nombre<SortIcon field="nombre" />
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
              <TableHead className="w-[70px] text-center text-xs font-medium">Cotiz.</TableHead>
              <TableHead className="w-[100px] text-right text-xs font-medium">Total</TableHead>
              <TableHead className="w-[90px]">
                <button
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center text-xs font-medium"
                >
                  Fecha<SortIcon field="createdAt" />
                </button>
              </TableHead>
              <TableHead className="w-[110px] text-xs font-medium">Estado</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedListas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                  {search || filterEstado !== 'all' ? 'No se encontraron listas' : 'Sin listas de equipos'}
                </TableCell>
              </TableRow>
            ) : (
              sortedListas.map((lista) => (
                <TableRow
                  key={lista.id}
                  className="group cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/proyectos/${proyectoId}/equipos/listas/${lista.id}`)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground py-2">
                    {lista.codigo || '-'}
                  </TableCell>
                  <TableCell className="py-2">
                    <div>
                      <span className="text-sm font-medium line-clamp-1">{lista.nombre}</span>
                      {lista.descripcion && (
                        <span className="text-xs text-muted-foreground line-clamp-1 block">
                          {lista.descripcion}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm py-2">
                    {lista.totalItems || lista.items?.length || 0}
                  </TableCell>
                  <TableCell className="text-center py-2">
                    {(lista._count?.cotizacionProveedorItem || lista.cotizacionCount || 0) > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <ShoppingCart className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs font-medium text-green-700">
                          {lista._count?.cotizacionProveedorItem || lista.cotizacionCount || 0}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground py-2">
                    ${(lista.totalPresupuesto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-2">
                    {formatDate(lista.createdAt)}
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
                        onClick={() => router.push(`/proyectos/${proyectoId}/equipos/listas/${lista.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onDelete(lista)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

export default function EquipmentListsPage({ params }: PageProps) {
  const router = useRouter();
  const [proyectoId, setProyectoId] = useState<string>('');
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [listas, setListas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listaToDelete, setListaToDelete] = useState<{ id: string; nombre: string; codigo?: string } | null>(null);

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

  const handleDeleteClick = (lista: any) => {
    setListaToDelete({ id: lista.id, nombre: lista.nombre, codigo: lista.codigo });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!listaToDelete) return;

    try {
      const success = await deleteListaEquipo(listaToDelete.id);
      if (success) {
        toast.success('Lista eliminada');
        fetchData();
      } else {
        toast.error('Error al eliminar');
      }
    } catch (error) {
      toast.error('Error al eliminar');
    } finally {
      setDeleteDialogOpen(false);
      setListaToDelete(null);
    }
  };

  if (loading && !proyecto) return <LoadingSkeleton />;

  // Stats calculados
  const totalListas = listas.length;
  const listasAprobadas = listas.filter(l => l.estado === 'aprobado').length;
  const totalItems = listas.reduce((sum, l) => sum + (l.totalItems || l.items?.length || 0), 0);
  const totalPresupuesto = listas.reduce((sum, l) => sum + (l.totalPresupuesto || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* Navegación mínima */}
          <Link
            href={`/proyectos/${proyectoId}/equipos`}
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Equipos
          </Link>

          {/* Título con icono */}
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-semibold">Listas de Equipos</h1>
          </div>

          {/* Stats inline */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{totalListas} listas</span>
            <span className="text-green-600">{listasAprobadas} aprobadas</span>
            <span>{totalItems} items</span>
            <span className="font-mono">${totalPresupuesto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Acción principal */}
        <ModalCrearListaEquipo
          proyectoId={proyectoId}
          onCreated={(lista: any) => {
            toast.success('Lista creada');
            router.push(`/proyectos/${proyectoId}/equipos/listas/${lista.id}`);
          }}
          triggerClassName="h-8"
        />
      </div>

      {/* Tabla de listas - El foco principal */}
      <ListasTable
        listas={listas}
        proyectoId={proyectoId}
        onDelete={handleDeleteClick}
        onRefresh={fetchData}
        loading={loading}
      />

      {/* Modal de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Eliminar Lista de Equipos
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-muted-foreground text-sm space-y-2">
                <span>¿Estás seguro de que deseas eliminar esta lista?</span>
                {listaToDelete && (
                  <div className="bg-muted/50 rounded-md p-3 mt-2">
                    <span className="font-medium text-foreground block">{listaToDelete.nombre}</span>
                    {listaToDelete.codigo && (
                      <span className="text-xs text-muted-foreground font-mono block">{listaToDelete.codigo}</span>
                    )}
                  </div>
                )}
                <span className="text-red-600 text-sm font-medium mt-2 block">
                  Esta acción no se puede deshacer.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="h-9 bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
