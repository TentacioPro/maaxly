# Seed Data Schema

This document describes the minimal data shapes needed to seed the application so the student and employer dashboard visualizations can be exercised.

Use these example objects to populate your database (Mongo) or to return from the API while developing frontend visualizations.

Guidelines:
- Use ISO 8601 strings for `createdAt` / `updatedAt` / `at` date fields.
- `_id` fields use string ObjectId-like values (e.g. `"64a1f..."`) but may be any unique string for local testing.
- Numeric counters and percentages are integers unless noted.

## Users / Profiles

Student profile
- collection: `StudentProfile`
- example:
  {
    _id: "stu_1",
    userId: "u_stu_1",
    fullName: "Ava Student",
    email: "ava@student.example",
    role: "student",
    headline: "Computer Science Student",
    location: "Remote",
    about: "Interested in front-end and data visualization",
    skills: ["React", "D3", "SQL"],
    createdAt: "2025-09-01T10:00:00.000Z",
    visibility: { email: false, resume: true, phone: false }
  }

Employer profile
- collection: `EmployerProfile`
- example:
  {
    _id: "emp_1",
    userId: "u_emp_1",
    fullName: "Acme Corp",
    email: "talent@acme.example",
    role: "employer",
    company: "Acme Corp",
    location: "San Francisco, CA",
    createdAt: "2023-02-02T12:00:00.000Z"
  }

## Opportunities (Listings)
- collection: `Opportunity`
- example:
  {
    _id: "op_1",
    title: "Frontend Engineer Intern",
    company: "Acme Corp",
    ownerId: "emp_1",
    type: "internship",
    location: "Remote",
    description: "Build interactive dashboards",
    createdAt: "2025-08-10T09:00:00.000Z",
    applicationsCount: 34,
    views30d: 240,
    clicks30d: 62
  }

## Applications
- collection: `Application`
- example:
  {
    _id: "app_1",
    opportunity: "op_1",
    studentId: "stu_1",
    status: "applied", // applied | interviewing | offered | rejected | withdrawn
    createdAt: "2025-09-10T11:00:00.000Z",
    history: [ { status: 'applied', at: '2025-09-10T11:00:00Z' } ]
  }

## Habits / Tasks (student)
- collection: `HabitTask`
- example:
  { id: "h_1", label: "Apply to 3 roles", done: false }

Streak
- API: `/habits/streak` returns { streak: 4 }

## Analytics (dashboard data)
- collection: `AnalyticsEvent` (events)
- example event:
  { _id: "e_1", type: "view", opportunityId: "op_1", studentId: "stu_1", createdAt: "2025-09-20T18:00:00.000Z" }

- Overview endpoints expected shapes (examples):

GET `/analytics/student/progress` →
  { applications: 12, interviews: 3, offers: 0 }

GET `/analytics/employer/overview` →
  {
    applicants: 120,
    views: 3400,
    funnel: { viewsPct: 82, clicksPct: 56, appliesPct: 18 },
    topRoles: [ { title: 'Frontend Intern', views: 34 } ],
    notes: [ 'Listings with details get +15% applies' ]
  }

## Presence / Messaging
- Conversation
  {
    _id: "c1",
    participants: [ { user: { _id: "stu_1", fullName: "Ava Student" } }, { user: { _id: "emp_1", fullName: "Acme Corp" } } ],
    lastMessage: { _id: 'm1', text: 'Hi', sender: { _id: 'stu_1' }, createdAt: '2025-09-20T12:00:00Z' }
  }

- Message
  { _id: 'm1', text: 'Hello', sender: { _id: 'stu_1' }, createdAt: '2025-09-20T12:00:00Z' }

- Presence API: GET `/api/users/:id/presence` → { online: true, lastSeenAt: '2025-09-20T12:00:00Z' }

## Suggested Seed Dataset
- Students: 6 sample students with varied skills and locations
- Employers: 3 sample employers
- Opportunities: 12 sample listings distributed across employers
- Applications: 40 sample application records linking students ↔ opportunities
- Analytics events: 200-400 generated view/click/apply events across opportunities for 30 days window
- Messaging: 10 sample conversations with last messages
- Habits: 3-4 sample tasks per student, several streak values

## Usage
- Use the above JSON shapes to seed Mongo collections or mock API responses for front-end dev.
- For quick front-end demos, return the `Analytics` overview payloads via a static JSON API route and emit `studentProgressUpdated` or `employerOverviewUpdated` window events to simulate SSE.

*** End of Document
