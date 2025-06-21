import { css } from '@firebolt-dev/css';
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import { SunIcon } from 'lucide-react'; // Import icon
import { CanvasView } from './CanvasView'; // Import CanvasView
import { InputDropdown, InputSwitch } from './Inputs'; // Import input components

export function ViewportPanel({ world, editorMode, layout, togglePanel /* canvasRef is handled by CoreUI for now */ }) {
  const [isRightMouseDown, setIsRightMouseDown] = useState(false);
  const canvasContainerRef = useRef(null);
  const [canvasElement, setCanvasElement] = useState(null);
  
  // Setup event listeners on the actual canvas element once it's available
  useEffect(() => {
    if (!editorMode || !canvasContainerRef.current || !world || !world.graphics) return;
    
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          // Find the canvas element that Three.js creates
          const canvas = canvasContainerRef.current.querySelector('canvas');
          if (canvas) {
            console.log("Found Three.js canvas, attaching event listeners");
            setCanvasElement(canvas);
            observer.disconnect();
          }
        }
      }
    });
    
    // Watch for changes in the canvas container to detect when Three.js adds its canvas
    observer.observe(canvasContainerRef.current, { childList: true });
    
    return () => {
      observer.disconnect();
    };
  }, [editorMode, world]);
  
  // Handle right mouse button events
  const handleMouseDown = useCallback((e) => {
    // Only in editor mode we track right mouse button
    if (editorMode && e.button === 2) {
      setIsRightMouseDown(true);
      e.preventDefault(); // Prevent default context menu
      
      // Notify FreeCamOrb directly through the world
      if (world && world.builder && world.builder.freeCamOrb) {
        // Simulate right mouse press
        const rightMouseButton = world.builder.freeCamOrb.control?.mouseRight;
        if (rightMouseButton && rightMouseButton.onPress) {
          rightMouseButton.onPress();
        }
      }
    }
  }, [editorMode, world]);
  
  const handleMouseUp = useCallback((e) => {
    // Only in editor mode we track right mouse button
    if (editorMode && e.button === 2) {
      setIsRightMouseDown(false);
      
      // Notify FreeCamOrb directly through the world
      if (world && world.builder && world.builder.freeCamOrb) {
        // Simulate right mouse release
        const rightMouseButton = world.builder.freeCamOrb.control?.mouseRight;
        if (rightMouseButton && rightMouseButton.onRelease) {
          rightMouseButton.onRelease();
        }
      }
    }
  }, [editorMode, world]);
  
  const handleContextMenu = useCallback((e) => {
    // Always prevent context menu in editor mode
    if (editorMode) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [editorMode]);
  
  // Attach event listeners to the canvas element when it's available
  useEffect(() => {
    if (!canvasElement || !editorMode) return;
    
    canvasElement.addEventListener('mousedown', handleMouseDown);
    canvasElement.addEventListener('mouseup', handleMouseUp);
    canvasElement.addEventListener('contextmenu', handleContextMenu);
    
    // Add cursor styles directly to canvas
    canvasElement.style.cursor = getCursorStyle();
    
    // Set document mouse up listener to handle cases where mouse is released outside viewport
    const handleDocumentMouseUp = (e) => {
      if (e.button === 2) {
        setIsRightMouseDown(false);
        
        // Notify FreeCamOrb directly
        if (world && world.builder && world.builder.freeCamOrb) {
          const rightMouseButton = world.builder.freeCamOrb.control?.mouseRight;
          if (rightMouseButton && rightMouseButton.onRelease) {
            rightMouseButton.onRelease();
          }
        }
      }
    };
    
    document.addEventListener('mouseup', handleDocumentMouseUp);
    
    // Create MutationObserver to watch for style changes
    const styleObserver = new MutationObserver(() => {
      if (canvasElement) {
        canvasElement.style.cursor = getCursorStyle();
      }
    });
    
    styleObserver.observe(canvasElement, { attributes: true, attributeFilter: ['style'] });
    
    return () => {
      canvasElement.removeEventListener('mousedown', handleMouseDown);
      canvasElement.removeEventListener('mouseup', handleMouseUp);
      canvasElement.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
      styleObserver.disconnect();
    };
  }, [canvasElement, editorMode, handleMouseDown, handleMouseUp, handleContextMenu, world, isRightMouseDown]);
  
  // Update cursor style when isRightMouseDown changes
  useEffect(() => {
    if (canvasElement) {
      canvasElement.style.cursor = getCursorStyle();
    }
  }, [isRightMouseDown, canvasElement]);
  
  // Normal click handler
  const handleViewportClick = () => {
    // Only attempt to lock cursor if in editor mode and input system exists
    if (editorMode && world && world.input) {
      // Cursor lock is now handled by right-click
      // world.input.setCursorLock(true);
    }
  };

  // Determine cursor style based on mode and mouse state
  const getCursorStyle = () => {
    if (!editorMode) return 'default';
    if (isRightMouseDown) return 'grabbing';
    return 'grab';
  };

  return (
    <div
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
        ref={canvasContainerRef} // Add ref to get direct access to container
        className="canvas-area"
        onClick={handleViewportClick} // Click handler
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
          
          /* Add subtle highlight when in editor mode to indicate interactivity */
          ${editorMode && `
            &:hover {
              box-shadow: inset 0 0 0 2px rgba(79, 135, 255, 0.3);
            }
          `}
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
    add('2x', 2);
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