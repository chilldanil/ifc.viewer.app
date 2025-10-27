import React from 'react';
import { useBIM } from '../../context/BIMContext';
import './ViewCubeSection.css';

export const ViewCubeSection: React.FC = () => {
  const { viewCubeEnabled, setViewCubeEnabled } = useBIM();

  return (
    <bim-panel-section label="View Cube" collapsed>
      <div className="viewcube-section">
        <label className="viewcube-toggle">
          <input
            type="checkbox"
            checked={viewCubeEnabled}
            onChange={(event) => setViewCubeEnabled(event.target.checked)}
          />
          <span>Display view cube overlay</span>
        </label>
        <p className="viewcube-hint">
          Toggle the orientation cube shown in the lower-right corner of the viewport.
        </p>
      </div>
    </bim-panel-section>
  );
};
