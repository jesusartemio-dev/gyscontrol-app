-- CreateEnum
CREATE TYPE "OrigenRecurso" AS ENUM ('propio', 'externo');

-- AlterTable
ALTER TABLE "recurso" ADD COLUMN "origen" "OrigenRecurso" NOT NULL DEFAULT 'propio';
