-- AlterTable: Add adelanto fields to proyecto
ALTER TABLE "proyecto" ADD COLUMN "adelantoPorcentaje" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "proyecto" ADD COLUMN "adelantoMonto" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "proyecto" ADD COLUMN "adelantoAmortizado" DOUBLE PRECISION NOT NULL DEFAULT 0;
