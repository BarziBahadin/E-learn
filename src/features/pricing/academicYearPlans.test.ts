import { describe, expect, it } from 'vitest';
import {
  payoutTotal,
  privatePlanPriceIQD,
  pricingPlanById,
  pricingPlans,
  pricingSystemConstraints,
  subjectsForPlan,
} from './academicYearPlans';

it('uses Biology instead of Mathematics in Gold', () => {
  expect(subjectsForPlan(pricingPlanById('gold'))).toEqual(['Biology', 'Physics', 'Chemistry']);
});

describe('academic-year pricing plans', () => {
  it('prices private plans at least 75% higher and rounds up to 9,750', () => {
    expect(pricingPlans.map((plan) => privatePlanPriceIQD(plan.retailPriceIQD))).toEqual([
      179_750,
      319_750,
      459_750,
      979_750,
    ]);
  });

  it('applies the requested flat plan prices without changing subject order', () => {
    expect(pricingPlans.map(({ retailPriceIQD }) => retailPriceIQD)).toEqual([
      99_750,
      179_750,
      259_750,
      559_750,
    ]);

    expect(subjectsForPlan(pricingPlanById('platinum'))).toEqual([
      'Mathematics',
      'Physics',
      'Chemistry',
      'Biology',
      'English',
      'Kurdish',
      'Arabic',
    ]);
  });

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
