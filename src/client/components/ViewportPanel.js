import { css } from '@firebolt-dev/css';
import React, { useMemo, useState, useEffect } from 'react'; // Import hooks
import { SunIcon } from 'lucide-react'; // Import icon
import { CanvasView } from './CanvasView'; // Import CanvasView
import { InputDropdown, InputSwitch } from './Inputs'; // Import input components

export function ViewportPanel({ world, editorMode, layout, togglePanel /* canvasRef is handled by CoreUI for now */ }) {
  const handleViewportClick = () => {
    // Only attempt to lock cursor if in editor mode and input system exists
    if (editorMode && world && world.input) {
      world.input.setCursorLock(true);
    }
  };

  return (
    <div
      // ref={viewportRef} // Ref might be needed if we manage canvas internally later
      className="scene-view"
      css={css`
        flex: 1;
        display: flex;
        flex-direction: column;
        background-color: #232323;
        position: relative;
        z-index: 5;
        min-height: 0; /* Crucial for flexbox sizing */
        overflow: hidden; /* Prevent content spilling */
      `}
    >
      <div
        className="scene-toolbar"
        css={css`
          height: 25px;
          background-color: #3c3c3c;
          display: flex;
          align-items: center;
          padding: 0 10px;
          border-bottom: 1px solid #1a1a1a;
          z-index: 7;
          user-select: none;
          flex-shrink: 0;
          gap: 8px; /* Add gap between items */
        `}
      >
        <div
          css={css`
            margin-right: auto; /* Push other items to the right */
            cursor: default; /* Make Scene tab non-interactive for now */
            font-weight: bold;
            padding: 2px 8px;
            /* Highlight Scene tab if Game tab is not active (or always) */
            background-color: #4b4b4b;
            border-radius: 3px;
          `}
        >
          Scene
        </div>

        {/* Resolution Dropdown - Adapted from SettingsPane.js */}
        <ResolutionControl world={world} />

        {/* Lighting/Postprocessing Toggle */}
        <PostprocessingControl world={world} />

      </div>

      {/* Render CanvasView directly inside the canvas area - Reverted */}
      {/* We need a container for the canvas owned by ClientGraphics */}
      <div 
        id="editor-canvas-area" // Add ID for targeting
        className="canvas-area"
        onClick={handleViewportClick} // Add click handler here
        css={css`
          flex: 1; 
          position: relative; 
          min-height: 0; 
          background: #1a1a1a; 
          overflow: hidden; /* Clip canvas if needed */
          /* Ensure canvas fits */
          canvas {
            display: block;
            width: 100% !important;
            height: 100% !important;
            outline: none;
          }
        `}
      >
        {/* world.graphics.renderer.domElement will be appended here */}
      </div>
    </div>
  );
}

// --- New Components for Toolbar Controls ---

function ResolutionControl({ world }) {
  const [dpr, setDPR] = useState(world?.prefs?.dpr ?? 1);
  const [isOpen, setIsOpen] = useState(false);

  const dprOptions = useMemo(() => {
    if (!world?.graphics) return [];
    const devicePixelRatio = window.devicePixelRatio;
    const options = [];
    const add = (label, val) => {
      options.push({
        label: label, 
        value: val,
      });
    };
    add('0.5x', 0.5);
    add('1x', 1);
    if (devicePixelRatio >= 2) add('2x', 2);
    if (![0.5, 1, 2].includes(devicePixelRatio)) {
       add(`${devicePixelRatio.toFixed(1)}x`, devicePixelRatio);
    }
    options.sort((a, b) => a.value - b.value);
    return options;
  }, [world?.prefs]);

  useEffect(() => {
    if (!world?.prefs) return;
    const onChange = changes => {
      if (changes.dpr) setDPR(changes.dpr.value);
    };
    world.prefs.on('change', onChange);
    return () => world.prefs.off('change', onChange);
  }, [world?.prefs]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (isOpen && !e.target.closest('#resolution-control')) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [isOpen]);

  if (!world?.prefs) return null;

  // Find the currently selected option label
  const currentLabel = dprOptions.find(opt => opt.value === dpr)?.label || '1x';
  
  return (
    <div
      id="resolution-control"
      css={css`
        position: relative;
        display: flex;
        align-items: center;
      `}
    >
      <button
        onClick={(e) => {
          setIsOpen(!isOpen);
          e.stopPropagation();
        }}
        css={css`
          background: #444;
          border: 1px solid #2a2a2a;
          border-radius: 3px;
          padding: 2px 8px;
          color: #eee;
          font-size: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          white-space: nowrap;
          height: 19px;
          &:hover { background: #555; }
        `}
      >
        {currentLabel}
      </button>
      
      {isOpen && (
        <div
          css={css`
            position: absolute;
            top: 100%;
            left: 0;
            margin-top: 3px;
            background: #444;
            border: 1px solid #2a2a2a;
            border-radius: 3px;
            z-index: 100;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          `}
        >
          {dprOptions.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                world.prefs.setDPR(option.value);
                setIsOpen(false);
              }}
              css={css`
                padding: 4px 10px;
                font-size: 11px;
                cursor: pointer;
                color: ${option.value === dpr ? '#fff' : '#ddd'};
                background: ${option.value === dpr ? '#555' : 'transparent'};
                &:hover {
                  background: #555;
                }
              `}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const onOffOptions = [
  { label: 'Off', value: false },
  { label: 'On', value: true },
];

function PostprocessingControl({ world }) {
  const [postprocessing, setPostprocessing] = useState(world?.prefs?.postprocessing ?? true);

  useEffect(() => {
    if (!world?.prefs) return;
    const onChange = changes => {
      if (changes.postprocessing) setPostprocessing(changes.postprocessing.value);
    };
    world.prefs.on('change', onChange);
    return () => world.prefs.off('change', onChange);
  }, [world?.prefs]);

  if (!world?.prefs) return null;

  const togglePostprocessing = () => {
     world.prefs.setPostprocessing(!postprocessing);
  };

  return (
    <button 
      onClick={togglePostprocessing}
      title={postprocessing ? 'Disable Postprocessing' : 'Enable Postprocessing'} 
      css={css`
        background: ${postprocessing ? '#5a5a5a' : '#444'}; 
        border: 1px solid #2a2a2a;
        color: ${postprocessing ? '#eee' : '#aaa'};
        padding: 2px;
        border-radius: 3px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 19px;
        width: 19px;
        &:hover { background: #6a6a6a; }
      `}
    >
      <SunIcon size={13} /> 
    </button>
  );
} 