import { generateClient } from 'aws-amplify/data';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import type { Schema } from '../../amplify/data/resource';
import type { DataService, CreateUserInput, CreatePatientInput } from './DataService.ts';
import {
  type User,
  type Patient,
  type PatientWidget,
  type WidgetPermission,
  type WidgetConfig,
  type AuditLogEntry,
  type RoleDefinition,
  type WidgetType,
  type WidgetInputType,
  Role,
  WidgetType as WidgetTypeEnum,
} from '../types/index.ts';

// ─── Pagination helper ────────────────────────────────────────

async function listAll<T>(
  fetcher: (nextToken?: string) => Promise<{ data: T[]; nextToken?: string | null }>,
): Promise<T[]> {
  const results: T[] = [];
  let nextToken: string | undefined;
  do {
    const response = await fetcher(nextToken);
    results.push(...response.data);
    nextToken = response.nextToken ?? undefined;
  } while (nextToken);
  return results;
}

// ─── Type mappers ─────────────────────────────────────────────

type UserRecord = Schema['UserRecord']['type'];
type PatientRecord = Schema['Patient']['type'];
type PatientWidgetRecord = Schema['PatientWidget']['type'];
type WidgetPermissionRecord = Schema['WidgetPermission']['type'];
type WidgetConfigRecord = Schema['WidgetConfig']['type'];
type AuditLogRecord = Schema['AuditLogEntry']['type'];
type RoleRecord = Schema['RoleDefinition']['type'];

function toUser(r: UserRecord): User {
  return { id: r.id, name: r.name, username: r.username, role: r.role };
}

function toPatient(r: PatientRecord): Patient {
  return {
    id: r.id,
    fullName: r.fullName,
    idNumber: r.idNumber,
    photoUrl: r.photoUrl,
    group: r.group,
    dateOfBirth: r.dateOfBirth,
    gender: r.gender as 'male' | 'female',
  };
}

function toWidget(r: PatientWidgetRecord): PatientWidget {
  return {
    id: r.id,
    patientId: r.patientId,
    widgetType: r.widgetType as WidgetType,
    value: r.value,
    lastUpdated: r.lastUpdated,
    updatedBy: r.updatedBy,
  };
}

function toPermission(r: WidgetPermissionRecord): WidgetPermission {
  return {
    widgetType: r.widgetType as WidgetType,
    rolesAllowedToEdit: r.rolesAllowedToEdit as string[],
  };
}

function toWidgetConfig(r: WidgetConfigRecord): WidgetConfig {
  return {
    widgetType: r.widgetType as WidgetType,
    inputType: r.inputType as WidgetInputType,
    options: r.options as string[],
  };
}

function toAuditEntry(r: AuditLogRecord): AuditLogEntry {
  return {
    id: r.id,
    userId: r.userId,
    patientId: r.patientId,
    widgetType: r.widgetType as WidgetType,
    oldValue: r.oldValue,
    newValue: r.newValue,
    timestamp: r.timestamp,
  };
}

function toRoleDefinition(r: RoleRecord): RoleDefinition {
  return { id: r.roleId, label: r.label, isBuiltIn: r.isBuiltIn };
}

// ─── Service ──────────────────────────────────────────────────

export class AmplifyDataService implements DataService {
  // Amplify's generateClient authToken must be a static string — not a function.
  // We call getClient() before every operation so the Lambda authorizer always
  // receives a fresh (auto-refreshed) Cognito ID token.
  private async getClient(): Promise<ReturnType<typeof generateClient<Schema>>> {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString() ?? '';
    return generateClient<Schema>({ authMode: 'lambda', authToken: token });
  }

  // ─── Auth ──────────────────────────────────────────────────

  async login(username: string, password: string): Promise<User | null> {
    try {
      await signIn({ username, password });
    } catch (error: unknown) {
      if ((error as { name?: string })?.name === 'UserAlreadyAuthenticatedException') {
        await signOut();
        try {
          await signIn({ username, password });
        } catch (retryError) {
          console.error('[Login] signIn retry failed:', retryError);
          return null;
        }
      } else {
        console.error('[Login] signIn failed:', error);
        return null;
      }
    }
    return this.getCurrentSession();
  }

  async getCurrentSession(): Promise<User | null> {
    try {
      const { userId } = await getCurrentUser();
      const client = await this.getClient();
      const { data } = await client.models.UserRecord.listUserRecordByCognitoId({
        cognitoId: userId,
      });
      const record = data[0];
      return record ? toUser(record) : null;
    } catch (error) {
      console.error('[getCurrentSession] failed:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    await signOut();
  }

  async getUserById(id: string): Promise<User | null> {
    const client = await this.getClient();
    const { data } = await client.models.UserRecord.get({ id });
    return data ? toUser(data) : null;
  }

  // ─── Patients ──────────────────────────────────────────────

  async searchPatients(query: string): Promise<Patient[]> {
    const q = query.trim();
    if (!q) return [];

    const client = await this.getClient();
    if (/^\d+$/.test(q)) {
      const { data } = await client.models.Patient.listPatientByIdNumber({ idNumber: q });
      return data.map(toPatient);
    }

    const all = await listAll((nextToken) =>
      client.models.Patient.list({
        filter: { fullName: { contains: q } },
        nextToken,
      }),
    );
    return all.map(toPatient);
  }

  async getPatientById(id: string): Promise<Patient | null> {
    const client = await this.getClient();
    const { data } = await client.models.Patient.get({ id });
    return data ? toPatient(data) : null;
  }

  // ─── Widgets ───────────────────────────────────────────────

  async getWidgetsForPatient(patientId: string): Promise<PatientWidget[]> {
    const client = await this.getClient();
    const { data } = await client.models.PatientWidget.listPatientWidgetByPatientId({ patientId });
    return data.map(toWidget);
  }

  // Permission check and audit log are now enforced server-side in updateWidgetOps Lambda.
  // _userId is kept in the signature to satisfy the DataService interface.
  async updateWidget(widgetId: string, newValue: string, _userId: string): Promise<PatientWidget> {
    const client = await this.getClient();
    const { data: updated, errors } = await client.mutations.updateWidget({ widgetId, newValue });
    if (errors && errors.length > 0) throw new Error(errors[0].message);
    if (!updated) throw new Error('Widget update failed');
    return toWidget(updated as unknown as PatientWidgetRecord);
  }

  // ─── Permissions ───────────────────────────────────────────

  async getWidgetPermissions(): Promise<WidgetPermission[]> {
    const client = await this.getClient();
    const all = await listAll((nextToken) =>
      client.models.WidgetPermission.list({ nextToken }),
    );
    return all.map(toPermission);
  }

  async canEditWidget(widgetType: WidgetType, userRole: string): Promise<boolean> {
    const client = await this.getClient();
    const { data } = await client.models.WidgetPermission.listWidgetPermissionByWidgetType({ widgetType });
    const perm = data[0];
    return perm ? (perm.rolesAllowedToEdit as string[]).includes(userRole) : false;
  }

  // ─── Audit ─────────────────────────────────────────────────

  async getAuditLog(patientId?: string): Promise<AuditLogEntry[]> {
    const client = await this.getClient();
    if (patientId) {
      const { data } = await client.models.AuditLogEntry.listAuditLogEntryByPatientId({ patientId });
      return data.map(toAuditEntry);
    }
    const all = await listAll((nextToken) =>
      client.models.AuditLogEntry.list({ nextToken }),
    );
    return all.map(toAuditEntry);
  }

  // ─── Admin — Users ─────────────────────────────────────────

  async getAllUsers(): Promise<User[]> {
    const client = await this.getClient();
    const all = await listAll((nextToken) =>
      client.models.UserRecord.list({ nextToken }),
    );
    return all.map(toUser);
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const client = await this.getClient();
    const existing = await client.models.UserRecord.listUserRecordByUsername({ username: input.username });
    if (existing.data.length > 0) throw new Error('שם המשתמש כבר קיים');

    const { data: cognitoIdData, errors } = await client.mutations.userAdminCreate({
      username: input.username,
      password: input.password,
      role: input.role,
    });
    if (errors && errors.length > 0) throw new Error(errors[0].message);
    const cognitoId = cognitoIdData;
    if (!cognitoId) throw new Error('Failed to create Cognito user');

    const { data } = await client.models.UserRecord.create({
      cognitoId,
      name: input.name,
      username: input.username,
      role: input.role,
    });
    if (!data) throw new Error('Failed to create user record');
    return toUser(data);
  }

  async updateUser(id: string, updates: Partial<CreateUserInput>): Promise<User> {
    const client = await this.getClient();
    const { data: existing } = await client.models.UserRecord.get({ id });
    if (!existing) throw new Error('משתמש לא נמצא');

    if (updates.username && updates.username !== existing.username) {
      const dup = await client.models.UserRecord.listUserRecordByUsername({ username: updates.username });
      if (dup.data.length > 0) throw new Error('שם המשתמש כבר קיים');
    }

    if (updates.password) {
      const { errors } = await client.mutations.userAdminSetPassword({
        username: existing.username,
        password: updates.password,
      });
      if (errors && errors.length > 0) throw new Error(errors[0].message);
    }

    const { data: updated } = await client.models.UserRecord.update({
      id,
      name: updates.name ?? existing.name,
      username: updates.username ?? existing.username,
      role: updates.role ?? existing.role,
    });
    if (!updated) throw new Error('Failed to update user');
    return toUser(updated);
  }

  async deleteUser(id: string): Promise<void> {
    const client = await this.getClient();
    const { data } = await client.models.UserRecord.get({ id });
    if (!data) throw new Error('משתמש לא נמצא');

    const { errors } = await client.mutations.userAdminDelete({ username: data.username });
    if (errors && errors.length > 0) throw new Error(errors[0].message);

    await client.models.UserRecord.delete({ id });
  }

  // ─── Photos ────────────────────────────────────────────────

  async uploadPatientPhoto(patientId: string, file: File): Promise<string> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const client = await this.getClient();
    const { data: url, errors } = await client.mutations.uploadPatientPhoto({
      patientId,
      imageBase64: base64,
      contentType: file.type || 'image/jpeg',
    });
    if (errors && errors.length > 0) throw new Error(errors[0].message);
    if (!url) throw new Error('Failed to upload photo');

    await client.models.Patient.update({ id: patientId, photoUrl: url });

    return url;
  }

  // ─── Admin — Patients ──────────────────────────────────────

  async getAllPatients(): Promise<Patient[]> {
    const client = await this.getClient();
    const all = await listAll((nextToken) =>
      client.models.Patient.list({ nextToken }),
    );
    return all.map(toPatient);
  }

  async createPatient(input: CreatePatientInput): Promise<Patient> {
    const client = await this.getClient();
    const existing = await client.models.Patient.listPatientByIdNumber({ idNumber: input.idNumber });
    if (existing.data.length > 0) throw new Error('מספר ת.ז כבר קיים במערכת');

    const { data: patient } = await client.models.Patient.create({
      fullName: input.fullName,
      idNumber: input.idNumber,
      photoUrl: input.photoUrl,
      group: input.group,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
    });
    if (!patient) throw new Error('Failed to create patient');

    const now = new Date().toISOString();
    const widgetTypes = Object.values(WidgetTypeEnum);
    await Promise.all(
      widgetTypes.map((wt) =>
        client.models.PatientWidget.create({
          patientId: patient.id,
          widgetType: wt,
          value: '',
          lastUpdated: now,
          updatedBy: '',
        }),
      ),
    );

    return toPatient(patient);
  }

  // ─── Admin — Permissions ───────────────────────────────────

  async updateWidgetPermissions(widgetType: WidgetType, rolesAllowedToEdit: string[]): Promise<WidgetPermission> {
    const client = await this.getClient();
    const { data: existing } = await client.models.WidgetPermission.listWidgetPermissionByWidgetType({ widgetType });
    const record = existing[0];
    if (!record) throw new Error('סוג ווידג\'ט לא נמצא');

    const { data: updated } = await client.models.WidgetPermission.update({
      id: record.id,
      rolesAllowedToEdit,
    });
    if (!updated) throw new Error('Failed to update permissions');
    return toPermission(updated);
  }

  // ─── Admin — Roles ─────────────────────────────────────────

  async getAllRoles(): Promise<RoleDefinition[]> {
    const client = await this.getClient();
    const all = await listAll((nextToken) =>
      client.models.RoleDefinition.list({ nextToken }),
    );
    return all.map(toRoleDefinition);
  }

  async createRole(id: string, label: string): Promise<RoleDefinition> {
    const client = await this.getClient();
    const existing = await client.models.RoleDefinition.listRoleDefinitionByRoleId({ roleId: id });
    if (existing.data.length > 0) throw new Error('מזהה התפקיד כבר קיים');

    const { data } = await client.models.RoleDefinition.create({ roleId: id, label, isBuiltIn: false });
    if (!data) throw new Error('Failed to create role');
    return toRoleDefinition(data);
  }

  async deleteRole(id: string): Promise<void> {
    const client = await this.getClient();
    const existing = await client.models.RoleDefinition.listRoleDefinitionByRoleId({ roleId: id });
    const record = existing.data[0];
    if (!record) throw new Error('תפקיד לא נמצא');
    if (record.isBuiltIn) throw new Error('לא ניתן למחוק תפקיד מובנה');

    const allPerms = await listAll((nextToken) =>
      client.models.WidgetPermission.list({ nextToken }),
    );
    await Promise.all(
      allPerms
        .filter((p) => (p.rolesAllowedToEdit as string[]).includes(id))
        .map((p) =>
          client.models.WidgetPermission.update({
            id: p.id,
            rolesAllowedToEdit: (p.rolesAllowedToEdit as string[]).filter((r) => r !== id),
          }),
        ),
    );

    const allUsers = await listAll((nextToken) =>
      client.models.UserRecord.list({ nextToken }),
    );
    await Promise.all(
      allUsers
        .filter((u) => u.role === id)
        .map((u) =>
          client.models.UserRecord.update({ id: u.id, role: Role.Caregiver }),
        ),
    );

    await client.models.RoleDefinition.delete({ id: record.id });
  }

  // ─── Admin — Widget Config ─────────────────────────────────

  async getWidgetConfigs(): Promise<WidgetConfig[]> {
    const client = await this.getClient();
    const all = await listAll((nextToken) =>
      client.models.WidgetConfig.list({ nextToken }),
    );
    return all.map(toWidgetConfig);
  }

  async updateWidgetConfig(widgetType: WidgetType, inputType: WidgetInputType, options: string[]): Promise<WidgetConfig> {
    const client = await this.getClient();
    const { data: existing } = await client.models.WidgetConfig.listWidgetConfigByWidgetType({ widgetType });
    const record = existing[0];
    if (!record) throw new Error('סוג ווידג\'ט לא נמצא');

    const { data: updated } = await client.models.WidgetConfig.update({
      id: record.id,
      inputType,
      options,
    });
    if (!updated) throw new Error('Failed to update widget config');
    return toWidgetConfig(updated);
  }
}
