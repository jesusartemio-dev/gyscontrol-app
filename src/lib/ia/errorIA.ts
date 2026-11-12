// ===================================================
// 📁 errorIA.ts
// 📌 Traduce los errores de la API de Anthropic a algo que el usuario pueda
//    leer y accionar.
//
// El SDK pone en `err.message` el cuerpo crudo de la respuesta, así que al
// usuario le llegaba literalmente:
//
//   400 {"type":"error","error":{"type":"invalid_request_error","message":
//   "Your credit balance is too low to access the Anthropic API..."}}
//
// Ninguna de esas fallas es culpa de quien aprieta el botón, y varias no se
// resuelven reintentando: hay que recargar saldo o revisar la API key. Decirlo
// en claro evita que nos reporten "no funciona el IPERC".
// ===================================================

/** Mensaje accionable en español para un error venido de la API de IA. */
export function mensajeErrorIA(err: unknown, fallback = 'Error al generar con IA'): string {
  const crudo = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  if (!crudo) return fallback

  const txt = crudo.toLowerCase()
  const status = (err as { status?: number })?.status

  // Saldo agotado. No se arregla reintentando.
  if (txt.includes('credit balance is too low') || txt.includes('insufficient_quota')) {
    return 'La cuenta de IA se quedó sin saldo. Un administrador debe recargar créditos en console.anthropic.com (Plans & Billing) para volver a generar. No es un problema del proyecto ni de los datos.'
  }

  // API key ausente o inválida.
  if (status === 401 || txt.includes('authentication_error') || txt.includes('invalid x-api-key')) {
    return 'La clave de la API de IA no es válida o no está configurada. Avisa a un administrador para revisar ANTHROPIC_API_KEY.'
  }

  if (status === 403 || txt.includes('permission_error')) {
    return 'La clave de la API de IA no tiene permiso para este modelo. Avisa a un administrador.'
  }

  // Saturación: reintentar sí sirve.
  if (status === 429 || txt.includes('rate_limit')) {
    return 'La IA está recibiendo demasiadas peticiones ahora mismo. Espera un par de minutos y vuelve a intentar.'
  }
  if (status === 529 || txt.includes('overloaded')) {
    return 'El servicio de IA está saturado en este momento. Vuelve a intentar en unos minutos.'
  }

  if (txt.includes('timeout') || txt.includes('etimedout') || txt.includes('econnreset') || txt.includes('aborted')) {
    return 'La IA tardó demasiado en responder. Vuelve a intentar; si se repite, genera menos EDTs a la vez.'
  }

  // Entrada demasiado grande para el modelo.
  if (txt.includes('prompt is too long') || txt.includes('max_tokens') || txt.includes('context_length')) {
    return 'El contenido enviado a la IA es demasiado largo. Genera por partes, con menos EDTs seleccionados a la vez.'
  }

  if (status === 500 || status === 502 || status === 503 || txt.includes('api_error')) {
    return 'El servicio de IA tuvo un problema temporal. Vuelve a intentar en unos minutos.'
  }

  // Un error nuestro (validación, parseo, BD): se devuelve tal cual, que para
  // eso lo escribimos nosotros en español.
  return crudo
}

/** true si reintentar tiene sentido. Útil para decidir si ofrecer "Reintentar". */
export function esErrorIAReintentable(err: unknown): boolean {
  const txt = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase()
  const status = (err as { status?: number })?.status
  if (txt.includes('credit balance is too low')) return false
  if (status === 401 || status === 403) return false
  return (
    status === 429 ||
    status === 529 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    txt.includes('rate_limit') ||
    txt.includes('overloaded') ||
    txt.includes('timeout')
  )
}
