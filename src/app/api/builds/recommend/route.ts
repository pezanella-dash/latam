import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL } from "@/lib/ai/client";
import { prisma } from "@/lib/db/prisma";
import {
  BUILD_CONSULTANT_SYSTEM_PROMPT,
  buildConsultantUserPrompt,
} from "@/lib/ai/prompts/build-consultant";
import { z } from "zod";

const RequestSchema = z.object({
  classId: z.string(),
  role: z.enum(["mvp", "woe", "pve", "pvp", "farm"]),
  budget: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { classId, role, budget } = RequestSchema.parse(body);

    // Fetch relevant data from DB
    const [jobClass, latestMeta] = await Promise.all([
      prisma.jobClass.findUnique({
        where: { id: classId },
        include: { skills: true },
      }),
      prisma.metaSnapshot.findFirst({
        orderBy: { snapshotAt: "desc" },
      }),
    ]);

    if (!jobClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Fetch items relevant to this class from DB
    const items = await prisma.item.findMany({
      where: {
        isEquipment: true,
        jobs: { hasSome: [classId, "all"] },
      },
      take: 100,
      orderBy: { id: "asc" },
    });

    const prompt = buildConsultantUserPrompt({
      className: jobClass.namePt ?? jobClass.name,
      role,
      budget,
      items: items.map((i) => ({
        id: i.id,
        name: i.namePt ?? i.name,
        type: i.type,
        slots: i.slots,
        atk: i.atk,
        matk: i.matk,
        defense: i.defense,
        locations: i.locations,
      })),
      currentMeta: latestMeta?.tierList,
    });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: BUILD_CONSULTANT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from AI");
    }

    return NextResponse.json({ recommendation: content.text });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("Build recommendation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
