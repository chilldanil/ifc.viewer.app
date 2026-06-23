import React from 'react';
import './polyfills/three-compat';
import { Layout } from './components/layout/Layout';
import { BIMProvider, SelectionMap } from './context/BIMContext';
import { RenderGalleryProvider } from './context/RenderGalleryContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PartialViewerConfig } from './config/viewerConfig';

export interface AppProps {
  onObjectSelected?: (selection: SelectionMap) => void;
  onModelLoaded?: (meta: Record<string, unknown>) => void;
  onError?: (error: unknown) => void;
  config?: PartialViewerConfig;
}

const App: React.FC<AppProps> = ({ onObjectSelected, onModelLoaded, onError, config }) => {
  return (
    <ErrorBoundary>
      <BIMProvider
        onObjectSelected={onObjectSelected}
        onModelLoaded={onModelLoaded}
        onError={onError}
        config={config}
      >
        <RenderGalleryProvider>
          <Layout />
        </RenderGalleryProvider>
      </BIMProvider>
    </ErrorBoundary>
  );
};

export default App;
