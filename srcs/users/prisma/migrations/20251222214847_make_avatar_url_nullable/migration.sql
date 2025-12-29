/*
  Warnings:

  - Made the column `authId` on table `UserProfile` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "authId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT
);
INSERT INTO "new_UserProfile" ("authId", "avatarUrl", "createdAt", "email", "id", "username") SELECT "authId", "avatarUrl", "createdAt", "email", "id", "username" FROM "UserProfile";
DROP TABLE "UserProfile";
ALTER TABLE "new_UserProfile" RENAME TO "UserProfile";
CREATE UNIQUE INDEX "UserProfile_authId_key" ON "UserProfile"("authId");
CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");
CREATE UNIQUE INDEX "UserProfile_username_key" ON "UserProfile"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
