import { css } from '@firebolt-dev/css';
import { useState, useEffect } from 'react';
import { isArray } from 'lodash-es';
import {
  fileKinds,
  InputDropdown,
  InputFile,
  InputNumber,
  InputRange,
  InputSwitch,
  InputText,
  InputTextarea,
} from './Inputs';
import { PanelHeader } from './PanelHeader';

// Main Panel Component
export function FieldsPanel({ selectedApp, world, height, onClose }) {
  const blueprint = selectedApp ? world.blueprints.get(selectedApp.blueprintId) : null;

  return (
    <div 
      className="fields-panel" 
      style={{ height: `${height}px`, display: 'flex', flexDirection: 'column' }}
      css={css`
        background-color: #2a2a2a; /* Slightly different background */
        color: #e0e0e0;
        border-top: 1px solid #1a1a1a; /* Add border if needed */
        overflow: hidden; /* Prevent content overflow */
      `}
    >
      <PanelHeader title="Fields" onClose={onClose} />
      <div 
        className="fields-content noscrollbar" 
        css={css`
          flex: 1;
          padding: 10px;
          overflow-y: auto; /* Allow scrolling */
          min-height: 0; /* Ensure flex shrinking works */
        `}
      >
        {selectedApp && blueprint ? (
          <Fields app={selectedApp} blueprint={blueprint} />
        ) : (
          <div css={css`text-align: center; padding-top: 20px; color: #888;`}>
            Select an App to view its fields.
          </div>
        )}
      </div>
    </div>
  );
}

// --- Extracted Field Components from InspectPane.js ---

export function Fields({ app, blueprint }) { // Make exportable
  const world = app.world;
  const [fields, setFields] = useState(() => app.fields || []); // Initialize with empty array if no fields
  const props = blueprint.props;

  // Subscribe to field updates
  useEffect(() => {
    const updateFields = (newFields) => {
      setFields(newFields || []); // Ensure it's always an array
    };
    app.onFields = updateFields;
    // Initial set in case fields are already populated
    updateFields(app.fields);
    return () => {
      app.onFields = null;
    };
  }, [app]); // Re-run if app instance changes

  // Modify blueprint props
  const modify = (key, value) => {
    if (props[key] === value) return;
    // Create a new props object to avoid mutation issues
    const newProps = { ...props, [key]: value }; 
    const id = blueprint.id;
    const version = blueprint.version + 1;
    // Update blueprint locally (also rebuilds apps)
    world.blueprints.modify({ id, version, props: newProps });
    // Broadcast blueprint change to server + other clients
    world.network.send('blueprintModified', { id, version, props: newProps });
  };

  // Render only if fields exist
  if (!fields || fields.length === 0) {
    return <div css={css`padding: 10px; color: #888;`}>No configurable fields.</div>;
  }

  return fields.map(field => (
    <Field key={field.key} world={world} props={props} field={field} value={props?.[field.key]} modify={modify} /> // Use optional chaining for value
  ));
}

const fieldTypes = {
  section: FieldSection,
  text: FieldText,
  textarea: FieldTextArea, // Corrected name
  number: FieldNumber,
  file: FieldFile,
  switch: FieldSwitch,
  dropdown: FieldDropdown,
  range: FieldRange,
  button: FieldButton,
  buttons: FieldButtons,
};

function Field({ world, props, field, value, modify }) {
  if (field.hidden) {
    return null;
  }
  if (field.when && isArray(field.when)) {
    for (const rule of field.when) {
      // Add check for rule existence and key
      if (rule && rule.key && rule.op === 'eq' && props?.[rule.key] !== rule.value) { 
        return null;
      }
       // Add other operators if needed (e.g., 'neq')
      if (rule && rule.key && rule.op === 'neq' && props?.[rule.key] === rule.value) {
        return null;
      }
    }
  }
  const FieldControl = fieldTypes[field.type];
  if (!FieldControl) return null;
  return <FieldControl world={world} field={field} value={value} modify={modify} />; // Pass props down
}

function FieldWithLabel({ label, children }) {
  return (
    <div
      className='fieldwlabel'
      css={css`
        display: flex;
        align-items: flex-start; /* Align items to the top */
        margin: 0 0 10px;
        .fieldwlabel-label {
          width: 90px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7); /* Slightly brighter label */
          padding-top: 7px; /* Align with typical input height */
          flex-shrink: 0;
        }
        .fieldwlabel-content {
          flex: 1;
        }
      `}
    >
      <div className='fieldwlabel-label'>{label}</div>
      <div className='fieldwlabel-content'>{children}</div>
    </div>
  );
}

function FieldSection({ world, field, value, modify }) {
  return (
    <div
      className='fieldsection'
      css={css`
        border-top: 1px solid rgba(255, 255, 255, 0.1); /* Brighter border */
        margin: 20px -10px 14px -10px; /* Span full width */
        padding: 16px 10px 0 10px; /* Add padding back */
        .fieldsection-label {
          font-size: 14px;
          font-weight: 500; /* Slightly bolder */
          line-height: 1;
          color: rgba(255, 255, 255, 0.8);
        }
      `}
    >
      <div className='fieldsection-label'>{field.label}</div>
    </div>
  );
}

function FieldText({ world, field, value, modify }) {
  return (
    <FieldWithLabel label={field.label}>
      <InputText value={value} onChange={value => modify(field.key, value)} placeholder={field.placeholder} />
    </FieldWithLabel>
  );
}

function FieldTextArea({ world, field, value, modify }) { // Corrected export name
  return (
    <FieldWithLabel label={field.label}>
      <InputTextarea value={value} onChange={value => modify(field.key, value)} placeholder={field.placeholder} />
    </FieldWithLabel>
  );
}

function FieldNumber({ world, field, value, modify }) {
  return (
    <FieldWithLabel label={field.label}>
      <InputNumber
        placeholder={field.placeholder}
        value={value}
        onChange={value => modify(field.key, value)}
        dp={field.dp}
        min={field.min}
        max={field.max}
        step={field.step}
      />
    </FieldWithLabel>
  );
}

function FieldRange({ world, field, value, modify }) {
  return (
    <FieldWithLabel label={field.label}>
      <InputRange
        value={value}
        onChange={value => modify(field.key, value)}
        min={field.min}
        max={field.max}
        step={field.step}
      />
    </FieldWithLabel>
  );
}

function FieldFile({ world, field, value, modify }) {
  // fileKinds likely needs to be imported or passed down if used here
  // Assuming fileKinds is available globally or passed via world/context for now.
  // const kind = fileKinds[field.kind]; 
  // if (!kind) return null; 
  return (
    <FieldWithLabel label={field.label}>
      <InputFile world={world} kind={field.kind} value={value} onChange={value => modify(field.key, value)} />
    </FieldWithLabel>
  );
}

function FieldSwitch({ world, field, value, modify }) {
  return (
    <FieldWithLabel label={field.label}>
      <InputSwitch options={field.options} value={value} onChange={value => modify(field.key, value)} />
    </FieldWithLabel>
  );
}

function FieldDropdown({ world, field, value, modify }) {
  return (
    <FieldWithLabel label={field.label}>
      <InputDropdown options={field.options} value={value} onChange={value => modify(field.key, value)} />
    </FieldWithLabel>
  );
}

function FieldButton({ world, field, value, modify }) {
   // This component likely doesn't need modify/value, but needs access to app/world for actions
  const handleClick = () => {
    if (field.action && typeof field.action === 'string') {
       // Example: Send a network message or call a world method
       // This needs concrete implementation based on expected actions
       console.log(`Button '${field.label}' clicked, action: ${field.action}`);
       if (world && world.network) {
         world.network.send('appAction', { appId: world.apps.find(a => a.blueprintId === field.blueprintId)?.id, action: field.action, key: field.key });
       }
    } else if (typeof field.onClick === 'function') {
      // If onClick is defined directly as a function (less common for blueprints)
      field.onClick();
    }
  };

  return (
    <FieldWithLabel label={field.label || ''}> {/* Use label if provided */}
      <div
        css={css`
          background: #4a4a4a; /* Slightly different button color */
          border-radius: 5px; /* Standard radius */
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: #eee;
          padding: 0 15px;
          cursor: pointer;
          transition: background-color 0.15s ease;
          &:hover {
            background: #5a5a5a;
          }
          &:active {
            background: #6a6a6a;
          }
        `}
        onClick={handleClick} // Use the enhanced handler
      >
        <span>{field.label}</span>
      </div>
    </FieldWithLabel>
  );
}

function FieldButtons({ world, field, value, modify }) {
   // Similar to FieldButton, action handling needs context

  const handleButtonClick = (buttonAction) => {
    if (buttonAction && typeof buttonAction === 'string') {
      console.log(`Button action: ${buttonAction}`);
      if (world && world.network) {
        // Assuming the action string corresponds to something the server/world understands
        world.network.send('appAction', { appId: world.apps.find(a => a.blueprintId === field.blueprintId)?.id, action: buttonAction, key: field.key });
      }
    } else if (typeof buttonAction === 'function'){
        buttonAction(); // Execute if it's a direct function
    }
  };

  return (
    <FieldWithLabel label={field.label}>
      <div
        css={css`
          display: flex;
          gap: 5px;
          .fieldbuttons-button {
            flex: 1;
            background: #4a4a4a;
            border-radius: 5px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            color: #eee;
            padding: 0 10px; /* Adjust padding */
            cursor: pointer;
            transition: background-color 0.15s ease;
            white-space: nowrap; /* Prevent wrapping */
            overflow: hidden; 
            text-overflow: ellipsis; 

            &:hover {
              background: #5a5a5a;
            }
            &:active {
              background: #6a6a6a;
            }
          }
        `}
      >
        {field.buttons?.map(button => ( // Add safe navigation
          <div 
             key={button.label} 
             className='fieldbuttons-button' 
             onClick={() => handleButtonClick(button.action || button.onClick)} // Use enhanced handler
             title={button.label} // Add tooltip
          >
            <span>{button.label}</span>
          </div>
        ))}
      </div>
    </FieldWithLabel>
  );
} 