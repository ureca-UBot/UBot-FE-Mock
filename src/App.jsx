import { useEffect } from 'react';
import mockupHtml from './mockup.html?raw';
import { setupMock } from './legacy/setupMock.js';
import { setupStoreLocator } from './stores/storeLocator.js';
import { setupAdminStoreManagement } from './admin/setupAdminStoreManagement.js';

const resolvedMockupHtml = mockupHtml.replaceAll(
  './assets/',
  `${import.meta.env.BASE_URL}assets/`,
);

export default function App() {
  useEffect(() => {
    setupMock();
    setupStoreLocator();
    setupAdminStoreManagement();
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: resolvedMockupHtml }} />;
}
