# Broward-Miami SIS/LMS

A local-first Student Information System and Learning Management System for Broward-Miami Health Institute. This first version is a working foundation inspired by Canvas/Kajabi-style course delivery and Populi-style student administration.

## What is included

- Role-based login for admins, instructors, and students
- Seeded course catalog for Broward-Miami Health Institute programs
- Student records, manual enrollment, and password resets
- Course modules, lessons, grade item schema, attendance schema, and enrollment progress
- Student portal with course access and progress updates
- Printable certificates and diplomas
- GoHighLevel purchase webhook that creates/enrolls students after purchase
- Local SQLite database stored in `data/bmhi.sqlite`

## Local setup

This project requires Node.js 24 or newer because it uses Node's built-in SQLite module.

```bash
cp .env.example .env
pnpm install
pnpm run dev
```

Open `http://localhost:4321`.

In this Codex desktop workspace, Node is available through the bundled runtime. You can also start the app with:

```bash
./run-local.command
```

## Online deployment

This project includes `Dockerfile`, `render.yaml`, and [DEPLOYMENT.md](./DEPLOYMENT.md) for deploying to Render with a persistent `/data` disk.

Default accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@browardmiamihi.com` | `AdminPass123!` |
| Instructor | `instructor@browardmiamihi.com` | `InstructorPass123!` |
| Student | `student@browardmiamihi.com` | `StudentPass123!` |

## GoHighLevel webhook

Configure a GoHighLevel workflow/webhook action after a successful course purchase:

```text
POST http://localhost:4321/webhooks/ghl/purchase
Header: x-bmhi-webhook-secret: your .env GHL_WEBHOOK_SECRET
```

Example payload:

```json
{
  "email": "student@example.com",
  "firstName": "Alicia",
  "lastName": "Rivera",
  "phone": "954-555-0199",
  "productName": "Home Health Aide",
  "transactionId": "GHL-ORDER-10001"
}
```

The webhook matches `productName`, `productId`, `offerName`, or `courseSlug` to each course's GHL product keys.

## Course seed notes

The seeded course list is based on the public Broward-Miami Health Institute website and Florida CIE listing information available during initial scaffolding. Review exact tuition, schedules, approval language, and credential rules before using this operationally.

## Recommended next build phases

1. Add admissions document uploads, immunization checks, signed disclosures, and registrar approvals.
2. Add instructor gradebook editing, attendance sessions, competency rubrics, and transcript generation.
3. Add email/SMS delivery for temporary passwords and completion notices.
4. Add hosted deployment, encrypted secrets, backups, audit logs, and production GHL OAuth/API integration.
