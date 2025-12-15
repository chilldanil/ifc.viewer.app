import React, { useEffect, useState, useCallback } from 'react';
import * as OBC from '@thatopen/components';
import { useBIM } from '../../context/BIMContext';
import { Button, Stack, Status, Text, Card, Input } from '../../ui';
import './HiderSection.css';

export const HiderSection: React.FC = () => {
  const { components, eventBus } = useBIM();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const refreshCategories = useCallback(() => {
    if (!components) {
      setAvailableCategories([]);
      return;
    }
    try {
      const classifier = components.get(OBC.Classifier);
      const list = Object.keys(classifier.list?.entities ?? {}).sort();
      setAvailableCategories(list);
    } catch (err) {
      console.warn('Failed to read classifier categories', err);
      setAvailableCategories([]);
    }
  }, [components]);

  useEffect(() => {
    refreshCategories();
    const off = eventBus.on('modelLoaded', () => refreshCategories());
    return () => off();
  }, [eventBus, refreshCategories]);

  const buildModelIdMap = async (cats: string[]) => {
    if (!components) {
      throw new Error('Viewer not ready');
    }

    const classifier = components.get(OBC.Classifier);
    const modelIdMap = classifier.find({ entities: cats });
    return modelIdMap;
  };

  const run = async (action: 'isolate' | 'hide' | 'reset') => {
    setError(null);
    setMessage(null);

    if (!components) {
      setError('Viewer not ready');
      return;
    }

    const hider = components.get(OBC.Hider);
    setLoading(true);
    try {
      if (action === 'reset') {
        await hider.set(true);
        setMessage('Visibility reset');
        return;
      }

      const cats = Array.from(selected);
      if (!cats.length) {
        setError('Select at least one category');
        return;
      }

      const map = await buildModelIdMap(cats);
      const hasSelection = map && Object.values(map).some((set) => (set as Set<number>).size > 0);
      if (!hasSelection) {
        setError('No elements found for those categories');
        return;
      }

      if (action === 'isolate') {
        await hider.isolate(map);
        setMessage('Isolated categories');
      } else {
        await hider.set(false, map);
        setMessage('Hidden categories');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Hider operation failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="sm">
      <Text variant="muted" size="sm">
        Isolate or hide elements by IFC category across all loaded models.
      </Text>

      <Stack gap="sm">
        <Button
          variant="ghost"
          onClick={() => setShowPicker((v) => !v)}
          disabled={loading}
          aria-expanded={showPicker}
        >
          {showPicker ? 'Hide categories' : 'Select categories'} {selected.size ? `(${selected.size})` : ''}
        </Button>

        {showPicker && (
          <Stack gap="sm">
            <Input
              placeholder="Filter categories..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              disabled={loading}
            />
            <Card className="hider-list">
              <Stack gap="sm">
                {availableCategories
                  .filter((c) => c.toLowerCase().includes(filter.toLowerCase()))
                  .map((cat) => {
                    const isSelected = selected.has(cat);
                    return (
                      <Button
                        key={cat}
                        variant={isSelected ? 'primary' : 'ghost'}
                        selected={isSelected}
                        onClick={() => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(cat)) {next.delete(cat);} else {next.add(cat);}
                            return next;
                          });
                        }}
                        block
                        size="sm"
                        className={isSelected ? 'hider-item hider-item--selected' : 'hider-item'}
                      >
                        {cat}
                      </Button>
                    );
                  })}
                {availableCategories.length === 0 && (
                  <Text variant="subtle" size="sm">No categories available.</Text>
                )}
              </Stack>
            </Card>
          </Stack>
        )}

        {selected.size > 0 && (
          <Status variant="info">
            Selected: {selected.size} {selected.size === 1 ? 'category' : 'categories'}
          </Status>
        )}
      </Stack>

      <Stack gap="sm">
        <Button variant="primary" onClick={() => run('isolate')} disabled={loading}>
          Isolate categories
        </Button>
        <Button variant="ghost" onClick={() => run('hide')} disabled={loading}>
          Hide categories
        </Button>
        <Button onClick={() => run('reset')} disabled={loading}>
          Reset visibility
        </Button>
      </Stack>

      {error && <Status variant="error">{error}</Status>}
      {message && !error && <Status variant="success">{message}</Status>}
    </Stack>
  );
};

export default HiderSection;
