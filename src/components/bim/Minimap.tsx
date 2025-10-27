import React, { useEffect, useRef } from 'react';
import * as OBC from '@thatopen/components';
import { useBIM } from '../../context/BIMContext';
import { ErrorType, handleBIMError, withErrorHandling } from '../../utils/errorHandler';
import './Minimap.css';

export interface MinimapConfig {
  enabled: boolean;
  visible: boolean;
  lockRotation: boolean;
  zoom: number;
  frontOffset: number;
  sizeX: number;
  sizeY: number;
}

export interface MinimapProps {
  config: MinimapConfig;
  onConfigChange: (config: Partial<MinimapConfig>) => void;
}

export const Minimap: React.FC<MinimapProps> = ({ config }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<OBC.MiniMap | null>(null);
  const mapsRef = useRef<OBC.MiniMaps | null>(null);
  const isInitializedRef = useRef(false);
  const { components, world } = useBIM();

  useEffect(() => {
    if (!components || !world || !containerRef.current || isInitializedRef.current) {
      return;
    }

    // Add delay to ensure world is fully stabilized
    const timeoutId = setTimeout(() => {
      if (isInitializedRef.current) {return;} // Check again after delay

      const initializeMinimap = async () => {
        return withErrorHandling(async () => {
          // Comprehensive world validation
          if (!world || !world.scene || !world.renderer || !world.camera) {
            console.warn('World not fully ready for minimap initialization, retrying...');
            return;
          }

          // Validate the three.js scene exists
          if (!world.scene.three) {
            console.warn('Three.js scene not initialized, retrying...');
            return;
          }

          // Additional check for renderer DOM element
          if (!world.renderer.three || !world.renderer.three.domElement) {
            console.warn('Renderer not fully initialized, retrying...');
            return;
          }

          try {
            // Get the minimap component (don't create new instance)
            const maps = components.get(OBC.MiniMaps);
            const map = maps.create(world);
            
            // Store references
            mapsRef.current = maps;
            minimapRef.current = map;

            // Add error handling for the minimap update method
            const originalUpdate = map.update.bind(map);
            map.update = () => {
              try {
                return originalUpdate();
              } catch (error: any) {
                if (error.message && error.message.includes('toArray is not a function')) {
                  console.warn('MiniMap update error caught and handled:', error);
                  // Skip this update cycle
                  return;
                }
                throw error;
              }
            };
            
            // Configure the minimap
            map.enabled = config.enabled;
            map.config.visible = config.visible;
            map.config.lockRotation = config.lockRotation;
            map.config.zoom = config.zoom;
            map.config.frontOffset = config.frontOffset;
            map.config.sizeX = config.sizeX;
            map.config.sizeY = config.sizeY;

            // Get the canvas and style it
            const canvas = map.renderer.domElement;
            canvas.style.borderRadius = '12px';
            canvas.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
            
            // Clear any existing content and append the canvas
            if (containerRef.current) {
              containerRef.current.innerHTML = '';
              containerRef.current.appendChild(canvas);
              map.resize();
            }

            isInitializedRef.current = true;
            console.log('Minimap initialized successfully');
          } catch (error) {
            console.warn('Minimap initialization failed, will retry:', error);
            // Don't mark as initialized so it can retry
          }
        }, ErrorType.COMPONENT_ERROR, 'Minimap');
      };

      initializeMinimap().catch((error) => {
        handleBIMError(
          ErrorType.COMPONENT_ERROR,
          `Failed to initialize minimap: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { error },
          'Minimap'
        );
      });
    }, 800); // Increased delay to 800ms for better world stability

    return () => {
      clearTimeout(timeoutId);
      // Cleanup
      if (minimapRef.current && mapsRef.current) {
        try {
          // Dispose the minimap properly
          if (typeof minimapRef.current.dispose === 'function') {
            minimapRef.current.dispose();
          }
        } catch (error) {
          console.warn('Error disposing minimap:', error);
        }
      }
      isInitializedRef.current = false;
      minimapRef.current = null;
      mapsRef.current = null;
    };
  }, [components, world]);

  // Update minimap config when props change
  useEffect(() => {
    if (!minimapRef.current) {return;}

    const map = minimapRef.current;
    map.enabled = config.enabled;
    map.config.visible = config.visible;
    map.config.lockRotation = config.lockRotation;
    map.config.zoom = config.zoom;
    map.config.frontOffset = config.frontOffset;
    map.config.sizeX = config.sizeX;
    map.config.sizeY = config.sizeY;
    
    // Trigger resize to apply size changes
    map.resize();
  }, [config]);

  return (
    <div 
      ref={containerRef}
      className={`minimap-container ${config.visible ? 'visible' : 'hidden'}`}
      style={{
        width: `${config.sizeX}px`,
        height: `${config.sizeY}px`,
      }}
    />
  );
}; 