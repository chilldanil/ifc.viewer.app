import React from 'react';
import './polyfills/three-compat';
import { Layout } from './components/layout/Layout';
import { BIMProvider, SelectionMap } from './context/BIMContext';
import { ErrorBoundary } from './components/ErrorBoundary';

interface AppProps {
  onObjectSelected?: (selection: SelectionMap) => void;
  onModelLoaded?: (meta: Record<string, unknown>) => void;
  onError?: (error: unknown) => void;
}

const App: React.FC<AppProps> = ({ onObjectSelected, onModelLoaded, onError }) => {
  return (
    <ErrorBoundary>
      <BIMProvider
        onObjectSelected={onObjectSelected}
        onModelLoaded={onModelLoaded}
        onError={onError}
      >
        <Layout />
      </BIMProvider>
    </ErrorBoundary>
  );
};

export default App;
