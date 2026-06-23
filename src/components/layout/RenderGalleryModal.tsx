import React, { useState } from 'react';
import { Modal, Button, Text, Row } from '../../ui';
import { downloadRenderItem, type RenderItem } from '../../core/project/renderGallery';
import './RenderGalleryModal.css';

interface RenderGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  renders: RenderItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

const kindLabel = (kind: RenderItem['kind']) => (kind === 'ai' ? 'AI visualization' : 'Screenshot');

export const RenderGalleryModal: React.FC<RenderGalleryModalProps> = ({
  isOpen,
  onClose,
  renders,
  onRemove,
  onClear,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = renders.find((item) => item.id === selectedId) ?? null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Render Gallery" size="lg">
      {renders.length === 0 ? (
        <div className="render-gallery-empty">
          <Text variant="muted" as="div">
            No renders yet. Generate an AI visualization or capture a screenshot and it will appear
            here.
          </Text>
        </div>
      ) : selected ? (
        <div className="render-gallery-detail">
          <img
            className="render-gallery-detail-img"
            src={selected.url}
            alt={kindLabel(selected.kind)}
          />
          <div className="render-gallery-detail-meta">
            <Text variant="muted" size="sm" as="div">
              {kindLabel(selected.kind)} · {new Date(selected.createdAt).toLocaleString()}
            </Text>
            {selected.prompt && (
              <Text size="sm" as="div" className="render-gallery-detail-prompt">
                “{selected.prompt}”
              </Text>
            )}
          </div>
          <Row>
            <Button onClick={() => setSelectedId(null)}>← Back</Button>
            <Button variant="primary" onClick={() => downloadRenderItem(selected)}>
              Export PNG
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onRemove(selected.id);
                setSelectedId(null);
              }}
            >
              Delete
            </Button>
          </Row>
        </div>
      ) : (
        <>
          <div className="render-gallery-grid">
            {renders.map((item) => (
              <div key={item.id} className="render-gallery-card">
                <button
                  type="button"
                  className="render-gallery-thumb"
                  onClick={() => setSelectedId(item.id)}
                  title={item.prompt || kindLabel(item.kind)}
                >
                  <img src={item.url} alt={kindLabel(item.kind)} loading="lazy" />
                  <span className={`render-gallery-badge render-gallery-badge--${item.kind}`}>
                    {item.kind === 'ai' ? 'AI' : 'IMG'}
                  </span>
                </button>
                <div className="render-gallery-card-actions">
                  <button
                    type="button"
                    onClick={() => downloadRenderItem(item)}
                    aria-label="Export PNG"
                    title="Export PNG"
                  >
                    ⤓
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    aria-label="Delete"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="render-gallery-footer">
            <Text variant="muted" size="sm" as="div">
              {renders.length} render{renders.length === 1 ? '' : 's'}
            </Text>
            <Button variant="danger" size="sm" onClick={onClear}>
              Clear All
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default RenderGalleryModal;
