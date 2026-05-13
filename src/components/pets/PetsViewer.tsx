'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Users, Shield, Wrench, ClipboardList, AlertTriangle } from 'lucide-react'
import type { PetsContenido } from '@/lib/validators/pets'
import { BloqueComoRenderer } from './BloqueComoRenderer'

interface Props {
  contenido: PetsContenido
}

export function PetsViewer({ contenido }: Props) {
  return (
    <Accordion type="multiple" defaultValue={['procedimiento']}>
      {/* Personal */}
      <AccordionItem value="personal">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            Personal involucrado ({contenido.personal.length})
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-1 px-2 py-1">
            {contenido.personal.map((p, i) => (
              <li key={i} className="text-sm flex items-center gap-1.5">
                <span className="text-blue-500">•</span> {p.rol}
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>

      {/* EPP */}
      <AccordionItem value="epp">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-600" />
            EPP requerido
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-2 py-1">
            {contenido.epp.basico.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Básico</p>
                {contenido.epp.basico.map((e, i) => (
                  <p key={i} className="text-sm">• {e.nombre}</p>
                ))}
              </div>
            )}
            {contenido.epp.bioseguridad.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Bioseguridad</p>
                {contenido.epp.bioseguridad.map((e, i) => (
                  <p key={i} className="text-sm">• {e.nombre}</p>
                ))}
              </div>
            )}
            {contenido.epp.especifico.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Específico</p>
                {contenido.epp.especifico.map((e, i) => (
                  <p key={i} className="text-sm">• {e.nombre}</p>
                ))}
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Recursos */}
      {(contenido.recursos.equipos.length > 0 ||
        contenido.recursos.herramientas.length > 0 ||
        contenido.recursos.materiales.length > 0) && (
        <AccordionItem value="recursos">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-orange-600" />
              Recursos y materiales
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-2 py-1">
              {contenido.recursos.equipos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Equipos</p>
                  {contenido.recursos.equipos.map((e, i) => (
                    <p key={i} className="text-sm">• {e.nombre}</p>
                  ))}
                </div>
              )}
              {contenido.recursos.herramientas.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Herramientas</p>
                  {contenido.recursos.herramientas.map((e, i) => (
                    <p key={i} className="text-sm">• {e.nombre}</p>
                  ))}
                </div>
              )}
              {contenido.recursos.materiales.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Materiales</p>
                  {contenido.recursos.materiales.map((e, i) => (
                    <p key={i} className="text-sm">• {e.nombre}</p>
                  ))}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Procedimiento */}
      <AccordionItem value="procedimiento">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-purple-600" />
            Procedimiento — {contenido.procedimiento.etapas.length} etapas
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <Accordion type="multiple" className="pl-2">
            {contenido.procedimiento.etapas.map((etapa, i) => {
              const letra = etapa.letra ?? String.fromCharCode(65 + i)
              return (
                <AccordionItem key={i} value={`etapa-${i}`}>
                  <AccordionTrigger className="text-sm font-semibold">
                    Etapa {letra}: {etapa.titulo}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pl-2">
                      {etapa.pasos.map((paso, j) => (
                        <div key={j} className="border-l-2 border-blue-200 pl-3">
                          <p className="text-sm font-semibold text-gray-800 mb-0.5">
                            {j + 1}. {paso.que}
                          </p>
                          <p className="text-xs text-gray-500 mb-2">
                            Quien: {paso.quien.map((q) => q.rol).join(', ')}
                          </p>
                          <BloqueComoRenderer bloques={paso.como} />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </AccordionContent>
      </AccordionItem>

      {/* Restricciones */}
      <AccordionItem value="restricciones">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Restricciones generales ({contenido.restricciones.length})
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-1 px-2 py-1">
            {contenido.restricciones.map((r, i) => (
              <li key={i} className="text-sm text-red-700 flex items-start gap-1.5">
                <span className="flex-shrink-0 font-bold">✗</span>
                {r.texto}
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
