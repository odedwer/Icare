import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type { AppSyncResolverHandler } from 'aws-lambda';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const WIDGET_TABLE = process.env.WIDGET_TABLE!;
const PERMISSION_TABLE = process.env.PERMISSION_TABLE!;
const AUDIT_TABLE = process.env.AUDIT_TABLE!;

type Args = { widgetId: string; newValue: string };
type Result = {
  id: string;
  patientId: string;
  widgetType: string;
  value: string;
  lastUpdated: string;
  updatedBy: string;
};

export const handler: AppSyncResolverHandler<Args, Result> = async (event) => {
  const { widgetId, newValue } = event.arguments;
  const identity = event.identity as { resolverContext?: { userId?: string; role?: string } } | null;
  const userId = identity?.resolverContext?.userId;
  const role = identity?.resolverContext?.role;

  if (!userId || !role) throw new Error('Unauthorized');

  // 1. Fetch existing widget
  const widgetResult = await dynamo.send(
    new GetCommand({ TableName: WIDGET_TABLE, Key: { id: widgetId } }),
  );
  const widget = widgetResult.Item;
  if (!widget) throw new Error('Widget not found');

  // 2. Check WidgetPermission — WidgetPermission table has 9 items, scan is fine
  const permResult = await dynamo.send(
    new ScanCommand({
      TableName: PERMISSION_TABLE,
      FilterExpression: 'widgetType = :wt',
      ExpressionAttributeValues: { ':wt': widget['widgetType'] as string },
    }),
  );
  const perm = permResult.Items?.[0];
  const allowed = (perm?.['rolesAllowedToEdit'] as string[] | undefined) ?? [];
  if (!allowed.includes(role)) throw new Error('Permission denied');

  // 3. Update widget — 'value' is a DynamoDB reserved word, use expression name alias
  const now = new Date().toISOString();
  await dynamo.send(
    new UpdateCommand({
      TableName: WIDGET_TABLE,
      Key: { id: widgetId },
      UpdateExpression: 'SET #v = :val, lastUpdated = :lu, updatedBy = :ub, updatedAt = :ua',
      ExpressionAttributeNames: { '#v': 'value' },
      ExpressionAttributeValues: {
        ':val': newValue,
        ':lu': now,
        ':ub': userId,
        ':ua': now,
      },
    }),
  );

  // 4. Write AuditLogEntry
  await dynamo.send(
    new PutCommand({
      TableName: AUDIT_TABLE,
      Item: {
        id: crypto.randomUUID(),
        __typename: 'AuditLogEntry',
        userId,
        patientId: widget['patientId'] as string,
        widgetType: widget['widgetType'] as string,
        oldValue: widget['value'] as string,
        newValue,
        timestamp: now,
        createdAt: now,
        updatedAt: now,
      },
    }),
  );

  return {
    id: widgetId,
    patientId: widget['patientId'] as string,
    widgetType: widget['widgetType'] as string,
    value: newValue,
    lastUpdated: now,
    updatedBy: userId,
  };
};
