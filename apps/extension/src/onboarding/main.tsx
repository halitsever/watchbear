import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Onboarding } from './Onboarding';
import '@/styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Onboarding />
  </StrictMode>,
);
