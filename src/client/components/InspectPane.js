import { css } from '@firebolt-dev/css'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BoxIcon,
  CircleCheckIcon,
  DownloadIcon,
  EarthIcon,
  EyeIcon,
  FileCode2Icon,
  FileIcon,
  LoaderIcon,
  PackageCheckIcon,
  ShuffleIcon,
  XIcon,
  LayersIcon,
  AtomIcon,
  FolderIcon,
  BlendIcon,
  CircleIcon,
  AnchorIcon,
  PersonStandingIcon,
  MagnetIcon,
  DumbbellIcon,
  ChevronDown,
  SplitIcon,
  LockKeyholeIcon,
  SparkleIcon,
  ZapIcon,
  Trash2Icon,
  Move3dIcon,
  Rotate3dIcon,
  ScalingIcon,
} from 'lucide-react'
import * as THREE from '../../core/extras/three'

import { hashFile } from '../../core/utils-client'
import { useUpdate } from './useUpdate'
import { cls } from './cls'
import { exportApp } from '../../core/extras/appTools'
import { downloadFile } from '../../core/extras/downloadFile'
import { hasRole } from '../../core/utils'
import {
  fileKinds,
  InputDropdown,
  InputFile,
  InputNumber,
  InputRange,
  InputSwitch,
  InputText,
  InputTextarea,
} from './Inputs'
import { isArray } from 'lodash-es'
import { Fields } from './FieldsPanel'
import { RAD2DEG, DEG2RAD } from '../../core/extras/general'

// Deprecated InspectPane - logic moved to individual panel components
// export function InspectPane({ world, entity }) { ... }

const extToType = {
  glb: 'model',
  vrm: 'avatar',
}
const allowedModels = ['glb', 'vrm']

// Helper component for transform inputs
function TransformInputGroup({ label, icon: Icon, x, y, z, onChange }) {
  const step = 0.1
  return (
    <div className='transform-group'>
      <div className='transform-label'>
        <Icon size={12} />
        <span>{label}</span>
      </div>
      <div className='transform-inputs'>
        <InputNumber value={x} onChange={v => onChange('x', v)} step={step} label='X' />
        <InputNumber value={y} onChange={v => onChange('y', v)} step={step} label='Y' />
        <InputNumber value={z} onChange={v => onChange('z', v)} step={step} label='Z' />
      </div>
    </div>
  )
}

// --- New App Main Panel --- 
export function AppMainPanel({ world, app }) {
  const [blueprint, setBlueprint] = useState(app.blueprint)
  const canEdit = !blueprint.frozen && hasRole(world.entities.player.data.roles, 'admin', 'builder')
  const [fileInputKey, setFileInputKey] = useState(0)
  const update = useUpdate()

  // Transform State
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 })
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 })
  const [scale, setScale] = useState({ x: 1, y: 1, z: 1 })

  // Effect to update local transform state from app.root
  useEffect(() => {
    if (!app?.root) return

    const updateTransforms = () => {
      if (!app?.root) return
      // Position
      setPosition({
        x: app.root.position.x,
        y: app.root.position.y,
        z: app.root.position.z,
      })
      // Rotation (Euler Degrees)
      const euler = new THREE.Euler().setFromQuaternion(app.root.quaternion, 'YXZ')
      setRotation({
        x: euler.x * RAD2DEG,
        y: euler.y * RAD2DEG,
        z: euler.z * RAD2DEG,
      })
      // Scale
      setScale({
        x: app.root.scale.x,
        y: app.root.scale.y,
        z: app.root.scale.z,
      })
    }

    // Initial update
    updateTransforms()

    // --- Listener for external changes (e.g., gizmo, grab mode) ---
    const intervalId = setInterval(() => {
      if (app?.root && (
          Math.abs(position.x - app.root.position.x) > 0.001 ||
          Math.abs(position.y - app.root.position.y) > 0.001 ||
          Math.abs(position.z - app.root.position.z) > 0.001 ||
          Math.abs(scale.x - app.root.scale.x) > 0.001 ||
          Math.abs(scale.y - app.root.scale.y) > 0.001 ||
          Math.abs(scale.z - app.root.scale.z) > 0.001 ||
          !new THREE.Quaternion().setFromEuler(new THREE.Euler(
            rotation.x * DEG2RAD, rotation.y * DEG2RAD, rotation.z * DEG2RAD, 'YXZ'
          )).equals(app.root.quaternion)
      )) {
         updateTransforms();
      }
    }, 250);

    return () => {
      clearInterval(intervalId);
    }
  }, [app])

  // Update blueprint state if the app's blueprint changes externally
  useEffect(() => {
    const onModify = bp => {
      if (bp.id === app.blueprint?.id) {
        setBlueprint(bp)
      }
    }
    world.blueprints.on('modify', onModify)
    return () => {
      world.blueprints.off('modify', onModify)
    }
  }, [world.blueprints, app.blueprint?.id])
  
  const download = async () => {
    try {
      const file = await exportApp(blueprint, world.loader.loadFile)
      downloadFile(file)
    } catch (err) {
      console.error(err)
    }
  }

  const downloadModel = e => {
    if (e.shiftKey) {
      e.preventDefault()
      const file = world.loader.getFile(blueprint.model)
      if (!file) return
      downloadFile(file)
    }
  }

  const changeModel = async e => {
    setFileInputKey(n => n + 1)
    const file = e.target.files[0]
    if (!file) return
    const ext = file.name.split('.').pop()
    if (!allowedModels.includes(ext)) return
    const hash = await hashFile(file)
    const filename = `${hash}.${ext}`
    const url = `asset://${filename}`
    const type = extToType[ext]
    world.loader.insert(type, url, file)
    const version = blueprint.version + 1
    world.blueprints.modify({ id: blueprint.id, version, model: url })
    await world.network.upload(file)
    world.network.send('blueprintModified', { id: blueprint.id, version, model: url })
  }

  const toggle = async key => {
    const value = !blueprint[key]
    const version = blueprint.version + 1
    world.blueprints.modify({ id: blueprint.id, version, [key]: value })
    world.network.send('blueprintModified', { id: blueprint.id, version, [key]: value })
  }

  // Helper function to handle transform changes and update app.root
  const handleTransformChange = (transformType, axis, value) => {
    if (!app?.root || !world?.builder) return;

    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;

    // --- Add Undo Step ---
    const currentPositionArray = app.root.position.toArray();
    const currentQuaternionArray = app.root.quaternion.toArray();
    world.builder.addUndo({
      name: 'move-entity',
      entityId: app.data.id,
      position: currentPositionArray,
      quaternion: currentQuaternionArray,
    });

    // --- Update local UI state immediately ---
    let stateUpdater, stateValue;
    if (transformType === 'position') {
      stateUpdater = setPosition;
      stateValue = numericValue;
    } else if (transformType === 'rotation') {
      stateUpdater = setRotation;
      stateValue = numericValue;
    } else if (transformType === 'scale') {
      stateUpdater = setScale;
      stateValue = numericValue === 0 ? 0.001 : numericValue; // Prevent zero scale in state
    }
    if (stateUpdater) {
      stateUpdater(prev => ({ ...prev, [axis]: stateValue }));
    }

    // --- Update app.root (Use callback with latest state for rotation) ---
    // Using state updaters' callback ensures we use the *most recent* state
    // especially important for rotation conversion.
    let newPositionArray, newQuaternionArray;
    if (transformType === 'position') {
      app.root.position[axis] = numericValue;
      newPositionArray = app.root.position.toArray();
      newQuaternionArray = app.root.quaternion.toArray(); // Get current quaternion
    } else if (transformType === 'rotation') {
       // Use the latest state value directly from the closure
      setRotation(currentState => {
         const updatedState = { ...currentState, [axis]: numericValue };
         const newEuler = new THREE.Euler(
           updatedState.x * DEG2RAD,
           updatedState.y * DEG2RAD,
           updatedState.z * DEG2RAD,
           'YXZ'
         );
         app.root.quaternion.setFromEuler(newEuler);
         newQuaternionArray = app.root.quaternion.toArray();
         newPositionArray = app.root.position.toArray(); // Get current position
         return updatedState; // Return the updated state for React
      });
    } else if (transformType === 'scale') {
      // Ensure scale is not zero on the object itself
      app.root.scale[axis] = stateValue; // Use the already clamped stateValue
      newPositionArray = app.root.position.toArray(); 
      newQuaternionArray = app.root.quaternion.toArray();
    }

    // Mark the object as needing a matrix update
    app.root.matrixWorldNeedsUpdate = true; 

    // --- Update app.data and Send Network Update (for position/rotation) ---
    // Ensure we have the final arrays after potential async state updates (esp. for rotation)
    if (newPositionArray && newQuaternionArray && (transformType === 'position' || transformType === 'rotation')) {
      app.data.position = newPositionArray;
      app.data.quaternion = newQuaternionArray;

      world.network.send('entityModified', {
        id: app.data.id,
        position: app.data.position,
        quaternion: app.data.quaternion,
      });

      // Rebuild the entity to reflect data changes internally
      app.build();
    } else if (transformType === 'scale') {
       // If only scale changed, still call build() to potentially update internal state if needed
       // although scale doesn't seem to be in app.data 
       app.build(); 
    }
  };

  return (
    <div
      className='app-main-panel noscrollbar'
      css={css`
        height: 100%; 
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background-color: #303030;
        color: #ddd;

        .app-main-content {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }

        .panel-button {
          background: #444;
          border: 1px solid #555;
          border-radius: 3px;
          padding: 5px 10px;
          margin: 5px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          color: #ddd;
          &:hover { background: #555; }
          svg { margin-right: 6px; }
          input[type="file"] { display: none; }
        }
        
        .panel-toggle-section {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 5px;
          margin: 10px 0;
        }
        
        .panel-toggle-btn {
            background: #252630;
            border-radius: 5px;
            padding: 8px 5px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #8a8c9e;
            cursor: pointer;
            text-align: center;
            font-size: 11px;
            border: 1px solid transparent;
            svg {
              margin-bottom: 4px;
              color: #606275;
            }
            &:hover { background-color: #30313a; }
            &.active {
              color: white;
              border-color: #5097ff; 
              svg {
              }
              &.green svg { color: #50ff51; }
              &.blue svg { color: #5097ff; }
              &.red svg { color: #ff5050; }
              &.yellow svg { color: #fbff50; }
            }
        }

        .panel-section-divider {
          border-top: 1px solid #1a1a1a;
          margin: 10px -10px;
        }
        
        .panel-fields-container {
          margin-top: 5px;
        }
        
        .panel-top-actions {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            gap: 10px;
            .panel-button { margin: 0; flex: 1; }
        }
        
        .transform-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 10px;
        }
        .transform-group {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .transform-label {
          width: 70px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          font-size: 11px;
          color: #aaa;
          gap: 4px;
          svg { 
              flex-shrink: 0; 
              margin-top: -1px;
          }
        }
        .transform-inputs {
          flex-grow: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 5px;
          .input-number {
          }
        }
      `}
    >
      <div className='app-main-content'>
          {/* Top Buttons: Model & Download */} 
          {canEdit && (
              <div className="panel-top-actions">
                   <label className='panel-button' onClick={downloadModel}>
                    <input key={fileInputKey} type='file' accept='.glb,.vrm' onChange={changeModel} />
                    <BoxIcon size={14} />
                    <span>Model</span>
                   </label>
                   <div className='panel-button' onClick={download}>
                    <DownloadIcon size={14} />
                    <span>Download BP</span>
                   </div>
              </div>
          )}
          {!canEdit && blueprint.model && (
               <div className='panel-button' style={{ justifyContent: 'flex-start', marginBottom: '10px', cursor: 'default' }} onClick={downloadModel}>
                   <BoxIcon size={14} />
                   <span>Model: {blueprint.model.split('/').pop()}</span>
               </div>
          )}

          {/* --- Transform Section --- */}
          <div className='transform-section'>
            <TransformInputGroup
              label="Position"
              icon={Move3dIcon}
              x={position.x}
              y={position.y}
              z={position.z}
              onChange={(axis, value) => handleTransformChange('position', axis, value)}
            />
            <TransformInputGroup
              label="Rotation"
              icon={Rotate3dIcon}
              x={rotation.x}
              y={rotation.y}
              z={rotation.z}
              onChange={(axis, value) => handleTransformChange('rotation', axis, value)}
            />
            <TransformInputGroup
              label="Scale"
              icon={ScalingIcon}
              x={scale.x}
              y={scale.y}
              z={scale.z}
              onChange={(axis, value) => handleTransformChange('scale', axis, value)}
            />
          </div>
          <div className='panel-section-divider' />

          {/* Toggles */} 
          {canEdit && (
              <div className='panel-toggle-section'>
                  <div
                      className={cls('panel-toggle-btn green', { active: blueprint.preload })}
                      onClick={() => toggle('preload')}
                  >
                      <CircleCheckIcon size={12} />
                      <span>Preload</span>
                  </div>
                  <div className={cls('panel-toggle-btn blue', { active: blueprint.public })} onClick={() => toggle('public')}>
                      <EarthIcon size={12} />
                      <span>Public</span>
                  </div>
                  <div className={cls('panel-toggle-btn red', { active: blueprint.locked })} onClick={() => toggle('locked')}>
                      <LockKeyholeIcon size={12} />
                      <span>Lock</span>
                  </div>
                  <div
                      className={cls('panel-toggle-btn yellow', { active: blueprint.unique })}
                      onClick={() => toggle('unique')}
                  >
                      <SparkleIcon size={12} />
                      <span>Unique</span>
                  </div>
              </div>
          )}
          
          {/* Fields */} 
          {app.fields?.length > 0 && <div className='panel-section-divider' />} 
          <div className='panel-fields-container'>
            <Fields app={app} blueprint={blueprint} />
          </div>
      </div>
    </div>
  )
}

// --- New App Meta Panel --- 
export function AppMetaPanel({ world, app }) {
  const [blueprint, setBlueprint] = useState(app.blueprint) 
  const canEdit = !blueprint.frozen && hasRole(world.entities.player.data.roles, 'admin', 'builder')

  // Update blueprint state if the app's blueprint changes externally
  useEffect(() => {
    const onModify = bp => {
      if (bp.id === app.blueprint?.id) {
        setBlueprint(bp)
      }
    }
    world.blueprints.on('modify', onModify)
    return () => {
      world.blueprints.off('modify', onModify)
    }
  }, [world.blueprints, app.blueprint?.id])

  const set = async (key, value) => {
    if (!canEdit) return;
    const version = blueprint.version + 1
    world.blueprints.modify({ id: blueprint.id, version, [key]: value })
    world.network.send('blueprintModified', { id: blueprint.id, version, [key]: value })
  }

  return (
    <div
      className='app-meta-panel noscrollbar'
      css={css`
        height: 100%; 
        overflow-y: auto;
        padding: 10px;
        background-color: #303030;
        color: #ddd;
        
        .meta-field {
          display: flex;
          align-items: flex-start;
          margin-bottom: 8px;
          &-label {
            width: 80px;
            padding-top: 5px;
            font-size: 11px;
            color: #aaa;
            flex-shrink: 0;
          }
          &-input {
            flex: 1;
          }
        }
      `}
    >
      <div className='meta-field'>
        <div className='meta-field-label'>Name</div>
        <div className='meta-field-input'>
          <InputText value={blueprint.name || ''} onChange={name => set('name', name)} readOnly={!canEdit} />
        </div>
      </div>
      <div className='meta-field'>
        <div className='meta-field-label'>Image</div>
        <div className='meta-field-input'>
          <InputFile world={world} kind='texture' value={blueprint.image} onChange={image => set('image', image)} readOnly={!canEdit} />
        </div>
      </div>
      <div className='meta-field'>
        <div className='meta-field-label'>Author</div>
        <div className='meta-field-input'>
          <InputText value={blueprint.author || ''} onChange={author => set('author', author)} readOnly={!canEdit} />
        </div>
      </div>
      <div className='meta-field'>
        <div className='meta-field-label'>URL</div>
        <div className='meta-field-input'>
          <InputText value={blueprint.url || ''} onChange={url => set('url', url)} readOnly={!canEdit} />
        </div>
      </div>
      <div className='meta-field'>
        <div className='meta-field-label'>Description</div>
        <div className='meta-field-input'>
          <InputTextarea value={blueprint.desc || ''} onChange={desc => set('desc', desc)} readOnly={!canEdit} />
        </div>
      </div>
    </div>
  )
}

// --- New App Nodes Panel --- 

// Helper function to safely get vector string
const getVectorString = vec => {
  if (!vec || typeof vec.x !== 'number') return null
  return `${vec.x.toFixed(2)}, ${vec.y.toFixed(2)}, ${vec.z.toFixed(2)}`
}

// Helper function to safely check if a property exists
const hasProperty = (obj, prop) => {
  try {
    return obj && typeof obj[prop] !== 'undefined'
  } catch (err) {
    return false
  }
}

const nodeIcons = {
  default: CircleIcon,
  group: FolderIcon,
  mesh: BoxIcon,
  rigidbody: DumbbellIcon,
  collider: BlendIcon,
  lod: EyeIcon,
  avatar: PersonStandingIcon,
  snap: MagnetIcon,
}

function renderHierarchy(nodes, depth = 0, selectedNode, setSelectedNode) {
  if (!Array.isArray(nodes)) return null

  return nodes.map(node => {
    if (!node) return null

    const children = node.children || []
    const hasChildren = Array.isArray(children) && children.length > 0
    const isSelected = selectedNode?.uuid === node.uuid
    const Icon = nodeIcons[node.name] || nodeIcons[node.type?.toLowerCase()] || nodeIcons.default
    const nodeName = node.name || node.type || `Node_${node.uuid?.substring(0, 4)}`

    return (
      <div key={node.uuid || node.id}>
        <div
          className={cls('nodes-item', {
            'nodes-item-indent': depth > 0,
            selected: isSelected,
          })}
          style={{ paddingLeft: depth * 15 + 5 }}
          onClick={() => setSelectedNode(node)}
        >
          <Icon size={14} />
          <span>{nodeName}</span>
        </div>
        {hasChildren && renderHierarchy(children, depth + 1, selectedNode, setSelectedNode)}
      </div>
    )
  })
}

function HierarchyDetail({ label, value, copy }) {
  let handleCopy = copy ? () => navigator.clipboard.writeText(value) : null
  return (
    <div className='nodes-detail'>
      <div className='nodes-detail-label'>{label}</div>
      <div className={cls('nodes-detail-value', { copy })} onClick={handleCopy}>
        {value}
      </div>
    </div>
  )
}

export function AppNodesPanel({ app }) {
  const [selectedNode, setSelectedNode] = useState(null)
  const rootNode = useMemo(() => app.getNodes ? app.getNodes() : null, [app])

  // Select root node initially if available
  useEffect(() => {
    if (rootNode && !selectedNode) {
      setSelectedNode(rootNode);
    }

    if (selectedNode) { 
        let existsInScene = false;
        if (app?.root && selectedNode.uuid && typeof app.root.getObjectByProperty === 'function') { 
            try {
              existsInScene = !!app.root.getObjectByProperty('uuid', selectedNode.uuid);
            } catch (error) {
               console.error("Error checking node existence in scene:", error);
               existsInScene = false;
            }
        }
        if (!existsInScene) {
            setSelectedNode(rootNode || null); 
        }
    } 
    else if (!selectedNode && rootNode) {
        setSelectedNode(rootNode);
    }

  }, [rootNode, app, selectedNode]);

  return (
    <div
      className='app-nodes-panel noscrollbar'
      css={css`
        height: 100%; 
        display: flex;
        flex-direction: column;
        overflow: hidden; 
        background-color: #303030;
        color: #ddd;

        .nodes-tree-container {
          flex: 1;
          overflow-y: auto;
          padding: 5px;
          border-bottom: 1px solid #1a1a1a; 
          min-height: 50px;
        }
        
        .nodes-item {
          display: flex;
          align-items: center;
          padding: 3px 5px;
          border-radius: 3px;
          font-size: 11px;
          cursor: pointer;
          white-space: nowrap;
          &:hover {
            background-color: #3c3c3c;
          }
          &.selected {
            color: white;
            background: #4f87ff;
          }
          svg {
            margin-right: 5px;
            opacity: 0.7;
            flex-shrink: 0;
          }
          span {
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
        
        .nodes-empty {
          color: #888;
          text-align: center;
          padding: 10px;
          font-size: 11px;
        }
        
        .nodes-details-container {
          flex-shrink: 0;
          padding: 10px;
          max-height: 50%;
          overflow-y: auto;
        }
        
        .nodes-detail {
          display: flex;
          margin-bottom: 5px;
          font-size: 11px;
          &-label {
            width: 70px;
            color: #aaa;
            flex-shrink: 0;
          }
          &-value {
            flex: 1;
            word-break: break-word;
            color: #ccc;
            &.copy {
              cursor: pointer;
            }
            &:hover {
               &.copy { color: #fff; }
            }
          }
        }
      `}
    >
      <div className='nodes-tree-container'>
        {rootNode ? (
          renderHierarchy([rootNode], 0, selectedNode, setSelectedNode)
        ) : (
          <div className='nodes-empty'>
            <LayersIcon size={16} />
            <div>No nodes found or model not loaded.</div>
          </div>
        )}
      </div>

      {selectedNode && (
        <div className='nodes-details-container'>
          <HierarchyDetail label='UUID' value={selectedNode.uuid} copy />
          <HierarchyDetail label='Name' value={selectedNode.name || '(No Name)'} />
          <HierarchyDetail label='Type' value={selectedNode.type || 'Object3D'} />

          {/* Position */} 
          {hasProperty(selectedNode, 'position') && getVectorString(selectedNode.position) && (
            <HierarchyDetail label='Position' value={getVectorString(selectedNode.position)} />
          )}

          {/* Rotation */}
          {hasProperty(selectedNode, 'rotation') && (
            <HierarchyDetail label='Rotation' value={`X: ${selectedNode.rotation.x.toFixed(2)}, Y: ${selectedNode.rotation.y.toFixed(2)}, Z: ${selectedNode.rotation.z.toFixed(2)}`} />
          )}

          {/* Scale */} 
          {hasProperty(selectedNode, 'scale') && getVectorString(selectedNode.scale) && (
            <HierarchyDetail label='Scale' value={getVectorString(selectedNode.scale)} />
          )}
          
          {/* Visibility */}
          {hasProperty(selectedNode, 'visible') && (
             <HierarchyDetail label='Visible' value={selectedNode.visible ? 'Yes' : 'No'} />
          )}

          {/* Material */} 
          {hasProperty(selectedNode, 'material') && selectedNode.material && (
            <>
              <HierarchyDetail label='Material' value={selectedNode.material.name || selectedNode.material.type || 'Standard'} />
              {hasProperty(selectedNode.material, 'color') && selectedNode.material.color && (
                <HierarchyDetail
                  label='Color'
                  value={
                    selectedNode.material.color.getHexString
                      ? `#${selectedNode.material.color.getHexString()}`
                      : '(Color object)'
                  }
                />
              )}
              {hasProperty(selectedNode.material, 'map') && selectedNode.material.map && (
                 <HierarchyDetail label='Texture' value={selectedNode.material.map.name || '(Texture object)'} />
              )}
            </>
          )}

          {/* Geometry */} 
          {hasProperty(selectedNode, 'geometry') && selectedNode.geometry && (
             <HierarchyDetail label='Geometry' value={selectedNode.geometry.type || 'Custom'} />
          )}
          
           {/* User Data */} 
          {hasProperty(selectedNode, 'userData') && Object.keys(selectedNode.userData).length > 0 && (
            <>
              <HierarchyDetail label='User Data' value={JSON.stringify(selectedNode.userData)} />
            </>
          )}
        </div>
      )}
    </div>
  )
}


// --- Deprecated AppPane --- 
/* 
export function AppPane({ world, app, onClose }) { ... } 
function AppPaneMain({ world, app, blueprint, canEdit }) { ... }
function AppPaneMeta({ world, app, blueprint }) { ... }
function AppPaneNodes({ app }) { ... }
*/

// --- Deprecated PlayerPane --- 
// function PlayerPane({ world, player }) { ... }
