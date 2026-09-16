import { createRoot } from 'react-dom/client';

import App from './components/App';
// import './i18n/config';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  throw new Error('Root container not found');
}
