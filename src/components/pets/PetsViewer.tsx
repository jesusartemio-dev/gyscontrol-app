'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Users, Shield, Wrench, ClipboardList, AlertTriangle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PetsContenido } from '@/lib/validators/pets'
import type { SeccionSimple } from '@/lib/pets/textoPets'
import { BloqueComoRenderer } from './BloqueComoRenderer'

type Etapa = PetsContenido['procedimiento']['etapas'][number]
type Paso = Etapa['pasos'][number]

/** Parte del PETS que se edita como texto / IA. */
export type PartePets =
  | { tipo: 'seccion'; seccion: SeccionSimple }
  | { tipo: 'procedimiento' }
  | { tipo: 'etapa'; etapa: number }
  | { tipo: 'paso'; etapa: number; paso: number }

interface Props {
  contenido: PetsContenido
  /** Si viene, cada parte muestra "Texto / IA". */
  onTexto?: (parte: PartePets) => void
}

function BotonTexto({ onClick, etiqueta = 'Texto / IA', compacto }: { onClick: () => void; etiqueta?: string; compacto?: boolean }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={compacto ? 'h-7 w-7 shrink-0 p-0' : 'h-7 shrink-0 px-2 text-[11px]'}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title="Editar como texto (para trabajarlo con una IA)"
    >
      <Sparkles className={`h-3.5 w-3.5 text-indigo-500 ${compacto ? '' : 'mr-1'}`} />
      {!compacto && etiqueta}
    </Button>
  )
}

/** Un paso (qué / quién / cómo). También es la vista previa del texto pegado. */
export function PasoVista({ paso, numero, accion }: { paso: Paso; numero: number; accion?: React.ReactNode }) {
  return (
    <div className="border-l-2 border-blue-200 pl-2 sm:pl-3">
      <div className="mb-0.5 flex items-start gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold text-gray-800">{numero}. {paso.que}</p>
        {accion}
      </div>
      <p className="mb-2 text-xs text-gray-500">Quién: {paso.quien.map((q) => q.rol).join(', ')}</p>
      <BloqueComoRenderer bloques={paso.como} />
    </div>
  )
}

export function EtapaVista({ etapa, onTextoPaso }: { etapa: Etapa; onTextoPaso?: (paso: number) => void }) {
  return (
    <div className="space-y-4">
      {etapa.pasos.map((paso, j) => (
        <PasoVista
          key={j}
          paso={paso}
          numero={j + 1}
          accion={onTextoPaso && <BotonTexto compacto onClick={() => onTextoPaso(j)} />}
        />
      ))}
    </div>
  )
}

function Grupos({ grupos }: { grupos: [string, { nombre: string }[]][] }) {
  return (
    <div className="grid grid-cols-1 gap-3 px-1 py-1 sm:grid-cols-3 sm:gap-4 sm:px-2">
      {grupos.filter(([, items]) => items.length > 0).map(([titulo, items]) => (
        <div key={titulo}>
          <p className="mb-1 text-xs font-semibold uppercase text-gray-500">{titulo}</p>
          {items.map((e, i) => <p key={i} className="text-sm">• {e.nombre}</p>)}
        </div>
      ))}
    </div>
  )
}

export function PetsViewer({ contenido, onTexto }: Props) {
  const barra = (parte: PartePets, etiqueta?: string) =>
    onTexto && <div className="flex justify-end pb-1"><BotonTexto onClick={() => onTexto(parte)} etiqueta={etiqueta} /></div>

  return (
    <Accordion type="multiple" defaultValue={['procedimiento']}>
      {/* Personal */}
      <AccordionItem value="personal">
        <AccordionTrigger>
          <span className="flex items-center gap-2 text-left">
            <Users className="h-4 w-4 shrink-0 text-blue-600" />
            Personal involucrado ({contenido.personal.length})
          </span>
        </AccordionTrigger>
        <AccordionContent>
          {barra({ tipo: 'seccion', seccion: 'personal' })}
          <ul className="space-y-1 px-1 py-1 sm:px-2">
            {contenido.personal.map((p, i) => (
              <li key={i} className="flex items-center gap-1.5 text-sm">
                <span className="text-blue-500">•</span> {p.rol}
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>

      {/* EPP */}
      <AccordionItem value="epp">
        <AccordionTrigger>
          <span className="flex items-center gap-2 text-left">
            <Shield className="h-4 w-4 shrink-0 text-green-600" />
            EPP requerido
          </span>
        </AccordionTrigger>
        <AccordionContent>
          {barra({ tipo: 'seccion', seccion: 'epp' })}
          <Grupos grupos={[['Básico', contenido.epp.basico], ['Bioseguridad', contenido.epp.bioseguridad], ['Específico', contenido.epp.especifico]]} />
        </AccordionContent>
      </AccordionItem>

      {/* Recursos */}
      <AccordionItem value="recursos">
        <AccordionTrigger>
          <span className="flex items-center gap-2 text-left">
            <Wrench className="h-4 w-4 shrink-0 text-orange-600" />
            Recursos y materiales
          </span>
        </AccordionTrigger>
        <AccordionContent>
          {barra({ tipo: 'seccion', seccion: 'recursos' })}
          <Grupos grupos={[['Equipos', contenido.recursos.equipos], ['Herramientas', contenido.recursos.herramientas], ['Materiales', contenido.recursos.materiales]]} />
        </AccordionContent>
      </AccordionItem>

      {/* Procedimiento */}
      <AccordionItem value="procedimiento">
        <AccordionTrigger>
          <span className="flex items-center gap-2 text-left">
            <ClipboardList className="h-4 w-4 shrink-0 text-purple-600" />
            Procedimiento — {contenido.procedimiento.etapas.length} etapas
          </span>
        </AccordionTrigger>
        <AccordionContent>
          {barra({ tipo: 'procedimiento' }, 'Texto / IA: todo el procedimiento')}
          <Accordion type="multiple" className="sm:pl-2">
            {contenido.procedimiento.etapas.map((etapa, i) => {
              const letra = etapa.letra ?? String.fromCharCode(65 + i)
              return (
                <AccordionItem key={i} value={`etapa-${i}`}>
                  <AccordionTrigger className="text-left text-sm font-semibold">
                    Etapa {letra}: {etapa.titulo}
                  </AccordionTrigger>
                  <AccordionContent>
                    {barra({ tipo: 'etapa', etapa: i }, `Texto / IA: etapa ${letra}`)}
                    <div className="sm:pl-2">
                      <EtapaVista
                        etapa={etapa}
                        onTextoPaso={onTexto ? (j) => onTexto({ tipo: 'paso', etapa: i, paso: j }) : undefined}
                      />
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
          <span className="flex items-center gap-2 text-left">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            Restricciones generales ({contenido.restricciones.length})
          </span>
        </AccordionTrigger>
        <AccordionContent>
          {barra({ tipo: 'seccion', seccion: 'restricciones' })}
          <ul className="space-y-1 px-1 py-1 sm:px-2">
            {contenido.restricciones.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-sm text-red-700">
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
