-- Bloques de generación del IPERC.
--
-- Generar un proyecto entero de una vez no cabe en los 5 min de Vercel: en
-- CJM52, de 68 tareas solo terminó la primera ola de lotes (30 tareas) y el
-- resto se perdió sin aviso. Cada bloque se genera en su propia petición y se
-- puede reintentar por separado.

CREATE TABLE "iperc_bloque" (
    "id" TEXT NOT NULL,
    "ipercId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "edtIds" TEXT[],
    "actividadIds" TEXT[],
    "tareaIds" TEXT[],
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "filasGeneradas" INTEGER NOT NULL DEFAULT 0,
    "errorMensaje" TEXT,
    "generadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iperc_bloque_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "iperc_bloque_ipercId_idx" ON "iperc_bloque"("ipercId");

CREATE UNIQUE INDEX "iperc_bloque_ipercId_numero_key" ON "iperc_bloque"("ipercId", "numero");

ALTER TABLE "iperc_bloque" ADD CONSTRAINT "iperc_bloque_ipercId_fkey"
    FOREIGN KEY ("ipercId") REFERENCES "iperc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
