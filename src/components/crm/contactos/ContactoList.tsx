'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Edit, Trash2, Phone, Mail, Crown, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { CrmContactoCliente } from '@/types'

interface ContactoListProps {
   contactos: CrmContactoCliente[]
   clienteId: string
   onEdit: (contacto: CrmContactoCliente) => void
   onDelete: (contactoId: string) => void
   onCreate: () => void
   loading?: boolean
 }

export default function ContactoList({
  contactos,
  clienteId,
  onEdit,
  onDelete,
  onCreate,
  loading = false
}: ContactoListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (contactoId: string) => {
    setDeletingId(contactoId)
    try {
      const response = await fetch(`/api/crm/clientes/${clienteId}/contactos/${contactoId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar contacto')
      }

      onDelete(contactoId)
    } catch (error) {
      console.error('Error deleting contacto:', error)
      // Aquí podrías mostrar un toast de error
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Contactos del Cliente</h3>
          <p className="text-sm text-muted-foreground">
            {contactos.length} contacto{contactos.length !== 1 ? 's' : ''} registrado{contactos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={onCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Contacto
        </Button>
      </div>

      {/* Lista de contactos */}
      {contactos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay contactos registrados</h3>
            <p className="text-muted-foreground mb-4">
              Agrega contactos para mantener un mejor seguimiento de tus relaciones comerciales.
            </p>
            <Button onClick={onCreate} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primer Contacto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {contactos.map((contacto, index) => (
            <motion.div
              key={contacto.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Avatar */}
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {contacto.nombre.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Información principal */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-lg">{contacto.nombre}</h4>
                          {contacto.esDecisionMaker && (
                            <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                              <Crown className="h-3 w-3 mr-1" />
                              Decision Maker
                            </Badge>
                          )}
                        </div>

                        {contacto.cargo && (
                          <p className="text-sm text-muted-foreground">{contacto.cargo}</p>
                        )}

                        {/* Información de contacto */}
                        <div className="flex flex-wrap gap-4 text-sm">
                          {contacto.email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              {contacto.email}
                            </div>
                          )}
                          {contacto.telefono && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              {contacto.telefono}
                            </div>
                          )}
                          {contacto.celular && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              {contacto.celular} (cel)
                            </div>
                          )}
                        </div>

                        {/* Áreas de influencia y relación */}
                        {(contacto.areasInfluencia || contacto.relacionComercial) && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {contacto.areasInfluencia && (
                              <Badge variant="outline" className="text-xs">
                                {contacto.areasInfluencia}
                              </Badge>
                            )}
                            {contacto.relacionComercial && (
                              <Badge variant="outline" className="text-xs">
                                Rel: {contacto.relacionComercial}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Último contacto */}
                        {contacto.fechaUltimoContacto && (
                          <p className="text-xs text-muted-foreground">
                            Último contacto: {new Date(contacto.fechaUltimoContacto).toLocaleDateString('es-ES')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(contacto)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deletingId === contacto.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar Contacto</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de que quieres eliminar el contacto "{contacto.nombre}"?
                              Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => contacto.id && handleDelete(contacto.id)}
                                className="bg-red-600 hover:bg-red-700"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Notas */}
                  {contacto.notas && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">{contacto.notas}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}