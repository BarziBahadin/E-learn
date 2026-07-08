export const ACADEMIC_YEAR_ACCESS_MODEL =
  'Full academic year one-time purchase, valid through the August/September ministerial resits.';

export type AcademicSubject =
  | 'Mathematics'
  | 'Physics'
  | 'Chemistry'
  | 'Biology'
  | 'English'
  | 'Kurdish'
  | 'Arabic';

export type PricingPlanId = 'bronze' | 'silver' | 'gold' | 'platinum';

export type PricingPlan = {
  id: PricingPlanId;
  tierName: string;
  shortName: string;
  retailPriceIQD: number;
  unlocks: string;
  allowedPaths: readonly (readonly AcademicSubject[])[];
  payoutStructure: Readonly<Record<string, number>>;
};

export const pricingPlans: readonly PricingPlan[] = [
  {
    id: 'bronze',
    tierName: 'Bronze Code',
    shortName: 'Bronze',
    retailPriceIQD: 99_750,
    unlocks: 'Any 1 standalone subject',
    allowedPaths: [],
    payoutStructure: {
      premiumTeacherShare: 44_500,
      platformMargin: 55_250,
    },
  },
  {
    id: 'silver',
    tierName: 'Silver Code',
    shortName: 'Silver',
    retailPriceIQD: 179_750,
    unlocks: 'Choose exactly one fixed dual-subject path',
    allowedPaths: [
      ['Mathematics', 'Physics'],
      ['Chemistry', 'Biology'],
    ],
    payoutStructure: {
      teacher1Share: 40_000,
      teacher2Share: 40_000,
      platformMargin: 99_750,
    },
  },
  {
    id: 'gold',
    tierName: 'Gold Code',
    shortName: 'Gold',
    retailPriceIQD: 259_750,
    unlocks: 'Fixed core science trio',
    allowedPaths: [['Biology', 'Physics', 'Chemistry']],
    payoutStructure: {
      biologyTeacherShare: 40_000,
      physicsTeacherShare: 40_000,
      chemistryTeacherShare: 40_000,
      platformMargin: 139_750,
    },
  },
  {
    id: 'platinum',
    tierName: 'Platinum VIP Code',
    shortName: 'Platinum VIP',
    retailPriceIQD: 559_750,
    unlocks: 'Full pass for all 7 scientific-stream subjects',
    allowedPaths: [[
      'Mathematics',
      'Physics',
      'Chemistry',
      'Biology',
      'English',
      'Kurdish',
      'Arabic',
    ]],
    payoutStructure: {
      distributionCommissionMactaba: 49_000,
      mathematicsTeacherShare: 100_000,
      physicsTeacherShare: 100_000,
      chemistryTeacherShare: 100_000,
      highMarginFillersPool: 100_000,
      platformNetProfit: 110_750,
    },
  },
] as const;

export const pricingSystemConstraints = {
  allowCustomMultiTeacherMix: false,
  minimumBundleTeacherPayoutIQD: 40_000,
} as const;

export function formatIQD(amount: number) {
  return `${amount.toLocaleString('en-US')} IQD`;
}

export function privatePlanPriceIQD(amount: number) {
  const increasedPrice = amount * 1.75;
  return Math.ceil((increasedPrice + 250) / 10_000) * 10_000 - 250;
}

export function pricingPlanById(id: PricingPlanId) {
  return pricingPlans.find((plan) => plan.id === id) ?? pricingPlans[0];
}

export function subjectsForPlan(
  plan: PricingPlan,
  options: { pathIndex?: number; standaloneSubject?: AcademicSubject } = {},
): readonly AcademicSubject[] {
  if (plan.id === 'bronze') {
    return options.standaloneSubject ? [options.standaloneSubject] : [];
  }

  return plan.allowedPaths[options.pathIndex ?? 0] ?? plan.allowedPaths[0] ?? [];
}

export function pathLabel(path: readonly AcademicSubject[]) {
  return path.join(' + ');
}

export function payoutTotal(plan: PricingPlan) {
  return Object.values(plan.payoutStructure).reduce((total, amount) => total + amount, 0);
}

export function payoutLabel(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase());
}
