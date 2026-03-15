import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { AppSyncResolverHandler } from 'aws-lambda';

const cognitoClient = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.USER_POOL_ID!;

export const handler: AppSyncResolverHandler<
  { username?: string; password?: string; role?: string },
  string
> = async (event) => {
  const { fieldName } = event.info;
  const args = event.arguments;

  if (fieldName === 'userAdminCreate') {
    const { username, password } = args as {
      username: string;
      password: string;
      role: string;
    };

    const createRes = await cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        MessageAction: 'SUPPRESS',
        UserAttributes: [],
      }),
    );

    await cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        Password: password,
        Permanent: true,
      }),
    );

    const sub = createRes.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;
    if (!sub) throw new Error('Failed to get Cognito sub for new user');
    return sub;
  }

  if (fieldName === 'userAdminSetPassword') {
    const { username, password } = args as { username: string; password: string };

    await cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        Password: password,
        Permanent: true,
      }),
    );

    return 'ok';
  }

  if (fieldName === 'userAdminDelete') {
    const { username } = args as { username: string };

    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      }),
    );

    return 'ok';
  }

  throw new Error(`Unknown fieldName: ${fieldName}`);
};
