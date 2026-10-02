import { prisma } from "@/lib/prisma";

export type SequenceKey = "RECEIPT" | "OWNER_SETTLEMENT";

const SEQUENCE_DEFAULTS: Record<SequenceKey, { prefix: string; width: number }> = {
  RECEIPT: { prefix: "REC", width: 4 },
  OWNER_SETTLEMENT: { prefix: "LIQ", width: 4 },
};

export async function nextDocumentNumber(key: SequenceKey, reference = new Date()): Promise<string> {
  const defaults = SEQUENCE_DEFAULTS[key];
  const year = reference.getFullYear();
  const sequenceKey = `${key}-${year}`;
  const prefix = `${defaults.prefix}-${year}-`;

  const sequence = await prisma.$transaction(async (tx) => {
    const existing = await tx.documentSequence.findUnique({ where: { key: sequenceKey } });
    if (existing) {
      return tx.documentSequence.update({
        where: { key: sequenceKey },
        data: { nextValue: { increment: 1 } },
      });
    }
    return tx.documentSequence.create({
      data: { key: sequenceKey, prefix, nextValue: 2 },
    });
  });

  const value = sequence.nextValue - 1;
  return `${prefix}${String(value).padStart(defaults.width, "0")}`;
}
