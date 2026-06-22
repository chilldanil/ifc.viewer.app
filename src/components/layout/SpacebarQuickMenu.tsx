import React, { useEffect, useRef, useState } from 'react';
import './SpacebarQuickMenu.css';

export interface QuickMenuLeaf {
  type: 'leaf';
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  onActivate: () => void;
  active?: boolean;
  disabled?: boolean;
}

export interface QuickMenuPreview {
  type: 'preview';
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  onActivate: () => void;
  disabled?: boolean;
}

export interface QuickMenuBranch {
  type: 'branch';
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  disabled?: boolean;
  children: QuickMenuLeaf[];
}

export type QuickMenuTopSegment = QuickMenuLeaf | QuickMenuPreview | QuickMenuBranch;

export interface SpacebarQuickMenuProps {
  /** Exactly four top-level segments, in screen order [top, right, bottom, left]. */
  segments: [QuickMenuTopSegment, QuickMenuTopSegment, QuickMenuTopSegment, QuickMenuTopSegment];
  disabled?: boolean;
}

const RING1_INNER = 44;
const RING1_OUTER = 120;
const RING2_INNER = 180;
const RING2_OUTER = 270;
const DEADZONE_RADIUS = 32;
// Wide dead-band between the rings so hovering near either edge doesn't flicker
// between levels: you must commit well past ring1 to drill in, and back well
// inside it to pop out.
const DRILL_IN_DISTANCE = 160;
const DRILL_OUT_DISTANCE = 100;
const WEDGE_GAP_DEG = 4;

// Screen-space angles: 0 = right, 90 = down, 180 = left, 270 = up (clockwise, matches DOM y-down).
const RING1_CENTER_ANGLES = [270, 0, 90, 180] as const; // top, right, bottom, left

const toRad = (deg: number) => (deg * Math.PI) / 180;

const pointOnCircle = (radius: number, angleDeg: number) => ({
  x: radius * Math.cos(toRad(angleDeg)),
  y: radius * Math.sin(toRad(angleDeg)),
});

const describeWedge = (centerAngle: number, outerR: number, innerR: number, halfSpanDeg: number, gapDeg: number) => {
  const start = centerAngle - halfSpanDeg + gapDeg / 2;
  const end = centerAngle + halfSpanDeg - gapDeg / 2;
  const outerStart = pointOnCircle(outerR, start);
  const outerEnd = pointOnCircle(outerR, end);
  const innerEnd = pointOnCircle(innerR, end);
  const innerStart = pointOnCircle(innerR, start);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 0 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
};

const normalizeAngle = (deg: number) => ((deg % 360) + 360) % 360;

const circularDiff = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

const angleToIndex = (angleDeg: number, centerAngles: readonly number[]): number => {
  const a = normalizeAngle(angleDeg);
  let bestIndex = 0;
  let bestDiff = Infinity;
  centerAngles.forEach((center, index) => {
    const diff = circularDiff(a, center);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = index;
    }
  });
  return bestIndex;
};

const childCenterAngles = (count: number): number[] =>
  Array.from({ length: count }, (_, i) => normalizeAngle(270 + (360 / count) * i));

const isTypingTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  return Boolean(
    el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
  );
};

interface PointerState {
  level: 1 | 2;
  branchIndex: number | null; // top-level index we've drilled into, when level === 2
  highlightedIndex: number | null; // index within the active level/ring
}

const IDLE_POINTER_STATE: PointerState = { level: 1, branchIndex: null, highlightedIndex: null };

export const SpacebarQuickMenu: React.FC<SpacebarQuickMenuProps> = ({ segments, disabled }) => {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [pointerState, setPointerState] = useState<PointerState>(IDLE_POINTER_STATE);

  const openRef = useRef(false);
  const originRef = useRef({ x: 0, y: 0 });
  const pointerStateRef = useRef<PointerState>(IDLE_POINTER_STATE);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  const updatePointerState = (next: PointerState) => {
    pointerStateRef.current = next;
    setPointerState(next);
  };

  const cancel = () => {
    if (!openRef.current) {return;}
    openRef.current = false;
    setOpen(false);
    updatePointerState(IDLE_POINTER_STATE);
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mousePositionRef.current = { x: event.clientX, y: event.clientY };
      if (!openRef.current) {return;}

      const dx = event.clientX - originRef.current.x;
      const dy = event.clientY - originRef.current.y;
      const distance = Math.hypot(dx, dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const current = pointerStateRef.current;

      if (current.level === 2) {
        // Drop back out to the top ring only once well back inside it, so jitter near
        // the boundary doesn't flicker between levels.
        if (distance < DRILL_OUT_DISTANCE) {
          updatePointerState({ level: 1, branchIndex: null, highlightedIndex: angleToIndex(angle, RING1_CENTER_ANGLES) });
          return;
        }

        const branch = segmentsRef.current[current.branchIndex as number];
        const childCount = branch?.type === 'branch' ? branch.children.length : 0;
        const index = childCount > 0 ? angleToIndex(angle, childCenterAngles(childCount)) : null;
        updatePointerState({ ...current, highlightedIndex: index });
        return;
      }

      // level === 1
      if (distance < DEADZONE_RADIUS) {
        updatePointerState({ level: 1, branchIndex: null, highlightedIndex: null });
        return;
      }

      const topIndex = angleToIndex(angle, RING1_CENTER_ANGLES);
      const topSegment = segmentsRef.current[topIndex];

      if (topSegment.type === 'branch' && !topSegment.disabled && distance > DRILL_IN_DISTANCE) {
        updatePointerState({ level: 2, branchIndex: topIndex, highlightedIndex: null });
        return;
      }

      updatePointerState({ level: 1, branchIndex: null, highlightedIndex: topIndex });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        cancel();
        return;
      }

      if (event.code !== 'Space' || event.repeat || openRef.current) {return;}
      if (disabled || isTypingTarget(event.target)) {return;}
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {return;}

      event.preventDefault();
      originRef.current = { ...mousePositionRef.current };
      setOrigin(originRef.current);
      openRef.current = true;
      setOpen(true);
      updatePointerState(IDLE_POINTER_STATE);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || !openRef.current) {return;}

      const state = pointerStateRef.current;
      openRef.current = false;
      setOpen(false);
      updatePointerState(IDLE_POINTER_STATE);

      if (state.level === 2 && state.branchIndex !== null && state.highlightedIndex !== null) {
        const branch = segmentsRef.current[state.branchIndex];
        if (branch?.type === 'branch') {
          const child = branch.children[state.highlightedIndex];
          if (child && !child.disabled) {
            child.onActivate();
          }
        }
        return;
      }

      if (state.level === 1 && state.highlightedIndex !== null) {
        const segment = segmentsRef.current[state.highlightedIndex];
        if ((segment.type === 'leaf' || segment.type === 'preview') && !segment.disabled) {
          segment.onActivate();
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', cancel);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', cancel);
    };
  }, [disabled]);

  if (!open) {return null;}

  const drilledBranch = pointerState.level === 2 && pointerState.branchIndex !== null
    ? segments[pointerState.branchIndex]
    : null;
  const children = drilledBranch?.type === 'branch' ? drilledBranch.children : [];
  const childAngles = children.length > 0 ? childCenterAngles(children.length) : [];

  let hubLabel = 'Quick Menu';
  let hubHint = 'Move to pick';
  let hubMuted = true;

  if (pointerState.level === 2 && drilledBranch) {
    if (pointerState.highlightedIndex !== null && children[pointerState.highlightedIndex]) {
      const child = children[pointerState.highlightedIndex];
      hubLabel = child.label;
      hubHint = child.disabled ? `${child.hint} (unavailable)` : child.hint;
      hubMuted = Boolean(child.disabled);
    } else {
      hubLabel = drilledBranch.label;
      hubHint = 'Choose an option';
      hubMuted = true;
    }
  } else if (pointerState.level === 1 && pointerState.highlightedIndex !== null) {
    const segment = segments[pointerState.highlightedIndex];
    hubLabel = segment.label;
    hubHint = segment.type === 'branch'
      ? 'Move further out'
      : segment.disabled ? `${segment.hint} (unavailable)` : segment.hint;
    hubMuted = Boolean(segment.disabled);
  }

  return (
    <div className="quick-menu-overlay">
      <div className="quick-menu-wheel" style={{ left: origin.x, top: origin.y }}>
        <svg className="quick-menu-svg" viewBox="-320 -320 640 640" width={640} height={640}>
          {segments.map((segment, index) => {
            const isDrilled = pointerState.level === 2 && pointerState.branchIndex === index;
            return (
              <path
                key={segment.id}
                d={describeWedge(RING1_CENTER_ANGLES[index], RING1_OUTER, RING1_INNER, 180 / segments.length, WEDGE_GAP_DEG)}
                className={[
                  'quick-menu-wedge',
                  'quick-menu-wedge--ring1',
                  pointerState.level === 1 && pointerState.highlightedIndex === index && 'quick-menu-wedge--active',
                  isDrilled && 'quick-menu-wedge--drilled',
                  segment.disabled && 'quick-menu-wedge--disabled',
                ].filter(Boolean).join(' ')}
              />
            );
          })}

          {children.map((child, index) => (
            <path
              key={child.id}
              d={describeWedge(childAngles[index], RING2_OUTER, RING2_INNER, 180 / children.length, WEDGE_GAP_DEG)}
              className={[
                'quick-menu-wedge',
                'quick-menu-wedge--ring2',
                pointerState.highlightedIndex === index && 'quick-menu-wedge--active',
                child.disabled && 'quick-menu-wedge--disabled',
              ].filter(Boolean).join(' ')}
            />
          ))}
        </svg>

        {pointerState.level === 1 && segments.map((segment, index) => {
          const center = pointOnCircle((RING1_OUTER + RING1_INNER) / 2, RING1_CENTER_ANGLES[index]);
          return (
            <div
              key={segment.id}
              className={[
                'quick-menu-item',
                pointerState.highlightedIndex === index && 'quick-menu-item--active',
                segment.disabled && 'quick-menu-item--disabled',
              ].filter(Boolean).join(' ')}
              style={{ left: `calc(50% + ${center.x}px)`, top: `calc(50% + ${center.y}px)` }}
            >
              <span className="quick-menu-item-icon">{segment.icon}</span>
              <span className="quick-menu-item-label">{segment.label}</span>
              {segment.type === 'branch' && <span className="quick-menu-item-caret">›</span>}
            </div>
          );
        })}

        {pointerState.level === 2 && children.map((child, index) => {
          const center = pointOnCircle((RING2_OUTER + RING2_INNER) / 2, childAngles[index]);
          return (
            <div
              key={child.id}
              className={[
                'quick-menu-item',
                'quick-menu-item--child',
                pointerState.highlightedIndex === index && 'quick-menu-item--active',
                child.disabled && 'quick-menu-item--disabled',
              ].filter(Boolean).join(' ')}
              style={{ left: `calc(50% + ${center.x}px)`, top: `calc(50% + ${center.y}px)` }}
            >
              <span className="quick-menu-item-icon">{child.icon}</span>
              <span className="quick-menu-item-label">{child.label}</span>
              {child.active && <span className="quick-menu-item-dot" />}
            </div>
          );
        })}

        <div className={['quick-menu-hub', hubMuted && 'quick-menu-hub--muted'].filter(Boolean).join(' ')}>
          <div className="quick-menu-hub-label">{hubLabel}</div>
          <div className="quick-menu-hub-hint">{hubHint}</div>
        </div>
      </div>
    </div>
  );
};

export default SpacebarQuickMenu;
