# Production Deployment

This app is ready to deploy as a Docker web service on Render with a persistent disk for SQLite.

## Render

1. Push this folder to a GitHub repository.
2. In Render, choose **New > Blueprint** and select the repository.
3. Render will read `render.yaml`, build the Docker image, and mount a persistent disk at `/data`.
4. After deploy, open the Render URL and sign in with:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@browardmiamihi.com` | `AdminPass123!` |

5. Change the default admin password after first login.
6. Add your custom domain, such as `portal.browardmiamihi.com`.
7. Update GHL to call:

```text
https://portal.browardmiamihi.com/webhooks/ghl/purchase
```

Use the generated `GHL_WEBHOOK_SECRET` as the `x-bmhi-webhook-secret` header.

## Environment Variables

Render sets these through `render.yaml`:

```text
NODE_ENV=production
PORT=4321
DATABASE_FILE=/data/bmhi.sqlite
UPLOAD_DIR=/data/uploads
SESSION_SECRET=<generated>
GHL_WEBHOOK_SECRET=<generated>
GHL_SUB_ACCOUNT_NAME=Broward-Miami Health Institute
GHL_SUB_ACCOUNT_ID=l0nuB5CyYhn0gJmoVobg
INSTITUTE_NAME=Broward-Miami Health Institute
INSTITUTE_ADDRESS=6320 Miramar Pkwy Suite I, Miramar, FL 33023
INSTITUTE_PHONE=954-248-0669
INSTITUTE_EMAIL=support@browardmiamihi.com
INSTITUTE_WEBSITE=https://www.browardmiamihi.com
PUBLIC_APP_URL=https://portal.browardmiamihi.com
```

## External Email Delivery

The portal stores every message internally. To also send real external email, add SMTP credentials in Render under **Environment**:

```text
EMAIL_DELIVERY_ENABLED=true
SMTP_HOST=<your SMTP host>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your SMTP username>
SMTP_PASS=<your SMTP password or API key>
SMTP_FROM=Broward-Miami Health Institute <messages@your-domain.com>
PUBLIC_APP_URL=https://portal.browardmiamihi.com
```

Use a real transactional mailbox/provider for `SMTP_FROM`. Gmail accounts usually require an app password and may limit sending; a school-domain provider or transactional email service is better for production.

## Data and Backups

SQLite data lives at `/data/bmhi.sqlite`. Registrar checklist uploads live at `/data/uploads`. Back up the Render disk regularly before using this with live student records.

For a larger production system, migrate to PostgreSQL, add automated backups, email-based password resets, audit logs, and admin password-management screens.
