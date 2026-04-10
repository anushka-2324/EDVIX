# EDVIX – Smart Campus Ecosystem

Production-style MVP for a unified smart campus platform built with **Next.js App Router + Tailwind + TypeScript + ShadCN-style UI + Supabase**.

## Features Delivered

- **Authentication + RBAC**
  - Supabase Auth (email/password)
  - Roles: `student`, `faculty`, `admin`
  - Route and API-level role checks

- **QR Attendance System**
  - Faculty/Admin can create class sessions and generate dynamic class QR tokens
  - Faculty can customize each live QR session by subject + lecture topic
  - Configurable QR expiry window for live sessions
  - Students scan/paste token to mark attendance
  - Realtime dashboard scanner for students to mark attendance instantly
  - Duplicate check-ins blocked per user/class/day

- **Bus Tracking System**
  - Live map with bus markers (Leaflet)
  - ETA estimation
  - Mock GPS simulation (API tick + optional background simulator script)
  - Supabase realtime bus updates

- **Smart Parking System**
  - Zone-wise live parking occupancy
  - Available slot and utilization insights
  - Faculty/Admin occupancy controls + simulation tick
  - Realtime parking updates via Supabase subscriptions

- **Smart Alerts System**
  - Faculty/Admin publish alerts (`class`, `bus`, `announcement`)
  - Realtime alerts feed using Supabase subscriptions
  - User notifications panel

- **Issue Reporting System**
  - Students report issues with category/title/description/image
  - Image upload to Supabase Storage bucket (`issue-images`)
  - Admin/Faculty update status (`pending`, `resolved`)
  - Issue history timeline

- **Admin Dashboard**
  - Attendance stats
  - Issue status breakdown
  - Active users and unread notifications
  - Recharts visual analytics

- **Campus Navigation (MVP)**
  - Static searchable campus map with key markers

- **UX and Architecture**
  - Responsive dashboard + sidebar navigation
  - Dark mode (`next-themes`)
  - Loading states and toast-based feedback
  - Modular folders: `components`, `hooks`, `services`, `lib`, `api`

---

## Tech Stack

### Frontend
- Next.js (App Router)
- Tailwind CSS
- TypeScript
- ShadCN-style component architecture (custom UI primitives in `src/components/ui`)
- Recharts
- Leaflet / React Leaflet

### Backend
- Supabase Postgres
- Supabase Auth
- Supabase Realtime
- Supabase Storage

---

## Project Structure

```bash
src/
  app/
    (auth)/login
    (protected)/dashboard|attendance|transport|parking|alerts|issues|navigation|admin
    api/
      attendance/mark
      classes
      classes/[id]/rotate-qr
      buses/simulate
      parking
      parking/[id]/occupancy
      parking/simulate
      alerts
      issues
      issues/[id]
      issues/[id]/status
      notifications/[id]/read
  components/
    ui/
    attendance/
    transport/
    alerts/
    issues/
    navigation/
    dashboard/
    layout/
  hooks/
  services/
  lib/
    supabase/

supabase/
  schema.sql
  seed.sql

scripts/
  bus-simulator.mjs
```

---

## Setup Instructions

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Set values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3) Create Supabase schema

Run SQL from:

- `supabase/schema.sql`

This creates:
- Required tables (`users`, `attendance`, `classes`, `buses`, `alerts`, `issues`, `notifications`)
- `issue_history` support table
- RLS policies
- Auth user sync trigger
- Storage bucket for issue images

### 4) Seed demo data

Run SQL from:

- `supabase/seed.sql`

### 5) Run app

```bash
npm run dev
```

Open: `http://localhost:3000`

---

## Demo Notes

- Create accounts via Sign Up and choose role (`student`, `faculty`, `admin`).
- For best local demo, disable strict email confirmation in Supabase auth settings.
- Faculty/Admin can refresh QR codes and customize live attendance by subject/topic.
- Students can scan/paste attendance token from Attendance page or Dashboard live scanner.
- Bus simulation can run by API trigger in UI or script:

```bash
npm run simulate:buses
```

---

## Security + API Notes

- API routes validate payloads with Zod.
- Auth checks in all sensitive routes.
- Role checks enforced before privileged actions.
- RLS policies protect direct table access.

---

## Build

```bash
npm run lint
npm run build
```

