import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { adminUserOps } from '../functions/adminUserOps/resource';
import { photoOps } from '../functions/photoOps/resource';
import { appSyncAuthorizer } from '../functions/appSyncAuthorizer/resource';
import { updateWidgetOps } from '../functions/updateWidgetOps/resource';

const schema = a.schema({
  UserRecord: a
    .model({
      cognitoId: a.string().required(),
      name: a.string().required(),
      username: a.string().required(),
      role: a.string().required(),
    })
    .secondaryIndexes((index) => [index('username'), index('cognitoId')])
    .authorization((allow) => [allow.custom()]),

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
    .authorization((allow) => [allow.custom()]),

  PatientWidget: a
    .model({
      patientId: a.string().required(),
      widgetType: a.string().required(),
      value: a.string().required(),
      lastUpdated: a.string().required(),
      updatedBy: a.string().required(),
    })
    .secondaryIndexes((index) => [index('patientId')])
    // update is disabled here — use the custom updateWidget mutation which enforces WidgetPermission
    // Valid operations: create, read, delete. 'read' covers both get and list.
    .authorization((allow) => [allow.custom().to(['create', 'read', 'delete'])]),

  WidgetPermission: a
    .model({
      widgetType: a.string().required(),
      rolesAllowedToEdit: a.string().array().required(),
    })
    .secondaryIndexes((index) => [index('widgetType')])
    .authorization((allow) => [allow.custom()]),

  WidgetConfig: a
    .model({
      widgetType: a.string().required(),
      inputType: a.string().required(),
      options: a.string().array().required(),
    })
    .secondaryIndexes((index) => [index('widgetType')])
    .authorization((allow) => [allow.custom()]),

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
    // Append-only: deny mutations other than create and reads
    .authorization((allow) => [allow.custom().to(['create', 'read'])]),

  RoleDefinition: a
    .model({
      roleId: a.string().required(),
      label: a.string().required(),
      isBuiltIn: a.boolean().required(),
    })
    .secondaryIndexes((index) => [index('roleId')])
    .authorization((allow) => [allow.custom()]),

  // Custom mutation — replaces auto-generated PatientWidget.update.
  // The Lambda handler enforces WidgetPermission server-side before writing.
  updateWidget: a
    .mutation()
    .arguments({
      widgetId: a.string().required(),
      newValue: a.string().required(),
    })
    .returns(a.ref('PatientWidget'))
    .handler(a.handler.function(updateWidgetOps))
    .authorization((allow) => [allow.custom()]),

  userAdminCreate: a
    .mutation()
    .arguments({
      username: a.string().required(),
      password: a.string().required(),
      role: a.string().required(),
    })
    .returns(a.string().required())
    .handler(a.handler.function(adminUserOps))
    .authorization((allow) => [allow.custom()]),

  userAdminSetPassword: a
    .mutation()
    .arguments({
      username: a.string().required(),
      password: a.string().required(),
    })
    .returns(a.string().required())
    .handler(a.handler.function(adminUserOps))
    .authorization((allow) => [allow.custom()]),

  userAdminDelete: a
    .mutation()
    .arguments({
      username: a.string().required(),
    })
    .returns(a.string().required())
    .handler(a.handler.function(adminUserOps))
    .authorization((allow) => [allow.custom()]),

  uploadPatientPhoto: a
    .mutation()
    .arguments({
      patientId: a.string().required(),
      imageBase64: a.string().required(),
      contentType: a.string().required(),
    })
    .returns(a.string().required())
    .handler(a.handler.function(photoOps))
    .authorization((allow) => [allow.custom()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'lambda',
    lambdaAuthorizationMode: {
      function: appSyncAuthorizer,
      timeToLiveInSeconds: 300,
    },
  },
});
