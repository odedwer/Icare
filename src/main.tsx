import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';
import App from './App.tsx';
import './styles.css';

// amplify_outputs.json stores Cognito IDs under 'custom' (raw CDK, not defineAuth).
// We use ResourcesConfig format (capital keys, no 'version') intentionally: passing
// outputs directly triggers AmplifyOutputs parsing which ignores Auth when there is no
// 'auth' section, leaving loginWith unconfigured and causing signIn to silently fail.
const custom = (outputs as any).custom as { userPoolId: string; userPoolClientId: string };
const data = (outputs as any).data;

console.log('[Amplify] userPoolId:', custom.userPoolId, 'clientId:', custom.userPoolClientId);
Amplify.configure({
  API: {
    GraphQL: {
      endpoint: data.url,
      region: data.aws_region,
      defaultAuthMode: 'lambda' as const,
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
