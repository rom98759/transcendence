/*
  Warnings:

  - The primary key for the `UserProfile` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `UserProfile` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `avatarUrl` to the `UserProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `UserProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `UserProfile` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "authId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL
);
INSERT INTO "new_UserProfile" ("id") SELECT "id" FROM "UserProfile";
DROP TABLE "UserProfile";
ALTER TABLE "new_UserProfile" RENAME TO "UserProfile";
CREATE UNIQUE INDEX "UserProfile_authId_key" ON "UserProfile"("authId");
CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");
CREATE UNIQUE INDEX "UserProfile_username_key" ON "UserProfile"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
