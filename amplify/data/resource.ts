import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  UserRecord: a
    .model({
      name: a.string().required(),
      username: a.string().required(),
      passwordHash: a.string().required(),
      role: a.string().required(),
    })
    .secondaryIndexes((index) => [index('username')])
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
    .authorization((allow) => [allow.publicApiKey()]),

  RoleDefinition: a
    .model({
      roleId: a.string().required(),
      label: a.string().required(),
      isBuiltIn: a.boolean().required(),
    })
    .secondaryIndexes((index) => [index('roleId')])
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: { expiresInDays: 365 },
  },
});
