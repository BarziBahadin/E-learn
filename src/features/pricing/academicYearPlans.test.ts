import { describe, expect, it } from 'vitest';
import {
  payoutTotal,
  pricingPlans,
  pricingSystemConstraints,
  subjectsForPlan,
} from './academicYearPlans';

describe('academic-year pricing plans', () => {
  it('balances every payout structure to its retail price', () => {
    for (const plan of pricingPlans) {
      expect(payoutTotal(plan)).toBe(plan.retailPriceIQD);
    }
  });

  it('allows only the two fixed Silver paths', () => {
    const silver = pricingPlans.find((plan) => plan.id === 'silver');
    if (!silver) throw new Error('Silver plan is required.');

    expect(subjectsForPlan(silver, { pathIndex: 0 })).toEqual(['Mathematics', 'Physics']);
    expect(subjectsForPlan(silver, { pathIndex: 1 })).toEqual(['Chemistry', 'Biology']);
    expect(pricingSystemConstraints.allowCustomMultiTeacherMix).toBe(false);
  });

  it('keeps bundle teacher payouts at or above the minimum', () => {
    const teacherPayouts = pricingPlans.flatMap((plan) =>
      Object.entries(plan.payoutStructure)
        .filter(([key]) => key.toLowerCase().includes('teacher'))
        .map(([, amount]) => amount),
    );

    expect(Math.min(...teacherPayouts)).toBeGreaterThanOrEqual(
      pricingSystemConstraints.minimumBundleTeacherPayoutIQD,
    );
  });
});
