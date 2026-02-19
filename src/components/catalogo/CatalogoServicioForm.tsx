// ===================================================
// 📝 Archivo: CatalogoServicioForm.tsx (Diseño Optimizado)
// 🔹 Ubicación: src/components/catalogo/
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { createCatalogoServicio } from '@/lib/services/catalogoServicio'
import { getEdts } from '@/lib/services/edt'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { getRecursos } from '@/lib/services/recurso'
import { CatalogoServicio, Edt, UnidadServicio, Recurso, CatalogoServicioPayload } from '@/types'
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
  const [categoriaId, setCategoriaId] = useState('')
  const [unidadServicioId, setUnidadServicioId] = useState('')
  const [recursoId, setRecursoId] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [horaBase, setHoraBase] = useState(0)
  const [horaRepetido, setHoraRepetido] = useState(0)
  const [nivelDificultad, setNivelDificultad] = useState(1)

  const [categorias, setCategorias] = useState<Edt[]>([])
  const [unidades, setUnidades] = useState<UnidadServicio[]>([])
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getEdts().then(setCategorias)
    getUnidadesServicio().then(setUnidades)
    getRecursos(true).then(setRecursos)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload: CatalogoServicioPayload = {
      nombre,
      descripcion,
      cantidad,
      horaBase,
      horaRepetido,
      orden: 0,
      nivelDificultad,
      categoriaId,
      unidadServicioId,
      recursoId,
    }

    try {
      const nuevo = await createCatalogoServicio(payload)
      toast.success('Servicio creado')
      onCreated?.(nuevo)

      setNombre('')
      setDescripcion('')
      setCantidad(1)
      setHoraBase(0)
      setHoraRepetido(0)
      setNivelDificultad(1)
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
        <div className="space-y-1">
          <Label>Cantidad de referencia</Label>
          <Input type="number" min="1" placeholder="1" value={cantidad} onChange={(e) => setCantidad(parseInt(e.target.value) || 1)} required />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Descripción</Label>
          <textarea className="w-full p-2 border border-gray-300 rounded-md min-h-[80px]" placeholder="Descripción del servicio" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>EDT</Label>
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger><SelectValue placeholder="Selecciona EDT" /></SelectTrigger>
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

      {/* Horas escalonadas + Dificultad */}
      <div className="grid grid-cols-3 gap-4 items-start">
        <div className="grid grid-cols-2 gap-4 col-span-2">
          <div className="space-y-1">
            <Label>Horas base</Label>
            <Input type="number" step="any" value={horaBase} onChange={(e) => setHoraBase(parseFloat(e.target.value) || 0)} required />
          </div>
          <div className="space-y-1">
            <Label>Horas por repetido</Label>
            <Input type="number" step="any" value={horaRepetido} onChange={(e) => setHoraRepetido(parseFloat(e.target.value) || 0)} required />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Nivel de dificultad</Label>
          <Select value={nivelDificultad.toString()} onValueChange={(val) => setNivelDificultad(parseInt(val))}>
            <SelectTrigger><SelectValue placeholder="Selecciona dificultad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 - Básico</SelectItem>
              <SelectItem value="2">2 - Intermedio</SelectItem>
              <SelectItem value="3">3 - Avanzado</SelectItem>
              <SelectItem value="4">4 - Experto</SelectItem>
              <SelectItem value="5">5 - Maestro</SelectItem>
            </SelectContent>
          </Select>
          {/* Leyenda */}
          <div className="text-xs text-gray-600 mt-1">
            <p><strong>HH =</strong> (HH_base + (cantidad - 1) × HH_repetido) × dificultad</p>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : 'Crear'}
      </Button>
    </form>
  )
}
