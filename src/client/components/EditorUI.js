import { css } from '@firebolt-dev/css'
import { useEffect, useState, useRef } from 'react'
import { ResizableBox } from 'react-resizable'
import { EditorMenuBar } from './EditorMenuBar'
import { EditorToolbar } from './EditorToolbar'
import { HierarchyPanel } from './HierarchyPanel'
import { InspectorPanel } from './InspectorPanel'
import { ConsolePanel } from './ConsolePanel'
import { ViewportPanel } from './ViewportPanel'
import { PanelHeader } from './PanelHeader'
import { CodePanel } from './CodePanel'
import { AppMainPanel, AppMetaPanel, AppNodesPanel } from './InspectPane'
import { cls } from './cls'
import { ContextMenu } from './ContextMenu'

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
  inspector: { visible: true, height: 250 },
  console: { visible: true, height: 200 },
  code: { visible: true, height: 300 },
  appMain: { visible: true },
  appMeta: { visible: true },
  appNodes: { visible: true },
  bottomCenterHeight: 250,
};

// Simple Tabbed Container Component
const TabbedPanelContainer = ({ world, app, layout, panels, activeTab, setActiveTab, height, onCloseTab }) => {
  if (!app) {
    return <div css={css`padding: 10px; color: #888; font-size: 11px; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #303030;`}>Select an App in the Hierarchy.</div>;
  }

  return (
    <div css={css`height: 100%; display: flex; flex-direction: column; background-color: #303030;`}>
      {/* Tab Headers */}
      <div css={css`
          display: flex; 
          flex-shrink: 0; 
          border-bottom: 1px solid #1a1a1a; 
          background-color: #252525;
          height: 28px; /* Tab header height */
      `}>
        {panels.map(panel => (
           layout[panel.key]?.visible && (
              <div 
                key={panel.key}
                className={cls('tab-item', { active: activeTab === panel.key })}
                onClick={() => setActiveTab(panel.key)}
                css={css`
                  padding: 0 10px;
                  font-size: 11px;
                  display: flex;
                  align-items: center;
                  cursor: pointer;
                  color: #aaa;
                  border-right: 1px solid #1a1a1a;
                  position: relative;
                  &:hover { background-color: #3c3c3c; color: #eee; }
                  &.active {
                    background-color: #303030; /* Matches content bg */
                    color: #eee;
                    /* Maybe add a bottom border highlight */
                    /* border-bottom: 2px solid #eee; */ 
                    /* margin-bottom: -1px; */
                  }
                `}
              >
                {panel.title}
                {/* Optional: Add close button per tab? 
                <button onClick={(e) => { e.stopPropagation(); onCloseTab(panel.key); }} css={css`...`}>x</button> 
                */} 
              </div>
            )
        ))}
      </div>
      {/* Tab Content */}
      <div css={css`flex: 1; min-height: 0; overflow: hidden;`}>
        {panels.map(panel => (
          layout[panel.key]?.visible && activeTab === panel.key && (
            <panel.component 
              key={panel.key} 
              world={world} 
              app={app} 
              /* Pass other necessary props? */
            />
          )
        ))}
      </div>
    </div>
  );
};

export function EditorUI({ world }) {
  const [editorMode, setEditorMode] = useState(false)
  const [currentMode, setCurrentMode] = useState('translate')
  const [selectedApp, setSelectedApp] = useState(null);
  const [layout, setLayout] = useState(() => {
    let initialState = { ...DEFAULT_LAYOUT }; 
    try {
      const savedLayoutString = localStorage.getItem('editor-layout');
      if (savedLayoutString) {
        const parsedLayout = JSON.parse(savedLayoutString);
        // Merge saved state, ensuring all DEFAULT keys exist
        Object.keys(DEFAULT_LAYOUT).forEach(panelKey => {
           initialState[panelKey] = { 
             ...DEFAULT_LAYOUT[panelKey], // Start with default 
             ...(parsedLayout[panelKey] || {}) // Merge saved config if exists
           };
        });
         // Also merge top-level properties like bottomCenterHeight
        if (typeof parsedLayout.bottomCenterHeight === 'number') {
           initialState.bottomCenterHeight = parsedLayout.bottomCenterHeight;
        }
      } else {
         // If no saved layout, ensure all default keys are present
         initialState = { ...DEFAULT_LAYOUT };
      }
    } catch (e) {
      console.error("Error loading or parsing layout from localStorage:", e);
      initialState = { ...DEFAULT_LAYOUT }; 
    }
    // Ensure visibility flags exist for app panels if loaded from old state
    initialState.appMain = { visible: initialState.appMain?.visible ?? DEFAULT_LAYOUT.appMain.visible };
    initialState.appMeta = { visible: initialState.appMeta?.visible ?? DEFAULT_LAYOUT.appMeta.visible };
    initialState.appNodes = { visible: initialState.appNodes?.visible ?? DEFAULT_LAYOUT.appNodes.visible };
    // Ensure project is hidden even if loaded from old state
    // initialState.project = { visible: false };
    return initialState;
  });
  
  // State for the active tab in the bottom-center area
  const [bottomCenterActiveTab, setBottomCenterActiveTab] = useState('appMain');
  
  // State for context menu
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, items: [] });
  
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Add refs for resize handlers
  const leftResizeRef = useRef(null)
  const rightResizeRef = useRef(null)
  const bottomResizeRef = useRef(null)
  const editorUIRef = useRef(null)

  // State for the list of apps
  const [apps, setApps] = useState([]);

  // Effect to initialize and update apps list based on world events
  useEffect(() => {
    if (!world?.entities?.items) return;

    // Initial population
    const initialApps = [];
    for (const [_, entity] of world.entities.items) {
      if (entity.isApp) {
        initialApps.push(entity);
      }
    }
    setApps(initialApps);

    // Event handlers
    const handleEntityAdded = (entity) => {
       console.log('Entity Added Event:', entity);
       if (entity?.isApp) {
          setApps(prevApps => [...prevApps, entity]);
       }
    };

    const handleEntityRemoved = (entity) => {
       console.log('Entity Removed Event:', entity);
       // Note: The event emits the entity object *before* full destruction.
       // We use its ID to filter.
       if (entity?.isApp) {
          setApps(prevApps => prevApps.filter(app => app.data.id !== entity.data.id));
          // If the removed app was selected, deselect it
          // Use a ref or closure to avoid dependency issues
          setSelectedApp(prev => {
            if (prev && prev.data.id === entity.data.id) {
              return null;
            }
            return prev;
          });
       }
    };

    // Subscribe
    world.events.on('entityAdded', handleEntityAdded);
    world.events.on('entityRemoved', handleEntityRemoved);

    // Cleanup
    return () => {
      world.events.off('entityAdded', handleEntityAdded);
      world.events.off('entityRemoved', handleEntityRemoved);
    };

  }, [world, world?.entities, world?.events]); // Depend on world and its systems

  // Separate effect to synchronize selectedApp with builder.select()
  useEffect(() => {
    if (world.builder && editorMode) {
      console.log('🔄 EditorUI: Syncing selectedApp with builder:', selectedApp?.data?.id);
      world.builder.select(selectedApp);
    }
  }, [selectedApp, world.builder, editorMode]);

  // Function to handle selecting an app from ANY source (UI or Builder)
  // Ensures both UI state and Builder state are synchronized
  const handleAppSelection = (app) => {
    console.log('🎯 EditorUI: App selected:', app?.data?.id, 'mode:', currentMode);
    // Update UI state (this will trigger the sync effect above)
    setSelectedApp(app);
  };

  // Function to delete the selected app (now uses builder's selection)
  // Updated: Accepts optional appToDelete for explicit deletion
  const handleDeleteSelectedApp = (appToDelete = null) => {
    if (world.builder) {
      if (appToDelete) {
        // If an app is passed directly (e.g., from context menu), use its ID
        console.log('Requesting builder delete specific app:', appToDelete.data?.id);
        world.builder.destroyEntityById(appToDelete.data?.id);
        // Also update UI state if the deleted app was the selected one
        if (selectedApp === appToDelete) {
          setSelectedApp(null);
        }
      } else if (selectedApp) {
        // If no specific app passed (e.g., from main menu), use the current UI selection's ID
        console.log('Requesting builder delete selected app:', selectedApp.data?.id);
        world.builder.destroyEntityById(selectedApp.data?.id);
        setSelectedApp(null); // Clear UI selection
      } else {
        // Fallback: If no specific app and no UI selection, try builder's internal selection (might do nothing)
        console.log('Requesting builder delete its current selection (fallback)');
        world.builder.destroySelected(); 
      }
    } 
  };

  // Placeholder function for Undo
  const handleUndo = () => {
    console.log("Attempting Undo via world.builder.undo()");
    if (world.builder) {
      world.builder.undo();
    }
    // In a real implementation, this would trigger the undo logic.
  };

  // Function to show the context menu
  const showContextMenu = (x, y, items) => {
    setContextMenu({ visible: true, x, y, items });
  };

  // Function to hide the context menu
  const hideContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // Save layout to localStorage when it changes
  useEffect(() => {
    if (layout) {
      try {
        // Only save relevant layout parts, not the whole object potentially
        const layoutToSave = {
           hierarchy: layout.hierarchy,
           inspector: layout.inspector,
           console: layout.console,
           code: layout.code,
           appMain: layout.appMain,
           appMeta: layout.appMeta,
           appNodes: layout.appNodes,
           bottomCenterHeight: layout.bottomCenterHeight,
        }
        localStorage.setItem('editor-layout', JSON.stringify(layoutToSave));
      } catch (e) {
        console.error("Error saving layout to localStorage:", e);
      }
    }
  }, [layout]);

  useEffect(() => {
    const onEditorMode = (enabled) => {
      setEditorMode(enabled)
      // Set the builder to editor UI mode when editor is active
      if (world.builder) {
        world.builder.setEditorUIMode(enabled)
      }
      // We no longer need to explicitly set cursor lock to false here
      // Right-click navigation in the viewport will now control this
    }
    world.on('editor-mode', onEditorMode)
    return () => {
      world.off('editor-mode', onEditorMode)
    }
  }, [world])

  // Add keydown listener for Delete key and tool shortcuts
  useEffect(() => {
    if (!editorMode) return;
    const handleKeyDown = (e) => {
      // Ignore if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      if (e.key === 'Delete' && selectedApp) {
        handleDeleteSelectedApp();
      }
      // Tool shortcuts
      if (e.key === '1' || e.key.toLowerCase() === 'g') {
        setCurrentMode('grab');
      }
      if (e.key === '2' || e.key.toLowerCase() === 'm') {
        setCurrentMode('translate');
      }
      if (e.key === '3' || e.key.toLowerCase() === 'r') {
        setCurrentMode('rotate');
      }
      // Handle Escape key for menus (existing logic)
      if (e.key === 'Escape') {
        if (world.input) {
          world.input.setCursorLock(false);
        }
        setMenuOpen(false);
        setActiveMenu(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
    // Include selectedApp in dependencies to re-bind if selection changes (though listener logic depends on it)
    // Add world.builder dependency since we now call methods on it
  }, [editorMode, world, selectedApp, handleDeleteSelectedApp, setCurrentMode]); // Add handleDeleteSelectedApp dependency

  // Reset layout function - update to include new defaults
  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
    setBottomCenterActiveTab('appMain'); // Reset tab
    setMenuOpen(false);
    setActiveMenu(null);
    try {
      localStorage.removeItem('editor-layout');
    } catch (e) {
      console.error("Error removing layout from localStorage:", e);
    }
  };

  // Toggle panel visibility - handles new panels
  const togglePanel = (panelName) => {
    setLayout(prev => ({
      ...prev,
      [panelName]: {
        ...(prev[panelName] || {}), // Handle potentially missing key briefly
        visible: !prev[panelName]?.visible
      }
    }));
    // If hiding the active tab, switch to another visible one if possible
    if (panelName === bottomCenterActiveTab && !layout[panelName]?.visible) {
        const availableTabs = ['appMain', 'appMeta', 'appNodes', 'console'].filter(key => layout[key]?.visible);
        if (availableTabs.length > 0) {
           setBottomCenterActiveTab(availableTabs[0]);
        }
    }
    setMenuOpen(false);
  };

  // Handle mode changes
  useEffect(() => {
    console.log('🔄 EditorUI: Mode change effect triggered. editorMode:', editorMode, 'currentMode:', currentMode, 'builder available:', !!world.builder);
    if (editorMode && world.builder) {
      console.log('🎯 EditorUI: Setting builder mode to:', currentMode);
      world.builder.setMode(currentMode)
    }
  }, [currentMode, editorMode, world.builder])

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
     // Special handling for the shared bottom-center height
     if (panelName === 'bottomCenter') {
         setLayout(prev => ({
            ...prev,
            bottomCenterHeight: size.height
         }));
     } else {
        // Standard panel resize
        setLayout(prev => ({
          ...prev,
          [panelName]: {
            ...prev[panelName],
            [sizeProp]: size[sizeProp] // Update width or height based on sizeProp
          }
        }));
     }
  };
  
  // Define panels for the bottom-center tabbed container
  const bottomCenterPanels = [
     { key: 'appMain', title: 'App', component: AppMainPanel },
     { key: 'appMeta', title: 'Meta', component: AppMetaPanel },
     { key: 'appNodes', title: 'Nodes', component: AppNodesPanel },
     { key: 'console', title: 'Console', component: ConsolePanel },
  ];

  if (!editorMode) {
    return null
  }

  return (
    <div 
      ref={editorUIRef}
      className="editor-ui"
      css={css`
        ${resizableStyles} 
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
        
        .main-content, .center-area, .react-resizable-box { overflow: visible !important; }
        .react-resizable { position: relative !important; }
      `}
    >
      <EditorMenuBar
        layout={layout}
        togglePanel={togglePanel}
        resetLayout={resetLayout}
        activeMenu={activeMenu}
        menuOpen={menuOpen}
        handleMenuClick={handleMenuClick}
        setMenuOpen={setMenuOpen}
        selectedApp={selectedApp}
        onDeleteSelectedApp={handleDeleteSelectedApp}
        onUndo={handleUndo}
      />
      <EditorToolbar
        currentMode={currentMode}
        setCurrentMode={setCurrentMode}
      />

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
        {/* Left Column (Hierarchy & Inspector) */}
        <ResizableBox
          width={layout.hierarchy.width}
          height={Infinity}
          axis="x"
          resizeHandles={['e']}
          minConstraints={[150, Infinity]}
          maxConstraints={[600, Infinity]}
          onResize={handleResize('hierarchy', 'width')}
          css={css`flex-shrink: 0; display: flex !important; flex-direction: column;`}
        >
          {/* Top Left: Hierarchy */}
          {layout.hierarchy?.visible && (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <HierarchyPanel
                apps={apps}
                world={world}
                selectedApp={selectedApp}
                onAppSelect={handleAppSelection}
                onDeleteApp={handleDeleteSelectedApp}
                onShowContextMenu={showContextMenu}
                onClose={() => togglePanel('hierarchy')}
              />
            </div>
          )}
          {/* Bottom Left: Inspector */}
          {layout.hierarchy?.visible && layout.inspector?.visible && (
            <div css={css`height: 1px; background-color: #1a1a1a; flex-shrink: 0;`}></div>
          )}
          {layout.inspector?.visible && (
            <ResizableBox
              width={Infinity}
              height={layout.inspector.height}
              axis="y"
              resizeHandles={['n']}
              minConstraints={[Infinity, 100]}
              maxConstraints={[Infinity, 600]}
              onResize={handleResize('inspector', 'height')}
              css={css`flex-shrink: 0; display: flex !important;`}
            >
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <InspectorPanel
                  selectedApp={selectedApp}
                  world={world}
                  onClose={() => togglePanel('inspector')}
                />
              </div>
            </ResizableBox>
          )}
        </ResizableBox>

        {/* Center Area (Viewport and Bottom Tabbed Panels) */}
        <div 
          className="center-area"
          css={css`
            flex: 1;
            display: flex;
            flex-direction: column;
            min-width: 0;
            overflow: hidden;
            border-left: 1px solid #1a1a1a;
            border-right: 1px solid #1a1a1a;
          `}
        >
          {/* Top Center: Viewport */}
          <ViewportPanel 
            world={world} 
            editorMode={editorMode}
            layout={layout} 
            togglePanel={togglePanel} 
          />

          {/* Bottom Center: Tabbed Panels (App/Meta/Nodes/Console) */}
          {(layout.appMain?.visible || layout.appMeta?.visible || layout.appNodes?.visible || layout.console?.visible) && (
             <ResizableBox
               height={layout.bottomCenterHeight}
               width={Infinity}
               axis="y"
               resizeHandles={['n']}
               minConstraints={[Infinity, 50]}
               maxConstraints={[Infinity, 800]}
               onResize={handleResize('bottomCenter', 'height')}
               css={css`flex-shrink: 0; display: flex !important; flex-direction: column; border-top: 1px solid #1a1a1a;`}
             >
                <TabbedPanelContainer
                   world={world}
                   app={selectedApp}
                   layout={layout}
                   panels={bottomCenterPanels}
                   activeTab={bottomCenterActiveTab}
                   setActiveTab={setBottomCenterActiveTab}
                   height={layout.bottomCenterHeight}
                   onCloseTab={togglePanel}
                />
            </ResizableBox>
          )}
        </div>

        {/* Right Column (Just Code Panel) */}
        {layout.code?.visible && (
          <ResizableBox
            width={layout.code.width || 350}
            height={Infinity}
            axis="x"
            resizeHandles={['w']}
            minConstraints={[150, Infinity]}
            maxConstraints={[1000, Infinity]}
            onResize={handleResize('code', 'width')}
            css={css`flex-shrink: 0; display: flex !important; flex-direction: column;`}
          >
            <div style={{flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column'}}>
              <CodePanel 
                selectedApp={selectedApp} 
                world={world} 
                onClose={() => togglePanel('code')} 
              />
            </div>
          </ResizableBox>
        )}
      </div>
      {/* Render Context Menu */}
      <ContextMenu
         visible={contextMenu.visible}
         x={contextMenu.x}
         y={contextMenu.y}
         items={contextMenu.items}
         onClose={hideContextMenu}
       />
    </div>
  )
} 