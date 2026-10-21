const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/**
 * Total de una valorización desde sus partidas.
 *
 * Si todas las partidas son CALCULADAS (montoAvance = contractual × % redondeado),
 * el total es Σ (contractual × %) SIN redondear cada partida, redondeado una
 * sola vez al final — igual que el Excel del cliente. Sumar los montos ya
 * redondeados perdía centavos (QRM18-VAL-001: 7,915.356 → el cliente 7,915.36;
 * la suma de partidas redondeadas daba 7,915.35).
 *
 * Si alguna partida trae un monto que no sale de contractual × % (importada del
 * Excel/PDF del cliente con el % redondeado), se suman los montos tal cual:
 * ese monto es el del documento del cliente y no se recalcula.
 */
export function montoTotalPartidas(
  partidas: { montoContractual: number; porcentajeAvance: number; montoAvance?: number }[]
): number {
  const calculado = (p: { montoContractual: number; porcentajeAvance: number }) =>
    (Number(p.montoContractual) || 0) * ((Number(p.porcentajeAvance) || 0) / 100)
  const todasCalculadas = partidas.every(
    p => p.montoAvance === undefined || Math.abs(round2(calculado(p)) - Number(p.montoAvance)) < 0.005
  )
  return todasCalculadas
    ? round2(partidas.reduce((s, p) => s + calculado(p), 0))
    : round2(partidas.reduce((s, p) => s + (Number(p.montoAvance) || 0), 0))
}
