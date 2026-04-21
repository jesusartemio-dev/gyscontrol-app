-- Rename: pendiente → enviado + add borrador as new default
-- Defensive: convert any existing 'pendiente' rows to 'enviado' before recreating the enum.

BEGIN;

CREATE TYPE "EstadoSolicitudHerramienta_new" AS ENUM ('borrador', 'enviado', 'atendida', 'cancelada');

-- Drop default to allow type swap even if the current default ('pendiente') no longer exists in the new enum.
ALTER TABLE "solicitud_herramienta" ALTER COLUMN "estado" DROP DEFAULT;

-- Migrate existing data (cast via text, mapping 'pendiente' to 'enviado').
ALTER TABLE "solicitud_herramienta"
  ALTER COLUMN "estado" TYPE "EstadoSolicitudHerramienta_new"
  USING (
    CASE "estado"::text
      WHEN 'pendiente' THEN 'enviado'::"EstadoSolicitudHerramienta_new"
      ELSE "estado"::text::"EstadoSolicitudHerramienta_new"
    END
  );

ALTER TYPE "EstadoSolicitudHerramienta" RENAME TO "EstadoSolicitudHerramienta_old";
ALTER TYPE "EstadoSolicitudHerramienta_new" RENAME TO "EstadoSolicitudHerramienta";
DROP TYPE "EstadoSolicitudHerramienta_old";

-- New default now that the enum is finalized.
ALTER TABLE "solicitud_herramienta" ALTER COLUMN "estado" SET DEFAULT 'borrador';

-- Track cuándo se envió (pasa de borrador a enviado).
ALTER TABLE "solicitud_herramienta" ADD COLUMN "fechaEnvio" TIMESTAMP(3);

COMMIT;
