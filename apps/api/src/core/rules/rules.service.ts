import { Injectable } from '@nestjs/common';
import { CountryRuleSet, SENEGAL_RULES_2026 } from '@praxis/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The country rules engine (section 5.2 / 2.3): SMIG, contribution
 * rates, overtime multipliers, leave accrual, notice periods, CDD
 * thresholds — paramétré par pays, jamais codé en dur. A new country is
 * onboarded by inserting a CountryRuleSet row, never by editing this
 * service or the payroll/leave calculators that consume it.
 */
@Injectable()
export class RulesService {
  constructor(private prisma: PrismaService) {}

  async getActiveRuleSet(countryCode: string): Promise<CountryRuleSet> {
    const row = await this.prisma.countryRuleSet.findFirst({
      where: { countryCode, effectiveFrom: { lte: new Date() } },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (row) {
      return row.payload as unknown as CountryRuleSet;
    }
    // Fallback for environments where the seed hasn't run yet.
    if (countryCode === 'SN') {
      return SENEGAL_RULES_2026;
    }
    throw new Error(`Aucun jeu de règles pays trouvé pour "${countryCode}".`);
  }

  computeOvertimeMultiplier(rules: CountryRuleSet, hoursBeyondLegalThisWeek: number): number {
    let remaining = hoursBeyondLegalThisWeek;
    let weighted = 0;
    let consumed = 0;
    for (const tier of rules.overtimeTiers) {
      const tierCapacity = tier.upToHoursPerWeek - consumed;
      const hoursInTier = Math.max(0, Math.min(remaining, tierCapacity));
      weighted += hoursInTier * tier.multiplier;
      remaining -= hoursInTier;
      consumed += hoursInTier;
      if (remaining <= 0) break;
    }
    return hoursBeyondLegalThisWeek > 0 ? weighted / hoursBeyondLegalThisWeek : 0;
  }

  computeIncomeTax(rules: CountryRuleSet, taxableAnnualFcfa: number): number {
    let tax = 0;
    let lower = 0;
    for (const bracket of rules.incomeTaxBrackets) {
      const upper = bracket.upToFcfa ?? Infinity;
      if (taxableAnnualFcfa > lower) {
        const amountInBracket = Math.min(taxableAnnualFcfa, upper) - lower;
        tax += amountInBracket * bracket.rate;
      }
      lower = upper;
      if (taxableAnnualFcfa <= upper) break;
    }
    return Math.round(tax / 12);
  }

  computeEmployeeSocialContributions(rules: CountryRuleSet, grossMonthlyFcfa: number): number {
    return Math.round(
      rules.socialContributions.reduce((sum, c) => {
        const base = c.ceilingFcfa ? Math.min(grossMonthlyFcfa, c.ceilingFcfa) : grossMonthlyFcfa;
        return sum + base * c.employeeRate;
      }, 0),
    );
  }
}
