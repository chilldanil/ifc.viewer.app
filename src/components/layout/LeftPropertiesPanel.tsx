import React from 'react';
import { useBIM } from '../../context/BIMContext';
import { useElementSelection } from '../../hooks/useElementSelection';
import { Card, Stack, Text } from '../../ui';

const PropertyEditor = React.lazy(() =>
  import('../sidebar/PropertyEditor').then((m) => ({ default: m.PropertyEditor }))
);

const ExportModifiedIfc = React.lazy(() =>
  import('../sidebar/ExportModifiedIfc').then((m) => ({ default: m.ExportModifiedIfc }))
);

export const LeftPropertiesPanel: React.FC = () => {
  const { components, world } = useBIM();
  const { selectedModel, selectedExpressID } = useElementSelection(components, world);

  return (
    <div className="left-properties-panel">
      <Card className="relations-card left-properties-card left-properties-card--properties">
        <Stack gap="sm" className="left-properties-card-stack">
          <Text variant="label" as="div">Element Properties</Text>
          <div className="left-properties-editor">
            <React.Suspense fallback={<div />}>
              <PropertyEditor selectedModel={selectedModel} selectedExpressID={selectedExpressID} />
            </React.Suspense>
          </div>
        </Stack>
      </Card>

      <Card className="relations-card left-properties-card left-properties-card--export">
        <Stack gap="sm" className="left-properties-card-stack">
          <Text variant="label" as="div">Export</Text>
          <div className="left-properties-export">
            <React.Suspense fallback={<div />}>
              <ExportModifiedIfc />
            </React.Suspense>
          </div>
        </Stack>
      </Card>
    </div>
  );
};

export default LeftPropertiesPanel;
