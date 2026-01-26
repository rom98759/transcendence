/*
  Warnings:

  - You are about to drop the column `nickname` on the `Friendship` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Friendship" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nicknameRequester" TEXT,
    "nicknameReceiver" TEXT,
    "status" TEXT NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Friendship_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Friendship" ("createdAt", "id", "receiverId", "requesterId", "status") SELECT "createdAt", "id", "receiverId", "requesterId", "status" FROM "Friendship";
DROP TABLE "Friendship";
ALTER TABLE "new_Friendship" RENAME TO "Friendship";
CREATE UNIQUE INDEX "Friendship_requesterId_receiverId_key" ON "Friendship"("requesterId", "receiverId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
