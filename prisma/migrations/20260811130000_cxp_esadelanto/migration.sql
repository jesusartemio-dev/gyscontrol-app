-- AlterTable
ALTER TABLE "cuenta_por_pagar" ADD COLUMN     "esAdelanto" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "cuenta_por_pagar_item" ALTER COLUMN "cantidad" DROP NOT NULL;

