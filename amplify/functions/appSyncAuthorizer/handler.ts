import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const USER_POOL_ID = process.env.USER_POOL_ID!;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID!;
const USER_RECORD_TABLE = process.env.USER_RECORD_TABLE!;

// Fail fast at cold start if env vars are missing rather than producing cryptic auth errors
for (const [key, val] of Object.entries({ USER_POOL_ID, USER_POOL_CLIENT_ID, USER_RECORD_TABLE })) {
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
}

// tokenUse: 'id' because the frontend sends the Cognito ID token as the Bearer token.
// The ID token carries the 'sub' claim used to look up the UserRecord.
// Access tokens do not contain this claim by default.
const verifier = CognitoJwtVerifier.create({
  userPoolId: USER_POOL_ID,
  tokenUse: 'id',
  clientId: USER_POOL_CLIENT_ID,
});

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface AuthorizerEvent {
  authorizationToken: string;
  requestContext: {
    apiId: string;
    accountId: string;
    requestId: string;
    queryString: string;
    operationName: string | null;
    variables: Record<string, unknown>;
  };
}

interface AuthorizerResult {
  isAuthorized: boolean;
  resolverContext?: Record<string, unknown>;
  ttlOverride?: number;
}

export const handler = async (event: AuthorizerEvent): Promise<AuthorizerResult> => {
  const token = event.authorizationToken.replace(/^Bearer\s+/i, '');

  let cognitoId: string;
  try {
    const payload = await verifier.verify(token);
    cognitoId = payload.sub;
  } catch (err) {
    console.error('[appSyncAuthorizer] JWT verification failed:', (err as Error).message);
    return { isAuthorized: false };
  }

  // Full scan — UserRecord table has ~10 items; no Limit to avoid the DynamoDB
  // behaviour where Limit applies before FilterExpression (could miss valid users)
  let result: Awaited<ReturnType<typeof dynamo.send<ScanCommand>>>;
  try {
    result = await dynamo.send(
      new ScanCommand({
        TableName: USER_RECORD_TABLE,
        FilterExpression: 'cognitoId = :cid',
        ExpressionAttributeValues: { ':cid': cognitoId },
      }),
    );
  } catch (err) {
    console.error('[appSyncAuthorizer] DynamoDB scan failed:', (err as Error).message);
    return { isAuthorized: false };
  }

  const record = result.Items?.[0];
  if (!record) {
    console.error('[appSyncAuthorizer] No UserRecord found for cognitoId:', cognitoId);
    return { isAuthorized: false };
  }

  const userId = record['id'];
  const role = record['role'];
  if (typeof userId !== 'string' || typeof role !== 'string') {
    console.error('[appSyncAuthorizer] UserRecord missing id or role for cognitoId:', cognitoId);
    return { isAuthorized: false };
  }

  return {
    isAuthorized: true,
    resolverContext: { userId, role },
    ttlOverride: 300,
  };
};
