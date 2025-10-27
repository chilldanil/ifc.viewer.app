import React from 'react';
import { VolumeMeasurement } from './VolumeMeasurement';
import { LengthMeasurement } from './LengthMeasurement';
import './MeasurementSection.css';

export const MeasurementSection: React.FC = () => {
    return (
        <>
            <bim-panel-section label="Face Measurement" collapsed>
                <div className="measurement-tool-placeholder">
                    Face measurement controls will be implemented here
                </div>
            </bim-panel-section>

            <bim-panel-section label="Edge Measurement" collapsed>
                <div className="measurement-tool-placeholder">
                    Edge measurement controls will be implemented here
                </div>
            </bim-panel-section>

            <bim-panel-section label="Angle Measurement" collapsed>
                <div className="measurement-tool-placeholder">
                    Angle measurement controls will be implemented here
                </div>
            </bim-panel-section>

            <bim-panel-section label="Area Measurement" collapsed>
                <div className="measurement-tool-placeholder">
                    Area measurement controls will be implemented here
                </div>
            </bim-panel-section>

            <bim-panel-section label="Length Measurement" collapsed>
                <div className="measurement-tool-placeholder">
                    <LengthMeasurement />
                </div>
            </bim-panel-section>

            <bim-panel-section label="Volume Measurement" collapsed>
                <VolumeMeasurement />
            </bim-panel-section>
        </>
    );
};