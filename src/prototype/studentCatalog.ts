import type { AcademicSubject } from '../features/pricing/academicYearPlans';

export type Lesson = {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'reading' | 'quiz';
  available: boolean;
  completed: boolean;
};

export type Chapter = {
  id: string;
  title: string;
  summary: string;
  lessons: Lesson[];
};

export type StudentCourse = {
  id: string;
  title: string;
  category: AcademicSubject;
  instructor: string;
  instructors: string[];
  level: string;
  duration: string;
  description: string;
  chapters: Chapter[];
};

export const studentCourses: StudentCourse[] = [
  {
    id: 'course_001',
    title: 'Grade 12 Physics',
    category: 'Physics',
    instructor: 'Ahmed Hassan',
    instructors: ['Ahmed Hassan', 'Sara Mahmoud', 'Haval Qadir'],
    level: 'Grade 12',
    duration: '8h 40m',
    description: 'Master mechanics, force, electricity, and ministry exam questions for the Kurdistan Grade 12 curriculum.',
    chapters: [
      {
        id: 'chapter_001',
        title: 'Motion and measurement',
        summary: 'Vectors, displacement, velocity, and acceleration.',
        lessons: [
          { id: 'lesson_001', title: 'Introduction to motion', duration: '18 min', type: 'video', available: true, completed: true },
          { id: 'lesson_002', title: 'Velocity and acceleration', duration: '24 min', type: 'video', available: true, completed: true },
          { id: 'lesson_003', title: 'Motion checkpoint', duration: '10 min', type: 'quiz', available: true, completed: true },
        ],
      },
      {
        id: 'chapter_002',
        title: 'Force and energy',
        summary: 'Newton’s laws, work, energy, and momentum.',
        lessons: [
          { id: 'lesson_004', title: 'Newton’s laws', duration: '28 min', type: 'video', available: true, completed: true },
          { id: 'lesson_005', title: 'Work and kinetic energy', duration: '32 min', type: 'video', available: true, completed: true },
          { id: 'lesson_006', title: 'Momentum summary', duration: '21 min', type: 'reading', available: true, completed: false },
        ],
      },
      {
        id: 'chapter_003',
        title: 'Electricity',
        summary: 'Electric fields, circuits, and exam questions.',
        lessons: [
          { id: 'lesson_007', title: 'Electric field summary', duration: '17 min', type: 'reading', available: true, completed: true },
          { id: 'lesson_008', title: 'Electric fields: worked examples', duration: '27 min', type: 'video', available: true, completed: false },
          { id: 'lesson_009', title: 'Ministry exam questions', duration: '23 min', type: 'video', available: true, completed: false },
        ],
      },
    ],
  },
  {
    id: 'course_002',
    title: 'Grade 12 Mathematics',
    category: 'Mathematics',
    instructor: 'Karwan Ali',
    instructors: ['Karwan Ali', 'Dilan Rashid', 'Lana Ismail'],
    level: 'Grade 12',
    duration: '6h 15m',
    description: 'Build exam confidence in algebra, calculus, functions, and analytic geometry.',
    chapters: [
      {
        id: 'chapter_004',
        title: 'Functions and algebra',
        summary: 'Functions, equations, inequalities, and graph interpretation.',
        lessons: [
          { id: 'lesson_010', title: 'Function transformations', duration: '22 min', type: 'video', available: true, completed: true },
          { id: 'lesson_011', title: 'Exponential equations', duration: '26 min', type: 'video', available: true, completed: true },
          { id: 'lesson_012', title: 'Algebra formula sheet', duration: '18 min', type: 'reading', available: true, completed: false },
        ],
      },
      {
        id: 'chapter_005',
        title: 'Differential calculus',
        summary: 'Limits, derivatives, and exam-focused applications.',
        lessons: [
          { id: 'lesson_013', title: 'Derivative rules', duration: '25 min', type: 'video', available: true, completed: false },
          { id: 'lesson_014', title: 'Calculus exam checkpoint', duration: '20 min', type: 'quiz', available: false, completed: false },
        ],
      },
    ],
  },
  {
    id: 'course_003',
    title: 'Grade 12 Chemistry',
    category: 'Chemistry',
    instructor: 'Shilan Omar',
    instructors: ['Shilan Omar', 'Rebaz Salih', 'Naza Karim'],
    level: 'Grade 12',
    duration: '7h 05m',
    description: 'Understand chemical equilibrium, organic reactions, and recurring exam problem patterns.',
    chapters: [
      {
        id: 'chapter_006',
        title: 'Chemical equilibrium',
        summary: 'Reversible reactions, equilibrium constants, and calculations.',
        lessons: [
          { id: 'lesson_015', title: 'Dynamic equilibrium', duration: '19 min', type: 'video', available: true, completed: false },
          { id: 'lesson_016', title: 'Equilibrium calculations', duration: '31 min', type: 'video', available: true, completed: false },
          { id: 'lesson_017', title: 'Equilibrium checkpoint', duration: '15 min', type: 'quiz', available: false, completed: false },
        ],
      },
    ],
  },
  {
    id: 'course_004',
    title: 'Grade 12 Biology',
    category: 'Biology',
    instructor: 'Rojin Barzan',
    instructors: ['Rojin Barzan', 'Aso Jamal', 'Zhyan Farhad'],
    level: 'Grade 12',
    duration: '7h 30m',
    description: 'Prepare for cell biology, genetics, human systems, and evidence-based biology exam questions.',
    chapters: [
      {
        id: 'chapter_007',
        title: 'Cells and biomolecules',
        summary: 'Cell organelles, transport, enzymes, and biological molecules.',
        lessons: [
          { id: 'lesson_018', title: 'Cell structure essentials', duration: '21 min', type: 'video', available: true, completed: false },
          { id: 'lesson_019', title: 'Enzymes and metabolism', duration: '28 min', type: 'video', available: true, completed: false },
          { id: 'lesson_020', title: 'Cell biology checkpoint', duration: '14 min', type: 'quiz', available: true, completed: false },
        ],
      },
      {
        id: 'chapter_008',
        title: 'Genetics and inheritance',
        summary: 'DNA, chromosomes, Mendelian inheritance, and pedigree questions.',
        lessons: [
          { id: 'lesson_021', title: 'DNA replication overview', duration: '24 min', type: 'video', available: true, completed: false },
          { id: 'lesson_022', title: 'Inheritance worked examples', duration: '30 min', type: 'video', available: true, completed: false },
        ],
      },
    ],
  },
  {
    id: 'course_005',
    title: 'Grade 12 English',
    category: 'English',
    instructor: 'Lara Aziz',
    instructors: ['Lara Aziz', 'Alan Sadiq', 'Hana Bakir'],
    level: 'Grade 12',
    duration: '5h 50m',
    description: 'Strengthen grammar, reading comprehension, writing patterns, and final exam technique.',
    chapters: [
      {
        id: 'chapter_009',
        title: 'Grammar and usage',
        summary: 'Tenses, conditionals, passive voice, and common exam traps.',
        lessons: [
          { id: 'lesson_023', title: 'Tense review for exams', duration: '20 min', type: 'video', available: true, completed: false },
          { id: 'lesson_024', title: 'Conditionals and passive voice', duration: '26 min', type: 'video', available: true, completed: false },
          { id: 'lesson_025', title: 'Grammar drill', duration: '12 min', type: 'quiz', available: true, completed: false },
        ],
      },
      {
        id: 'chapter_010',
        title: 'Reading and writing',
        summary: 'Comprehension strategy, paragraph structure, and model answers.',
        lessons: [
          { id: 'lesson_026', title: 'Reading comprehension method', duration: '22 min', type: 'video', available: true, completed: false },
          { id: 'lesson_027', title: 'Writing a high-scoring paragraph', duration: '29 min', type: 'video', available: true, completed: false },
        ],
      },
    ],
  },
  {
    id: 'course_006',
    title: 'Grade 12 Kurdish',
    category: 'Kurdish',
    instructor: 'Darya Kamal',
    instructors: ['Darya Kamal', 'Saman Othman', 'Avan Rasul'],
    level: 'Grade 12',
    duration: '6h 20m',
    description: 'Review Kurdish literature, grammar, reading analysis, and structured ministry-style answers.',
    chapters: [
      {
        id: 'chapter_011',
        title: 'Literature and analysis',
        summary: 'Poetry, prose, themes, and author context.',
        lessons: [
          { id: 'lesson_028', title: 'Poetry analysis framework', duration: '24 min', type: 'video', available: true, completed: false },
          { id: 'lesson_029', title: 'Prose themes and examples', duration: '27 min', type: 'video', available: true, completed: false },
        ],
      },
      {
        id: 'chapter_012',
        title: 'Grammar and expression',
        summary: 'Sentence structure, vocabulary, and answer composition.',
        lessons: [
          { id: 'lesson_030', title: 'Grammar patterns', duration: '23 min', type: 'video', available: true, completed: false },
          { id: 'lesson_031', title: 'Model answer practice', duration: '18 min', type: 'reading', available: true, completed: false },
          { id: 'lesson_032', title: 'Kurdish exam checkpoint', duration: '13 min', type: 'quiz', available: true, completed: false },
        ],
      },
    ],
  },
  {
    id: 'course_007',
    title: 'Grade 12 Arabic',
    category: 'Arabic',
    instructor: 'Omar Namiq',
    instructors: ['Omar Namiq', 'Mina Jalal', 'Yusuf Hadi'],
    level: 'Grade 12',
    duration: '6h 05m',
    description: 'Build confidence in Arabic grammar, literature, comprehension, and concise exam responses.',
    chapters: [
      {
        id: 'chapter_013',
        title: 'Grammar foundations',
        summary: 'I’rab, verb forms, sentence structure, and question patterns.',
        lessons: [
          { id: 'lesson_033', title: 'I’rab essentials', duration: '25 min', type: 'video', available: true, completed: false },
          { id: 'lesson_034', title: 'Verb forms in context', duration: '22 min', type: 'video', available: true, completed: false },
          { id: 'lesson_035', title: 'Arabic grammar checkpoint', duration: '15 min', type: 'quiz', available: true, completed: false },
        ],
      },
      {
        id: 'chapter_014',
        title: 'Literature and comprehension',
        summary: 'Text analysis, vocabulary, and written response practice.',
        lessons: [
          { id: 'lesson_036', title: 'Reading strategy', duration: '19 min', type: 'video', available: true, completed: false },
          { id: 'lesson_037', title: 'Literature answer templates', duration: '28 min', type: 'video', available: true, completed: false },
        ],
      },
    ],
  },
];

export const initialCompletedLessonIds = studentCourses.flatMap((course) =>
  course.chapters.flatMap((chapter) =>
    chapter.lessons.filter((lesson) => lesson.completed).map((lesson) => lesson.id),
  ),
);

export function courseLessons(course: StudentCourse) {
  return course.chapters.flatMap((chapter) => chapter.lessons);
}

export function courseProgress(course: StudentCourse, completedLessonIds: string[]) {
  const lessons = courseLessons(course);
  if (lessons.length === 0) return 0;
  const completed = lessons.filter((lesson) => completedLessonIds.includes(lesson.id)).length;
  return Math.round((completed / lessons.length) * 100);
}
