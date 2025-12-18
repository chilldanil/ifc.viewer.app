import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import * as OBCF from '@thatopen/components-front';
import { useBIM } from '../../context/BIMContext';
import { Input, Row, Select, Slider, Stack, Text, Toggle } from '../../ui';

type PostStyle =
  | 'custom'
  | 'basic'
  | 'pen'
  | 'shadowedPen'
  | 'colorPen'
  | 'colorShadows'
  | 'colorPenShadows';

type PassState = {
  enabled: boolean;
  gamma: boolean;
  custom: boolean;
  ao: boolean;
};

type EdgeState = {
  width: number;
  color: string;
  opacity: number;
  tolerance: number;
};

type GlossState = {
  enabled: boolean;
  exponent: number;
  min: number;
  max: number;
};

type AoState = {
  intensity: number;
  radius: number;
  samples: number;
};

type OutlineState = {
  enabled: boolean;
  color: string;
  thickness: number;
};

type StylePreset = {
  passes: Partial<PassState>;
  edges?: Partial<EdgeState>;
  gloss?: Partial<GlossState>;
  ao?: Partial<AoState>;
  outline?: Partial<OutlineState>;
};

const STYLE_PRESETS: Record<Exclude<PostStyle, 'custom'>, StylePreset> = {
  basic: {
    passes: { enabled: true, gamma: true, custom: false, ao: false },
  },
  pen: {
    passes: { enabled: true, gamma: true, custom: true, ao: false },
    edges: { width: 2, opacity: 0.65, tolerance: 2.5, color: '#e6e6e6' },
    gloss: { enabled: false },
  },
  shadowedPen: {
    passes: { enabled: true, gamma: true, custom: true, ao: true },
    edges: { width: 2, opacity: 0.6, tolerance: 2.5, color: '#e6e6e6' },
    gloss: { enabled: false },
    ao: { intensity: 4.5, radius: 1.2, samples: 16 },
  },
  colorPen: {
    passes: { enabled: true, gamma: true, custom: true, ao: false },
    edges: { width: 2, opacity: 0.7, tolerance: 2.3, color: '#b17bff' },
    gloss: { enabled: false },
  },
  colorShadows: {
    passes: { enabled: true, gamma: true, custom: false, ao: true },
    ao: { intensity: 4, radius: 1.4, samples: 16 },
  },
  colorPenShadows: {
    passes: { enabled: true, gamma: true, custom: true, ao: true },
    edges: { width: 2, opacity: 0.65, tolerance: 2.3, color: '#b17bff' },
    gloss: { enabled: false },
    ao: { intensity: 4, radius: 1.4, samples: 16 },
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const PostproductionToolbarMenu: React.FC = () => {
  const { world, components } = useBIM();

  const [style, setStyle] = useState<PostStyle>('custom');

  const [passes, setPasses] = useState<PassState>({
    enabled: false,
    gamma: true,
    custom: true,
    ao: true,
  });

  const [edges, setEdges] = useState<EdgeState>({
    width: 1,
    color: '#999999',
    opacity: 0.4,
    tolerance: 3,
  });

  const [gloss, setGloss] = useState<GlossState>({
    enabled: true,
    exponent: 1.9,
    min: -0.1,
    max: 0.1,
  });

  const [ao, setAo] = useState<AoState>({
    intensity: 4,
    radius: 1,
    samples: 16,
  });

  const [outline, setOutline] = useState<OutlineState>({
    enabled: false,
    color: '#bcf124',
    thickness: 6,
  });

  const selectionOutlineMaterialRef = useRef(
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#bcf124'),
      transparent: true,
      opacity: 0.6,
    })
  );

  const getPostproduction = useCallback(() => {
    const renderer = world?.renderer as any;
    if (!renderer) {
      return null;
    }
    try {
      return renderer.postproduction as any;
    } catch {
      return null;
    }
  }, [world]);

  const requestRender = useCallback(() => {
    try {
      (world?.renderer as any)?.update?.();
    } catch {
      /* ignore */
    }
  }, [world]);

  const syncFromWorld = useCallback(() => {
    const pp = getPostproduction();
    if (!pp) {
      return;
    }

    try {
      setPasses((prev) => ({ ...prev, enabled: !!pp.enabled }));
    } catch {
      /* ignore */
    }

    try {
      const settings = pp.settings ?? {};
      setPasses((prev) => ({
        ...prev,
        gamma: settings.gamma ?? prev.gamma,
        custom: settings.custom ?? prev.custom,
        ao: settings.ao ?? prev.ao,
      }));
    } catch {
      /* ignore */
    }

    try {
      const effects = pp.customEffects as any;
      setEdges((prev) => ({
        ...prev,
        opacity: typeof effects.opacity === 'number' ? effects.opacity : prev.opacity,
        tolerance: typeof effects.tolerance === 'number' ? effects.tolerance : prev.tolerance,
      }));

      const lineColorValue = typeof effects.lineColor === 'number' ? effects.lineColor : null;
      if (typeof lineColorValue === 'number') {
        setEdges((prev) => ({ ...prev, color: `#${new THREE.Color(lineColorValue).getHexString()}` }));
      }

      const widthValue = (effects.fsQuad?.material as any)?.uniforms?.width?.value;
      if (typeof widthValue === 'number') {
        setEdges((prev) => ({ ...prev, width: clamp(Math.round(widthValue), 1, 6) }));
      }

      setGloss((prev) => ({
        ...prev,
        enabled: typeof effects.glossEnabled === 'boolean' ? effects.glossEnabled : prev.enabled,
        exponent: typeof effects.glossExponent === 'number' ? effects.glossExponent : prev.exponent,
        min: typeof effects.minGloss === 'number' ? effects.minGloss : prev.min,
        max: typeof effects.maxGloss === 'number' ? effects.maxGloss : prev.max,
      }));
    } catch {
      /* ignore */
    }

    try {
      const config = (pp.n8ao as any)?.configuration;
      if (config) {
        setAo((prev) => ({
          ...prev,
          intensity: typeof config.intensity === 'number' ? config.intensity : prev.intensity,
          radius: typeof config.aoRadius === 'number' ? config.aoRadius : prev.radius,
          samples: typeof config.aoSamples === 'number' ? config.aoSamples : prev.samples,
        }));
      }
    } catch {
      /* ignore */
    }
  }, [getPostproduction]);

  const applyPassState = useCallback((next: Partial<PassState>) => {
    const pp = getPostproduction();
    if (!pp) {
      return;
    }

    const merged = { ...passes, ...next };
    setPasses(merged);

    try {
      pp.enabled = merged.enabled;
    } catch (error) {
      console.warn('Failed to set postproduction enabled', error);
    }

    try {
      pp.setPasses({ gamma: merged.gamma, custom: merged.custom, ao: merged.ao });
    } catch (error) {
      console.warn('Failed to update postproduction passes', error);
    }

    requestRender();
  }, [getPostproduction, passes, requestRender]);

  const applyCustomEffects = useCallback((apply: (effects: any) => void) => {
    const pp = getPostproduction();
    if (!pp) {
      return;
    }
    try {
      apply(pp.customEffects);
    } catch (error) {
      console.warn('Failed to update custom effects', error);
    }
    requestRender();
  }, [getPostproduction, requestRender]);

  const applyAoConfig = useCallback((apply: (config: any) => void) => {
    const pp = getPostproduction();
    if (!pp) {
      return;
    }
    try {
      const config = (pp.n8ao as any)?.configuration;
      if (!config) {
        return;
      }
      apply(config);
    } catch (error) {
      console.warn('Failed to update AO settings', error);
    }
    requestRender();
  }, [getPostproduction, requestRender]);

  const ensureOutlinerStyle = useCallback(() => {
    if (!components || !world) {
      return null;
    }
    try {
      const outliner = components.get(OBCF.Outliner);
      outliner.world = world;
      try {
        outliner.create('selection', selectionOutlineMaterialRef.current);
      } catch {
        // style may already exist
      }
      return outliner;
    } catch (error) {
      console.warn('Failed to setup outliner', error);
      return null;
    }
  }, [components, world]);

  const applyOutlineState = useCallback((next: Partial<OutlineState>) => {
    const merged = { ...outline, ...next };
    setOutline(merged);
    setStyle('custom');

    // Outlines live inside the custom pass in this library version.
    if (merged.enabled) {
      applyPassState({ custom: true });
    }

    const outliner = ensureOutlinerStyle();
    if (!outliner) {
      return;
    }

    try {
      outliner.enabled = merged.enabled;
    } catch {
      /* ignore */
    }

    try {
      selectionOutlineMaterialRef.current.color = new THREE.Color(merged.color);
      selectionOutlineMaterialRef.current.opacity = clamp(merged.thickness / 10, 0.1, 1);
      selectionOutlineMaterialRef.current.needsUpdate = true;
    } catch {
      /* ignore */
    }

    if (!merged.enabled) {
      try {
        outliner.clear('selection');
      } catch {
        /* ignore */
      }
    }

    requestRender();
  }, [applyPassState, ensureOutlinerStyle, outline, requestRender]);

  const applyStylePreset = useCallback((nextStyle: PostStyle) => {
    setStyle(nextStyle);
    if (nextStyle === 'custom') {
      return;
    }

    const preset = STYLE_PRESETS[nextStyle];
    if (!preset) {
      return;
    }

    applyPassState(preset.passes);

    if (preset.edges) {
      setEdges((prev) => ({ ...prev, ...preset.edges }));
      const nextEdges = { ...edges, ...preset.edges };
      applyCustomEffects((effects) => {
        if (typeof nextEdges.opacity === 'number') effects.opacity = nextEdges.opacity;
        if (typeof nextEdges.tolerance === 'number') effects.tolerance = nextEdges.tolerance;
        const lineHex = parseInt(nextEdges.color.replace('#', ''), 16);
        if (!Number.isNaN(lineHex)) effects.lineColor = lineHex;
        const uniform = (effects.fsQuad?.material as any)?.uniforms?.width;
        if (uniform) uniform.value = clamp(Math.round(nextEdges.width), 1, 6);
      });
    }

    if (preset.gloss) {
      setGloss((prev) => ({ ...prev, ...preset.gloss }));
      const nextGloss = { ...gloss, ...preset.gloss };
      applyCustomEffects((effects) => {
        if (typeof nextGloss.enabled === 'boolean') effects.glossEnabled = nextGloss.enabled;
        if (typeof nextGloss.exponent === 'number') effects.glossExponent = nextGloss.exponent;
        if (typeof nextGloss.min === 'number') effects.minGloss = nextGloss.min;
        if (typeof nextGloss.max === 'number') effects.maxGloss = nextGloss.max;
      });
    }

    if (preset.ao) {
      setAo((prev) => ({ ...prev, ...preset.ao }));
      const nextAo = { ...ao, ...preset.ao };
      applyAoConfig((config) => {
        if (typeof nextAo.intensity === 'number') config.intensity = nextAo.intensity;
        if (typeof nextAo.radius === 'number') config.aoRadius = nextAo.radius;
        if (typeof nextAo.samples === 'number') config.aoSamples = nextAo.samples;
      });
    }

    if (preset.outline) {
      applyOutlineState(preset.outline);
    }
  }, [applyAoConfig, applyCustomEffects, applyOutlineState, applyPassState, ao, edges, gloss]);

  // Keep UI in sync when world changes.
  useEffect(() => {
    syncFromWorld();
  }, [syncFromWorld]);

  useEffect(() => {
    if (outline.enabled && (!passes.enabled || !passes.custom)) {
      applyOutlineState({ enabled: false });
    }
  }, [applyOutlineState, outline.enabled, passes.custom, passes.enabled]);

  // Keep selection outlines synced with current selection.
  useEffect(() => {
    if (!components || !world) {
      return;
    }

    let cleanup: (() => void) | undefined;
    let retryCount = 0;
    const maxRetries = 20;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const setup = () => {
      try {
        const highlighter = components.get(OBCF.Highlighter) as any;
        const selectEvents = highlighter?.events?.select;
        if (!selectEvents?.onHighlight || !selectEvents?.onClear) {
          retryCount += 1;
          if (retryCount < maxRetries) {
            timeout = setTimeout(setup, 100);
          }
          return;
        }

        const outliner = ensureOutlinerStyle();
        if (!outliner) {
          return;
        }

        const handleHighlight = (fragmentIdMap: any) => {
          if (!outline.enabled) {
            return;
          }
          try {
            outliner.clear('selection');
            outliner.add('selection', fragmentIdMap);
          } catch {
            /* ignore */
          }
          requestRender();
        };

        const handleClear = () => {
          try {
            outliner.clear('selection');
          } catch {
            /* ignore */
          }
          requestRender();
        };

        selectEvents.onHighlight.add(handleHighlight);
        selectEvents.onClear.add(handleClear);

        const initial = highlighter?.selection?.select;
        if (initial) {
          handleHighlight(initial);
        }

        cleanup = () => {
          selectEvents.onHighlight.remove(handleHighlight);
          selectEvents.onClear.remove(handleClear);
        };
      } catch {
        retryCount += 1;
        if (retryCount < maxRetries) {
          timeout = setTimeout(setup, 100);
        }
      }
    };

    setup();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      cleanup?.();
    };
  }, [components, world, ensureOutlinerStyle, outline.enabled, requestRender]);

  const styleOptions = useMemo(
    () => [
      { value: 'custom', label: 'Custom' },
      { value: 'basic', label: 'Basic' },
      { value: 'pen', label: 'Pen' },
      { value: 'shadowedPen', label: 'Shadowed Pen' },
      { value: 'colorPen', label: 'Color Pen' },
      { value: 'colorShadows', label: 'Color Shadows' },
      { value: 'colorPenShadows', label: 'Color Pen Shadows' },
    ],
    []
  );

  const postFxAvailable = !!getPostproduction();

  return (
    <div className="toolbar-post-menu">
      <div className="toolbar-post-section">
        <Text variant="label" size="sm" as="div">General</Text>
        <Stack gap="sm">
          <Toggle
            checked={passes.enabled}
            onChange={(value) => {
              setStyle('custom');
              applyPassState({ enabled: value });
            }}
            label="Postproduction enabled"
            disabled={!postFxAvailable}
          />

          <Select
            label="Postproduction style"
            value={style}
            disabled={!postFxAvailable}
            options={styleOptions}
            onChange={(e) => applyStylePreset(e.target.value as PostStyle)}
          />

          <Row stretch>
            <Toggle
              checked={passes.gamma}
              onChange={(value) => {
                setStyle('custom');
                applyPassState({ gamma: value });
              }}
              label="Gamma"
              disabled={!postFxAvailable || !passes.enabled}
            />
            <Toggle
              checked={passes.custom}
              onChange={(value) => {
                setStyle('custom');
                applyPassState({ custom: value });
              }}
              label="Edges/Gloss"
              disabled={!postFxAvailable || !passes.enabled}
            />
            <Toggle
              checked={passes.ao}
              onChange={(value) => {
                setStyle('custom');
                applyPassState({ ao: value });
              }}
              label="AO"
              disabled={!postFxAvailable || !passes.enabled}
            />
          </Row>
        </Stack>
      </div>

      <div className="toolbar-post-section">
        <Row between>
          <Text variant="label" size="sm" as="div">Outlines</Text>
          <Toggle
            checked={outline.enabled}
            onChange={(value) => applyOutlineState({ enabled: value })}
            label="Enabled"
            disabled={!postFxAvailable || !passes.enabled}
          />
        </Row>
        <Stack gap="sm">
          <Stack gap="sm" className="toolbar-world-field">
            <Text variant="muted" size="sm">Outline color</Text>
            <Input
              type="color"
              value={outline.color}
              disabled={!postFxAvailable || !passes.enabled || !outline.enabled}
              onChange={(e) => applyOutlineState({ color: e.target.value })}
            />
          </Stack>
          <Slider
            label="Thickness"
            min={1}
            max={10}
            step={1}
            value={outline.thickness}
            disabled={!postFxAvailable || !passes.enabled || !outline.enabled}
            onChange={(e) => applyOutlineState({ thickness: parseFloat(e.target.value) })}
            formatValue={(v) => `${Math.round(v)}`}
          />
          <Text variant="subtle" size="sm">
            Outlines are applied to the current selection.
          </Text>
        </Stack>
      </div>

      <div className="toolbar-post-section">
        <Text variant="label" size="sm" as="div">Edges</Text>
        <Stack gap="sm">
          <Row stretch>
            <Slider
              label="Width"
              min={1}
              max={3}
              step={1}
              value={edges.width}
              disabled={!postFxAvailable || !passes.enabled || !passes.custom}
              onChange={(e) => {
                setStyle('custom');
                const next = parseFloat(e.target.value);
                setEdges((prev) => ({ ...prev, width: next }));
                applyCustomEffects((effects) => {
                  const uniform = (effects.fsQuad?.material as any)?.uniforms?.width;
                  if (uniform) uniform.value = clamp(Math.round(next), 1, 6);
                });
              }}
              formatValue={(v) => `${Math.round(v)}`}
            />
          </Row>

          <Slider
            label="Opacity"
            min={0}
            max={1}
            step={0.05}
            value={edges.opacity}
            disabled={!postFxAvailable || !passes.enabled || !passes.custom}
            onChange={(e) => {
              setStyle('custom');
              const next = parseFloat(e.target.value);
              setEdges((prev) => ({ ...prev, opacity: next }));
              applyCustomEffects((effects) => {
                effects.opacity = next;
              });
            }}
            formatValue={(v) => v.toFixed(2)}
          />

          <Slider
            label="Tolerance"
            min={1}
            max={12}
            step={0.5}
            value={edges.tolerance}
            disabled={!postFxAvailable || !passes.enabled || !passes.custom}
            onChange={(e) => {
              setStyle('custom');
              const next = parseFloat(e.target.value);
              setEdges((prev) => ({ ...prev, tolerance: next }));
              applyCustomEffects((effects) => {
                effects.tolerance = next;
              });
            }}
            formatValue={(v) => v.toFixed(1)}
          />

          <Stack gap="sm" className="toolbar-world-field">
            <Text variant="muted" size="sm">Edges color</Text>
            <Input
              type="color"
              value={edges.color}
              disabled={!postFxAvailable || !passes.enabled || !passes.custom}
              onChange={(e) => {
                setStyle('custom');
                const value = e.target.value;
                setEdges((prev) => ({ ...prev, color: value }));
                const hex = parseInt(value.replace('#', ''), 16);
                if (!Number.isNaN(hex)) {
                  applyCustomEffects((effects) => {
                    effects.lineColor = hex;
                  });
                }
              }}
            />
          </Stack>
        </Stack>
      </div>

      <div className="toolbar-post-section">
        <Row between>
          <Text variant="label" size="sm" as="div">Gloss</Text>
          <Toggle
            checked={gloss.enabled}
            onChange={(value) => {
              setStyle('custom');
              setGloss((prev) => ({ ...prev, enabled: value }));
              applyCustomEffects((effects) => { effects.glossEnabled = value; });
            }}
            label="Enabled"
            disabled={!postFxAvailable || !passes.enabled || !passes.custom}
          />
        </Row>
        <Stack gap="sm">
          <Slider
            label="Exponent"
            min={0.2}
            max={5}
            step={0.1}
            value={gloss.exponent}
            disabled={!postFxAvailable || !passes.enabled || !passes.custom || !gloss.enabled}
            onChange={(e) => {
              setStyle('custom');
              const next = parseFloat(e.target.value);
              setGloss((prev) => ({ ...prev, exponent: next }));
              applyCustomEffects((effects) => { effects.glossExponent = next; });
            }}
            formatValue={(v) => v.toFixed(1)}
          />
          <Row stretch>
            <Slider
              label="Min"
              min={-1}
              max={0}
              step={0.05}
              value={gloss.min}
              disabled={!postFxAvailable || !passes.enabled || !passes.custom || !gloss.enabled}
              onChange={(e) => {
                setStyle('custom');
                const next = parseFloat(e.target.value);
                setGloss((prev) => ({ ...prev, min: next }));
                applyCustomEffects((effects) => { effects.minGloss = next; });
              }}
              formatValue={(v) => v.toFixed(2)}
            />
            <Slider
              label="Max"
              min={0}
              max={1}
              step={0.05}
              value={gloss.max}
              disabled={!postFxAvailable || !passes.enabled || !passes.custom || !gloss.enabled}
              onChange={(e) => {
                setStyle('custom');
                const next = parseFloat(e.target.value);
                setGloss((prev) => ({ ...prev, max: next }));
                applyCustomEffects((effects) => { effects.maxGloss = next; });
              }}
              formatValue={(v) => v.toFixed(2)}
            />
          </Row>
        </Stack>
      </div>

      <div className="toolbar-post-section">
        <Text variant="label" size="sm" as="div">Ambient Occlusion</Text>
        <Stack gap="sm">
          <Slider
            label="Intensity"
            min={0}
            max={10}
            step={0.25}
            value={ao.intensity}
            disabled={!postFxAvailable || !passes.enabled || !passes.ao}
            onChange={(e) => {
              setStyle('custom');
              const next = parseFloat(e.target.value);
              setAo((prev) => ({ ...prev, intensity: next }));
              applyAoConfig((config) => { config.intensity = next; });
            }}
            formatValue={(v) => v.toFixed(2)}
          />
          <Row stretch>
            <Slider
              label="Radius"
              min={0.1}
              max={5}
              step={0.1}
              value={ao.radius}
              disabled={!postFxAvailable || !passes.enabled || !passes.ao}
              onChange={(e) => {
                setStyle('custom');
                const next = parseFloat(e.target.value);
                setAo((prev) => ({ ...prev, radius: next }));
                applyAoConfig((config) => { config.aoRadius = next; });
              }}
              formatValue={(v) => v.toFixed(1)}
            />
            <Slider
              label="Samples"
              min={4}
              max={32}
              step={1}
              value={ao.samples}
              disabled={!postFxAvailable || !passes.enabled || !passes.ao}
              onChange={(e) => {
                setStyle('custom');
                const next = parseInt(e.target.value, 10);
                setAo((prev) => ({ ...prev, samples: next }));
                applyAoConfig((config) => { config.aoSamples = next; });
              }}
              formatValue={(v) => `${Math.round(v)}`}
            />
          </Row>
        </Stack>
      </div>
    </div>
  );
};

export default PostproductionToolbarMenu;
