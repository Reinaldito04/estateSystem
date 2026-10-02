import { prisma } from "@/lib/prisma";

export type SequenceKey = "RECEIPT" | "OWNER_SETTLEMENT";

const SEQUENCE_DEFAULTS: Record<SequenceKey, { prefix: string; width: number }> = {
  RECEIPT: { prefix: "REC", width: 4 },
  OWNER_SETTLEMENT: { prefix: "LIQ", width: 4 },
};

export function buildSequenceKey(key: SequenceKey, reference = new Date()): { sequenceKey: string; prefix: string } {
  const defaults = SEQUENCE_DEFAULTS[key];
  const year = reference.getFullYear();
  return { sequenceKey: `${key}-${year}`, prefix: `${defaults.prefix}-${year}-` };
}

export function formatDocumentNumber(key: SequenceKey, prefix: string, value: number): string {
  return `${prefix}${String(value).padStart(SEQUENCE_DEFAULTS[key].width, "0")}`;
}

export async function nextDocumentNumber(key: SequenceKey, reference = new Date()): Promise<string> {
  const { sequenceKey, prefix } = buildSequenceKey(key, reference);

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
  return formatDocumentNumber(key, prefix, value);
}
