// TODO Fase 3

type SseEvent = { tipo: string; [key: string]: unknown }

export async function* generarConIaPets(
  _proyectoId: string,
  _signal?: AbortSignal,
): AsyncGenerator<SseEvent> {
  yield { tipo: 'error', mensaje: 'Not implemented — Fase 3' }
}
