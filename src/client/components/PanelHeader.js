import { css } from '@firebolt-dev/css';
import React from 'react';

export function PanelHeader({ title, onClose }) {
  return (
    <div
      className="panel-header"
      css={css`
        padding: 5px 10px;
        background-color: #3c3c3c;
        border-bottom: 1px solid #1a1a1a;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
        flex-shrink: 0; /* Prevent shrinking */
      `}
    >
      {title}
      {onClose && (
        <div
          className="close-button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          css={css`
            cursor: pointer;
            opacity: 0.7;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 2px;
            font-size: 14px;
            line-height: 1;
            &:hover {
              opacity: 1;
              background-color: rgba(255,255,255,0.1);
            }
          `}
        >
          ×
        </div>
      )}
    </div>
  );
} 