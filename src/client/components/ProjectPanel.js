import { css } from '@firebolt-dev/css';
import React from 'react';
import { PanelHeader } from './PanelHeader'; // Assuming PanelHeader is extracted

export function ProjectPanel({ height, onClose }) {
  return (
    <div
      className="project-panel"
      style={{ height: height }}
      css={css`
        background-color: #303030;
        border-top: 1px solid #1a1a1a;
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        overflow: hidden;
      `}
    >
      <PanelHeader title="Project" onClose={onClose} />
      <div 
        className="panel-content"
        css={css`
          flex: 1; 
          padding: 5px; 
          overflow: auto; 
          min-height: 0;
        `}
      >
        Project Content Placeholder
        {/* Add actual project file browser/asset list here later */}
      </div>
    </div>
  );
} 