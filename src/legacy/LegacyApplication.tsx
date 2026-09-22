import { useEffect } from 'react';
import parse from 'html-react-parser';
import { setupAdminStoreManagement } from '../features/admin-store/setupAdminStoreManagement';
import { setupStoreLocator } from '../features/store-locator/setupStoreLocator';
import mockupHtml from './mockup.html?raw';
import { setupLegacyMock } from './setupLegacyMock.js';

const resolvedMockupHtml = mockupHtml.replaceAll(
  './assets/',
  `${import.meta.env.BASE_URL}assets/`,
);
const legacyMarkup = parse(resolvedMockupHtml);

export function LegacyApplication() {
  useEffect(() => {
    setupLegacyMock();
    const cleanupStoreLocator = setupStoreLocator();
    const cleanupAdminStoreManagement = setupAdminStoreManagement();

    return () => {
      cleanupAdminStoreManagement();
      cleanupStoreLocator();
    };
  }, []);

  return <>{legacyMarkup}</>;
}
