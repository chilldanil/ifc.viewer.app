import React, { useMemo } from 'react';
import { Button, ButtonGroup, Field, Grid, Row, Slider, Stack, Status, Text, Toggle } from '../../ui';

export type ClippingToolMode = 'off' | 'create' | 'delete';

export interface ClippingToolbarMenuProps {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  gizmosVisible: boolean;
  onGizmosVisibleChange: (value: boolean) => void;
  edgesVisible: boolean;
  onEdgesVisibleChange: (value: boolean) => void;
  orthoY: boolean;
  onOrthoYChange: (value: boolean) => void;
  planeOpacity: number;
  onPlaneOpacityChange: (value: number) => void;
  planeSize: number;
  onPlaneSizeChange: (value: number) => void;
  edgeColor: string;
  onEdgeColorChange: (value: string) => void;
  edgeWidth: number;
  onEdgeWidthChange: (value: number) => void;
  fillColor: string;
  onFillColorChange: (value: string) => void;
  fillOpacity: number;
  onFillOpacityChange: (value: number) => void;
  toolMode: ClippingToolMode;
  onToolModeChange: (mode: ClippingToolMode) => void;
  sectionBoxActive: boolean;
  onCreateSectionBox: () => void;
  onClearSectionBox: () => void;
  onClearAll: () => void;
  onCreateAxisPlane: (axis: 'X' | 'Y' | 'Z') => void;
  planeCount: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const ClippingToolbarMenu: React.FC<ClippingToolbarMenuProps> = ({
  enabled,
  onEnabledChange,
  gizmosVisible,
  onGizmosVisibleChange,
  edgesVisible,
  onEdgesVisibleChange,
  orthoY,
  onOrthoYChange,
  planeOpacity,
  onPlaneOpacityChange,
  planeSize,
  onPlaneSizeChange,
  edgeColor,
  onEdgeColorChange,
  edgeWidth,
  onEdgeWidthChange,
  fillColor,
  onFillColorChange,
  fillOpacity,
  onFillOpacityChange,
  toolMode,
  onToolModeChange,
  sectionBoxActive,
  onCreateSectionBox,
  onClearSectionBox,
  onClearAll,
  onCreateAxisPlane,
  planeCount,
}) => {
  const hint = useMemo(() => {
    if (toolMode === 'create') {
      return 'Click in the viewport to place a section plane (Esc to cancel).';
    }
    if (toolMode === 'delete') {
      return 'Click a section plane gizmo to delete it (Esc to cancel).';
    }
    return null;
  }, [toolMode]);

  return (
    <div className="toolbar-clipping-menu">
      <div className="toolbar-clipping-section">
        <Row between>
          <Text variant="label" size="sm" as="div">General</Text>
          <Text variant="subtle" size="sm" as="div">{planeCount} planes</Text>
        </Row>
        <Stack gap="sm">
          <Toggle checked={enabled} onChange={onEnabledChange} label="Clipping enabled" />
          <Row stretch>
            <Toggle checked={gizmosVisible} onChange={onGizmosVisibleChange} label="Gizmos" />
            <Toggle checked={edgesVisible} onChange={onEdgesVisibleChange} label="Edges" />
            <Toggle checked={orthoY} onChange={onOrthoYChange} label="Lock Y" />
          </Row>
        </Stack>
      </div>

      <div className="toolbar-clipping-section">
        <Text variant="label" size="sm" as="div">Create</Text>
        <Stack gap="sm">
          <ButtonGroup stretch>
            <Button
              variant={toolMode === 'create' ? 'primary' : 'default'}
              selected={toolMode === 'create'}
              onClick={() => onToolModeChange(toolMode === 'create' ? 'off' : 'create')}
            >
              Add plane
            </Button>
            <Button
              variant={toolMode === 'delete' ? 'danger' : 'default'}
              selected={toolMode === 'delete'}
              onClick={() => onToolModeChange(toolMode === 'delete' ? 'off' : 'delete')}
            >
              Delete plane
            </Button>
          </ButtonGroup>

          {hint && <Status variant="info">{hint}</Status>}

          <Grid cols={3}>
            <Button size="sm" onClick={() => onCreateAxisPlane('X')}>X plane</Button>
            <Button size="sm" onClick={() => onCreateAxisPlane('Y')}>Y plane</Button>
            <Button size="sm" onClick={() => onCreateAxisPlane('Z')}>Z plane</Button>
          </Grid>

          <ButtonGroup stretch>
            <Button
              variant={sectionBoxActive ? 'primary' : 'default'}
              selected={sectionBoxActive}
              onClick={onCreateSectionBox}
            >
              {sectionBoxActive ? 'Reset section box' : 'Section box'}
            </Button>
            <Button variant="ghost" onClick={onClearSectionBox} disabled={!sectionBoxActive}>
              Clear box
            </Button>
          </ButtonGroup>

          <Button variant="danger" onClick={onClearAll} disabled={planeCount === 0}>
            Clear all
          </Button>
        </Stack>
      </div>

      <div className="toolbar-clipping-section">
        <Text variant="label" size="sm" as="div">Style</Text>
        <Stack gap="sm">
          <Slider
            label="Plane opacity"
            min={0}
            max={0.6}
            step={0.01}
            value={planeOpacity}
            onChange={(e) => onPlaneOpacityChange(clamp01(Number(e.target.value)))}
          />

          <Slider
            label="Plane size"
            min={1}
            max={50}
            step={0.5}
            value={planeSize}
            onChange={(e) => onPlaneSizeChange(Number(e.target.value))}
          />

          <Field label="Edges" row className="toolbar-clipping-color-field">
            <input
              type="color"
              className="toolbar-color-input"
              value={edgeColor}
              onChange={(e) => onEdgeColorChange(e.target.value)}
            />
            <Slider
              label="Width"
              min={1}
              max={5}
              step={1}
              value={edgeWidth}
              onChange={(e) => onEdgeWidthChange(Number(e.target.value))}
            />
          </Field>

          <Field label="Fill" row className="toolbar-clipping-color-field">
            <input
              type="color"
              className="toolbar-color-input"
              value={fillColor}
              onChange={(e) => onFillColorChange(e.target.value)}
            />
            <Slider
              label="Opacity"
              min={0}
              max={0.6}
              step={0.01}
              value={fillOpacity}
              onChange={(e) => onFillOpacityChange(clamp01(Number(e.target.value)))}
            />
          </Field>
        </Stack>
      </div>
    </div>
  );
};

