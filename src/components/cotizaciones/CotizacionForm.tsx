'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createCotizacion } from '@/lib/services/cotizacion'
import { useSession } from 'next-auth/react'
import type { Cotizacion } from '@/types'
import { buildApiUrl } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface Cliente {
  id: string
  codigo: string
  nombre: string
}

interface Props {
  onCreated: (nueva: Cotizacion) => void
}

export default function CotizacionForm({ onCreated }: Props) {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { data: session } = useSession()
  const comercialId = session?.user?.id ?? ''

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/clientes'))
        if (!res.ok) throw new Error('Error al obtener clientes')
        const data = await res.json()
        setClientes(data)
      } catch (err) {
        console.error('Error al cargar clientes:', err)
        setError('No se pudieron cargar los clientes.')
      }
    }

    fetchClientes()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    if (!clienteId) {
      setError('Debes seleccionar un cliente.')
      return
    }

    if (!comercialId) {
      setError('Usuario no autenticado.')
      return
    }

    setLoading(true)
    try {
      const nueva = await createCotizacion({ clienteId, comercialId, nombre, fecha })
      onCreated(nueva)
      setNombre('')
      setClienteId('')
      router.push(`/comercial/cotizaciones/${nueva.id}`)
    } catch (err) {
      console.error('Error al crear cotización:', err)
      const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error al crear la cotización.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Nombre de la cotización *</Label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Cotización equipos planta norte"
          className="h-9 text-sm"
          disabled={loading}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Cliente *</Label>
        <Select value={clienteId} onValueChange={setClienteId} disabled={loading}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Seleccionar cliente" />
          </SelectTrigger>
          <SelectContent>
            {clientes.map((cliente) => (
              <SelectItem key={cliente.id} value={cliente.id}>
                <span className="font-mono text-xs text-muted-foreground mr-1.5">{cliente.codigo}</span>
                {cliente.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Fecha de cotización</Label>
        <Input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="h-9 text-sm"
          disabled={loading}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {loading ? 'Creando...' : 'Crear Cotización'}
        </Button>
      </div>
    </form>
  )
}
