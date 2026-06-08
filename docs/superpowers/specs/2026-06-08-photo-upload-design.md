# Photo Upload — Crop, Camera Picker, Display Fix

**Date:** 2026-06-08
**Status:** Approved

---

## Background

The current photo upload flow in `ConfirmPage.tsx` has three problems:
1. No crop step — the image is auto-centered by CSS with no user control over which part of the face appears in the circle.
2. No camera capture option — only file picker is available.
3. Uploaded images do not display — the CloudFront URL is returned but the `<img>` tag shows a broken image, caused by a Lambda auth check that blocks requests under API_KEY auth, plus missing cache-busting.

Additionally, the set of roles allowed to upload photos is hardcoded in the frontend instead of being stored in the `WidgetPermission` table and configurable by admins.

---

## Goals

1. Let users drag and zoom to position the face in the circular crop before uploading.
2. Offer a choice between camera capture and gallery upload.
3. Fix the broken image display after upload.
4. Make photo upload permissions admin-configurable via the existing Permissions Manager.

---

## Non-Goals

- Server-side role enforcement for photo upload (requires Lambda auth backend to be deployed; noted as a future concern).
- External crop/image libraries (all implemented with native Canvas + pointer/touch events).

---

## Design

### New Component: `PhotoCropModal`

**File:** `src/components/PhotoCropModal.tsx`

A fullscreen modal shown after the user selects or captures a photo, before upload.

**Behaviour:**
- Renders the image behind a circular mask (160 px radius, matching `confirm-photo` size).
- **Drag** (mouse or touch) translates the image position.
- **Scroll wheel / pinch** changes zoom (minimum: image fills the circle; no upper bound).
- Starts with the image centered and scaled to fill the circle.
- **"אישור"** button: renders the current viewport into a hidden `<canvas>` at 400×400 px, exports as `image/jpeg` (quality 0.9), produces a `Blob` passed to the `onConfirm` callback.
- **"ביטול"** button: dismisses without uploading.

**Props:**
```ts
interface PhotoCropModalProps {
  file: File;           // raw file from input
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}
```

No external libraries. Uses `useRef` + `useEffect` for canvas rendering and pointer event listeners.

---

### New Component: `PhotoSourceModal`

**File:** `src/components/PhotoSourceModal.tsx`

A small modal presented when the 📷 button is tapped, replacing the direct `fileInputRef.click()` call.

**Behaviour:**
- Two large buttons: **📷 צלם תמונה** and **🖼️ העלה מהגלריה**.
- Camera: triggers a hidden `<input type="file" accept="image/*" capture="user">`.
- Gallery: triggers a hidden `<input type="file" accept="image/*">` (no capture attribute).
- **"ביטול"** closes the modal.
- Both inputs' `onChange` call the `onFileSelected` callback and dismiss the modal.

**Props:**
```ts
interface PhotoSourceModalProps {
  onFileSelected: (file: File) => void;
  onCancel: () => void;
}
```

---

### Updated: `ConfirmPage.tsx`

**Upload flow (replaces current `handlePhotoChange`):**

1. User taps 📷 → `PhotoSourceModal` opens.
2. User picks camera or gallery → file selected → `PhotoSourceModal` closes → `PhotoCropModal` opens.
3. User positions face → taps "אישור" → `PhotoCropModal` closes → blob sent to `dataService.uploadPatientPhoto`.
4. Returned URL (with `?t=<Date.now()>` appended) set on patient state and displayed.

**Permission check (replaces hardcoded set):**
```ts
const [canUploadPhoto, setCanUploadPhoto] = useState(false);

useEffect(() => {
  if (user) {
    dataService.canEditWidget('photo_upload', user.role).then(setCanUploadPhoto);
  }
}, [user, dataService]);
```

**Image tag:**
```tsx
<img
  src={patient.photoUrl}
  alt={patient.fullName}
  className="confirm-photo"
  crossOrigin="anonymous"
/>
```

**State:**
```ts
const [sourceModalOpen, setSourceModalOpen] = useState(false);
const [cropFile, setCropFile] = useState<File | null>(null);
```

---

### Fix: `photoOps` Lambda (`amplify/functions/photoOps/handler.ts`)

Replace the hard auth block:
```ts
// Before (blocks all API_KEY requests):
if (!identity?.resolverContext?.userId) {
  throw new Error('Unauthorized');
}

// After (logs but does not block; server-side enforcement deferred to Lambda auth deployment):
const userId = (identity as any)?.resolverContext?.userId as string | undefined;
if (!userId) {
  console.warn('[photoOps] No resolverContext.userId — running under API_KEY auth');
}
```

Role enforcement remains client-side (the upload button is hidden unless the user has the `photo_upload` permission).

---

### Seed: `photo_upload` Permission

Add to `PERMISSIONS` array in `scripts/seed.ts`:
```ts
{ widgetType: 'photo_upload', rolesAllowedToEdit: ['admin', 'head_nurse'] }
```

This makes the permission appear in the existing `PermissionsManager` admin UI automatically.

**Label:** The `PermissionsManager` currently uses `widgetType` as the display key. A label map should include `photo_upload: 'העלאת תמונה'`.

---

### Display Label in PermissionsManager

`src/components/admin/PermissionsManager.tsx` — add `photo_upload` to the widget label map so it appears as **"העלאת תמונה"** instead of the raw key.

---

## File Changelist

| File | Change |
|---|---|
| `src/components/PhotoCropModal.tsx` | New — crop UI |
| `src/components/PhotoSourceModal.tsx` | New — camera/gallery picker |
| `src/pages/ConfirmPage.tsx` | Updated — wire new modals, dynamic permission, crossOrigin, cache-bust |
| `src/components/admin/PermissionsManager.tsx` | Add `photo_upload` label |
| `amplify/functions/photoOps/handler.ts` | Soften auth check |
| `scripts/seed.ts` | Add `photo_upload` permission entry |
| `src/styles.css` | Add modal styles for PhotoCropModal and PhotoSourceModal |
| `src/api/DataService.ts` + `src/api/AmplifyDataService.ts` + `src/api/MockDataService.ts` | Widen `canEditWidget` first param from `WidgetType` to `string` so `photo_upload` can be passed |

---

## Open Questions / Future Work

- **Server-side role enforcement**: Once the Lambda auth backend is deployed, the `photoOps` Lambda should re-enable the `resolverContext.userId` check and additionally verify the user's role against `WidgetPermission`.
- **Image orientation**: EXIF rotation is not handled. Most mobile browsers auto-correct, but edge cases may arise.
