import { css } from '@firebolt-dev/css';
import React from 'react';
import { PanelHeader } from './PanelHeader'; // Assuming PanelHeader is extracted
import { CrosshairIcon } from 'lucide-react'; // Import the icon

export function HierarchyPanel({ apps, world, selectedApp, onAppSelect, onDeleteApp, onShowContextMenu, width, onClose }) {
  const handleFindApp = (e, app) => {
    e.stopPropagation(); // Prevent selection when clicking the icon
    if (world && world.target && app.root) {
      world.target.show(app.root.position);
    } else {
      console.warn('Could not find app or target system:', app);
    }
  };

  const handleContextMenu = (e, app) => {
    e.preventDefault(); // Prevent default context menu
    e.stopPropagation(); // Prevent selection/other clicks

    if (onShowContextMenu) {
      // Define menu items for the app context menu
      const menuItems = [
        {
          label: `Delete '${app.blueprint?.name || app.name || `App ${app.data?.id}`}'`,
          action: () => {
            // Directly tell the EditorUI to delete *this specific* app
            // Pass the specific app to the delete handler
            if (onDeleteApp) {
              onDeleteApp(app); 
            }
          },
          // Optionally disable if needed, e.g., for protected apps
          // disabled: app.isProtected,
        },
        { isSeparator: true }, // Example separator
        { label: 'Rename...', action: () => alert('Rename action...'), disabled: true },
        { label: 'Duplicate', action: () => alert('Duplicate action...'), disabled: true },
      ];

      onShowContextMenu(e.clientX, e.clientY, menuItems);
    } else {
      console.warn('onShowContextMenu function not provided to HierarchyPanel');
    }
  };

  return (
    <div
      className="hierarchy-panel"
      style={{ width: width }}
      css={css`
        background-color: #303030;
        border-right: 1px solid #1a1a1a;
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        overflow: hidden; /* Prevent content overflow */
      `}
    >
      <PanelHeader title="Hierarchy" onClose={onClose} />
      <div 
        className="panel-content"
        css={css`
          flex: 1; 
          padding: 5px; 
          overflow: auto; /* Allow scrolling */
          min-height: 0; /* Ensure flex shrink works correctly */
        `}
      >
        {/* Iterate over the apps array and display their names */}
        {apps && apps.length > 0 ? (
          apps.map(app => (
            <div 
              key={app.data?.id || Math.random()} // Use instance ID as key, fallback if needed
              onClick={() => onAppSelect(app)} // Use the new handler
              onContextMenu={(e) => handleContextMenu(e, app)} // Updated context menu handler
              title={`Right-click for options on ${app.blueprint?.name || app.name}`}
              css={css`
                display: flex; /* Use flexbox for layout */
                align-items: center; /* Vertically center items */
                justify-content: space-between; /* Push icon to the right */
                padding: 4px 8px;
                cursor: default;
                white-space: nowrap;
                overflow: hidden;
                /* text-overflow: ellipsis; No longer needed on container */
                &:hover {
                  background-color: #404040;
                }
                /* Add selected state styling */
                ${selectedApp === app && css`
                  background-color: #4a5c75; /* Highlight color for selected item */
                  &:hover {
                    background-color: #5a6c85; /* Slightly different hover for selected */
                  }
                `}
              `}
            >
              <span css={css` /* Span for text to allow ellipsis */
                overflow: hidden;
                text-overflow: ellipsis;
                flex-grow: 1; /* Allow text to take available space */
                margin-right: 5px; /* Space between text and icon */
              `}>
                {app.blueprint?.name || app.name || `App ${app.data?.id}` } {/* Display name, fallback */}
              </span>
              <button 
                onClick={(e) => handleFindApp(e, app)} // Pass event to stop propagation
                title="Find App in Scene"
                css={css`
                  background: none;
                  border: none;
                  padding: 2px;
                  margin: 0;
                  color: #ccc; /* Icon color */
                  cursor: pointer;
                  display: inline-flex; /* Align icon */
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0; /* Prevent icon from shrinking */
                  &:hover {
                    color: #fff; /* Brighter icon on hover */
                  }
                `}
              >
                <CrosshairIcon size={14} />
              </button>
            </div>
          ))
        ) : (
          <div css={css`padding: 4px 8px; color: #888;`}>No apps loaded</div>
        )}
      </div>
    </div>
  );
} 