import { css } from '@firebolt-dev/css';
import React from 'react'; // Assuming React is used, adjust if necessary

// Helper components (extracted from EditorUI)
const MenuDropdown = ({ title, items }) => (
  <div className="dropdown-menu" css={css`
    position: absolute;
    top: 100%;
    left: 0;
    min-width: 180px;
    background-color: #383838;
    border: 1px solid #1a1a1a;
    border-radius: 2px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    z-index: 2000;
    overflow: visible;
  `}>
    <div css={css`padding: 5px; background-color: #4b4b4b; font-weight: bold; border-bottom: 1px solid #1a1a1a;`}>{title}</div>
    <div>
      {items.map((item, index) => (
        <div
          key={index}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (item.action) item.action();
          }}
          css={css`
            padding: 6px 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            &:hover { background-color: #4b4b4b; }
          `}
        >
          <div css={css`display: flex; align-items: center;`}>
            {typeof item.checked !== 'undefined' && (
              <span css={css`
                width: 14px;
                height: 14px;
                border: 1px solid #aaa;
                margin-right: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: ${item.checked ? '#4f87ff' : 'transparent'};
              `}>
                {item.checked && '✓'}
              </span>
            )}
            <span>{item.label}</span>
          </div>
          {item.shortcut && <span css={css`opacity: 0.6; font-size: 11px;`}>{item.shortcut}</span>}
        </div>
      ))}
    </div>
  </div>
);


export function EditorMenuBar({
  layout,
  togglePanel,
  resetLayout,
  activeMenu,
  menuOpen,
  handleMenuClick,
  setMenuOpen // Pass setMenuOpen directly
}) {

  // Menu items configuration (extracted from EditorUI)
  const fileMenuItems = [
    { label: 'New Scene', shortcut: 'Ctrl+N', action: () => setMenuOpen(false) },
    { label: 'Open Scene', shortcut: 'Ctrl+O', action: () => setMenuOpen(false) },
    { label: 'Save Scene', shortcut: 'Ctrl+S', action: () => setMenuOpen(false) },
    { label: 'Export', shortcut: 'Ctrl+E', action: () => setMenuOpen(false) },
  ];

  const editMenuItems = [
    { label: 'Undo', shortcut: 'Ctrl+Z', action: () => setMenuOpen(false) },
    { label: 'Redo', shortcut: 'Ctrl+Y', action: () => setMenuOpen(false) },
    { label: 'Cut', shortcut: 'Ctrl+X', action: () => setMenuOpen(false) },
    { label: 'Copy', shortcut: 'Ctrl+C', action: () => setMenuOpen(false) },
    { label: 'Paste', shortcut: 'Ctrl+V', action: () => setMenuOpen(false) },
  ];

  const windowMenuItems = [
    { label: 'Hierarchy', action: () => { togglePanel('hierarchy'); setMenuOpen(false); }, checked: layout.hierarchy.visible },
    { label: 'Inspector', action: () => { togglePanel('inspector'); setMenuOpen(false); }, checked: layout.inspector.visible },
    { label: 'Project', action: () => { togglePanel('project'); setMenuOpen(false); }, checked: layout.project.visible },
    { label: 'Console', action: () => { togglePanel('console'); setMenuOpen(false); }, checked: layout.console.visible },
    { label: 'Code', action: () => { togglePanel('code'); setMenuOpen(false); }, checked: layout.code.visible },
    { label: 'Reset Layout', action: () => { resetLayout(); setMenuOpen(false); } },
  ];

  return (
    <div
      className="menu-bar"
      css={css`
        height: 25px; /* Adjusted height */
        background-color: #252525; /* Original menubar color */
        display: flex;
        align-items: center;
        padding: 0 10px;
        border-bottom: 1px solid #1a1a1a;
        flex-shrink: 0;
        z-index: 1002; /* Ensure menu dropdowns are above */
        user-select: none;
      `}
    >
      {/* File Menu */}
      <div
        className="menu-item"
        css={css`
          margin-right: 15px;
          cursor: pointer;
          position: relative;
          padding: 0 5px;
          height: 100%;
          display: flex;
          align-items: center;
          &:hover { background-color: #3c3c3c; }
          ${activeMenu === 'File' && menuOpen ? 'background-color: #3c3c3c;' : ''}
        `}
        onClick={(e) => {
          e.stopPropagation();
          handleMenuClick('File');
        }}
      >
        File
        {activeMenu === 'File' && menuOpen && <MenuDropdown title="File" items={fileMenuItems} />}
      </div>

      {/* Edit Menu */}
      <div
        className="menu-item"
        css={css`
          margin-right: 15px;
          cursor: pointer;
          position: relative;
          padding: 0 5px;
          height: 100%;
          display: flex;
          align-items: center;
          &:hover { background-color: #3c3c3c; }
          ${activeMenu === 'Edit' && menuOpen ? 'background-color: #3c3c3c;' : ''}
        `}
        onClick={(e) => {
          e.stopPropagation();
          handleMenuClick('Edit');
        }}
      >
        Edit
        {activeMenu === 'Edit' && menuOpen && <MenuDropdown title="Edit" items={editMenuItems} />}
      </div>

      {/* Placeholder Menus */}
      <div css={css`margin-right: 15px; cursor: pointer; padding: 0 5px; height: 100%; display: flex; align-items: center; &:hover { background-color: #3c3c3c; }`}>Primitives</div>

      {/* Window Menu */}
      <div
        className="menu-item"
        css={css`
          margin-right: 15px;
          cursor: pointer;
          position: relative;
          padding: 0 5px;
          height: 100%;
          display: flex;
          align-items: center;
          &:hover { background-color: #3c3c3c; }
          ${activeMenu === 'Window' && menuOpen ? 'background-color: #3c3c3c;' : ''}
        `}
        onClick={(e) => {
          e.stopPropagation();
          handleMenuClick('Window');
        }}
      >
        Window
        {activeMenu === 'Window' && menuOpen && <MenuDropdown title="Window" items={windowMenuItems} />}
      </div>

      {/* Help Menu */}
      <div css={css`margin-right: 15px; cursor: pointer; padding: 0 5px; height: 100%; display: flex; align-items: center; &:hover { background-color: #3c3c3c; }`}>Help</div>
    </div>
  );
}
