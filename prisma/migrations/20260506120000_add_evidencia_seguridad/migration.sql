-- ========== STEP A: enum + tabla evidencia_seguridad ==========
CREATE TYPE "EstadoEvidenciaSeguridad" AS ENUM ('abierta', 'cerrada');

CREATE TABLE "evidencia_seguridad" (
    "id" TEXT NOT NULL,
    "registroHorasCampoId" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "estado" "EstadoEvidenciaSeguridad" NOT NULL DEFAULT 'abierta',
    "observaciones" TEXT,
    "fechaCierre" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "evidencia_seguridad_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "evidencia_seguridad_registroHorasCampoId_key" ON "evidencia_seguridad"("registroHorasCampoId");
CREATE INDEX "evidencia_seguridad_creadoPorId_idx" ON "evidencia_seguridad"("creadoPorId");

ALTER TABLE "evidencia_seguridad"
    ADD CONSTRAINT "evidencia_seguridad_registroHorasCampoId_fkey"
    FOREIGN KEY ("registroHorasCampoId") REFERENCES "registro_horas_campo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidencia_seguridad"
    ADD CONSTRAINT "evidencia_seguridad_creadoPorId_fkey"
    FOREIGN KEY ("creadoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ========== STEP B: backfill ==========
-- Una EvidenciaSeguridad por cada registroHorasCampoId distinto en registro_seguridad.
-- creadoPorId = ingenieroId del registro más antiguo de esa jornada.
-- estado = 'cerrada' si la jornada está aprobada/rechazada, sino 'abierta'.
INSERT INTO "evidencia_seguridad" (
    "id", "registroHorasCampoId", "creadoPorId", "estado",
    "fechaCierre", "createdAt", "updatedAt"
)
SELECT
    'evd_' || substr(md5(random()::text || clock_timestamp()::text), 1, 21),
    j."id",
    first_rs."ingenieroId",
    CASE WHEN j."estado" IN ('aprobado','rechazado') THEN 'cerrada'::"EstadoEvidenciaSeguridad"
         ELSE 'abierta'::"EstadoEvidenciaSeguridad" END,
    CASE WHEN j."estado" IN ('aprobado','rechazado') THEN agg."max_created" ELSE NULL END,
    agg."min_created",
    agg."max_created"
FROM (
    SELECT "registroHorasCampoId", MIN("createdAt") AS "min_created", MAX("createdAt") AS "max_created"
    FROM "registro_seguridad"
    GROUP BY "registroHorasCampoId"
) agg
JOIN LATERAL (
    SELECT rs."ingenieroId" FROM "registro_seguridad" rs
    WHERE rs."registroHorasCampoId" = agg."registroHorasCampoId"
    ORDER BY rs."createdAt" ASC, rs."id" ASC
    LIMIT 1
) first_rs ON TRUE
JOIN "registro_horas_campo" j ON j."id" = agg."registroHorasCampoId";

-- ========== STEP C: rewire registro_seguridad ==========
ALTER TABLE "registro_seguridad" ADD COLUMN "evidenciaSeguridadId" TEXT;

UPDATE "registro_seguridad" rs
SET "evidenciaSeguridadId" = ev."id"
FROM "evidencia_seguridad" ev
WHERE ev."registroHorasCampoId" = rs."registroHorasCampoId";

ALTER TABLE "registro_seguridad" ALTER COLUMN "evidenciaSeguridadId" SET NOT NULL;
ALTER TABLE "registro_seguridad" DROP CONSTRAINT "registro_seguridad_registroHorasCampoId_fkey";
DROP INDEX "registro_seguridad_registroHorasCampoId_idx";
ALTER TABLE "registro_seguridad" DROP COLUMN "registroHorasCampoId";

CREATE INDEX "registro_seguridad_evidenciaSeguridadId_idx" ON "registro_seguridad"("evidenciaSeguridadId");
ALTER TABLE "registro_seguridad"
    ADD CONSTRAINT "registro_seguridad_evidenciaSeguridadId_fkey"
    FOREIGN KEY ("evidenciaSeguridadId") REFERENCES "evidencia_seguridad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
