import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';
import { Dashboard } from './features/diagnostics/Dashboard';
import { Evaluation } from './features/evaluation/Evaluation';
import { initTelemetry } from './lib/api/client';

initTelemetry();

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');

createRoot(root).render(
  <StrictMode>
    {window.location.pathname === '/diagnostics' ? (
      <Dashboard />
    ) : window.location.pathname === '/evaluation' ? (
      <Evaluation />
    ) : (
      <App />
    )}
  </StrictMode>,
);
