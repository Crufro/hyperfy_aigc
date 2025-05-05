import { css } from '@firebolt-dev/css';
import React, { useState, useRef, useEffect } from 'react';
import { PanelHeader } from './PanelHeader'; // Assuming PanelHeader is extracted
import { CrosshairIcon } from 'lucide-react'; // Import the icon

export function HierarchyPanel({ apps, world, selectedApp, onAppSelect, onDeleteApp, onShowContextMenu, width, onClose }) {
  // State for tracking app being renamed and input value
  const [renamingApp, setRenamingApp] = useState(null);
  const [newName, setNewName] = useState('');
  const renameInputRef = useRef(null);

  useEffect(() => {
    // Focus the input field when entering rename mode
    if (renamingApp && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingApp]);

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
        { 
          label: 'Rename...', 
          action: () => {
            const currentName = app.blueprint?.name || app.name || `App ${app.data?.id}`;
            setRenamingApp(app);
            setNewName(currentName);
          } 
        },
        { label: 'Duplicate', action: () => alert('Duplicate action...'), disabled: true },
      ];

      onShowContextMenu(e.clientX, e.clientY, menuItems);
    } else {
      console.warn('onShowContextMenu function not provided to HierarchyPanel');
    }
  };

  const handleRenameConfirm = () => {
    if (renamingApp && newName.trim() !== '') {
      // Update app name in the world system
      if (world && renamingApp) {
        if (renamingApp.blueprint) {
          renamingApp.blueprint.name = newName.trim();
        } else {
          renamingApp.name = newName.trim();
        }
        
        // If there's a meta system, update there too (affects all instances)
        if (renamingApp.meta) {
          renamingApp.meta.name = newName.trim();
        }
      }
      
      // Exit rename mode
      setRenamingApp(null);
    } else {
      // If name is empty, just cancel
      setRenamingApp(null);
    }
  };

  const handleRenameCancel = () => {
    setRenamingApp(null);
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleRenameCancel();
    }
  };

  // Handle clicks outside the rename input to confirm
  useEffect(() => {
    if (!renamingApp) return;
    
    const handleClickOutside = (e) => {
      if (renameInputRef.current && !renameInputRef.current.contains(e.target)) {
        handleRenameConfirm();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [renamingApp, newName]);

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
              onClick={() => {
                // Don't select when in rename mode
                if (renamingApp !== app) {
                  onAppSelect(app);
                }
              }} 
              onContextMenu={(e) => handleContextMenu(e, app)} // Updated context menu handler
              title={renamingApp === app ? '' : `Right-click for options on ${app.blueprint?.name || app.name}`}
              css={css`
                display: flex; /* Use flexbox for layout */
                align-items: center; /* Vertically center items */
                justify-content: space-between; /* Push icon to the right */
                padding: 4px 8px;
                cursor: default;
                white-space: nowrap;
                overflow: hidden;
                position: relative; /* For positioning the rename input */
                /* text-overflow: ellipsis; No longer needed on container */
                &:hover {
                  background-color: ${renamingApp === app ? 'transparent' : '#404040'};
                }
                /* Add selected state styling */
                ${selectedApp === app && renamingApp !== app && css`
                  background-color: #4a5c75; /* Highlight color for selected item */
                  &:hover {
                    background-color: #5a6c85; /* Slightly different hover for selected */
                  }
                `}
              `}
            >
              {renamingApp === app ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  css={css`
                    width: 100%;
                    background-color: #3c3c3c;
                    color: #fff;
                    border: 1px solid #5a6c85;
                    border-radius: 2px;
                    padding: 2px 4px;
                    margin: -2px 0;
                    font-size: 12px;
                    outline: none;
                    z-index: 10;
                  `}
                />
              ) : (
                <>
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
                </>
              )}
            </div>
          ))
        ) : (
          <div css={css`padding: 4px 8px; color: #888;`}>No apps loaded</div>
        )}
      </div>
    </div>
  );
} 