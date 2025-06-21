import { css } from '@firebolt-dev/css';
import React from 'react';

export function EditorToolbar({ currentMode, setCurrentMode }) {
  const buttonBaseStyle = css`
    background-color: #555;
    border: 1px solid #444;
    color: #e0e0e0;
    padding: 4px;
    border-radius: 3px;
    cursor: pointer;
    min-width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    transition: background-color 0.1s ease, border-color 0.1s ease;

    &:hover {
      background-color: #666;
      border-color: #555;
    }

    &:active {
      background-color: #6e6e6e;
    }

    img {
      width: 16px;
      height: 16px;
      filter: invert(90%) sepia(6%) saturate(88%) hue-rotate(340deg) brightness(95%) contrast(86%);
    }
  `;

  const activeButtonStyle = css`
    background-color: #4f87ff;
    border-color: #4f87ff;
    color: #fff;
    img {
      filter: invert(100%) sepia(0%) saturate(0%) hue-rotate(180deg) brightness(105%) contrast(102%);
    }
  `;

  return (
    <div
      className="toolbar"
      css={css`
        height: 35px;
        background-color: #3c3c3c;
        display: flex;
        align-items: center;
        padding: 0 10px;
        border-bottom: 1px solid #1a1a1a;
        flex-shrink: 0;
      `}
    >
      <div css={css`display: flex; align-items: center;`}>
        <div css={css`
          color: #999;
          font-size: 11px;
          user-select: none;
          margin-right: 20px;
        `}>
        </div>
        <div css={css`display: flex; gap: 5px;`}>
          <button
            css={css`${buttonBaseStyle} ${currentMode === 'grab' ? activeButtonStyle : ''}`}
            onClick={() => {
              console.log('🤏 EditorToolbar: Grab button clicked');
              setCurrentMode('grab');
            }}
            title="Grab Tool (G)"
          >
            ✋
          </button>
          <button
            css={css`${buttonBaseStyle} ${currentMode === 'translate' ? activeButtonStyle : ''}`}
            onClick={() => {
              console.log('📐 EditorToolbar: Translate button clicked');
              setCurrentMode('translate');
            }}
            title="Move Tool (M)"
          >
            <img src="/icons/move.svg" alt="Move" />
          </button>
          <button
            css={css`${buttonBaseStyle} ${currentMode === 'rotate' ? activeButtonStyle : ''}`}
            onClick={() => {
              console.log('🔄 EditorToolbar: Rotate button clicked');
              setCurrentMode('rotate');
            }}
            title="Rotate Tool (R)"
          >
            <img src="/icons/rotate.svg" alt="Rotate" />
          </button>
          <button
            css={css`${buttonBaseStyle} ${currentMode === 'scale' ? activeButtonStyle : ''}`}
            onClick={() => setCurrentMode('scale')}
            title="Scale Tool (S) - Coming Soon"
            disabled
          >
            <img src="/icons/scale.svg" alt="Scale" />
          </button>
        </div>
      </div>
    </div>
  );
}