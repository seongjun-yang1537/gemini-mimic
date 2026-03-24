import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/global.css';
import './styles/animations.css';
import './styles/header.css';
import './styles/composer.css';
import './styles/tabs.css';
import './styles/task.css';
import './styles/empty.css';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
