import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import '@atlaskit/css-reset';
import AppProvider from '@atlaskit/app-provider';

import Example from './example';

ReactDOM.render(
  <StrictMode>
    <AppProvider>
      <Example />
    </AppProvider>
  </StrictMode>,
  document.getElementById('root')
);
