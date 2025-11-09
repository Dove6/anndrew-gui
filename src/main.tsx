import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@atlaskit/css-reset';
import AppProvider from '@atlaskit/app-provider';

import Example from './example';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <Example />
    </AppProvider>
  </StrictMode>,
);
