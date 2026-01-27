'use client'

// ===================================================
// 📁 Archivo: CatalogoServicioList.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Lista de servicios usando acordeones modernos con filtros etiquetados.
// ===================================================

import { useEffect, useState } from 'react'
import { getEdts } from '@/lib/services/edt'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { getRecursos } from '@/lib/services/recurso'
import { CatalogoServicio } from '@/types'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import CatalogoServicioAcordeon from './CatalogoServicioAcordeon'

interface Props {
  data: CatalogoServicio[]
  onUpdate: (servicio: CatalogoServicio) => void
  onDelete: (id: string) => void
}

export default function CatalogoServicioList({ data, onUpdate, onDelete }: Props) {
  const [servicios, setServicios] = useState(data)
  const [categorias, setCategorias] = useState<any[]>([])
  const [unidades, setUnidades] = useState<any[]>([])
  const [recursos, setRecursos] = useState<any[]>([])
  const [filtroCategoria, setFiltroCategoria] = useState('__ALL__')
  const [filtroUnidad, setFiltroUnidad] = useState('__ALL__')
  const [filtroRecurso, setFiltroRecurso] = useState('__ALL__')
  const [filtroTexto, setFiltroTexto] = useState('')

  useEffect(() => {
    setServicios(data)
  }, [data])

  useEffect(() => {
    getEdts().then(setCategorias)
    getUnidadesServicio().then(setUnidades)
    getRecursos().then(setRecursos)
  }, [])

  const serviciosFiltrados = servicios.filter((s) =>
    (filtroCategoria !== '__ALL__' ? s.categoriaId === filtroCategoria : true) &&
    (filtroUnidad !== '__ALL__' ? s.unidadServicioId === filtroUnidad : true) &&
    (filtroRecurso !== '__ALL__' ? s.recursoId === filtroRecurso : true) &&
    (`${s.nombre} ${s.descripcion}`.toLowerCase().includes(filtroTexto.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">📋 Lista de Servicios</h2>

      {/* Filtros superiores con etiquetas */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col space-y-1">
          <label htmlFor="filtroTexto" className="text-sm font-medium text-gray-700">Buscar</label>
          <Input
            id="filtroTexto"
            placeholder="Nombre o descripción"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            className="w-60"
          />
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-700">Categoría</label>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todas</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-700">Unidad</label>
          <Select value={filtroUnidad} onValueChange={setFiltroUnidad}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Unidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todas</SelectItem>
              {unidades.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-700">Recurso</label>
          <Select value={filtroRecurso} onValueChange={setFiltroRecurso}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Recurso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todos</SelectItem>
              {recursos.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Renderizado de servicios con acordeones */}
      <div className="space-y-4">
        {serviciosFiltrados.map((servicio) => (
          <CatalogoServicioAcordeon
            key={servicio.id}
            servicio={servicio}
            categorias={categorias}
            unidades={unidades}
            recursos={recursos}
            onUpdate={(id, payload) => onUpdate({ ...servicio, ...payload })}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}
