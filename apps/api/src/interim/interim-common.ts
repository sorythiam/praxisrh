import { BadRequestException } from '@nestjs/common';

/** A blacklist row with a null `liftedAt` is currently in effect (9.4). */
export function isCurrentlyBlacklisted(entry: { liftedAt: Date | null } | null): boolean {
  return entry !== null && entry.liftedAt === null;
}

export function assertNotBlacklisted(entry: { liftedAt: Date | null; reason: string } | null): void {
  if (isCurrentlyBlacklisted(entry)) {
    throw new BadRequestException(`Cet employé est sur liste noire intérim (motif : ${entry!.reason}) et ne peut pas être affecté à une mission.`);
  }
}
