/*
  Warnings:

  - Changed the type of `senderType` on the `messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `receiverType` on the `messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "messages" DROP COLUMN "senderType",
ADD COLUMN     "senderType" "Role" NOT NULL,
DROP COLUMN "receiverType",
ADD COLUMN     "receiverType" "Role" NOT NULL;
