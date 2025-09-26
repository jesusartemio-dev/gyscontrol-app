'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Users, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import ContactoList from '@/components/crm/contactos/ContactoList'
import ContactoForm from '@/components/crm/contactos/ContactoForm'
import type { CrmContactoCliente } from '@/lib/services/crm'

type Contacto = CrmContactoCliente

interface Cliente {
  id: string
  nombre: string
  codigo: string
}

export default function ContactosClientePage() {
  const { id } = useParams()
  const router = useRouter()
  const clienteId = id as string

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [contactos, setContactos] = useState<CrmContactoCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingContacto, setEditingContacto] = useState<CrmContactoCliente | null>(null)

  useEffect(() => {
    if (clienteId) {
      loadData()
    }
  }, [clienteId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Cargar información del cliente y sus contactos
      const [clienteResponse, contactosResponse] = await Promise.all([
        fetch(`/api/clientes/${clienteId}`),
        fetch(`/api/crm/clientes/${clienteId}/contactos`)
      ])

      if (!clienteResponse.ok) {
        throw new Error('Error al cargar información del cliente')
      }

      if (!contactosResponse.ok) {
        throw new Error('Error al cargar contactos')
      }

      const clienteData = await clienteResponse.json()
      const contactosData = await contactosResponse.json()

      setCliente(clienteData)
      setContactos(contactosData)
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateContacto = () => {
    setEditingContacto(null)
    setShowForm(true)
  }

  const handleEditContacto = (contacto: CrmContactoCliente) => {
    setEditingContacto(contacto)
    setShowForm(true)
  }

  const handleSaveContacto = (savedContacto: CrmContactoCliente) => {
    if (editingContacto) {
      // Actualizar contacto existente
      setContactos(prev =>
        prev.map(c => c.id === savedContacto.id ? savedContacto : c)
      )
    } else {
      // Agregar nuevo contacto
      setContactos(prev => [savedContacto, ...prev])
    }
    setShowForm(false)
    setEditingContacto(null)
  }

  const handleDeleteContacto = (contactoId: string) => {
    setContactos(prev => prev.filter(c => c.id !== contactoId))
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingContacto(null)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Cargando contactos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={loadData} variant="outline">
            Intentar de nuevo
          </Button>
        </div>
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Cliente no encontrado</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <motion.div
      className="p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header con navegación */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div className="h-6 w-px bg-border" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Contactos - {cliente.nombre}
          </h1>
          <p className="text-muted-foreground">
            Gestión de contactos para el cliente {cliente.codigo}
          </p>
        </div>
      </div>

      {/* Información del cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Información del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nombre</p>
              <p className="text-lg font-semibold">{cliente.nombre}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Código</p>
              <p className="text-lg font-semibold">{cliente.codigo}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Contactos</p>
              <p className="text-lg font-semibold">{contactos.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de contactos */}
      <ContactoList
        contactos={contactos}
        clienteId={clienteId}
        onEdit={handleEditContacto}
        onDelete={handleDeleteContacto}
        onCreate={handleCreateContacto}
        loading={false}
      />

      {/* Modal de formulario */}
      <ContactoForm
        isOpen={showForm}
        onClose={handleCloseForm}
        onSave={handleSaveContacto}
        contacto={editingContacto}
        clienteId={clienteId}
        mode={editingContacto ? 'edit' : 'create'}
      />
    </motion.div>
  )
}