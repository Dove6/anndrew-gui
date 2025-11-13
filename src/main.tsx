import { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import '@atlaskit/css-reset';
import AppProvider from '@atlaskit/app-provider';
import { App } from './app';

ReactDOM.render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
  document.getElementById('root')
);
