import { css } from '@firebolt-dev/css';
import React, { useEffect, useRef } from 'react';

export function ContextMenu({ visible, x, y, items, onClose }) {
  const menuRef = useRef(null);

  // Close menu if clicking outside
  useEffect(() => {
    if (!visible) return; // Only run if visible

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    }
    // Use setTimeout to ensure the click that opened the menu doesn't immediately close it
    const timerId = setTimeout(() => {
       document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [visible, onClose]);

  if (!visible || !items || items.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ top: y, left: x }}
      css={css`
        position: absolute;
        min-width: 150px;
        background-color: #383838;
        border: 1px solid #1a1a1a;
        border-radius: 3px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
        z-index: 3000; /* Ensure it's above other UI */
        padding: 4px 0;
        font-size: 12px;
        color: #e0e0e0;
        user-select: none;
      `}
    >
      {items.map((item, index) => (
        item.isSeparator ? (
           <div key={`sep-${index}`} css={css`height: 1px; background-color: #4b4b4b; margin: 4px 0;`}></div>
        ) : (
          <div
            key={item.label || index}
            onClick={(e) => {
              e.stopPropagation(); // Prevent closing logic if clicking inside
              if (item.action && !item.disabled) {
                item.action();
                onClose(); // Close menu after action
              }
            }}
            css={css`
              padding: 5px 15px;
              cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
              opacity: ${item.disabled ? 0.5 : 1};
              white-space: nowrap;
              &:hover {
                background-color: ${!item.disabled ? '#4a5c75' : 'transparent'};
              }
            `}
          >
            {item.label}
            {/* TODO: Add support for shortcuts or icons if needed */}
          </div>
        )
      ))}
    </div>
  );
} 
 