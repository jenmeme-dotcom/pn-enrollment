# Production Deployment

This app is ready to deploy as a Docker web service on Render with a persistent disk for SQLite.

## Render

1. Push this folder to a GitHub repository.
2. In Render, choose **New > Blueprint** and select the repository.
3. Render will read `render.yaml`, build the Docker image, and mount a persistent disk at `/data`.
4. After deploy, open the Render URL and sign in with:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@browardmiamihi.local` | `AdminPass123!` |

5. Change the default admin password after first login.
6. Add your custom domain, such as `lms.browardmiamihi.com`.
7. Update GHL to call:

```text
https://lms.browardmiamihi.com/webhooks/ghl/purchase
```

Use the generated `GHL_WEBHOOK_SECRET` as the `x-bmhi-webhook-secret` header.

## Environment Variables

Render sets these through `render.yaml`:

```text
NODE_ENV=production
PORT=4321
DATABASE_FILE=/data/bmhi.sqlite
SESSION_SECRET=<generated>
GHL_WEBHOOK_SECRET=<generated>
INSTITUTE_NAME=Broward-Miami Health Institute
INSTITUTE_WEBSITE=https://www.browardmiamihi.com
```

## Data and Backups

SQLite data lives at `/data/bmhi.sqlite`. Back up the Render disk regularly before using this with live student records.

For a larger production system, migrate to PostgreSQL, add automated backups, email-based password resets, audit logs, and admin password-management screens.
