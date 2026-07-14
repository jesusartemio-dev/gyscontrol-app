'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Loader2, Pencil, Power, PowerOff } from 'lucide-react'
import { CatalogoImagenModal } from '@/components/catalogoImagenes/CatalogoImagenModal'
import { ImagenConLightbox } from '@/components/catalogoImagenes/ImagenConLightbox'
import { CATEGORIAS_CATALOGO_IMAGEN } from '@/lib/validators/catalogoImagen'
import type { CatalogoImagen } from '@prisma/client'

const ROLES_EDICION = ['admin', 'gerente']

const CATEGORIA_LABEL: Record<string, string> = {
  EQUIPO: 'Equipo',
  HERRAMIENTA: 'Herramienta',
  EPP: 'EPP',
  OTRO: 'Otro',
}

export default function CatalogoImagenesPage() {
  const { data: session } = useSession()
  const puedeEditar = Boolean(session?.user?.role && ROLES_EDICION.includes(session.user.role))

  const [imagenes, setImagenes] = useState<CatalogoImagen[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState<string>('TODAS')
  const [mostrarInactivas, setMostrarInactivas] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [imagenEditar, setImagenEditar] = useState<CatalogoImagen | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (busqueda.trim()) params.set('q', busqueda.trim())
      if (categoria !== 'TODAS') params.set('categoria', categoria)
      if (!mostrarInactivas) params.set('activo', 'true')
      const res = await fetch(`/api/catalogo-imagenes?${params.toString()}`)
      if (!res.ok) throw new Error('Error al cargar el catálogo')
      const body = await res.json()
      setImagenes(body.data ?? [])
    } catch {
      toast.error('No se pudo cargar el catálogo de imágenes')
    } finally {
      setLoading(false)
    }
  }, [busqueda, categoria, mostrarInactivas])

  useEffect(() => { cargar() }, [cargar])

  const toggleActivo = async (imagen: CatalogoImagen) => {
    try {
      const res = await fetch(`/api/catalogo-imagenes/${imagen.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !imagen.activo }),
      })
      if (!res.ok) throw new Error()
      toast.success(imagen.activo ? 'Imagen desactivada' : 'Imagen activada')
      await cargar()
    } catch {
      toast.error('No se pudo cambiar el estado')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Biblioteca de Imágenes</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo global de imágenes de referencia (equipos, herramientas, EPP) reutilizables entre planes de trabajo.
          </p>
        </div>
        {puedeEditar && (
          <Button onClick={() => { setImagenEditar(null); setModalAbierto(true) }}>
            <Plus size={16} className="mr-1" /> Nueva imagen
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre o keyword..." className="pl-7 h-9" />
        </div>
        <select value={categoria} onChange={e => setCategoria(e.target.value)} className="h-9 text-sm border rounded-md px-2 bg-white">
          <option value="TODAS">Todas las categorías</option>
          {CATEGORIAS_CATALOGO_IMAGEN.map(cat => (
            <option key={cat} value={cat}>{CATEGORIA_LABEL[cat]}</option>
          ))}
        </select>
        {puedeEditar && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarInactivas(v => !v)}
            className="h-9 text-xs"
          >
            {mostrarInactivas ? 'Ocultar inactivas' : 'Ver inactivas'}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 size={20} className="animate-spin mr-2" /> Cargando...
        </div>
      ) : imagenes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">No hay imágenes en el catálogo con estos filtros.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {imagenes.map(img => (
            <div key={img.id} className={`border rounded-lg overflow-hidden bg-white ${!img.activo ? 'opacity-50' : ''}`}>
              <ImagenConLightbox
                src={`/api/catalogo-imagenes/${img.id}/contenido`}
                alt={img.nombre}
                alturaClase="aspect-square"
              />
              <div className="p-2 space-y-1">
                <p className="text-xs font-medium truncate" title={img.nombre}>{img.nombre}</p>
                <Badge variant="outline" className="text-[10px]">{CATEGORIA_LABEL[img.categoria] ?? img.categoria}</Badge>
                {img.keywords.length > 0 && (
                  <p className="text-[10px] text-muted-foreground truncate" title={img.keywords.join(', ')}>
                    {img.keywords.join(', ')}
                  </p>
                )}
                {puedeEditar && (
                  <div className="flex items-center gap-1 pt-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setImagenEditar(img); setModalAbierto(true) }}>
                      <Pencil size={12} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleActivo(img)}>
                      {img.activo ? <PowerOff size={12} /> : <Power size={12} />}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <CatalogoImagenModal
          imagen={imagenEditar}
          onClose={() => setModalAbierto(false)}
          onSaved={cargar}
        />
      )}
    </div>
  )
}
