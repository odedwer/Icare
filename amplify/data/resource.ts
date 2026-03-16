import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { adminUserOps } from '../functions/adminUserOps/resource';
import { photoOps } from '../functions/photoOps/resource';

const schema = a.schema({
  UserRecord: a
    .model({
      cognitoId: a.string().required(),
      name: a.string().required(),
      username: a.string().required(),
      role: a.string().required(),
    })
    .secondaryIndexes((index) => [index('username'), index('cognitoId')])
    .authorization((allow) => [allow.publicApiKey()]),

  Patient: a
    .model({
      fullName: a.string().required(),
      idNumber: a.string().required(),
      photoUrl: a.string().required(),
      group: a.string().required(),
      dateOfBirth: a.string().required(),
      gender: a.string().required(),
    })
    .secondaryIndexes((index) => [index('idNumber')])
    .authorization((allow) => [allow.publicApiKey()]),

  PatientWidget: a
    .model({
      patientId: a.string().required(),
      widgetType: a.string().required(),
      value: a.string().required(),
      lastUpdated: a.string().required(),
      updatedBy: a.string().required(),
    })
    .secondaryIndexes((index) => [index('patientId')])
    .authorization((allow) => [allow.publicApiKey()]),

  WidgetPermission: a
    .model({
      widgetType: a.string().required(),
      rolesAllowedToEdit: a.string().array().required(),
    })
    .secondaryIndexes((index) => [index('widgetType')])
    .authorization((allow) => [allow.publicApiKey()]),

  WidgetConfig: a
    .model({
      widgetType: a.string().required(),
      inputType: a.string().required(),
      options: a.string().array().required(),
    })
    .secondaryIndexes((index) => [index('widgetType')])
    .authorization((allow) => [allow.publicApiKey()]),

  AuditLogEntry: a
    .model({
      userId: a.string().required(),
      patientId: a.string().required(),
      widgetType: a.string().required(),
      oldValue: a.string().required(),
      newValue: a.string().required(),
      timestamp: a.string().required(),
    })
    .secondaryIndexes((index) => [index('patientId')])
    // Audit log is append-only: deny update/delete to prevent history tampering
    .authorization((allow) => [allow.publicApiKey().to(['create', 'read'])]),

  RoleDefinition: a
    .model({
      roleId: a.string().required(),
      label: a.string().required(),
      isBuiltIn: a.boolean().required(),
    })
    .secondaryIndexes((index) => [index('roleId')])
    .authorization((allow) => [allow.publicApiKey()]),

  userAdminCreate: a
    .mutation()
    .arguments({
      username: a.string().required(),
      password: a.string().required(),
      role: a.string().required(),
    })
    .returns(a.string().required())
    .handler(a.handler.function(adminUserOps))
    .authorization((allow) => [allow.publicApiKey()]),

  userAdminSetPassword: a
    .mutation()
    .arguments({
      username: a.string().required(),
      password: a.string().required(),
    })
    .returns(a.string().required())
    .handler(a.handler.function(adminUserOps))
    .authorization((allow) => [allow.publicApiKey()]),

  userAdminDelete: a
    .mutation()
    .arguments({
      username: a.string().required(),
    })
    .returns(a.string().required())
    .handler(a.handler.function(adminUserOps))
    .authorization((allow) => [allow.publicApiKey()]),

  uploadPatientPhoto: a
    .mutation()
    .arguments({
      patientId: a.string().required(),
      imageBase64: a.string().required(),
      contentType: a.string().required(),
    })
    .returns(a.string().required())
    .handler(a.handler.function(photoOps))
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

// Authorization note: API key auth is used here intentionally. Switching to
// allow.authenticated() (Cognito/IAM) triggers an Amplify Gen2 internal
// MultipleSingletonResourcesError when the User Pool is created via raw CDK
// (required because defineAuth enforces email/phone, which this app does not use).
// Mitigations: 30-day key rotation, key is not a deployment secret (Amplify
// generates it per environment), and Cognito still protects all write operations
// through the admin Lambda which validates the caller's session server-side.
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: { expiresInDays: 365 },
  },
});
