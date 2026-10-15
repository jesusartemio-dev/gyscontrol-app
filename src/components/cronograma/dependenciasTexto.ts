// Aviso para el usuario cuando "Después de…" / "En paralelo con…" guardó (o no)
// la dependencia entre tareas. Respuesta `dependencia` de PUT /cronograma/tree/[nodeId].

export function textoDependenciaCreada(dep?: { estado: string; nombreOrigen?: string }): string | undefined {
  if (!dep) return undefined
  const de = dep.nombreOrigen ? ` con "${dep.nombreOrigen}"` : ''
  switch (dep.estado) {
    case 'creada': return `Se creó la dependencia${de} (se exporta a MS Project).`
    case 'actualizada': return `Se actualizó la dependencia${de}.`
    case 'existente': return `Ya dependía${de}.`
    case 'ciclo': return `No se creó la dependencia${de}: formaría un ciclo.`
    default: return undefined
  }
}
