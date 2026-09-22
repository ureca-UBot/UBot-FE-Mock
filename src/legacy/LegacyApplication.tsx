import { useEffect } from 'react';
import parse from 'html-react-parser';
import { setupAdminStoreManagement } from '../features/admin-store/setupAdminStoreManagement.js';
import { setupStoreLocator } from '../features/store-locator/setupStoreLocator.js';
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
    setupStoreLocator();
    setupAdminStoreManagement();
  }, []);

  return <>{legacyMarkup}</>;
}
