import React from 'react';
import { useBIM } from '../../context/BIMContext';
import { Toggle, Text, Stack } from '../../ui';

export const ViewCubeSection: React.FC = () => {
  const { viewCubeEnabled, setViewCubeEnabled } = useBIM();

  return (
    <bim-panel-section label="View Cube" collapsed>
      <Stack gap="sm">
        <Toggle
          checked={viewCubeEnabled}
          onChange={setViewCubeEnabled}
          label="Display view cube overlay"
        />
        <Text variant="subtle" size="sm">
          Toggle the orientation cube shown in the lower-right corner of the viewport.
        </Text>
      </Stack>
    </bim-panel-section>
  );
};
