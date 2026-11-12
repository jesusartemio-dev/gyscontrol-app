-- Grupo de la hoja "Controles": un peligro con sus riesgos y sus medidas.
--
-- La hoja agrupa por peligro concreto ("Virus, Bacterias, Hongos", "Ruido",
-- "Trabajo en Alturas") y debajo lista las medidas con una X en la columna de
-- jerarquía. Al copiarla al código se aplanó: se perdieron la descripción del
-- peligro, sus riesgos/consecuencias y 18 de las 168 medidas.

CREATE TABLE "iperc_catalogo_grupo_control" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipoPeligro" TEXT NOT NULL,
    "descripcionPeligro" TEXT NOT NULL,
    "riesgosConsecuencias" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iperc_catalogo_grupo_control_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "iperc_catalogo_grupo_control_numero_key"
    ON "iperc_catalogo_grupo_control"("numero");
CREATE INDEX "iperc_catalogo_grupo_control_activo_tipoPeligro_idx"
    ON "iperc_catalogo_grupo_control"("activo", "tipoPeligro");

ALTER TABLE "iperc_catalogo_control" ADD COLUMN "grupoId" TEXT;
CREATE INDEX "iperc_catalogo_control_grupoId_idx" ON "iperc_catalogo_control"("grupoId");
ALTER TABLE "iperc_catalogo_control" ADD CONSTRAINT "iperc_catalogo_control_grupoId_fkey"
    FOREIGN KEY ("grupoId") REFERENCES "iperc_catalogo_grupo_control"("id") ON DELETE SET NULL ON UPDATE CASCADE;
