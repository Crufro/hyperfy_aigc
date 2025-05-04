import { css } from '@firebolt-dev/css';
import React, { useState, useEffect, useMemo } from 'react';
import { PanelHeader } from './PanelHeader';
import { hashFile } from '../../core/utils-client'; // Import hashFile utility

export function CodePanel({ selectedApp, world, height, onClose }) {
  const [codeContent, setCodeContent] = useState(''); // Original fetched code
  const [editableCode, setEditableCode] = useState(''); // Code being edited
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Saving state
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null); // Specific save error state

  const scriptUrl = useMemo(() => {
    return selectedApp?.blueprint?.script;
  }, [selectedApp]);

  // Effect to fetch initial code
  useEffect(() => {
    if (!scriptUrl) {
      setCodeContent('');
      setEditableCode(''); // Reset editable code
      setError(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const fetchCode = async () => {
      setIsLoading(true);
      setError(null);
      setSaveError(null); // Clear save error on re-fetch
      try {
        // Check if code is already loaded on the entity (optimization)
        if (selectedApp.script?.code) {
          if (isMounted) {
             const initialCode = selectedApp.script.code;
             setCodeContent(initialCode);
             setEditableCode(initialCode); // Initialize editable code
             setIsLoading(false);
          }
          return;
        }
        
        // If not pre-loaded, try fetching via loader
        if (world?.loader) {
          // Check cache first
          let scriptResource = world.loader.get('script', scriptUrl);
          if (!scriptResource) {
              // Load if not in cache
              scriptResource = await world.loader.load('script', scriptUrl);
          } 

          if (isMounted) {
            let loadedCode = '';
            if (scriptResource instanceof Error) {
                 setError('Error loading script resource.');
                 setCodeContent('');
            } else if (typeof scriptResource?.text === 'function') {
                 const text = await scriptResource.text();
                 loadedCode = text;
            } else if (typeof scriptResource === 'string') {
                 loadedCode = scriptResource;
            } else {
                console.warn('Unexpected script resource format:', scriptResource);
                setError('Could not read script content.');
                setCodeContent('');
            }
            setCodeContent(loadedCode);
            setEditableCode(loadedCode); // Initialize editable code
          }
        } else {
             if (isMounted) setError('Loader unavailable.');
             setEditableCode(''); // Reset editable code
        }
      } catch (err) {
        console.error('Error fetching script content:', err);
        if (isMounted) setError('Failed to fetch script.');
        setEditableCode(''); // Reset editable code
      } finally {
         if (isMounted) setIsLoading(false);
      }
    };

    fetchCode();

    return () => {
      isMounted = false;
    };
  }, [scriptUrl, selectedApp, world?.loader]); // Re-fetch if URL or selected app changes

  const handleCodeChange = (event) => {
    setEditableCode(event.target.value);
    setSaveError(null); // Clear save error on edit
  };

  const handleSave = async () => {
    if (!selectedApp || !world || isSaving) return;

    setIsSaving(true);
    setSaveError(null);
    const blueprint = selectedApp.blueprint;
    const currentCode = editableCode;

    try {
      // 1. Create File
      const blob = new Blob([currentCode], { type: 'text/plain' });
      const file = new File([blob], 'script.js', { type: 'text/plain' });

      // 2. Hash File
      const hash = await hashFile(file);
      const filename = `${hash}.js`;
      const newUrl = `asset://${filename}`;

      // 3. Cache Locally
      world.loader.insert('script', newUrl, file);
      
      // 4. Update Blueprint (Local)
      const newVersion = (blueprint.version || 0) + 1;
      world.blueprints.modify({ id: blueprint.id, version: newVersion, script: newUrl });
      // Note: world.blueprints.modify should trigger updates in the app entity
      // including potentially updating selectedApp.script.code indirectly.
      // We'll update the local state optimistically.
      setCodeContent(currentCode);

      // 5. Upload Script
      await world.network.upload(file);

      // 6. Broadcast Blueprint Change
      world.network.send('blueprintModified', { id: blueprint.id, version: newVersion, script: newUrl });

      // alert('Code saved successfully!'); // Optional: Add success feedback

    } catch (err) {
      console.error('Error saving script:', err);
      setSaveError(`Failed to save script: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Determine if code has changed
  const hasChanges = editableCode !== codeContent;

  return (
    <div
      className="code-panel"
      style={{ height: '100%' }} // Use full height provided by ResizableBox
      css={css`
        background-color: #2a2a2a; /* Slightly different background */
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #ccc;
      `}
    >
      <PanelHeader title="Code" onClose={onClose} />
      <div 
        className="panel-content"
        css={css`
          flex: 1; 
          /* padding: 5px; Remove padding here */
          overflow: hidden; /* Change to hidden to manage scrolling internally */
          min-height: 0; 
          display: flex; /* Use flex column for textarea + button */
          flex-direction: column;
        `}
      >
        {isLoading ? (
          <div css={css`padding: 5px;`}>Loading code...</div>
        ) : error ? (
          <div css={css`color: #ff6b6b; padding: 5px;`}>{error}</div>
        ) : selectedApp ? (
          scriptUrl ? (
            <textarea
              value={editableCode}
              onChange={handleCodeChange}
              readOnly={isSaving} // Disable editing while saving
              css={css`
                flex-grow: 1; /* Take available vertical space */
                width: 100%;
                height: 100%; /* Ensure it tries to fill */
                background-color: #1e1e1e; /* Darker background for editor */
                color: #d4d4d4;
                border: none;
                outline: none;
                padding: 8px;
                font-family: 'Consolas', 'Monaco', 'monospace';
                font-size: 12px;
                line-height: 1.5;
                resize: none; /* Disable manual resize handle */
                white-space: pre; /* Keep whitespace */
                overflow: auto; /* Allow scrolling within textarea */
              `}
              placeholder="// Enter your JavaScript code here..."
            />
          ) : (
            <div css={css`padding: 5px;`}>Selected app has no script.</div>
          )
        ) : (
          <div css={css`padding: 5px;`}>Select an app in the Hierarchy to view its code.</div>
        )}
      </div>
      {/* Footer for Save button and status */}
      {selectedApp && scriptUrl && !isLoading && !error && (
         <div css={css`
           flex-shrink: 0;
           padding: 5px 8px;
           background-color: #333;
           border-top: 1px solid #1a1a1a;
           display: flex;
           align-items: center;
           justify-content: space-between;
         `}>
            <span css={css`
              font-size: 10px;
              color: ${saveError ? '#ff6b6b' : (hasChanges ? '#e0e077' : '#888')};
            `}>
              {isSaving ? 'Saving...' : saveError ? saveError : (hasChanges ? 'Unsaved changes' : 'Saved')}
            </span>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              css={css`
                padding: 3px 10px;
                font-size: 11px;
                background-color: ${hasChanges && !isSaving ? '#4f87ff' : '#555'};
                color: white;
                border: none;
                border-radius: 3px;
                cursor: ${hasChanges && !isSaving ? 'pointer' : 'default'};
                opacity: ${hasChanges && !isSaving ? 1 : 0.6};
                &:hover {
                  background-color: ${hasChanges && !isSaving ? '#699dff' : '#555'};
                }
              `}
            >
              Save
            </button>
         </div>
      )}
    </div>
  );
} 