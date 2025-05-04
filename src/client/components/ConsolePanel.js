import { css } from '@firebolt-dev/css';
import React from 'react';
import { PanelHeader } from './PanelHeader'; // Assuming PanelHeader is extracted

export function ConsolePanel({ height, onClose }) {
  // Note: Original EditorUI used layout.console.height, ensure this is passed correctly
  return (
    <div
      className="console-panel"
      style={{ height: height }}
      css={css`
        background-color: #2a2a2a;
        border-top: 1px solid #1a1a1a;
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        overflow: hidden;
      `}
    >
      <PanelHeader title="Console" onClose={onClose} />
      <div 
        className="panel-content"
        css={css`
          flex: 1; 
          padding: 5px; 
          overflow: auto; 
          min-height: 0;
          color: #ccc;
          font-family: monospace;
        `}
      >
        Console Content Placeholder
        {/* Add actual console log viewer here later */}
      </div>
    </div>
  );
} 