import React from 'react';
import { VolumeMeasurement } from './VolumeMeasurement';
import { LengthMeasurement } from './LengthMeasurement';
import { Text, Card } from '../../ui';

export const MeasurementSection: React.FC = () => {
  return (
    <>
      <bim-panel-section label="Face Measurement" collapsed>
        <Card>
          <Text variant="subtle" size="sm" style={{ fontStyle: 'italic', textAlign: 'center' }}>
            Face measurement controls will be implemented here
          </Text>
        </Card>
      </bim-panel-section>

      <bim-panel-section label="Edge Measurement" collapsed>
        <Card>
          <Text variant="subtle" size="sm" style={{ fontStyle: 'italic', textAlign: 'center' }}>
            Edge measurement controls will be implemented here
          </Text>
        </Card>
      </bim-panel-section>

      <bim-panel-section label="Angle Measurement" collapsed>
        <Card>
          <Text variant="subtle" size="sm" style={{ fontStyle: 'italic', textAlign: 'center' }}>
            Angle measurement controls will be implemented here
          </Text>
        </Card>
      </bim-panel-section>

      <bim-panel-section label="Area Measurement" collapsed>
        <Card>
          <Text variant="subtle" size="sm" style={{ fontStyle: 'italic', textAlign: 'center' }}>
            Area measurement controls will be implemented here
          </Text>
        </Card>
      </bim-panel-section>

      <bim-panel-section label="Length Measurement" collapsed>
        <LengthMeasurement />
      </bim-panel-section>

      <bim-panel-section label="Volume Measurement" collapsed>
        <VolumeMeasurement />
      </bim-panel-section>
    </>
  );
};
