import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';
import App from './App.tsx';
import './styles.css';

// amplify_outputs.json stores Cognito IDs under 'custom' (raw CDK, not defineAuth).
// Pass outputs directly so Amplify handles the data/AppSync section natively (including
// Lambda auth mode wiring). Auth is supplemented manually from custom since defineAuth
// was not used.
const custom = (outputs as any).custom as { userPoolId: string; userPoolClientId: string };

console.log('[Amplify] userPoolId:', custom.userPoolId, 'clientId:', custom.userPoolClientId);
Amplify.configure({
  ...outputs,
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
