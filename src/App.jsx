import { useEffect } from 'react';
import mockupHtml from './mockup.html?raw';
import { setupMock } from './legacy/setupMock.js';

export default function App() {
  useEffect(() => {
    setupMock();
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: mockupHtml }} />;
}
