-- Separar una lista de equipos en partes (CJM50-LST-004 -> 004B, 004C...):
-- cada parte apunta a la lista original de la que se separó.
ALTER TABLE "lista_equipo" ADD COLUMN "listaOrigenId" TEXT;

CREATE INDEX "lista_equipo_listaOrigenId_idx" ON "lista_equipo"("listaOrigenId");

ALTER TABLE "lista_equipo" ADD CONSTRAINT "lista_equipo_listaOrigenId_fkey" FOREIGN KEY ("listaOrigenId") REFERENCES "lista_equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
