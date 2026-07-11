export type WalletTransactionKind =
  | 'voucher_redemption'
  | 'course_purchase'
  | 'subscription_purchase'
  | 'refund'
  | 'manual_adjustment';

export type WalletTransaction = {
  id: string;
  kind: WalletTransactionKind;
  title: string;
  amountIQD: number;
  createdAt: string;
};

export const initialWallet = {
  balanceIQD: 134_000,
  currency: 'IQD',
  transactions: [
    { id: 'WTX-1041', kind: 'voucher_redemption', title: 'Voucher redeemed', amountIQD: 89_000, createdAt: 'Today, 10:42' },
    { id: 'WTX-1038', kind: 'course_purchase', title: 'Grade 12 Physics', amountIQD: -89_000, createdAt: '28 Jun 2026' },
    { id: 'WTX-1027', kind: 'refund', title: 'Chemistry course refund', amountIQD: 45_000, createdAt: '22 Jun 2026' },
  ] satisfies WalletTransaction[],
};

export const guardianStudents = [
  {
    id: 'user_123',
    name: 'Darya Ahmed',
    relationship: 'Daughter',
    status: 'On Track' as const,
    enrolledCourses: 2,
    completedLessons: 18,
    currentLesson: 'Electric fields: worked examples',
    watchedPercent: 68,
    quizAverage: 84,
    lastActive: 'Today, 10:42',
    studyTime: '12h 35m',
    target: 'Complete Electricity chapter by Friday',
  },
  {
    id: 'user_901',
    name: 'Ari Kamal',
    relationship: 'Son',
    status: 'Behind' as const,
    enrolledCourses: 3,
    completedLessons: 11,
    currentLesson: 'Derivative rules',
    watchedPercent: 42,
    quizAverage: 71,
    lastActive: '3 days ago',
    studyTime: '6h 10m',
    target: '2 missed weekly lessons',
  },
];

export const revenueRows = [
  { date: '30 Jun 2026', source: 'Bronze · Physics', teacher: 'Ahmed Hassan', method: 'Wallet / voucher', amount: '89,000 IQD', status: 'Completed' },
  { date: '30 Jun 2026', source: 'Silver · Math + Physics', teacher: 'Multiple teachers', method: 'ZainCash', amount: '179,750 IQD', status: 'Completed' },
  { date: '29 Jun 2026', source: 'Gold · Biology + Physics + Chemistry', teacher: 'Multiple teachers', method: 'FastPay', amount: '259,750 IQD', status: 'Completed' },
  { date: '29 Jun 2026', source: 'Bronze · English', teacher: 'Rojin Aziz', method: 'FIB', amount: '99,750 IQD', status: 'Completed' },
  { date: '28 Jun 2026', source: 'Silver · Chemistry + Biology', teacher: 'Multiple teachers', method: 'NASS', amount: '179,750 IQD', status: 'Pending' },
  { date: '28 Jun 2026', source: 'Wallet top-up', teacher: 'Platform wallet', method: 'QiCard', amount: '100,000 IQD', status: 'Completed' },
  { date: '28 Jun 2026', source: 'Bronze · Chemistry', teacher: 'Shilan Omar', method: 'Wallet / voucher', amount: '-89,000 IQD', status: 'Refunded' },
];

export const adminUsers = [
  { id: 'user_123', name: 'Darya Ahmed', email: 'darya@example.com', role: 'Student', wallet: '134,000 IQD', courses: 'Physics, Mathematics', subscription: 'Active · Silver' },
  { id: 'user_901', name: 'Ari Kamal', email: 'ari@example.com', role: 'Student', wallet: '20,000 IQD', courses: 'Mathematics', subscription: 'Active · Bronze' },
  { id: 'user_789', name: 'Ahmed Hassan', email: 'ahmed.teacher@example.com', role: 'Teacher', wallet: '—', courses: 'Grade 12 Physics', subscription: '—' },
  { id: 'user_654', name: 'Nawroz Kamal', email: 'nawroz@example.com', role: 'Parent', wallet: '—', courses: '—', subscription: '—' },
];
