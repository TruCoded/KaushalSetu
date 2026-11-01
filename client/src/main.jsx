import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from './ctx.jsx';
import App from './App.jsx';
import './styles.css';
createRoot(document.getElementById('root')).render(<BrowserRouter><Provider><App /></Provider></BrowserRouter>);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const r of registrations) r.unregister();
  }).catch(() => {});
}
