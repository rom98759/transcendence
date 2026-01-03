/*
  Warnings:

  - Made the column `status` on table `Friendship` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Friendship" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nickname" TEXT,
    "status" TEXT NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Friendship_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Friendship" ("createdAt", "id", "nickname", "receiverId", "requesterId", "status") SELECT "createdAt", "id", "nickname", "receiverId", "requesterId", "status" FROM "Friendship";
DROP TABLE "Friendship";
ALTER TABLE "new_Friendship" RENAME TO "Friendship";
CREATE UNIQUE INDEX "Friendship_requesterId_receiverId_key" ON "Friendship"("requesterId", "receiverId");
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
