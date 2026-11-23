import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {installBrowserGuards} from './utils/browserGuard.ts';

installBrowserGuards();

createRoot(document.getElementById('root')!).render(<App />);
