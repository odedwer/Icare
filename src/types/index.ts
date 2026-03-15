export enum Role {
  Doctor = 'doctor',
  Psychiatrist = 'psychiatrist',
  Physiotherapist = 'physiotherapist',
  OccupationalTherapist = 'occupational_therapist',
  Dietitian = 'dietitian',
  Caregiver = 'caregiver',
  Nurse = 'nurse',
  HeadNurse = 'head_nurse',
  DevelopmentCoordinator = 'development_coordinator',
  EducationCoordinator = 'education_coordinator',
  EmploymentCoordinator = 'employment_coordinator',
  Admin = 'admin',
  SocialWorker = 'social_worker',
}

export interface RoleDefinition {
  id: string;
  label: string;
  isBuiltIn: boolean;
}

export const BUILT_IN_ROLES: RoleDefinition[] = [
  { id: Role.Doctor, label: 'רופא', isBuiltIn: true },
  { id: Role.Psychiatrist, label: 'פסיכיאטר', isBuiltIn: true },
  { id: Role.Physiotherapist, label: 'פיזיותרפיסט', isBuiltIn: true },
  { id: Role.OccupationalTherapist, label: 'מרפא בעיסוק', isBuiltIn: true },
  { id: Role.Dietitian, label: 'תזונאי', isBuiltIn: true },
  { id: Role.Caregiver, label: 'מטפל', isBuiltIn: true },
  { id: Role.Nurse, label: 'אחות', isBuiltIn: true },
  { id: Role.HeadNurse, label: 'אחות אחראית', isBuiltIn: true },
  { id: Role.DevelopmentCoordinator, label: 'מרכז תוכניות קידום', isBuiltIn: true },
  { id: Role.EducationCoordinator, label: 'רכז חינוך', isBuiltIn: true },
  { id: Role.EmploymentCoordinator, label: 'רכז תעסוקה', isBuiltIn: true },
  { id: Role.Admin, label: 'מנהל', isBuiltIn: true },
  { id: Role.SocialWorker, label: 'עובד סוציאלי', isBuiltIn: true },
];

export enum WidgetType {
  FoodTexture = 'food_texture',
  WalkingStability = 'walking_stability',
  RiskManagement = 'risk_management',
  GuardianDetails = 'guardian_details',
  MedicationCardex = 'medication_cardex',
  Sensitivities = 'sensitivities',
  MedicalDiagnoses = 'medical_diagnoses',
  PersonalDevelopment = 'personal_development',
  ExceptionalEvents = 'exceptional_events',
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: string;
}

export interface Patient {
  id: string;
  fullName: string;
  idNumber: string;
  photoUrl: string;
  group: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
}

export interface PatientWidget {
  id: string;
  patientId: string;
  widgetType: WidgetType;
  value: string;
  lastUpdated: string;
  updatedBy: string;
}

export type WidgetInputType = 'freetext' | 'select';

export interface WidgetConfig {
  widgetType: WidgetType;
  inputType: WidgetInputType;
  options: string[];
}

export interface WidgetPermission {
  widgetType: WidgetType;
  rolesAllowedToEdit: string[];
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  patientId: string;
  widgetType: WidgetType;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

export const WIDGET_META: Record<WidgetType, { label: string; icon: string }> = {
  [WidgetType.FoodTexture]: { label: 'מרקם מזון', icon: '🍽️' },
  [WidgetType.WalkingStability]: { label: 'יציבות בהליכה', icon: '🚶' },
  [WidgetType.RiskManagement]: { label: 'תכנית ניהול סיכונים', icon: '⚠️' },
  [WidgetType.GuardianDetails]: { label: 'פרטי אפוטרופוס', icon: '👤' },
  [WidgetType.MedicationCardex]: { label: 'קרדקס תרופות', icon: '💊' },
  [WidgetType.Sensitivities]: { label: 'רגישויות', icon: '🩺' },
  [WidgetType.MedicalDiagnoses]: { label: 'אבחנות רפואיות', icon: '🏥' },
  [WidgetType.PersonalDevelopment]: { label: 'תוכנית קידום אישית', icon: '📋' },
  [WidgetType.ExceptionalEvents]: { label: 'אירועים חריגים', icon: '🚨' },
};

export const ROLE_LABELS: Record<string, string> = {
  [Role.Doctor]: 'רופא',
  [Role.Psychiatrist]: 'פסיכיאטר',
  [Role.Physiotherapist]: 'פיזיותרפיסט',
  [Role.OccupationalTherapist]: 'מרפא בעיסוק',
  [Role.Dietitian]: 'תזונאי',
  [Role.Caregiver]: 'מטפל',
  [Role.Nurse]: 'אחות',
  [Role.HeadNurse]: 'אחות אחראית',
  [Role.DevelopmentCoordinator]: 'מרכז תוכניות קידום',
  [Role.EducationCoordinator]: 'רכז חינוך',
  [Role.EmploymentCoordinator]: 'רכז תעסוקה',
  [Role.Admin]: 'מנהל',
  [Role.SocialWorker]: 'עובד סוציאלי',
};
