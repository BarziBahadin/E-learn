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
  { id: 'physics', name: 'Physics', teacherCount: 2, courseCount: 3 },
  { id: 'mathematics', name: 'Mathematics', teacherCount: 3, courseCount: 4 },
  { id: 'chemistry', name: 'Chemistry', teacherCount: 2, courseCount: 2 },
  { id: 'biology', name: 'Biology', teacherCount: 2, courseCount: 3 },
  { id: 'kurdish', name: 'Kurdish', teacherCount: 2, courseCount: 2 },
  { id: 'english', name: 'English', teacherCount: 2, courseCount: 2 },
];

export const teachers: TeacherProfile[] = [
  { id: 'teacher_ahmed', name: 'Ahmed Hassan', subjectId: 'physics', subject: 'Physics', bio: 'Explains Grade 12 physics through worked examples and ministry exam questions.', students: 842, completionRate: 74 },
  { id: 'teacher_sara', name: 'Sara Mahmoud', subjectId: 'physics', subject: 'Physics', bio: 'Specialist in mechanics, electricity, and concise exam revision.', students: 615, completionRate: 81 },
  { id: 'teacher_karwan', name: 'Karwan Ali', subjectId: 'mathematics', subject: 'Mathematics', bio: 'Step-by-step calculus and algebra for the Kurdistan Grade 12 curriculum.', students: 1094, completionRate: 78 },
  { id: 'teacher_shilan', name: 'Shilan Omar', subjectId: 'chemistry', subject: 'Chemistry', bio: 'Visual chemistry lessons with practical problem-solving techniques.', students: 538, completionRate: 69 },
];

export const initialNotifications = [
  { id: 'notification_1', title: 'Physics lesson published', body: 'Electric fields: ministry questions is now available.', time: '12 minutes ago', read: false },
  { id: 'notification_2', title: 'Course unlocked', body: 'Your payment for Grade 12 Mathematics was approved.', time: 'Yesterday', read: false },
  { id: 'notification_3', title: 'Continue learning', body: 'You stopped at 18:42 in Secure video playback.', time: '2 days ago', read: true },
];

export const initialPayments = [
  { id: 'PAY-1048', student: 'Darya Ahmed', course: 'Grade 12 Physics', amount: '45,000 IQD', method: 'FastPay proof', status: 'Pending' },
  { id: 'PAY-1047', student: 'Ari Kamal', course: 'Grade 12 Mathematics', amount: '50,000 IQD', method: 'ZainCash', status: 'Approved' },
  { id: 'PAY-1046', student: 'Narin Omer', course: 'Grade 12 Chemistry', amount: '42,000 IQD', method: 'Manual proof', status: 'Refunded' },
];

export const initialCoupons = [
  { code: 'WELCOME12', course: 'All Grade 12 courses', uses: '28 / 100', expires: '30 Sep 2026', status: 'Active' },
  { code: 'PHYSICS25', course: 'Grade 12 Physics', uses: '11 / 50', expires: '15 Aug 2026', status: 'Active' },
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
  { subject: 'Chemistry', teacher: 'Shilan Omar', course: 'Grade 12 Chemistry', lessons: '19', status: 'Draft' },
];

export const auditRows = [
  { action: 'payment.approved', actor: 'Soran Karim', resource: 'PAY-1047', result: 'Success', time: '10:42' },
  { action: 'lesson.published', actor: 'Soran Karim', resource: 'lesson_024', result: 'Success', time: '09:18' },
  { action: 'device.blocked', actor: 'System risk rule', resource: 'device_8d31', result: 'Success', time: 'Yesterday' },
];
