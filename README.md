# 🏥 ICare — Residential Care Information System

A secure internal web application for caregivers in residential facilities for people with intellectual disabilities. ICare enables quick resident lookup and viewing/editing of critical care information displayed as widget cards on each resident's profile page.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Demo Credentials](#-demo-credentials)
- [Project Structure](#-project-structure)
- [Main Screens](#-main-screens)
- [Widget System](#-widget-system)
- [Roles & Permissions](#-roles--permissions)
- [Admin Panel](#-admin-panel)
- [Architecture](#-architecture)
- [Security](#-security)

---

## 🌟 Overview

ICare is designed for caregivers, nurses, doctors, and other professionals working in residential care facilities. It provides fast access to vital resident information — allergies, medications, walking stability, care plans, and more.

### Key Features

- 🔍 **Quick Search** — Find residents by name or ID number with autocomplete
- 🗂️ **Information Cards (Widgets)** — 9 configurable data types per resident
- 🔐 **Role-Based Access Control (RBAC)** — Per-widget edit permissions
- 👤 **Full Admin Panel** — Manage users, residents, roles, permissions, and widget settings
- 📝 **Audit Log** — Automatic logging of every data change
- 🌐 **Hebrew & RTL** — Full Hebrew interface with right-to-left layout

---

## 🛠️ Tech Stack

| Technology | Usage |
|---|---|
| **React 19** | UI library |
| **TypeScript** | Programming language |
| **Vite** | Build tool & dev server |
| **React Router v7** | Client-side routing |
| **React Context** | State management (auth + data) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/amirlevy1170/Icare.git
cd Icare

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at **http://localhost:3000**

### Additional Commands

```bash
npm run build    # Type-check (tsc) + production build → dist/
npm run preview  # Serve the production build locally
```

---

## 👥 Demo Credentials

All passwords are `1234`

| Username | Password | Role | Access |
|---|---|---|---|
| `admin` | `1234` | Admin (מנהל) | Full access + admin panel |
| `david` | `1234` | Doctor (רופא) | Edit medical widgets |
| `noa` | `1234` | Nurse (אחות) | Edit nursing widgets |
| `yossi` | `1234` | Caregiver (מטפל) | Edit exceptional events |

---

## 📂 Project Structure

```
src/
├── api/
│   ├── DataService.ts          # Data service interface
│   ├── MockDataService.ts      # In-memory implementation (98 real residents)
│   └── index.ts                # Exports
├── components/
│   ├── AdminRoute.tsx          # Route guard — admin only
│   ├── ProtectedRoute.tsx      # Route guard — authenticated users
│   ├── WidgetCard.tsx          # Widget card (view + edit mode)
│   └── admin/
│       ├── PatientForm.tsx     # Add new resident form
│       ├── PermissionsManager.tsx  # Permissions matrix (roles × widgets)
│       ├── RoleManagement.tsx  # Role management (add/delete)
│       ├── UserManagement.tsx  # User CRUD
│       └── WidgetConfigManager.tsx # Widget input type configuration
├── context/
│   ├── AuthContext.tsx         # Authentication context (login/logout)
│   └── DataContext.tsx         # Data access context
├── pages/
│   ├── AdminPage.tsx           # Admin panel (5 tabs)
│   ├── LoginPage.tsx           # Login page
│   ├── PatientPage.tsx         # Resident profile page
│   └── SearchPage.tsx          # Search / home page
├── types/
│   └── index.ts                # Types, enums, constants
├── styles.css                  # All styles
├── main.tsx                    # Entry point
└── App.tsx                     # Router configuration
```

---

## 🖥️ Main Screens

### 1. Login (`/login`)
Username/password authentication. Redirects to the search page on success.

### 2. Search / Home (`/`)
- Search field with autocomplete
- Search by full name or ID number
- Click a result to navigate to the resident's profile

### 3. Resident Profile (`/patient/:id`)
- **Header** — Photo, full name, ID number, group, gender, age
- **Widget Grid** — 9 information cards in a responsive grid layout
- Each card is editable only if the user's role has permission

### 4. Admin Panel (`/admin`) — Admin only
- 5 tabs: Users, Residents, Permissions, Roles, Widget Settings

---

## 🗂️ Widget System

Every piece of resident information is represented as a **widget** with a defined type:

| Widget | Description |
|---|---|
| 🍽️ Food Texture (מרקם מזון) | Food type (regular, soft, puréed, liquid, thickened) |
| 🚶 Walking Stability (יציבות בהליכה) | Mobility level (independent, assisted, wheelchair, etc.) |
| ⚠️ Risk Management Plan (תכנית ניהול סיכונים) | Special risks and mitigation plans |
| 👨‍👩‍👧 Guardian Details (פרטי אפוטרופוס) | Legal guardian information |
| 💊 Medication Cardex (קרדקס תרופות) | Active medication list |
| 🤧 Sensitivities (רגישויות) | Known allergies and sensitivities |
| 🏥 Medical Diagnoses (אבחנות רפואיות) | Current medical diagnoses |
| 📈 Personal Development Plan (תוכנית קידום אישית) | Educational and developmental plan |
| 🔔 Exceptional Events (אירועים חריגים) | Special incident documentation |

### Input Types

Each widget can be configured as:
- **Free text** — Open text field
- **Select from list** — Dropdown with predefined options

The admin can change input types and manage option lists through the admin panel.

---

## 👔 Roles & Permissions

The system includes 13 built-in professional roles:

| Role (Hebrew) | Role ID |
|---|---|
| Doctor (רופא) | `doctor` |
| Psychiatrist (פסיכיאטר) | `psychiatrist` |
| Physiotherapist (פיזיותרפיסט) | `physiotherapist` |
| Occupational Therapist (מרפא בעיסוק) | `occupational_therapist` |
| Dietitian (תזונאי) | `dietitian` |
| Caregiver (מטפל) | `caregiver` |
| Nurse (אחות) | `nurse` |
| Head Nurse (אחות אחראית) | `head_nurse` |
| Development Coordinator (מרכז תוכניות קידום) | `development_coordinator` |
| Education Coordinator (רכז חינוך) | `education_coordinator` |
| Employment Coordinator (רכז תעסוקה) | `employment_coordinator` |
| Admin (מנהל) | `admin` |
| Social Worker (עובד סוציאלי) | `social_worker` |

### Permissions Matrix

Permissions are defined **per widget type** — each widget type specifies which roles are allowed to edit it. All authenticated users can **view** all widgets, but only authorized roles can **edit** them.

The admin can modify the permissions matrix and create custom roles through the admin panel.

---

## ⚙️ Admin Panel

Accessible only to users with the **Admin** role (⚙️ button in the header).

### Tabs

| Tab | Functionality |
|---|---|
| **User Management** | Add, edit, and delete users. Set name, username, password, and role |
| **Add Resident** | Form to add a new resident (name, ID, group, date of birth, gender, photo) |
| **Permissions** | Checkbox matrix — roles × widgets. Toggle edit permission per role per widget |
| **Role Management** | Add and delete custom roles (built-in roles are protected from deletion) |
| **Widget Settings** | Configure input type (free text / select) and manage dropdown options per widget |

---

## 🏗️ Architecture

### Data Service Pattern

All data access goes through the **`DataService` interface** (`src/api/DataService.ts`). The current implementation is `MockDataService` — in-memory data that resets on page refresh.

#### Switching to a Cloud Backend (e.g., AWS)

1. Create a new class implementing `DataService` (e.g., `AwsDataService`)
2. Swap the instantiation in `src/App.tsx`

```typescript
// Replace:
const dataService = new MockDataService();
// With:
const dataService = new AwsDataService(config);
```

### State Management

- **`AuthContext`** — User authentication (login/logout), stores the currently logged-in user
- **`DataContext`** — Provides `DataService` access to all components via React Context

### Data Model

```
User ─── role (string) ──→ RoleDefinition
  │
Patient ─── id ──→ PatientWidget[] (9 widgets)
  │                    │
  │                    └── widgetType ──→ WidgetPermission (edit permissions)
  │                                  ──→ WidgetConfig (input type settings)
  │
  └── AuditLog[] (change history)
```

### Resident Data

The system comes pre-loaded with **98 real residents** imported from the facility's roster file:
- 92 active residents (across groups: אגף מש"ה, שיקום ונכים, אוטיסטים)
- 5 Ministry of Health residents
- 1 resident with partial data

---

## 🔒 Security

- ✅ Passwords are hashed — never stored as plain text
- ✅ Every widget edit validates the user's role against `WidgetPermission`
- ✅ Every change creates an `AuditLog` entry — audit records are append-only, never deleted
- ✅ Route protection — admin routes are accessible only to admin users
- ✅ Full Hebrew RTL interface

---

## 📄 License

Internal project — for organizational use only.
