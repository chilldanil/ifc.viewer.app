import React, { useEffect, useRef, useState } from 'react';
import * as BUIC from '@thatopen/ui-obc';
import type { Table } from '@thatopen/ui';
import * as OBC from '@thatopen/components';
import { Card, Input, Stack } from '../../ui';
import { useBIM } from '../../context/BIMContext';
import { setupRelationsTreeSelection } from '../../utils/relationsTreeSelection';

export const ModelTreePanel: React.FC = () => {
  const { components } = useBIM();
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<Table | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!components || !treeContainerRef.current) {return;}

    const fragmentsManager = components.get(OBC.FragmentsManager);

    const [tree, update] = BUIC.tables.relationsTree({
      components,
      models: fragmentsManager.groups.values(),
    });

    treeRef.current = tree;
    treeContainerRef.current.innerHTML = '';
    treeContainerRef.current.appendChild(tree);

    const cleanupSelectionSync = setupRelationsTreeSelection(tree as unknown as HTMLElement, components);

    const refreshModels = () => update({ models: fragmentsManager.groups.values() });

    const handleLoaded = () => refreshModels();
    fragmentsManager.onFragmentsLoaded.add(handleLoaded);
    refreshModels();

    return () => {
      fragmentsManager.onFragmentsLoaded.remove(handleLoaded);
      cleanupSelectionSync?.();
      treeRef.current = null;
      if (treeContainerRef.current) {
        treeContainerRef.current.innerHTML = '';
      }
    };
  }, [components]);

  useEffect(() => {
    if (!treeRef.current) {return;}
    treeRef.current.queryString = search.trim() || null;
  }, [search]);

  return (
    <div className="properties-model-tree">
      <Card className="relations-card">
        <Stack gap="md" className="properties-model-tree-stack">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="relations-tree-shell">
            <div ref={treeContainerRef} className="relations-tree-container" />
          </div>
        </Stack>
      </Card>
    </div>
  );
};

export default ModelTreePanel;
