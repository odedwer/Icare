import {
  type User,
  type Patient,
  type PatientWidget,
  type WidgetPermission,
  type WidgetConfig,
  type AuditLogEntry,
  type WidgetType,
  type WidgetInputType,
  type RoleDefinition,
} from '../types';

export interface CreateUserInput {
  name: string;
  username: string;
  password: string;
  role: string;
}

export interface CreatePatientInput {
  fullName: string;
  idNumber: string;
  group: string;
  dateOfBirth: string;
  photoUrl: string;
  gender: 'male' | 'female';
}

export interface DataService {
  // Auth
  login(username: string, password: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;

  // Patients
  searchPatients(query: string): Promise<Patient[]>;
  getPatientById(id: string): Promise<Patient | null>;

  // Widgets
  getWidgetsForPatient(patientId: string): Promise<PatientWidget[]>;
  updateWidget(
    widgetId: string,
    newValue: string,
    userId: string,
  ): Promise<PatientWidget>;

  // Permissions
  getWidgetPermissions(): Promise<WidgetPermission[]>;
  canEditWidget(widgetType: WidgetType, userRole: string): Promise<boolean>;

  // Audit
  getAuditLog(patientId?: string): Promise<AuditLogEntry[]>;

  // Admin — Users
  getAllUsers(): Promise<User[]>;
  createUser(input: CreateUserInput): Promise<User>;
  updateUser(id: string, updates: Partial<CreateUserInput>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Admin — Patients
  getAllPatients(): Promise<Patient[]>;
  createPatient(input: CreatePatientInput): Promise<Patient>;

  // Admin — Permissions
  updateWidgetPermissions(widgetType: WidgetType, rolesAllowedToEdit: string[]): Promise<WidgetPermission>;

  // Admin — Roles
  getAllRoles(): Promise<RoleDefinition[]>;
  createRole(id: string, label: string): Promise<RoleDefinition>;
  deleteRole(id: string): Promise<void>;

  // Admin — Widget Config
  getWidgetConfigs(): Promise<WidgetConfig[]>;
  updateWidgetConfig(widgetType: WidgetType, inputType: WidgetInputType, options: string[]): Promise<WidgetConfig>;
}
