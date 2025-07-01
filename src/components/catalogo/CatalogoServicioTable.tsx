'use client'

import { useEffect, useState } from 'react'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { getRecursos } from '@/lib/services/recurso'
import { getCategoriasServicio } from '@/lib/services/categoriaServicio'
import type { CatalogoServicio, TipoFormula } from '@/types'
import { Input } from '@/components/ui/input'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/ui/select'
import { Pencil, Save, Trash2 } from 'lucide-react'

interface Props {
  data: CatalogoServicio[]
  onUpdate: (servicio: CatalogoServicio) => void
  onDelete: (id: string) => void
}

export default function CatalogoServicioTable({ data, onUpdate, onDelete }: Props) {
  const [servicios, setServicios] = useState(data)
  const [unidades, setUnidades] = useState<any[]>([])
  const [recursos, setRecursos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])

  const [filtroCategoria, setFiltroCategoria] = useState('__ALL__')
  const [filtroUnidad, setFiltroUnidad] = useState('__ALL__')
  const [filtroRecurso, setFiltroRecurso] = useState('__ALL__')
  const [filtroTexto, setFiltroTexto] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<CatalogoServicio>>({})
  const [cantidad, setCantidad] = useState<number>(1)

  useEffect(() => {
    setServicios(data)
  }, [data])

  useEffect(() => {
    getUnidadesServicio().then(setUnidades)
    getRecursos().then(setRecursos)
    getCategoriasServicio().then(setCategorias)
  }, [])

  const serviciosFiltrados = servicios.filter((s) =>
    (filtroCategoria !== '__ALL__' ? s.categoriaId === filtroCategoria : true) &&
    (filtroUnidad !== '__ALL__' ? s.unidadServicioId === filtroUnidad : true) &&
    (filtroRecurso !== '__ALL__' ? s.recursoId === filtroRecurso : true) &&
    (`${s.nombre} ${s.descripcion}`.toLowerCase().includes(filtroTexto.toLowerCase()))
  )

  const handleSave = (id: string) => {
    const original = servicios.find(s => s.id === id)
    if (!original) return
    const updated = { ...original, ...editData }
    onUpdate(updated)
    setEditingId(null)
    setEditData({})
  }

  const calcularHoras = (formula: TipoFormula, cantidad: number, data: Partial<CatalogoServicio>) => {
    switch (formula) {
      case 'Fijo':
        return data.horaFijo ?? 0
      case 'Proporcional':
        return cantidad * (data.horaUnidad ?? 0)
      case 'Escalonada':
        return (data.horaBase ?? 0) + Math.max(0, cantidad - 1) * (data.horaRepetido ?? 0)
      default:
        return 0
    }
  }

  return (
    <div className="space-y-6">
      {/* Filtros y leyenda */}
      <div className="flex flex-wrap justify-between gap-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">Buscar</label>
            <Input
              placeholder="Nombre o descripción"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="w-60"
            />
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">Categoría</label>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todas</SelectItem>
                {categorias.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">Unidad</label>
            <Select value={filtroUnidad} onValueChange={setFiltroUnidad}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Unidad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todas</SelectItem>
                {unidades.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">Recurso</label>
            <Select value={filtroRecurso} onValueChange={setFiltroRecurso}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Recurso" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todos</SelectItem>
                {recursos.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Leyenda de fórmulas */}
        <div className="bg-blue-50 border border-blue-200 text-sm rounded px-4 py-2 w-full md:w-auto max-w-md">
          <div className="font-semibold text-blue-700 mb-1">📘 Cálculo de Horas</div>
          <ul className="list-disc pl-4 text-blue-800 space-y-0.5">
            <li><strong>Proporcional:</strong> HH = cantidad × HH_unidad</li>
            <li><strong>Escalonada:</strong> HH = HH_base + (cantidad − 1) × HH_repetido</li>
            <li><strong>Fijo:</strong> HH = HH_fijo</li>
          </ul>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2 text-center">Categoría</th>
              <th className="p-2 text-center">Recurso</th>
              <th className="p-2 text-center">$/Hora</th>
              <th className="p-2 text-center">Unidad</th>
              <th className="p-2 text-center">Fórmula</th>
              <th className="p-2 text-center">Base</th>
              <th className="p-2 text-center">Repetido</th>
              <th className="p-2 text-center">Unidad</th>
              <th className="p-2 text-center">Fijo</th>
              <th className="p-2 text-center">Total</th>
              <th className="p-2 text-center">$ Total</th>
              <th className="p-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {serviciosFiltrados.map((item) => {
              const isEditing = editingId === item.id
              const recursoId = editData.recursoId ?? item.recursoId
              const formula = editData.formula ?? item.formula
              const horasCalculadas = calcularHoras(formula, cantidad, { ...item, ...editData })
              const costoHora = recursos.find(r => r.id === recursoId)?.costoHora ?? item.recurso.costoHora
              const costoTotal = horasCalculadas * costoHora

              return (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 text-left" title={item.descripcion}>{item.nombre}</td>
                  <td className="p-2 text-center">{item.categoria?.nombre}</td>
                  <td className="p-2 text-center">
                    {isEditing ? (
                      <Select value={recursoId} onValueChange={(v) => setEditData(d => ({ ...d, recursoId: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {recursos.map(r => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : item.recurso?.nombre}
                  </td>
                  <td className="p-2 text-center text-blue-700 font-medium">
                    ${costoHora.toFixed(2)}
                  </td>
                  <td className="p-2 text-center">
                    {isEditing ? (
                      <Select value={editData.unidadServicioId ?? item.unidadServicioId} onValueChange={(v) => setEditData(d => ({ ...d, unidadServicioId: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {unidades.map(u => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : item.unidadServicio?.nombre}
                  </td>
                  <td className="p-2 text-center">
                    {isEditing ? (
                      <Select value={formula} onValueChange={(v) => setEditData(d => ({ ...d, formula: v as TipoFormula }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['Fijo', 'Proporcional', 'Escalonada'].map(f => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : item.formula}
                  </td>
                  {(['horaBase', 'horaRepetido', 'horaUnidad', 'horaFijo'] as const).map(field => (
                    <td className="p-2 text-center" key={field}>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={(editData[field] ?? item[field]) ?? 0}
                          onChange={(e) => setEditData(d => ({ ...d, [field]: parseFloat(e.target.value) }))}
                          className="w-20 text-right"
                        />
                      ) : item[field] ?? 0}
                    </td>
                  ))}
                  <td className="p-2 text-center text-green-700 font-semibold">{horasCalculadas}</td>
                  <td className="p-2 text-center text-green-700 font-semibold">${costoTotal.toFixed(2)}</td>
                  <td className="p-2 text-center">
                    {isEditing ? (
                      <>
                        <button onClick={() => handleSave(item.id)} className="text-green-600 hover:text-green-800 mr-2">
                          <Save size={16} />
                        </button>
                        <button onClick={() => { setEditingId(null); setEditData({}) }} className="text-gray-500 hover:text-gray-700">
                          ❌
                        </button>
                      </>
                    ) : (
                      <button onClick={() => { setEditingId(item.id); setEditData({}) }} className="text-blue-600 hover:text-blue-800">
                        <Pencil size={16} />
                      </button>
                    )}
                    <button onClick={() => onDelete(item.id)} className="ml-2 text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
