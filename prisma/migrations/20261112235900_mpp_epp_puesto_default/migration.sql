-- Qué EPP le toca a cada puesto por defecto, contra el catálogo de puestos.
--
-- Reemplaza mpp_epp_catalogo.asignacionesDefault, que guardaba los diez
-- nombres fijos del catálogo viejo ('Técnico Electrónico', 'Sup. De Andamio')
-- y no coincidían con los puestos del organigrama. Esa columna se conserva
-- hasta terminar la migración.

CREATE TABLE "mpp_epp_puesto_default" (
    "id" TEXT NOT NULL,
    "mppEppCatalogoId" TEXT NOT NULL,
    "puestoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mpp_epp_puesto_default_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mpp_epp_puesto_default_mppEppCatalogoId_puestoId_key"
    ON "mpp_epp_puesto_default"("mppEppCatalogoId", "puestoId");

CREATE INDEX "mpp_epp_puesto_default_puestoId_idx"
    ON "mpp_epp_puesto_default"("puestoId");

ALTER TABLE "mpp_epp_puesto_default"
    ADD CONSTRAINT "mpp_epp_puesto_default_mppEppCatalogoId_fkey"
    FOREIGN KEY ("mppEppCatalogoId") REFERENCES "mpp_epp_catalogo"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mpp_epp_puesto_default"
    ADD CONSTRAINT "mpp_epp_puesto_default_puestoId_fkey"
    FOREIGN KEY ("puestoId") REFERENCES "puesto"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
