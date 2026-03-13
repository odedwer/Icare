# ICare – Copilot Instructions

## Project Overview

ICare is a secure internal web application for caregivers in residential facilities for people with intellectual disabilities. Caregivers use it to quickly look up residents and view/edit critical care information (allergies, medications, swallowing ability, behavioral notes, etc.) displayed as widget cards on a patient profile page.

## Stack

- **Frontend**: React 19 + TypeScript, built with Vite
- **Routing**: React Router v7
- **Data layer**: `DataService` interface with a `MockDataService` in-memory implementation. Designed to be swapped for AWS services (DynamoDB, Cognito, etc.)
- **State**: React Context for auth (`AuthContext`) and data access (`DataContext`)

## Commands

```bash
npm run dev      # start dev server on http://localhost:3000
npm run build    # type-check (tsc) then vite build → dist/
npm run preview  # serve the production build locally
```

No test runner or linter is configured yet. When adding them, update this section.

## Demo Credentials

All passwords are `1234`. Users: `sarah` (Admin), `david` (Medical Staff), `noa` (Editor), `yossi` (Viewer).

## Architecture

### Domain Model

The core entities and their relationships:

- **User** — a caregiver who logs in. Has a role (Viewer, Editor, Medical Staff, Admin).
- **Patient** — a resident. Identified by `id_number`. Has a photo, room number, and a set of **widgets**.
- **PatientWidget** — a typed card of patient data (e.g., `allergies`, `medication_alerts`, `diet`, `behavior_notes`, `mobility`, `swallowing`, `communication`, `emergency_instructions`, `medical_notes`). Each widget stores a single `value` string and tracks who last updated it.
- **WidgetPermission** — maps `widget_type` → list of roles allowed to edit that widget. All authenticated users can *view* all widgets.
- **AuditLog** — immutable record of every widget edit (who, what, old value, new value, when).

### Auth & Permissions (RBAC)

- Authentication is username/password with hashed passwords.
- Authorization is **per-widget**: the `WidgetPermission` table controls which roles may edit each widget type.
- The UI shows an Edit button on a widget only if the current user's role is in the widget's allowed editors.
- Roles hierarchy: `Viewer < Editor < Medical Staff < Admin`. Admin has full permissions including user management.

### Key Screens

1. **Home / Search** — search by ID number or full name, with autocomplete. Navigates to patient profile.
2. **Patient Profile** — header (photo, name, ID, room) + a 3×3 grid of widget cards. Each card is view-only or editable depending on the user's role.

## Conventions

### Widget System

Every piece of patient information is modeled as a widget with a `widget_type` enum string. When adding a new type of patient data:

1. Add the type to the `widget_type` enum/union.
2. Seed a default `WidgetPermission` row specifying which roles can edit it.
3. Add an icon and display label in the UI widget registry.

### Data Service Pattern

All data access goes through `src/api/DataService.ts` (the interface). The current implementation is `MockDataService` (in-memory). To connect to AWS:

1. Create a new class implementing `DataService` (e.g., `AwsDataService`).
2. Swap the instantiation in `src/App.tsx`.

All mutations to patient widgets must go through `updateWidget()`, which enforces permission checks and writes an audit log entry. Never trust client-side role checks alone.

### UI Principles

- Large tap targets — designed for tablet use by caregivers on the floor.
- Minimal clicks to reach information.
- Widget edits use inline editing or a small modal, not full-page forms.
- Hebrew/RTL support may be needed — keep layout direction configurable.

### Security Checklist

- Passwords are hashed (bcrypt or argon2), never stored in plain text.
- All widget edit endpoints validate the user's role against `WidgetPermission`.
- Every edit creates an `AuditLog` record — audit records are append-only, never deleted or modified.
- Session tokens / JWTs should have reasonable expiry times.
