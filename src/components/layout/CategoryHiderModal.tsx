import React, { useState, useCallback, useEffect } from 'react';
import * as OBC from '@thatopen/components';
import { useBIM } from '../../context/BIMContext';
import { Modal, Button, Stack, Input, Text } from '../../ui';
import './CategoryHiderModal.css';

interface CategoryHiderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryHiderModal: React.FC<CategoryHiderModalProps> = ({ isOpen, onClose }) => {
  const { components, eventBus } = useBIM();
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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
    if (!isOpen) return;

    refreshCategories();
    const off = eventBus.on('modelLoaded', () => refreshCategories());
    return () => off();
  }, [isOpen, eventBus, refreshCategories]);

  const run = async (action: 'isolate' | 'hide' | 'reset') => {
    if (!components) return;

    const hider = components.get(OBC.Hider);
    setLoading(true);
    try {
      if (action === 'reset') {
        await hider.set(true);
        setSelected(new Set());
        onClose();
        return;
      }

      const cats = Array.from(selected);
      if (!cats.length) return;

      const classifier = components.get(OBC.Classifier);
      const map = classifier.find({ entities: cats });

      if (action === 'isolate') {
        await hider.isolate(map);
      } else {
        await hider.set(false, map);
      }

      setSelected(new Set());
      onClose();
    } catch (err) {
      console.error('Hider operation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = availableCategories.filter((c) =>
    c.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Isolate or Hide Categories" size="sm">
      <Stack gap="sm">
        <Input
          placeholder="Search categories..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          disabled={loading}
        />

        <div className="category-list">
          {filteredCategories.map((cat) => {
            const isSelected = selected.has(cat);
            return (
              <button
                key={cat}
                className={`category-item ${isSelected ? 'category-item--selected' : ''}`}
                onClick={() => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(cat)) {
                      next.delete(cat);
                    } else {
                      next.add(cat);
                    }
                    return next;
                  });
                }}
              >
                <span className="category-checkbox">
                  {isSelected && '✓'}
                </span>
                <span className="category-name">{cat}</span>
              </button>
            );
          })}
          {filteredCategories.length === 0 && (
            <Text variant="subtle" size="sm">
              {filter ? 'No matching categories' : 'No categories available'}
            </Text>
          )}
        </div>

        {selected.size > 0 && (
          <Text variant="muted" size="sm">
            {selected.size} {selected.size === 1 ? 'category' : 'categories'} selected
          </Text>
        )}

        <Stack gap="sm">
          <Button
            variant="primary"
            onClick={() => run('isolate')}
            disabled={loading || selected.size === 0}
            block
          >
            Isolate Selected
          </Button>
          <Button
            variant="danger"
            onClick={() => run('hide')}
            disabled={loading || selected.size === 0}
            block
          >
            Hide Selected
          </Button>
          <Button onClick={() => run('reset')} disabled={loading} block>
            Reset All Visibility
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
};
