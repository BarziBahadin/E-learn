# Design QA

- Source visual truth: user-provided iOS screenshot, mirrored at `/tmp/e-lern-ios-2.png`
- Implementation screenshot: `/tmp/e-lern-teacher-text-fixed.png`
- Viewport: iPhone 17 simulator, 1206 × 2622 pixels, light mode
- State: Student Discover screen, Physics selected, Ahmed Hassan selected
- Full-view comparison evidence: both captures show the same screen and selected-teacher state; the implementation capture is at a slightly higher scroll position.
- Focused comparison evidence: `/tmp/e-lern-teacher-source-crop.png` and `/tmp/e-lern-teacher-fixed-crop.png` compare the selected Ahmed Hassan card at equal crop dimensions.

## Findings

No actionable P0, P1, or P2 differences remain. The `Physics` subject label now has its own positive top spacing and line height, so it sits below the teacher name instead of overlapping it.

Required fidelity surfaces checked:

- Fonts and typography: existing font family, weights, and sizes are preserved; name and subject baselines no longer collide.
- Spacing and layout rhythm: the subject label has a 1-point top margin and 15-point line height; the rest of the card layout is unchanged.
- Colors and visual tokens: existing blue, gray, and selected-card colors are unchanged.
- Image quality and asset fidelity: no image assets were changed.
- Copy and content: teacher name, subject, biography, and statistics are unchanged.

## Patches Made

- Replaced the shared negative-margin instructor style on teacher cards with a dedicated `teacherSubject` style.

## Implementation Checklist

- [x] Remove the overlap between teacher name and subject.
- [x] Preserve existing card content and interaction.
- [x] Verify the selected card on the iOS simulator.
- [x] Pass TypeScript and automated tests.

## Follow-up Polish

None required for this scoped fix.

final result: passed
