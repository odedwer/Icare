import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';
import App from './App';
import './styles.css';

// amplify_outputs.json stores Cognito IDs under 'custom' (raw CDK, not defineAuth).
// We configure Amplify using ResourcesConfig format (capital Auth, camelCase) so that
// the 'version' key in outputs does not trigger AmplifyOutputs parsing, which would
// leave loginWith empty and cause signIn to fail without a network request.
const custom = (outputs as any).custom as { userPoolId: string; userPoolClientId: string };
const data = outputs.data;

console.log('[Amplify] userPoolId:', custom.userPoolId, 'clientId:', custom.userPoolClientId);
Amplify.configure({
  API: {
    GraphQL: {
      endpoint: data.url,
      region: data.aws_region,
      defaultAuthMode: 'apiKey' as const,
      apiKey: data.api_key,
      modelIntrospection: data.model_introspection as any,
    },
  },
  Auth: {
    Cognito: {
      userPoolId: custom.userPoolId,
      userPoolClientId: custom.userPoolClientId,
      loginWith: {
        username: true,
      },
    },
  },
});
console.log('[Amplify] Configured successfully');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
