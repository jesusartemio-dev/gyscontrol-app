-- Quién puso el dinero de cada línea de gasto.
--
-- "yo" = el dueño del requerimiento, que es como venía funcionando todo hasta
-- ahora, así que las líneas existentes quedan ahí sin cambiar nada.
-- "administracion" = lo pagó administración directo al proveedor.
-- "personal" = el depósito va a otra persona, la de pagadoAPersonalId.
ALTER TABLE "gasto_linea"
  ADD COLUMN "pagadoPor" TEXT NOT NULL DEFAULT 'yo',
  ADD COLUMN "pagadoAPersonalId" TEXT;

ALTER TABLE "gasto_linea"
  ADD CONSTRAINT "gasto_linea_pagadoAPersonalId_fkey"
  FOREIGN KEY ("pagadoAPersonalId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "gasto_linea_pagadoAPersonalId_idx" ON "gasto_linea"("pagadoAPersonalId");
