# Introduction to Nursing for Practical Nursing Students

Canvas buildout for a 12-week introduction to nursing course for practical nursing students.

## Course focus

- What nursing was historically and what nursing is today
- Influential nursing leaders and their impact
- The purpose and importance of nursing
- Practical nurse role, professional identity, communication, safety, and teamwork
- Ethical and legal foundations for beginning nursing students
- Student impact on patients, families, teams, and communities

## Canvas setup

1. Create a new Canvas course under the Broward-Miami account/subaccount.
2. Use `course-home.html`, `course-syllabus.html`, and `weekly-schedule.html` as Canvas pages.
3. Replace every `COURSE_ID` placeholder with the Canvas course ID.
4. Create modules from `modules.csv`.
5. Create assignments/quizzes from `assignments.csv`.
6. Set cohort-specific due dates after the cohort start date is confirmed.
7. Verify legal references against the current student handbook, state nurse practice act, board of nursing rules, and clinical site policies.

## Publish with Canvas API

Set the Canvas values in `.env`, then run:

```bash
npm run publish:canvas:intro-nursing
```

Required values:

- `CANVAS_BASE_URL`
- `CANVAS_ACCESS_TOKEN`
- `CANVAS_ACCOUNT_ID` for a new course, or `CANVAS_COURSE_ID` to update an existing course

Optional values:

- `CANVAS_PUBLISH=true` to publish pages, modules, assignments, and quiz shells
- `CANVAS_SIS_COURSE_ID` to control the Canvas SIS ID
