export type Subject = {
  id: string;
  name: string;
  teacherCount: number;
  courseCount: number;
};

export type TeacherProfile = {
  id: string;
  name: string;
  subjectId: string;
  subject: string;
  bio: string;
  students: number;
  completionRate: number;
};

export const subjects: Subject[] = [
  { id: 'physics', name: 'Physics', teacherCount: 3, courseCount: 1 },
  { id: 'mathematics', name: 'Mathematics', teacherCount: 3, courseCount: 1 },
  { id: 'chemistry', name: 'Chemistry', teacherCount: 3, courseCount: 1 },
  { id: 'biology', name: 'Biology', teacherCount: 3, courseCount: 1 },
  { id: 'kurdish', name: 'Kurdish', teacherCount: 3, courseCount: 1 },
  { id: 'english', name: 'English', teacherCount: 3, courseCount: 1 },
  { id: 'arabic', name: 'Arabic', teacherCount: 3, courseCount: 1 },
];

export const teachers: TeacherProfile[] = [
  { id: 'teacher_ahmed', name: 'Ahmed Hassan', subjectId: 'physics', subject: 'Physics', bio: 'Explains Grade 12 physics through worked examples and ministry exam questions.', students: 842, completionRate: 74 },
  { id: 'teacher_sara', name: 'Sara Mahmoud', subjectId: 'physics', subject: 'Physics', bio: 'Specialist in mechanics, electricity, and concise exam revision.', students: 615, completionRate: 81 },
  { id: 'teacher_haval', name: 'Haval Qadir', subjectId: 'physics', subject: 'Physics', bio: 'Focuses on circuits, waves, and fast revision for resit students.', students: 436, completionRate: 77 },
  { id: 'teacher_karwan', name: 'Karwan Ali', subjectId: 'mathematics', subject: 'Mathematics', bio: 'Step-by-step calculus and algebra for the Kurdistan Grade 12 curriculum.', students: 1094, completionRate: 78 },
  { id: 'teacher_dilan', name: 'Dilan Rashid', subjectId: 'mathematics', subject: 'Mathematics', bio: 'Turns analytic geometry and functions into repeatable solving patterns.', students: 721, completionRate: 82 },
  { id: 'teacher_lana', name: 'Lana Ismail', subjectId: 'mathematics', subject: 'Mathematics', bio: 'Exam-speed drills for derivatives, limits, and algebra transformations.', students: 588, completionRate: 79 },
  { id: 'teacher_shilan', name: 'Shilan Omar', subjectId: 'chemistry', subject: 'Chemistry', bio: 'Visual chemistry lessons with practical problem-solving techniques.', students: 538, completionRate: 69 },
  { id: 'teacher_rebaz', name: 'Rebaz Salih', subjectId: 'chemistry', subject: 'Chemistry', bio: 'Clear explanations for equilibrium, acids, bases, and organic reactions.', students: 492, completionRate: 73 },
  { id: 'teacher_naza', name: 'Naza Karim', subjectId: 'chemistry', subject: 'Chemistry', bio: 'Short revision lessons built around recurring ministry question types.', students: 384, completionRate: 76 },
  { id: 'teacher_rojin', name: 'Rojin Barzan', subjectId: 'biology', subject: 'Biology', bio: 'Connects diagrams, definitions, and genetics problems for exam readiness.', students: 622, completionRate: 80 },
  { id: 'teacher_aso', name: 'Aso Jamal', subjectId: 'biology', subject: 'Biology', bio: 'Human systems and cell biology lessons with concise summary sheets.', students: 455, completionRate: 75 },
  { id: 'teacher_zhyan', name: 'Zhyan Farhad', subjectId: 'biology', subject: 'Biology', bio: 'Guided practice for evidence-based answers and biology calculations.', students: 397, completionRate: 72 },
  { id: 'teacher_lara', name: 'Lara Aziz', subjectId: 'english', subject: 'English', bio: 'Grammar, writing, and reading comprehension for confident final answers.', students: 834, completionRate: 83 },
  { id: 'teacher_alan', name: 'Alan Sadiq', subjectId: 'english', subject: 'English', bio: 'Fast grammar drills and paragraph structure for ministry-style prompts.', students: 573, completionRate: 78 },
  { id: 'teacher_hana', name: 'Hana Bakir', subjectId: 'english', subject: 'English', bio: 'Reading strategies and vocabulary lessons for exam passages.', students: 516, completionRate: 81 },
  { id: 'teacher_darya', name: 'Darya Kamal', subjectId: 'kurdish', subject: 'Kurdish', bio: 'Kurdish literature and grammar taught through clear answer frameworks.', students: 748, completionRate: 84 },
  { id: 'teacher_saman', name: 'Saman Othman', subjectId: 'kurdish', subject: 'Kurdish', bio: 'Poetry, prose, and model-answer revision for Grade 12 students.', students: 531, completionRate: 79 },
  { id: 'teacher_avan', name: 'Avan Rasul', subjectId: 'kurdish', subject: 'Kurdish', bio: 'Grammar practice and structured writing lessons in Sorani Kurdish.', students: 462, completionRate: 77 },
  { id: 'teacher_omar', name: 'Omar Namiq', subjectId: 'arabic', subject: 'Arabic', bio: 'Arabic grammar and literature revision with practical exam examples.', students: 689, completionRate: 76 },
  { id: 'teacher_mina', name: 'Mina Jalal', subjectId: 'arabic', subject: 'Arabic', bio: 'I’rab, verb forms, and comprehension practice in short focused lessons.', students: 501, completionRate: 74 },
  { id: 'teacher_yusuf', name: 'Yusuf Hadi', subjectId: 'arabic', subject: 'Arabic', bio: 'Literature templates and vocabulary recall for final exam responses.', students: 444, completionRate: 78 },
];

export const initialNotifications = [
  { id: 'notification_1', title: 'Physics lesson published', body: 'Electric fields: ministry questions is now available.', time: '12 minutes ago', read: false },
  { id: 'notification_2', title: 'Course unlocked', body: 'Your payment for Grade 12 Mathematics was approved.', time: 'Yesterday', read: false },
  { id: 'notification_3', title: 'Continue learning', body: 'You stopped at 18:42 in Secure video playback.', time: '2 days ago', read: true },
];

export const initialPayments = [
  { id: 'PAY-1049', student: 'Darya Ahmed', course: 'Bronze Code · Physics', amount: '99,750 IQD', method: 'FIB', status: 'Pending' },
  { id: 'PAY-1048', student: 'Ari Kamal', course: 'Silver Code · Mathematics + Physics', amount: '179,750 IQD', method: 'ZainCash', status: 'Approved' },
  { id: 'PAY-1047', student: 'Narin Omer', course: 'Gold Code · Core Science Trio', amount: '259,750 IQD', method: 'FastPay', status: 'Refunded' },
  { id: 'PAY-1046', student: 'Shan Jamal', course: 'Silver Code · Chemistry + Biology', amount: '179,750 IQD', method: 'NASS', status: 'Pending' },
  { id: 'PAY-1045', student: 'Darya Ahmed', course: 'Wallet top-up', amount: '100,000 IQD', method: 'QiCard', status: 'Approved' },
];

export const initialCoupons = [
  { code: 'WELCOME12', course: 'Any academic-year pricing plan', uses: '28 / 100', expires: '30 Sep 2026', status: 'Active' },
  { code: 'PHYSICS25', course: 'Bronze Code · Physics', uses: '11 / 50', expires: '15 Aug 2026', status: 'Active' },
];

export const teacherStudents = [
  { name: 'Darya Ahmed', course: 'Grade 12 Physics', progress: '68%', lastActive: 'Today' },
  { name: 'Ari Kamal', course: 'Grade 12 Physics', progress: '82%', lastActive: 'Today' },
  { name: 'Narin Omer', course: 'Physics Exam Revision', progress: '54%', lastActive: 'Yesterday' },
  { name: 'Rebin Salar', course: 'Grade 12 Physics', progress: '91%', lastActive: 'Yesterday' },
];

export const contentRows = [
  { subject: 'Physics', teacher: 'Ahmed Hassan', course: 'Grade 12 Physics', lessons: '24', status: 'Published' },
  { subject: 'Mathematics', teacher: 'Karwan Ali', course: 'Grade 12 Mathematics', lessons: '31', status: 'Published' },
  { subject: 'Chemistry', teacher: 'Shilan Omar', course: 'Grade 12 Chemistry', lessons: '19', status: 'Published' },
  { subject: 'Biology', teacher: 'Rojin Barzan', course: 'Grade 12 Biology', lessons: '22', status: 'Published' },
  { subject: 'English', teacher: 'Lara Aziz', course: 'Grade 12 English', lessons: '18', status: 'Published' },
  { subject: 'Kurdish', teacher: 'Darya Kamal', course: 'Grade 12 Kurdish', lessons: '20', status: 'Published' },
  { subject: 'Arabic', teacher: 'Omar Namiq', course: 'Grade 12 Arabic', lessons: '20', status: 'Published' },
];

export const auditRows = [
  { action: 'payment.approved', actor: 'Soran Karim', resource: 'PAY-1047', result: 'Success', time: '10:42' },
  { action: 'lesson.published', actor: 'Soran Karim', resource: 'lesson_024', result: 'Success', time: '09:18' },
  { action: 'device.blocked', actor: 'System risk rule', resource: 'device_8d31', result: 'Success', time: 'Yesterday' },
];
