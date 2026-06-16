import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SidePanel } from './SidePanel';
import { connectPanelPort } from '@/lib/panelPort';
import '@/styles/globals.css';

// module scope so the port lives for the whole page, not React's mount cycle
connectPanelPort();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SidePanel />
  </StrictMode>,
);
