import { describe, expect, it } from 'vitest';
import {
  courseLessons,
  courseProgress,
  initialCompletedLessonIds,
  studentCourses,
} from './studentCatalog';

describe('student catalog', () => {
  it('contains selectable chapters and lessons for each course', () => {
    expect(studentCourses).toHaveLength(3);
    for (const course of studentCourses) {
      expect(course.chapters.length).toBeGreaterThan(0);
      expect(courseLessons(course).length).toBeGreaterThan(0);
    }
  });

  it('updates course progress when a lesson is completed', () => {
    const course = studentCourses[0];
    if (!course) throw new Error('Expected a student course.');
    const before = courseProgress(course, initialCompletedLessonIds);
    const incomplete = courseLessons(course).find(
      (lesson) => !initialCompletedLessonIds.includes(lesson.id),
    );
    if (!incomplete) throw new Error('Expected an incomplete lesson.');
    const after = courseProgress(course, [...initialCompletedLessonIds, incomplete.id]);
    expect(after).toBeGreaterThan(before);
  });

  it('uses the Grade 12 curriculum catalog', () => {
    expect(studentCourses.map((course) => course.category)).toEqual([
      'Physics',
      'Mathematics',
      'Chemistry',
    ]);
    expect(studentCourses.every((course) => course.level === 'Grade 12')).toBe(true);
  });
});
