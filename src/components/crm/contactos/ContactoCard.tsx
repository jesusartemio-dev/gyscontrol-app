'use client'

import { motion } from 'framer-motion'
import { Mail, Phone, Building2, Star, Edit3, Trash2, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CrmContactoCliente } from '@/lib/services/crm/contactos'

interface ContactoCardProps {
  contacto: CrmContactoCliente
  onEdit?: (contacto: CrmContactoCliente) => void
  onDelete?: (id: string) => void
  onMessage?: (contacto: CrmContactoCliente) => void
}

export default function ContactoCard({ contacto, onEdit, onDelete, onMessage }: ContactoCardProps) {
  const getRelacionBadgeVariant = (relacion?: string) => {
    switch (relacion) {
      case 'muy_buena': return 'default'
      case 'buena': return 'secondary'
      case 'regular': return 'outline'
      case 'mala': return 'destructive'
      default: return 'outline'
    }
  }

  const getRelacionLabel = (relacion?: string) => {
    switch (relacion) {
      case 'muy_buena': return 'Muy Buena'
      case 'buena': return 'Buena'
      case 'regular': return 'Regular'
      case 'mala': return 'Mala'
      default: return 'Sin Calificar'
    }
  }

  const getAreaLabel = (area?: string) => {
    switch (area) {
      case 'técnica': return 'Técnica'
      case 'comercial': return 'Comercial'
      case 'financiera': return 'Financiera'
      case 'operativa': return 'Operativa'
      case 'gerencial': return 'Gerencial'
      default: return area || 'Sin Especificar'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-4 hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                  {contacto.nombre.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 truncate">{contacto.nombre}</h4>
                  {contacto.esDecisionMaker && (
                    <Badge variant="default" className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 border-yellow-300">
                      <Star className="h-3 w-3 mr-1" />
                      Decision Maker
                    </Badge>
                  )}
                </div>

                {contacto.cargo && (
                  <p className="text-sm text-gray-600 mb-2">{contacto.cargo}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-2">
                  {contacto.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span className="truncate max-w-[200px]">{contacto.email}</span>
                    </div>
                  )}
                  {contacto.telefono && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{contacto.telefono}</span>
                    </div>
                  )}
                  {contacto.celular && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{contacto.celular}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {contacto.areasInfluencia && (
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      {getAreaLabel(contacto.areasInfluencia)}
                    </Badge>
                  )}
                  {contacto.relacionComercial && (
                    <Badge variant={getRelacionBadgeVariant(contacto.relacionComercial)} className="text-xs">
                      {getRelacionLabel(contacto.relacionComercial)}
                    </Badge>
                  )}
                </div>

                {contacto.notas && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{contacto.notas}</p>
                )}
              </div>
            </div>

            <div className="flex gap-1 ml-2">
              {onMessage && (
                <Button variant="ghost" size="sm" onClick={() => onMessage(contacto)}>
                  <MessageSquare className="h-3 w-3" />
                </Button>
              )}
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(contacto)}>
                  <Edit3 className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="sm" onClick={() => onDelete(contacto.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}