import { css } from '@firebolt-dev/css'
import { useEffect, useState } from 'react'

export function ModeToggle({ world }) {
  const [editorMode, setEditorMode] = useState(false)

  useEffect(() => {
    const onEditorMode = (enabled) => {
      setEditorMode(enabled)
    }
    
    // Listen for editor-mode events
    world.on('editor-mode', onEditorMode)
    
    return () => {
      world.off('editor-mode', onEditorMode)
    }
  }, [world])

  const toggleMode = () => {
    if (world.builder) {
      world.builder.toggle()
    }
  }

  return (
    <div
      css={css`
        position: absolute;
        top: 20px;
        left: 20px;
        background-color: rgba(0, 0, 0, 0.6);
        color: white;
        padding: 10px 15px;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        z-index: 100;
        font-family: 'Arial', sans-serif;
      `}
    >
      <div
        css={css`
          font-size: 14px;
          font-weight: bold;
        `}
      >
        Current Mode: {editorMode ? 'Editor' : 'Play'}
      </div>
      <button
        onClick={toggleMode}
        css={css`
          background-color: ${editorMode ? '#ff6b6b' : '#4CAF50'};
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: bold;
          transition: background-color 0.2s;
          
          &:hover {
            background-color: ${editorMode ? '#ff5252' : '#3e8e41'};
          }
        `}
      >
        Switch to {editorMode ? 'Play' : 'Editor'} Mode
      </button>
    </div>
  )
} 