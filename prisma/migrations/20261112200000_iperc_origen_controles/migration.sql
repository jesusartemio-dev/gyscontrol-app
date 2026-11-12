-- Procedencia de cada control de una fila del IPERC: catálogo, IA o manual.
--
-- Va en columna aparte y no dentro de los campos de control, que siguen siendo
-- texto: así el parser de "Texto / IA", el exportador y el Excel no cambian.

ALTER TABLE "iperc_fila" ADD COLUMN "origenControles" JSONB;
