-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('WEAPON', 'ARMOR', 'CARD', 'CONSUMABLE', 'QUEST', 'MISC', 'AMMUNITION', 'SHADOW');

-- CreateTable
CREATE TABLE "Item" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameKo" TEXT,
    "namePt" TEXT,
    "type" "ItemType" NOT NULL,
    "subType" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "atk" INTEGER,
    "matk" INTEGER,
    "defense" INTEGER,
    "slots" INTEGER NOT NULL DEFAULT 0,
    "requiredLevel" INTEGER,
    "jobs" TEXT[],
    "description" TEXT,
    "flavorText" TEXT,
    "imageUrl" TEXT,
    "isEquipment" BOOLEAN NOT NULL DEFAULT false,
    "locations" TEXT[],
    "refineable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "namePt" TEXT,
    "effect" TEXT NOT NULL,
    "prefix" TEXT,
    "suffix" TEXT,
    "compoundOn" TEXT[],
    "monster" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enchantment" (
    "id" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Enchantment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCombo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "effect" TEXT NOT NULL,

    CONSTRAINT "ItemCombo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobClass" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "namePt" TEXT,
    "tree" TEXT NOT NULL,
    "baseClass" TEXT,
    "icon" TEXT,
    "description" TEXT,
    "roles" TEXT[],

    CONSTRAINT "JobClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "namePt" TEXT,
    "jobClassId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "maxLevel" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "spCost" TEXT,
    "cooldown" TEXT,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Build" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "jobClassId" TEXT NOT NULL,
    "patch" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "statPoints" JSONB,
    "skillPoints" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Build_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildItem" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "slot" TEXT NOT NULL,
    "refine" INTEGER NOT NULL DEFAULT 0,
    "cards" INTEGER[],
    "enchants" JSONB,

    CONSTRAINT "BuildItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaSnapshot" (
    "id" TEXT NOT NULL,
    "patch" TEXT NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tierList" JSONB NOT NULL,
    "topBuilds" JSONB NOT NULL,
    "changes" TEXT,
    "sources" TEXT[],

    CONSTRAINT "MetaSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ComboItems" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CardItems" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE INDEX "Item_type_idx" ON "Item"("type");

-- CreateIndex
CREATE INDEX "Item_name_idx" ON "Item"("name");

-- CreateIndex
CREATE INDEX "Card_compoundOn_idx" ON "Card"("compoundOn");

-- CreateIndex
CREATE INDEX "Enchantment_itemId_idx" ON "Enchantment"("itemId");

-- CreateIndex
CREATE INDEX "Skill_jobClassId_idx" ON "Skill"("jobClassId");

-- CreateIndex
CREATE INDEX "Build_jobClassId_idx" ON "Build"("jobClassId");

-- CreateIndex
CREATE INDEX "Build_patch_idx" ON "Build"("patch");

-- CreateIndex
CREATE INDEX "Build_role_idx" ON "Build"("role");

-- CreateIndex
CREATE INDEX "BuildItem_buildId_idx" ON "BuildItem"("buildId");

-- CreateIndex
CREATE UNIQUE INDEX "_ComboItems_AB_unique" ON "_ComboItems"("A", "B");

-- CreateIndex
CREATE INDEX "_ComboItems_B_index" ON "_ComboItems"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CardItems_AB_unique" ON "_CardItems"("A", "B");

-- CreateIndex
CREATE INDEX "_CardItems_B_index" ON "_CardItems"("B");

-- AddForeignKey
ALTER TABLE "Enchantment" ADD CONSTRAINT "Enchantment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_jobClassId_fkey" FOREIGN KEY ("jobClassId") REFERENCES "JobClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Build" ADD CONSTRAINT "Build_jobClassId_fkey" FOREIGN KEY ("jobClassId") REFERENCES "JobClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildItem" ADD CONSTRAINT "BuildItem_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildItem" ADD CONSTRAINT "BuildItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ComboItems" ADD CONSTRAINT "_ComboItems_A_fkey" FOREIGN KEY ("A") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ComboItems" ADD CONSTRAINT "_ComboItems_B_fkey" FOREIGN KEY ("B") REFERENCES "ItemCombo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardItems" ADD CONSTRAINT "_CardItems_A_fkey" FOREIGN KEY ("A") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardItems" ADD CONSTRAINT "_CardItems_B_fkey" FOREIGN KEY ("B") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
