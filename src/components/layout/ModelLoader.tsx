import React from 'react';
import './ModelLoader.css';

interface ModelLoaderProps {
  text?: string;
}

export const ModelLoader: React.FC<ModelLoaderProps> = ({ text = "Loading Model..." }) => {
  return (
    <div className="model-loader-overlay">
      <div className="model-loader-content">
        <div className="spinner">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <p aria-live="polite" aria-busy="true">{text}</p>
      </div>
    </div>
  );
}; 