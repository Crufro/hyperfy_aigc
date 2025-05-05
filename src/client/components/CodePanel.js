import { css } from '@firebolt-dev/css';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PanelHeader } from './PanelHeader';
import { hashFile } from '../../core/utils-client'; // Import hashFile utility

// --- Monaco Loader and Theme (adapted from CodeEditor.js) ---
let monacoLoadPromise;
const loadMonaco = () => {
  if (monacoLoadPromise) return monacoLoadPromise;
  monacoLoadPromise = new Promise(async resolve => {
    if (window.monaco) {
      resolve(window.monaco);
      return;
    }
    window.require = {
      paths: {
        vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.49.0/min/vs',
      },
    };
    await new Promise(resolveLoader => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.49.0/min/vs/loader.js';
      script.onload = () => resolveLoader();
      script.onerror = () => {
          console.error("Failed to load Monaco loader.");
          resolve(null); // Resolve with null on error
      };
      document.head.appendChild(script);
    });
    // Check if require was loaded
    if (!window.require) {
       resolve(null);
       return;
    }
    await new Promise(resolveEditor => {
      window.require(['vs/editor/editor.main'], () => {
        resolveEditor();
      }, (err) => {
          console.error("Failed to load Monaco editor core:", err);
          resolve(null); // Resolve with null on error
      });
    });
    if (window.monaco) {
        monaco.editor.defineTheme('default', darkPlusTheme); // Define theme here
        monaco.editor.setTheme('default');
        resolve(window.monaco);
    } else {
        resolve(null);
    }
  });
  return monacoLoadPromise;
};

const darkPlusTheme = { /* ... Keep the theme definition from CodeEditor.js ... */ 
  inherit: true,
  base: 'vs-dark',
  rules: [ { foreground: '#DCDCAA', token: 'entity.name.function', }, { foreground: '#DCDCAA', token: 'support.function', }, { foreground: '#DCDCAA', token: 'support.constant.handlebars', }, { foreground: '#DCDCAA', token: 'source.powershell variable.other.member', }, { foreground: '#DCDCAA', token: 'entity.name.operator.custom-literal', }, { foreground: '#4EC9B0', token: 'meta.return-type', }, { foreground: '#4EC9B0', token: 'support.class', }, { foreground: '#4EC9B0', token: 'support.type', }, { foreground: '#4EC9B0', token: 'entity.name.type', }, { foreground: '#4EC9B0', token: 'entity.name.namespace', }, { foreground: '#4EC9B0', token: 'entity.other.attribute', }, { foreground: '#4EC9B0', token: 'entity.name.scope-resolution', }, { foreground: '#4EC9B0', token: 'entity.name.class', }, { foreground: '#4EC9B0', token: 'storage.type.numeric.go', }, { foreground: '#4EC9B0', token: 'storage.type.byte.go', }, { foreground: '#4EC9B0', token: 'storage.type.boolean.go', }, { foreground: '#4EC9B0', token: 'storage.type.string.go', }, { foreground: '#4EC9B0', token: 'storage.type.uintptr.go', }, { foreground: '#4EC9B0', token: 'storage.type.error.go', }, { foreground: '#4EC9B0', token: 'storage.type.rune.go', }, { foreground: '#4EC9B0', token: 'storage.type.cs', }, { foreground: '#4EC9B0', token: 'storage.type.generic.cs', }, { foreground: '#4EC9B0', token: 'storage.type.modifier.cs', }, { foreground: '#4EC9B0', token: 'storage.type.variable.cs', }, { foreground: '#4EC9B0', token: 'storage.type.annotation.java', }, { foreground: '#4EC9B0', token: 'storage.type.generic.java', }, { foreground: '#4EC9B0', token: 'storage.type.java', }, { foreground: '#4EC9B0', token: 'storage.type.object.array.java', }, { foreground: '#4EC9B0', token: 'storage.type.primitive.array.java', }, { foreground: '#4EC9B0', token: 'storage.type.primitive.java', }, { foreground: '#4EC9B0', token: 'storage.type.token.java', }, { foreground: '#4EC9B0', token: 'storage.type.groovy', }, { foreground: '#4EC9B0', token: 'storage.type.annotation.groovy', }, { foreground: '#4EC9B0', token: 'storage.type.parameters.groovy', }, { foreground: '#4EC9B0', token: 'storage.type.generic.groovy', }, { foreground: '#4EC9B0', token: 'storage.type.object.array.groovy', }, { foreground: '#4EC9B0', token: 'storage.type.primitive.array.groovy', }, { foreground: '#4EC9B0', token: 'storage.type.primitive.groovy', }, { foreground: '#4EC9B0', token: 'meta.type.cast.expr', }, { foreground: '#4EC9B0', token: 'meta.type.new.expr', }, { foreground: '#4EC9B0', token: 'support.constant.math', }, { foreground: '#4EC9B0', token: 'support.constant.dom', }, { foreground: '#4EC9B0', token: 'support.constant.json', }, { foreground: '#4EC9B0', token: 'entity.other.inherited-class', }, { foreground: '#C586C0', token: 'keyword.control', }, { foreground: '#C586C0', token: 'source.cpp keyword.operator.new', }, { foreground: '#C586C0', token: 'keyword.operator.delete', }, { foreground: '#C586C0', token: 'keyword.other.using', }, { foreground: '#C586C0', token: 'keyword.other.operator', }, { foreground: '#C586C0', token: 'entity.name.operator', }, { foreground: '#9CDCFE', token: 'variable', }, { foreground: '#9CDCFE', token: 'meta.definition.variable.name', }, { foreground: '#9CDCFE', token: 'support.variable', }, { foreground: '#9CDCFE', token: 'entity.name.variable', }, { foreground: '#4FC1FF', token: 'variable.other.constant', }, { foreground: '#4FC1FF', token: 'variable.other.enummember', }, { foreground: '#9CDCFE', token: 'meta.object-literal.key', }, { foreground: '#CE9178', token: 'support.constant.property-value', }, { foreground: '#CE9178', token: 'support.constant.font-name', }, { foreground: '#CE9178', token: 'support.constant.media-type', }, { foreground: '#CE9178', token: 'support.constant.media', }, { foreground: '#CE9178', token: 'constant.other.color.rgb-value', }, { foreground: '#CE9178', token: 'constant.other.rgb-value', }, { foreground: '#CE9178', token: 'support.constant.color', }, { foreground: '#CE9178', token: 'punctuation.definition.group.regexp', }, { foreground: '#CE9178', token: 'punctuation.definition.group.assertion.regexp', }, { foreground: '#CE9178', token: 'punctuation.definition.character-class.regexp', }, { foreground: '#CE9178', token: 'punctuation.character.set.begin.regexp', }, { foreground: '#CE9178', token: 'punctuation.character.set.end.regexp', }, { foreground: '#CE9178', token: 'keyword.operator.negation.regexp', }, { foreground: '#CE9178', token: 'support.other.parenthesis.regexp', }, { foreground: '#d16969', token: 'constant.character.character-class.regexp', }, { foreground: '#d16969', token: 'constant.other.character-class.set.regexp', }, { foreground: '#d16969', token: 'constant.other.character-class.regexp', }, { foreground: '#d16969', token: 'constant.character.set.regexp', }, { foreground: '#DCDCAA', token: 'keyword.operator.or.regexp', }, { foreground: '#DCDCAA', token: 'keyword.control.anchor.regexp', }, { foreground: '#d7ba7d', token: 'keyword.operator.quantifier.regexp', }, { foreground: '#569cd6', token: 'constant.character', }, { foreground: '#d7ba7d', token: 'constant.character.escape', }, { foreground: '#C8C8C8', token: 'entity.name.label', }, { foreground: '#569CD6', token: 'constant.language', }, { foreground: '#569CD6', token: 'entity.name.tag', }, { foreground: '#569cd6', token: 'storage', } ],
  colors: {
    'editor.background': '#1e1e1e', // Match textarea background
    'editor.foreground': '#d4d4d4',
    'editorCursor.foreground': '#d4d4d4',
    'editorWhitespace.foreground': '#3B3A32A0',
    'editorIndentGuide.background': '#404040',
    'editorIndentGuide.activeBackground': '#707070',
    'editor.lineHighlightBackground': '#2a2a2a', // Match panel background
    'editor.selectionBackground': '#44475a',
  },
  encodedTokensColors: [],
};
// --- End Monaco Helpers --- 

export function CodePanel({ selectedApp, world, onClose }) {
  const [codeContent, setCodeContent] = useState('// No script loaded'); // Default state
  const editableCodeRef = useRef(codeContent); // Use ref for live editor content
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false); // State to track unsaved changes

  const editorRef = useRef(null); // Ref for Monaco editor instance
  const monacoMountRef = useRef(null); // Ref for DOM mount point

  const scriptUrl = useMemo(() => {
    return selectedApp?.blueprint?.script;
  }, [selectedApp]);

  // Effect to fetch initial code
  useEffect(() => {
    // First, clean up any existing editor when selected app changes
    if (editorRef.current) {
      editorRef.current.dispose();
      editorRef.current = null;
    }
    
    // Reset states when selection changes
    setError(null);
    setSaveError(null);
    setHasChanges(false);
    setIsLoading(selectedApp != null); // Only show loading if we have a selected app

    if (!selectedApp) {
      setCodeContent('');
      editableCodeRef.current = '';
      return;
    }
    
    if (!scriptUrl) {
      setCodeContent('');
      editableCodeRef.current = '';
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const fetchCode = async () => {
      setIsLoading(true);
      let initialCode = '// Error loading script'; // Default on error

      try {
        if (selectedApp.script?.code) {
          initialCode = selectedApp.script.code;
        } else if (world?.loader) {
          let scriptResource = world.loader.get('script', scriptUrl) || await world.loader.load('script', scriptUrl);
          if (scriptResource instanceof Error) {
            setError('Error loading script resource.');
          } else if (typeof scriptResource?.text === 'function') {
            initialCode = await scriptResource.text();
          } else if (typeof scriptResource === 'string') {
            initialCode = scriptResource;
          } else {
            console.warn('Unexpected script resource format:', scriptResource);
            setError('Could not read script content.');
          }
        } else {
          setError('Loader unavailable.');
        }
      } catch (err) {
        console.error('Error fetching script content:', err);
        setError('Failed to fetch script.');
      } finally {
        if (isMounted) {
          setCodeContent(initialCode);
          editableCodeRef.current = initialCode; // Initialize ref
          setIsLoading(false);
        }
      }
    };

    fetchCode();

    return () => {
      isMounted = false;
    };
  }, [scriptUrl, selectedApp, world?.loader]);

  // Separate effect to handle editor initialization
  useEffect(() => {
    // Only create a new editor if we have a script and a mount point
    if (!monacoMountRef.current || !scriptUrl || isLoading || error) {
      return;
    }
    
    // Clean up any existing editor before creating a new one
    if (editorRef.current) {
      editorRef.current.dispose();
      editorRef.current = null;
    }
    
    let isMounted = true;
    
    loadMonaco().then(monaco => {
      if (!isMounted || !monaco || !monacoMountRef.current) { 
        return; 
      }
      
      const editorInstance = monaco.editor.create(monacoMountRef.current, {
        value: editableCodeRef.current, // Use ref for initial value
        language: 'javascript',
        theme: 'default', // Use the defined theme
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        minimap: { enabled: false },
        automaticLayout: true, // Important for resize handling
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'off', // Default off
      });

      // Store instance
      editorRef.current = editorInstance;

      // Listen for changes
      editorInstance.onDidChangeModelContent(() => {
        editableCodeRef.current = editorInstance.getValue();
        // Update hasChanges state for UI feedback
        setHasChanges(editableCodeRef.current !== codeContent);
      });

      // Add save action with explicit keybinding
      editorInstance.addAction({
        id: 'save-script',
        label: 'Save Script',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        run: () => handleSave(), // Call our save handler
      });
      
      // Set focus
      editorInstance.focus();
      setHasChanges(false); // Ensure changes are reset on load
    });

    return () => {
      isMounted = false;
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, [monacoMountRef.current, scriptUrl, isLoading, error, codeContent]); 

  // Add a global keyboard shortcut for Ctrl+S as a fallback
  useEffect(() => {
    // Only add the listener if we have a script and the editor is active
    if (!selectedApp || !scriptUrl || isLoading || error) {
      return;
    }

    const handleKeyDown = (e) => {
      // Check for Ctrl+S or Cmd+S (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Prevent browser save dialog
        if (hasChanges && !isSaving) {
          handleSave();
        }
      }
    };

    // Add the event listener to the document
    document.addEventListener('keydown', handleKeyDown);

    // Clean up
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedApp, scriptUrl, isLoading, error, hasChanges, isSaving]);

  const handleSave = async () => {
    if (!selectedApp || !world || isSaving || !editorRef.current) return;

    setIsSaving(true);
    setSaveError(null);
    const blueprint = selectedApp.blueprint;
    const currentCode = editableCodeRef.current; // Get code from ref

    try {
      const blob = new Blob([currentCode], { type: 'text/plain' });
      const file = new File([blob], 'script.js', { type: 'text/plain' });
      const hash = await hashFile(file);
      const filename = `${hash}.js`;
      const newUrl = `asset://${filename}`;

      world.loader.insert('script', newUrl, file);
      const newVersion = (blueprint.version || 0) + 1;
      world.blueprints.modify({ id: blueprint.id, version: newVersion, script: newUrl });

      // Optimistically update original content state and reset changes flag
      setCodeContent(currentCode);
      setHasChanges(false); 

      await world.network.upload(file);
      world.network.send('blueprintModified', { id: blueprint.id, version: newVersion, script: newUrl });

    } catch (err) {
      console.error('Error saving script:', err);
      setSaveError(`Failed to save script: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // New function to create a blank script
  const handleCreateScript = async () => {
    if (!selectedApp || !world) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create a blank script content with basic structure - include the app ID for unique identification
      const blankScriptContent = `// Script for ${selectedApp.blueprint?.name || 'App'} (ID: ${selectedApp.blueprint?.id || 'unknown'})\n\n// This function runs when the app is initialized\nexport function init() {\n  // Your initialization code here\n}\n\n// This function runs on each frame update\nexport function update(time, delta) {\n  // Your update code here\n}\n`;
      
      const blob = new Blob([blankScriptContent], { type: 'text/plain' });
      const file = new File([blob], `script_${selectedApp.blueprint?.id}.js`, { type: 'text/plain' });
      const hash = await hashFile(file);
      const filename = `${hash}.js`;
      const newUrl = `asset://${filename}`;

      world.loader.insert('script', newUrl, file);
      const newVersion = (selectedApp.blueprint.version || 0) + 1;
      world.blueprints.modify({ id: selectedApp.blueprint.id, version: newVersion, script: newUrl });

      // Update content state
      setCodeContent(blankScriptContent);
      editableCodeRef.current = blankScriptContent;
      
      // Upload the file
      await world.network.upload(file);
      world.network.send('blueprintModified', { id: selectedApp.blueprint.id, version: newVersion, script: newUrl });
      
      // The scriptUrl should change after the blueprint is modified, which will trigger the useEffect above
      setHasChanges(false);
    } catch (err) {
      console.error('Error creating script:', err);
      setError(`Failed to create script: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // hasChanges state is now updated by the editor listener

  return (
    <div
      className="code-panel"
      style={{ height: '100%' }}
      css={css`
        background-color: #2a2a2a; 
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #ccc;
        
        .monaco-editor .margin, .monaco-editor .monaco-editor-background {
           background-color: #1e1e1e; /* Ensure editor background matches theme */
        }
        .monaco-editor .current-line ~ .margin {
            background-color: #2a2a2a; /* Match line highlight */
        }
      `}
    >
      <PanelHeader title="Code" onClose={onClose} />
      <div 
        className="panel-content"
        css={css`
          flex: 1; 
          overflow: hidden; 
          min-height: 0; 
          display: flex; 
          flex-direction: column;
        `}
      >
        {isLoading ? (
          <div css={css`padding: 10px; text-align: center;`}>Loading...</div>
        ) : error ? (
          <div css={css`color: #ff6b6b; padding: 10px; text-align: center;`}>{error}</div>
        ) : selectedApp ? (
          scriptUrl ? (
            // Monaco Editor Mount Point
            <div 
               ref={monacoMountRef} 
               css={css`
                  flex-grow: 1; 
                  width: 100%; 
                  height: 100%; 
                  overflow: hidden;
               `}
            />
          ) : (
            <div 
              css={css`
                padding: 10px; 
                text-align: center; 
                color: #888;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 10px;
                min-height: 120px;
                height: auto;
                margin-top: 20px;
              `}
            >
              <div css={css`font-size: 14px;`}>Selected app has no script.</div>
              <button
                onClick={handleCreateScript}
                css={css`
                  padding: 8px 16px;
                  font-size: 14px;
                  background-color: #4f87ff;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  margin-top: 5px;
                  &:hover {
                    background-color: #699dff;
                  }
                `}
              >
                Add Script
              </button>
            </div>
          )
        ) : (
          <div css={css`padding: 10px; text-align: center; color: #888;`}>Select an app in the Hierarchy to view its code.</div>
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
           height: 28px; /* Match tab header height */
         `}>
            <span css={css`
              font-size: 10px;
              color: ${saveError ? '#ff6b6b' : (hasChanges ? '#e0e077' : '#888')};
            `}>
              {isSaving ? 'Saving...' : saveError ? saveError : (hasChanges ? 'Unsaved changes (Ctrl+S to save)' : 'Saved')}
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
              {isSaving ? 'Saving...' : 'Save'} {/* Change button text while saving */}
            </button>
         </div>
      )}
    </div>
  );
} 