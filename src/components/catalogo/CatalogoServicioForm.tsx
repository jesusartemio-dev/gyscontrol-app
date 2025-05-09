// ===================================================
// 📝 Archivo: CatalogoServicioForm.tsx (Diseño Optimizado)
// 🔹 Ubicación: src/components/catalogo/
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { createCatalogoServicio } from '@/lib/services/catalogoServicio'
import { getCategoriasServicio } from '@/lib/services/categoriaServicio'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { getRecursos } from '@/lib/services/recurso'
import { CatalogoServicio, CategoriaServicio, UnidadServicio, Recurso, CatalogoServicioPayload, TipoFormula } from '@/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'

interface Props {
  onCreated?: (nuevo: CatalogoServicio) => void
}

export default function CatalogoServicioForm({ onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [formula, setFormula] = useState<TipoFormula>('Proporcional')
  const [categoriaId, setCategoriaId] = useState('')
  const [unidadServicioId, setUnidadServicioId] = useState('')
  const [recursoId, setRecursoId] = useState('')
  const [horaUnidad, setHoraUnidad] = useState(0)
  const [horaBase, setHoraBase] = useState(0)
  const [horaRepetido, setHoraRepetido] = useState(0)
  const [horaFijo, setHoraFijo] = useState(0)

  const [categorias, setCategorias] = useState<CategoriaServicio[]>([])
  const [unidades, setUnidades] = useState<UnidadServicio[]>([])
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getCategoriasServicio().then(setCategorias)
    getUnidadesServicio().then(setUnidades)
    getRecursos().then(setRecursos)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload: CatalogoServicioPayload = {
      nombre,
      descripcion,
      formula,
      categoriaId,
      unidadServicioId,
      recursoId,
      horaUnidad,
      horaBase,
      horaRepetido,
      horaFijo,
    }

    try {
      const nuevo = await createCatalogoServicio(payload)
      toast.success('Servicio creado')
      onCreated?.(nuevo)

      setNombre('')
      setDescripcion('')
      setFormula('Proporcional')
      setHoraUnidad(0)
      setHoraBase(0)
      setHoraRepetido(0)
      setHoraFijo(0)
    } catch (error) {
      console.error(error)
      toast.error('Error al crear servicio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold">➕ Nuevo Servicio</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Nombre del servicio</Label>
          <Input placeholder="Nombre del servicio" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Descripción</Label>
          <textarea className="w-full p-2 border border-gray-300 rounded-md min-h-[80px]" placeholder="Descripción del servicio" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>Categoría</Label>
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger><SelectValue placeholder="Selecciona categoría" /></SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Unidad de Servicio</Label>
          <Select value={unidadServicioId} onValueChange={setUnidadServicioId}>
            <SelectTrigger><SelectValue placeholder="Selecciona unidad" /></SelectTrigger>
            <SelectContent>
              {unidades.map((u) => (<SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Recurso</Label>
          <Select value={recursoId} onValueChange={setRecursoId}>
            <SelectTrigger><SelectValue placeholder="Selecciona recurso" /></SelectTrigger>
            <SelectContent>
              {recursos.map((r) => (<SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fórmula + Horas compactado */}
      <div className="grid grid-cols-3 gap-4 items-start">
        <div className="space-y-1">
          <Label>Fórmula</Label>
          <Select value={formula} onValueChange={(val) => setFormula(val as TipoFormula)}>
            <SelectTrigger><SelectValue placeholder="Selecciona fórmula" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Proporcional">Proporcional</SelectItem>
              <SelectItem value="Escalonada">Escalonada</SelectItem>
              <SelectItem value="Fijo">Fijo</SelectItem>
            </SelectContent>
          </Select>
          {/* Leyenda */}
          <div className="text-xs text-gray-600 mt-1">
            {formula === 'Proporcional' && (<p><strong>HH =</strong> cantidad × HH_unidad</p>)}
            {formula === 'Escalonada' && (<p><strong>HH =</strong> HH_base + (cantidad - 1) × HH_repetido</p>)}
            {formula === 'Fijo' && (<p><strong>HH =</strong> HH_fijo</p>)}
          </div>
        </div>

        {/* Campos dinámicos */}
        {formula === 'Proporcional' && (
          <div className="space-y-1">
            <Label>Horas por unidad</Label>
            <Input type="number" step="any" value={horaUnidad} onChange={(e) => setHoraUnidad(parseFloat(e.target.value))} required />
          </div>
        )}

        {formula === 'Escalonada' && (
          <div className="grid grid-cols-2 gap-4 col-span-2">
            <div className="space-y-1">
              <Label>Horas base</Label>
              <Input type="number" step="any" value={horaBase} onChange={(e) => setHoraBase(parseFloat(e.target.value))} required />
            </div>
            <div className="space-y-1">
              <Label>Horas por repetido</Label>
              <Input type="number" step="any" value={horaRepetido} onChange={(e) => setHoraRepetido(parseFloat(e.target.value))} required />
            </div>
          </div>
        )}

        {formula === 'Fijo' && (
          <div className="space-y-1">
            <Label>Horas fijas</Label>
            <Input type="number" step="any" value={horaFijo} onChange={(e) => setHoraFijo(parseFloat(e.target.value))} required />
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : 'Crear'}
      </Button>
    </form>
  )
}
