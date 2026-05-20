-- Eliminar el valor 'en_cobro' del enum EstadoValorizacion
-- Verificado: 0 registros con estado = 'en_cobro' en producción al momento de esta migración

-- PostgreSQL no permite DROP VALUE en enums; se recrea el tipo completo

-- Paso 1: crear nuevo enum sin en_cobro
CREATE TYPE "EstadoValorizacion_new" AS ENUM (
  'borrador',
  'enviada',
  'observada',
  'corregida',
  'aprobada_cliente',
  'hes_pendiente',
  'facturada',
  'pagada',
  'anulada'
);

-- Paso 2: migrar la columna al nuevo tipo
ALTER TABLE "valorizacion"
  ALTER COLUMN "estado" TYPE "EstadoValorizacion_new"
  USING ("estado"::text::"EstadoValorizacion_new");

-- Paso 3: eliminar el tipo viejo
DROP TYPE "EstadoValorizacion";

-- Paso 4: renombrar el nuevo al nombre original
ALTER TYPE "EstadoValorizacion_new" RENAME TO "EstadoValorizacion";
