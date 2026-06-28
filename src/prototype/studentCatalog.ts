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
  category: 'Physics' | 'Mathematics' | 'Chemistry';
  instructor: string;
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
