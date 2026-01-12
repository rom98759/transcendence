import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './i118n';
import { AuthProvider } from './components/helpers/AuthProvider';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App></App>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
