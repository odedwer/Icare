import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';
import App from './App';
import './styles.css';

// The Cognito User Pool is created via raw CDK (bypassing defineAuth) so its IDs
// are written into amplify_outputs.json under the 'custom' key by backend.addOutput.
const custom = (outputs as any).custom as { userPoolId?: string; userPoolClientId?: string } | undefined;

Amplify.configure({
  ...outputs,
  ...(custom?.userPoolId && custom?.userPoolClientId
    ? {
        auth: {
          region: 'us-east-1',
          userPoolId: custom.userPoolId,
          userPoolClientId: custom.userPoolClientId,
          loginWith: { username: true },
        },
      }
    : {}),
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
