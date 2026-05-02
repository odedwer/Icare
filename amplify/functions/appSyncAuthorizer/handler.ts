import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const USER_POOL_ID = process.env.USER_POOL_ID!;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID!;
const USER_RECORD_TABLE = process.env.USER_RECORD_TABLE!;

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
  } catch {
    return { isAuthorized: false };
  }

  // UserRecord table has ~10 items — scan is acceptable and avoids GSI naming assumptions
  const result = await dynamo.send(
    new ScanCommand({
      TableName: USER_RECORD_TABLE,
      FilterExpression: 'cognitoId = :cid',
      ExpressionAttributeValues: { ':cid': cognitoId },
      Limit: 1,
    }),
  );

  const record = result.Items?.[0];
  if (!record) return { isAuthorized: false };

  return {
    isAuthorized: true,
    resolverContext: {
      userId: record['id'] as string,
      role: record['role'] as string,
    },
    ttlOverride: 300,
  };
};
