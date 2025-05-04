import { css } from '@firebolt-dev/css'
import { useEffect, useState, useRef, useMemo } from 'react'
import { ResizableBox } from 'react-resizable'
import { EditorMenuBar } from './EditorMenuBar'
import { EditorToolbar } from './EditorToolbar'
import { HierarchyPanel } from './HierarchyPanel'
import { InspectorPanel } from './InspectorPanel'
import { ProjectPanel } from './ProjectPanel'
import { ConsolePanel } from './ConsolePanel'
import { ViewportPanel } from './ViewportPanel'
import { PanelHeader } from './PanelHeader'
import { CodePanel } from './CodePanel'

// CSS for react-resizable handles 
const resizableStyles = css`
  .react-resizable-handle {
    position: absolute;
    background-color: #444;
    background-clip: padding-box; /* Use padding-box to prevent background bleeding */
    z-index: 100;
    opacity: 0.8;
    transition: background-color 0.2s ease;
  }
  .react-resizable-handle:hover {
    background-color: #555;
    opacity: 1;
  }
  .react-resizable-handle-e {
    top: 0;
    right: -3px; /* Position centered over the right border */
    width: 6px;  /* Slightly wider handle */
    height: 100%;
    cursor: ew-resize;
  }
  .react-resizable-handle-w {
    top: 0;
    left: -3px; /* Position centered over the left border */
    width: 6px; /* Slightly wider handle */
    height: 100%;
    cursor: ew-resize;
  }
  .react-resizable-handle-n {
    top: -3px; /* Position centered over the top border */
    left: 0;
    height: 6px; /* Slightly wider handle */
    width: 100%;
    cursor: ns-resize;
  }
`;

// Panel configuration defaults
const DEFAULT_LAYOUT = {
  hierarchy: { visible: true, width: 250 },
  inspector: { visible: true, width: 300 },
  project: { visible: true, height: 200 },
  console: { visible: false, height: 150 },
  code: { visible: false, height: 200 }
};

export function EditorUI({ world }) {
  const [editorMode, setEditorMode] = useState(false)
  const [currentMode, setCurrentMode] = useState('grab')
  const [selectedApp, setSelectedApp] = useState(null); // State for selected app
  
  // State for layout and panels
  const [layout, setLayout] = useState(() => {
    let initialState = { ...DEFAULT_LAYOUT }; // Start with a copy of defaults
    try {
      const savedLayoutString = localStorage.getItem('editor-layout');
      if (savedLayoutString) {
        const parsedLayout = JSON.parse(savedLayoutString);
        // Ensure all panels from DEFAULT_LAYOUT exist, merging saved data
        Object.keys(DEFAULT_LAYOUT).forEach(panelKey => {
          if (parsedLayout[panelKey]) {
            // Merge saved panel config onto default panel config
            initialState[panelKey] = { 
              ...DEFAULT_LAYOUT[panelKey], 
              ...parsedLayout[panelKey] 
            };
          }
          // If parsedLayout doesn't have the panelKey, initialState keeps the default
        });
      }
    } catch (e) {
      console.error("Error loading or parsing layout from localStorage:", e);
      // Fallback to default if error occurs during loading/parsing
      initialState = { ...DEFAULT_LAYOUT }; 
    }
    return initialState;
  });
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Add refs for resize handlers
  const leftResizeRef = useRef(null)
  const rightResizeRef = useRef(null)
  const bottomResizeRef = useRef(null)
  const editorUIRef = useRef(null)

  // Derive apps list from world entities
  const apps = useMemo(() => {
    if (!world?.entities?.items) return [];
    const appEntities = [];
    for (const [_, entity] of world.entities.items) {
      if (entity.isApp) {
        appEntities.push(entity);
      }
    }
    // Potential future sorting/filtering could happen here
    return appEntities;
  }, [world?.entities?.items, editorMode]); // Recompute if entities or editorMode change

  // Save layout to localStorage when it changes
  useEffect(() => {
    if (layout) {
      try {
        localStorage.setItem('editor-layout', JSON.stringify(layout));
      } catch (e) {
        console.error("Error saving layout to localStorage:", e);
      }
    }
  }, [layout]);

  useEffect(() => {
    const onEditorMode = (enabled) => {
      setEditorMode(enabled)
      
      // Unlock cursor when entering editor mode
      if (enabled && world.input) {
        world.input.setCursorLock(false);
      }
    }
    
    // Listen for editor-mode events
    world.on('editor-mode', onEditorMode)
    
    return () => {
      world.off('editor-mode', onEditorMode)
    }
  }, [world])

  // Reset layout function
  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
    setMenuOpen(false);
    setActiveMenu(null);
    try {
      localStorage.removeItem('editor-layout');
    } catch (e) {
      console.error("Error removing layout from localStorage:", e);
    }
  };

  // Toggle panel visibility
  const togglePanel = (panelName) => {
    setLayout(prev => ({
      ...prev,
      [panelName]: {
        ...prev[panelName],
        visible: !prev[panelName].visible
      }
    }));
    setMenuOpen(false);
  };

  // Handle mode changes
  useEffect(() => {
    if (editorMode && world.builder) {
      world.builder.setMode(currentMode)
    }
  }, [currentMode, editorMode, world.builder])

  // Add ESC key listener to unlock cursor
  useEffect(() => {
    if (!editorMode) return;
    
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        if (world.input) {
          world.input.setCursorLock(false);
        }
        // Close any open menus on ESC
        setMenuOpen(false);
        setActiveMenu(null);
      }
    }
    
    document.addEventListener('keydown', onKeyDown);
    
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [editorMode, world]);

  // Toggle menu open/closed
  const handleMenuClick = (menuName) => {
    if (activeMenu === menuName) {
      setMenuOpen(!menuOpen);
    } else {
      setActiveMenu(menuName);
      setMenuOpen(true);
    }
  };

  // Update layout state from ResizableBox
  const handleResize = (panelName, sizeProp) => (event, { size }) => {
    setLayout(prev => ({
      ...prev,
      [panelName]: {
        ...prev[panelName],
        [sizeProp]: size[sizeProp] // Update width or height based on sizeProp
      }
    }));
  };

  if (!editorMode) {
    return null // Don't show Unity UI in play mode
  }

  return (
    <div 
      ref={editorUIRef}
      className="editor-ui"
      css={css`
        ${resizableStyles} /* Apply updated styles */
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background-color: #383838;
        color: #e0e0e0;
        font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
        font-size: 12px;
        z-index: 1000;
        pointer-events: auto;
        
        /* Ensure parent containers allow overflow for centered handles */
        .main-content,
        .center-area,
        .react-resizable-box { 
          overflow: visible !important; /* Allow handles to sit outside box bounds */
        }

         /* Add relative positioning to ResizableBox parent if needed for absolute handles */
        .react-resizable {
          position: relative !important; /* Needed for absolute positioning of handles */
        }
      `}
    >
      {/* Top Menu Bar */}
      <EditorMenuBar
        layout={layout}
        togglePanel={togglePanel}
        resetLayout={resetLayout}
        activeMenu={activeMenu}
        menuOpen={menuOpen}
        handleMenuClick={handleMenuClick}
        setMenuOpen={setMenuOpen}
      />

      {/* Toolbar - Replaced with component */}
      <EditorToolbar />

      {/* Main Content */}
      <div 
        className="main-content"
        css={css`
          flex: 1;
          display: flex;
          min-height: 0;
          overflow: hidden;
        `}
      >
        {/* Left Panel (Hierarchy) */}
        {layout.hierarchy.visible && (
          <ResizableBox
            width={layout.hierarchy.width}
            height={Infinity} // Let height be determined by flex parent
            axis="x"
            resizeHandles={['e']} // East handle
            minConstraints={[100, Infinity]} // Min width 100
            maxConstraints={[600, Infinity]} // Max width 600
            onResize={handleResize('hierarchy', 'width')}
            css={css`flex-shrink: 0; display: flex !important;`} // Ensure flex behavior
          >
            <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column'}}>
              <HierarchyPanel
                apps={apps} // Pass apps list as prop
                world={world} // Pass world object as prop
                selectedApp={selectedApp} // Pass selected app state
                setSelectedApp={setSelectedApp} // Pass setter function
                width={layout.hierarchy.width}
                onClose={() => togglePanel('hierarchy')}
              />
            </div>
          </ResizableBox>
        )}

        {/* Center Area (Viewport and Bottom Panel) */}
        <div 
          className="center-area"
          css={css`
            flex: 1;
            display: flex;
            flex-direction: column;
            min-width: 0;
              overflow: hidden;
            `}
          >
          <ViewportPanel 
            world={world} 
            editorMode={editorMode}
            layout={layout} 
            togglePanel={togglePanel} 
          />

          {(layout.project.visible || layout.console.visible) && (
             <ResizableBox
               height={layout.project.visible ? layout.project.height : layout.console.height} // Use height of visible panel
               width={Infinity} // Let width be determined by flex parent
               axis="y" 
               resizeHandles={['n']} // North handle
               minConstraints={[Infinity, 50]}  // Min height 50
               maxConstraints={[Infinity, 500]} // Max height 500
               onResize={handleResize(layout.project.visible ? 'project' : 'console', 'height')} // Update correct panel's height
               css={css`flex-shrink: 0; display: flex !important; flex-direction: column;`} // Ensure flex behavior
             >
              <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column'}}>
                {layout.project.visible && (
                  <ProjectPanel 
                    height={layout.project.height} 
                    onClose={() => togglePanel('project')} 
                  />
                )}
                {layout.console.visible && (
                  <ConsolePanel 
                    height={layout.console.height} 
                    onClose={() => togglePanel('console')} 
                  />
                )}
              </div>
            </ResizableBox>
          )}

        </div>

        {/* Right Panel (Inspector & Code) */}
        {layout.inspector.visible && (
          <ResizableBox
            width={layout.inspector.width}
            height={Infinity}
            axis="x"
            resizeHandles={['w']}
            minConstraints={[150, Infinity]}
            maxConstraints={[800, Infinity]}
            onResize={handleResize('inspector', 'width')}
            css={css`flex-shrink: 0; display: flex !important; flex-direction: column;`}
          >
            <div style={{
                flex: 1,
                minHeight: 0,
                display: 'flex', 
                flexDirection: 'column'
              }}
            >
              <InspectorPanel 
                selectedApp={selectedApp}
                world={world}
                onClose={() => togglePanel('inspector')} 
              />
            </div>

            {layout.code.visible && (
              <ResizableBox
                width={Infinity}
                height={layout.code.height}
                axis="y"
                resizeHandles={['n']}
                minConstraints={[Infinity, 50]}
                maxConstraints={[Infinity, 600]}
                onResize={handleResize('code', 'height')}
                css={css`flex-shrink: 0; display: flex !important; flex-direction: column; border-top: 1px solid #1a1a1a;`}
              >
                <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column'}}>
                  <CodePanel 
                    selectedApp={selectedApp} 
                    world={world} 
                    height={layout.code.height} 
                    onClose={() => togglePanel('code')} 
                  />
                </div>
              </ResizableBox>
            )}
          </ResizableBox>
        )}
      </div>

      <div 
        className="status-bar"
        css={css`
          height: 20px;
          background-color: #252525;
          border-top: 1px solid #1a1a1a;
          display: flex;
          align-items: center;
          padding: 0 10px;
          justify-content: space-between;
          font-size: 11px;
          z-index: 10;
          flex-shrink: 0;
        `}
      >
        <div>HyperFy Editor v1.0</div>
        <div>FPS: 60</div>
      </div>
    </div>
  )
} 