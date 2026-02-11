import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getElectronAPI, isElectron } from '../../utils/electronUtils';
import { SecondaryViewport } from '../bim/SecondaryViewport';
import type { MultiViewPreset } from '../../context/BIMContext';
import './StartPage.css';

type DirEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  isIfc: boolean;
};

type StartPageProps = {
  onOpenIfcPath: (path: string) => void;
  isBusy?: boolean;
  onEnterViewer?: () => void;
  canEnter?: boolean;
  previewPreset?: MultiViewPreset;
  loadedModelName?: string | null;
  skipStartPage?: boolean;
  onSkipStartPageChange?: (skip: boolean) => void;
};

export const StartPage: React.FC<StartPageProps> = ({
  onOpenIfcPath,
  isBusy = false,
  onEnterViewer,
  canEnter = false,
  previewPreset = 'single',
  loadedModelName = null,
  skipStartPage = false,
  onSkipStartPageChange,
}) => {
  const [rootPath, setRootPath] = useState<string>('');
  const [parentPath, setParentPath] = useState<string>('');
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<'unknown' | 'ok' | 'node' | 'missing' | 'error'>('unknown');

  // Detect Electron more defensively (userAgent + bridge)
  const electronAPI = (window as any).electronAPI ?? getElectronAPI();
  const isElectronEnv = isElectron();
  const isDesktop = bridgeStatus === 'ok' || bridgeStatus === 'node';

  // Fallback: use Node integration (when enabled) if the bridge is missing
  const nodeFallback = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const req = (window as any).require as any;
      if (!req) return null;
      const fs = req('fs');
      const path = req('path');
      const os = req('os');
      return {
        listDir: async (dirPath?: string) => {
          const target = dirPath ? path.resolve(dirPath) : os.homedir();
      const entries = await fs.promises.readdir(target, { withFileTypes: true });
      const filtered = entries
            .filter((entry: any) => (entry.isDirectory() || entry.name.toLowerCase().endsWith('.ifc')) && !entry.name.startsWith('.'))
            .map((entry: any) => ({
              name: entry.name,
              path: path.join(target, entry.name),
              isDirectory: entry.isDirectory(),
              isIfc: entry.isFile?.() && entry.name.toLowerCase().endsWith('.ifc'),
            }))
            .sort((a: DirEntry, b: DirEntry) => {
              if (a.isDirectory && !b.isDirectory) return -1;
              if (!a.isDirectory && b.isDirectory) return 1;
              return a.name.localeCompare(b.name);
            });
          return {
            path: target,
            parent: path.dirname(target),
            entries: filtered as DirEntry[],
          };
        },
      };
    } catch {
      return null;
    }
  }, []);

  const loadDirectory = useCallback(async (dirPath?: string) => {
    const listDir =
      electronAPI?.listDir ??
      nodeFallback?.listDir;

    if (!listDir) {
      setBridgeStatus('missing');
      setError('Electron bridge not available. Rebuild the desktop app to refresh preload.js.');
      return;
    }
    setLoading(true);
    try {
      const result = await listDir(dirPath);
      const resolvedPath = result.path || dirPath || '';
      const visibleEntries = (result.entries ?? []).filter((e: DirEntry) => !e.name.startsWith('.'));
      visibleEntries.sort((a: DirEntry, b: DirEntry) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });

      setRootPath(resolvedPath);
      setParentPath(result.parent ?? '');
      setEntries(visibleEntries);
      setError(result.error ?? null);
      setBridgeStatus(electronAPI?.listDir ? 'ok' : 'node');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to read directory');
      setBridgeStatus('error');
    } finally {
      setLoading(false);
    }
  }, [electronAPI, nodeFallback]);

  useEffect(() => {
    const tryDetect = async () => {
      const canList = electronAPI?.listDir || nodeFallback?.listDir;
      if (!isElectronEnv || !canList) {
        setBridgeStatus('missing');
        setError('Desktop-style browsing is available in the Electron app. Drag & drop an IFC file to start.');
        return;
      }
      await loadDirectory();
    };
    void tryDetect();
  }, [electronAPI, isElectronEnv, nodeFallback, loadDirectory]);

  const toggleDir = async (entry: DirEntry) => {
    if (!entry.isDirectory) return;
    await loadDirectory(entry.path);
  };

  const breadcrumbs = useMemo(() => {
    if (!rootPath) return [];
    return rootPath.split(/[\\/]+/).filter(Boolean);
  }, [rootPath]);

  return (
    <div className="start-page">
      <div className="start-page__panel">
        <div className="start-page__header">
          <h3 className="start-page__title">Browse IFC Files</h3>
          <div className="start-page__actions">
            {isDesktop && parentPath && (
              <button
                className="start-page__button start-page__button--ghost"
                onClick={() => loadDirectory(parentPath)}
                disabled={loading}
              >
                Up
              </button>
            )}
            {onEnterViewer && (
              <button
                className="start-page__button start-page__button--accent"
                onClick={onEnterViewer}
                disabled={!canEnter}
              >
                Enter Viewer
              </button>
            )}
          </div>
        </div>
        <div className="start-page__body">
          {loadedModelName && (
            <div className="start-page__loaded">
              <div>
                <div className="start-page__loaded-title">Model loaded</div>
                <div className="start-page__loaded-name">{loadedModelName}</div>
              </div>
              {onEnterViewer && (
                <button
                  className="start-page__button start-page__button--accent"
                  onClick={onEnterViewer}
                  disabled={isBusy}
                >
                  Use this model
                </button>
              )}
            </div>
          )}
          <div className="start-page__status">
            <span className={`start-page__pill start-page__pill--${bridgeStatus}`}>
              {bridgeStatus === 'ok' && 'Electron bridge detected'}
              {bridgeStatus === 'node' && 'Node fallback active'}
              {bridgeStatus === 'missing' && 'No Electron bridge'}
              {bridgeStatus === 'error' && 'Bridge error'}
              {bridgeStatus === 'unknown' && 'Detecting environment...'}
            </span>
          </div>
          {rootPath && (
            <div className="start-page__breadcrumbs">
              {breadcrumbs.map((segment, idx) => (
                <React.Fragment key={`${segment}-${idx}`}>
                  {idx > 0 && <span>/</span>}
                  <span>{segment}</span>
                </React.Fragment>
              ))}
            </div>
          )}

          <div className="start-page__skip">
            <label className="start-page__toggle">
              <input
                type="checkbox"
                checked={skipStartPage}
                onChange={(event) => onSkipStartPageChange?.(event.target.checked)}
              />
              <span className="start-page__toggle-track">
                <span className="start-page__toggle-thumb" />
              </span>
              <span className="start-page__toggle-label">Skip this start page next time</span>
            </label>
            {onEnterViewer && (
              <button
                className="start-page__button start-page__button--ghost"
                onClick={onEnterViewer}
                disabled={isBusy}
              >
                Skip now
              </button>
            )}
          </div>

          <div className="start-page__list">
            {loading && <div className="start-page__empty">Loading directory...</div>}
            {!loading && error && <div className="start-page__error">{error}</div>}
            {!loading && !error && !entries.length && (
              <div className="start-page__empty">No folders or IFC files here.</div>
            )}
            {!loading && !error && entries.map((entry) => (
              <button
                key={entry.path}
                className={`start-page__item start-page__item--tree ${entry.isIfc ? 'start-page__item--ifc' : ''} ${selected === entry.path ? 'start-page__item--active' : ''}`}
                onClick={() => {
                  setSelected(entry.path);
                  if (entry.isDirectory) {
                    void toggleDir(entry);
                  } else {
                    onOpenIfcPath(entry.path);
                  }
                }}
                disabled={isBusy}
              >
                <div
                  className={`start-page__item-icon ${
                    entry.isDirectory ? 'start-page__item-icon--dir' : 'start-page__item-icon--ifc'
                  }`}
                >
                  {entry.isDirectory ? 'DIR' : 'IFC'}
                </div>
                <div className="start-page__item-text">
                  <div className="start-page__item-name">{entry.name}</div>
                  <div className="start-page__item-meta">{entry.isDirectory ? 'Folder' : 'IFC Model'}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="start-page__panel">
        <div className="start-page__header">
          <h3 className="start-page__title">Preview</h3>
          {isBusy && <span className="start-page__meta">Loading...</span>}
        </div>
        <div className="start-page__body">
          <div className="start-page__preview-blurb">
            <p className="start-page__preview">
              Select an IFC file on the left to load it. The live preview below lets you orbit, pan,
              and zoom just like Adobe Bridge, before you jump into the full workspace.
            </p>
            {!isDesktop && (
              <div className="start-page__empty">
                Desktop file browser is unavailable in the web build. Use the Open IFC button above
                or drag a file into the viewer.
              </div>
            )}
          </div>
          <div className="start-page__preview-viewer">
            <SecondaryViewport orientation="perspective" preset={previewPreset} />
          </div>
        </div>
      </div>
    </div>
  );
};
