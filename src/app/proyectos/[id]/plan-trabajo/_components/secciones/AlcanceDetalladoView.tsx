import type { PlanTrabajo, PlanTrabajoImagen } from '@prisma/client'
import type { PlanAlcanceDetalladoEdt, PlanAlcanceItem } from '@/types/planTrabajo'
import { captionEfectivo } from '@/lib/planTrabajo/imagenCaption'

interface Props {
  plan: PlanTrabajo
  proyectoId: string
  imagenes: PlanTrabajoImagen[]
}

function isNuevoFormato(item: unknown): item is PlanAlcanceDetalladoEdt {
  return typeof item === 'object' && item !== null && 'edtNombre' in item
}

/**
 * Galería de solo lectura para el modo vista (Bloque 4.2, Tarea 2) — antes las
 * imágenes solo se veían dentro del editor; el responsable que solo revisa el
 * plan (sin entrar a editar) no las veía. Mismo orden (por `orden`) y mismo
 * caption efectivo que el export a docx — nunca upload/reordenar/borrar acá.
 */
function GaleriaSoloLectura({
  proyectoId,
  edtRef,
  subItemRef,
  tareaRef,
  imagenes,
}: {
  proyectoId: string
  edtRef: string
  subItemRef?: string
  /** tareaRefId de la tarea (Bloque 4.2 sesión 2, Tarea 3) — si está presente, filtra SOLO por tareaRef. */
  tareaRef?: string
  imagenes: PlanTrabajoImagen[]
}) {
  const propias = imagenes
    .filter(img => {
      if (img.edtRef !== edtRef) return false
      if (tareaRef) return img.tareaRef === tareaRef
      return !img.tareaRef && (img.subItemRef ?? undefined) === subItemRef
    })
    .sort((a, b) => a.orden - b.orden)

  if (propias.length === 0) return null

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {propias.map(img => (
        <figure key={img.id} className="border rounded overflow-hidden bg-gray-50">
          <img
            src={`/api/proyectos/${proyectoId}/plan-trabajo/alcance-imagenes/${img.id}/contenido`}
            alt={captionEfectivo(img, '')}
            className="w-full h-20 object-cover"
          />
          <figcaption className="text-[10px] text-gray-600 px-1 py-0.5 truncate" title={captionEfectivo(img, '')}>
            {captionEfectivo(img, '')}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

export function AlcanceDetalladoView({ plan, proyectoId, imagenes }: Props) {
  const raw = plan.alcanceDetallado as unknown[] | null
  if (!raw || raw.length === 0) return null

  const todosNuevoFormato = raw.every(isNuevoFormato)

  if (todosNuevoFormato) {
    const items = raw as PlanAlcanceDetalladoEdt[]

    // Agrupar por faseNombre manteniendo orden de aparición
    const grupos: Record<string, PlanAlcanceDetalladoEdt[]> = {}
    const ordenFases: string[] = []
    for (const item of items) {
      const fase = item.faseNombre || item.faseAbreviatura || 'Sin fase'
      if (!grupos[fase]) {
        grupos[fase] = []
        ordenFases.push(fase)
      }
      grupos[fase].push(item)
    }

    return (
      <div className="space-y-5">
        {ordenFases.map(faseNombre => (
          <div key={faseNombre}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-indigo-200" />
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest px-1">
                {faseNombre}
              </span>
              <div className="h-px flex-1 bg-indigo-200" />
            </div>
            <div className="space-y-3">
              {grupos[faseNombre].map((item, i) => (
                <div key={i} className="border rounded-md p-3 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                      {item.numeracion}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">{item.edtNombre}</span>
                  </div>
                  {item.ubicacion && (
                    <p className="text-xs text-muted-foreground ml-8">📍 {item.ubicacion}</p>
                  )}
                  {item.descripcion && (
                    <p className="text-xs text-gray-600 ml-8 leading-relaxed">{item.descripcion}</p>
                  )}
                  {item.tipoDetalle === 'detallado' && item.edtRefId && (
                    <div className="ml-8">
                      <GaleriaSoloLectura proyectoId={proyectoId} edtRef={item.edtRefId} imagenes={imagenes} />
                    </div>
                  )}
                  {(item.subItems ?? []).length > 0 && (
                    <div className="ml-8 mt-2 space-y-2 border-l-2 border-indigo-100 pl-3">
                      {(item.subItems ?? []).map((sub, si) => (
                        <div key={si} className="space-y-1">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                              {sub.numeracion}
                            </span>
                            <span className="text-xs font-medium text-gray-700">
                              {sub.actividadNombre}
                            </span>
                          </div>
                          {sub.descripcion && (
                            <p className="text-xs text-gray-500 leading-relaxed">{sub.descripcion}</p>
                          )}
                          {(sub.tareas ?? []).length > 0 && (
                            <ul className="list-disc list-inside space-y-1.5 pl-1">
                              {(sub.tareas ?? []).map((tarea, ti) => {
                                const imagenesDeLaTarea = imagenes.filter(
                                  img => img.edtRef === (item.edtRefId ?? '') && img.tareaRef === tarea.tareaRefId
                                )
                                return (
                                  <li key={tarea.tareaRefId ?? ti} className="text-xs text-gray-500 leading-relaxed">
                                    {tarea.texto || tarea.nombre}
                                    {item.tipoDetalle === 'detallado' && tarea.fotoSugerida && imagenesDeLaTarea.length === 0 && (
                                      <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mt-0.5 list-none">
                                        📷 <strong>Foto sugerida:</strong> {tarea.fotoSugerida}
                                      </p>
                                    )}
                                    {item.tipoDetalle === 'detallado' && tarea.tareaRefId && (
                                      <div className="list-none mt-1">
                                        <GaleriaSoloLectura
                                          proyectoId={proyectoId}
                                          edtRef={item.edtRefId ?? ''}
                                          tareaRef={tarea.tareaRefId}
                                          imagenes={imagenes}
                                        />
                                      </div>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                          {item.tipoDetalle === 'detallado' && sub.fotoSugerida &&
                            imagenes.filter(img => img.edtRef === (item.edtRefId ?? '') && !img.tareaRef && (img.subItemRef ?? undefined) === sub.actividadRefId).length === 0 && (
                              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                📷 <strong>Foto sugerida:</strong> {sub.fotoSugerida}
                              </p>
                          )}
                          {item.tipoDetalle === 'detallado' && sub.actividadRefId && (
                            <GaleriaSoloLectura
                              proyectoId={proyectoId}
                              edtRef={item.edtRefId ?? ''}
                              subItemRef={sub.actividadRefId}
                              imagenes={imagenes}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Formato mixto o legacy
  return (
    <div className="space-y-3">
      {raw.map((item, i) => {
        if (isNuevoFormato(item)) {
          return (
            <div key={i} className="border rounded-md p-3 space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                  {item.numeracion}
                </span>
                <span className="text-sm font-semibold text-gray-800">{item.edtNombre}</span>
              </div>
              {item.descripcion && (
                <p className="text-xs text-gray-600 ml-8 leading-relaxed">{item.descripcion}</p>
              )}
            </div>
          )
        }
        const legacy = item as PlanAlcanceItem
        return (
          <div key={i} className="border rounded-md p-3 space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                {legacy.numero}
              </span>
              <span className="text-sm font-semibold text-gray-800">{legacy.nombre}</span>
            </div>
            {legacy.descripcion && (
              <p className="text-xs text-gray-600 ml-8 leading-relaxed">{legacy.descripcion}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
