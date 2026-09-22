import { createRoot } from 'react-dom/client';
import App from './app/App';
import './legacy/mockup.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('애플리케이션을 표시할 #root 요소가 없습니다.');
}

createRoot(rootElement).render(<App />);
