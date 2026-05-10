import type { PlanTrabajo } from '@prisma/client'

interface SnapshotV1 {
  plan: PlanTrabajo
  organigramaPngBase64: string
}

function isSnapshotV1(s: unknown): s is SnapshotV1 {
  return (
    typeof s === 'object' &&
    s !== null &&
    'plan' in s &&
    typeof (s as SnapshotV1).plan === 'object' &&
    'organigramaPngBase64' in s
  )
}

/** Extrae el PlanTrabajo del snapshot. Devuelve null para snapshots legacy (dataBag). */
export function getSnapshotPlan(snapshotData: unknown): PlanTrabajo | null {
  if (isSnapshotV1(snapshotData)) return snapshotData.plan
  return null
}

/** Extrae el PNG base64 del organigrama del snapshot. Devuelve '' para snapshots legacy. */
export function getSnapshotPng(snapshotData: unknown): string {
  if (isSnapshotV1(snapshotData)) return snapshotData.organigramaPngBase64
  return ''
}
