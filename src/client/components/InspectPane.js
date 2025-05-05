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
} from 'lucide-react'

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

// Deprecated InspectPane - logic moved to individual panel components
// export function InspectPane({ world, entity }) { ... }

const extToType = {
  glb: 'model',
  vrm: 'avatar',
}
const allowedModels = ['glb', 'vrm']

// --- New App Main Panel --- 
export function AppMainPanel({ world, app }) {
  const [blueprint, setBlueprint] = useState(app.blueprint)
  const canEdit = !blueprint.frozen && hasRole(world.entities.player.data.roles, 'admin', 'builder')
  const [fileInputKey, setFileInputKey] = useState(0)

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

  return (
    <div
      className='app-main-panel noscrollbar' // Use specific class
      css={css`
        height: 100%; 
        display: flex;
        flex-direction: column;
        overflow: hidden; /* Contains scroll */
        background-color: #303030; /* Match editor panel background */
        color: #ddd;

        .app-main-content { /* Scrollable content area */
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
          grid-template-columns: repeat(2, 1fr); /* Two columns */
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
            color: #8a8c9e; /* Default color */
            cursor: pointer;
            text-align: center;
            font-size: 11px;
            border: 1px solid transparent;
            svg {
              margin-bottom: 4px;
              color: #606275; /* Icon default color */
            }
            &:hover { background-color: #30313a; }
            &.active {
              color: white;
              border-color: #5097ff; 
              svg {
                /* Keep icon color consistent or change based on state */
              }
              &.green svg { color: #50ff51; }
              &.blue svg { color: #5097ff; }
              &.red svg { color: #ff5050; }
              &.yellow svg { color: #fbff50; }
            }
        }

        .panel-section-divider {
          border-top: 1px solid #1a1a1a;
          margin: 10px -10px; /* Extend to edges */
        }
        
        .panel-fields-container {
          margin-top: 5px;
        }
        
        .panel-top-actions { /* Container for top buttons */
            display: flex;
            justify-content: space-between; /* Space out buttons */
            margin-bottom: 10px;
            gap: 10px;
            .panel-button { margin: 0; flex: 1; }
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
        background-color: #303030; /* Match editor panel background */
        color: #ddd;
        
        .meta-field {
          display: flex;
          align-items: flex-start; /* Align label top */
          margin-bottom: 8px;
          &-label {
            width: 80px;
            padding-top: 5px; /* Align with input text */
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
    const isSelected = selectedNode?.uuid === node.uuid // Use uuid for selection
    const Icon = nodeIcons[node.name] || nodeIcons[node.type?.toLowerCase()] || nodeIcons.default
    const nodeName = node.name || node.type || `Node_${node.uuid?.substring(0, 4)}`

    return (
      <div key={node.uuid || node.id}> {/* Prefer uuid for key */}
        <div
          className={cls('nodes-item', {
            'nodes-item-indent': depth > 0,
            selected: isSelected,
          })}
          style={{ paddingLeft: depth * 15 + 5 }} // Indentation + base padding
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
  const rootNode = useMemo(() => app.getNodes ? app.getNodes() : null, [app]) // Get nodes via method

  // Select root node initially if available
  useEffect(() => {
    // Set initial selection to root node if nothing is selected
    if (rootNode && !selectedNode) {
      setSelectedNode(rootNode);
    }

    // Deselect if current selection is no longer valid in the live scene graph
    if (selectedNode) { 
        let existsInScene = false;
        // Check if app, app.root, selectedNode.uuid, and the method exist before calling
        if (app?.root && selectedNode.uuid && typeof app.root.getObjectByProperty === 'function') { 
            try {
              existsInScene = !!app.root.getObjectByProperty('uuid', selectedNode.uuid);
            } catch (error) {
               console.error("Error checking node existence in scene:", error);
               existsInScene = false; // Assume not found on error
            }
        }
        // If the selected node doesn't exist in the current scene graph, 
        // reset selection to the current root node (or null if rootNode is also gone)
        if (!existsInScene) {
            setSelectedNode(rootNode || null); 
        }
    } 
    // If no node is selected, but there's a root node, select the root node.
    // This handles cases where the selection might have been nullified previously.
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
        background-color: #303030; /* Match editor panel background */
        color: #ddd;

        .nodes-tree-container {
          flex: 1; /* Takes up available space */
          overflow-y: auto;
          padding: 5px;
          border-bottom: 1px solid #1a1a1a; 
          min-height: 50px; /* Ensure it's visible */
        }
        
        .nodes-item {
          display: flex;
          align-items: center;
          padding: 3px 5px; /* Reduced padding */
          border-radius: 3px;
          font-size: 11px; /* Smaller font */
          cursor: pointer;
          white-space: nowrap;
          &:hover {
            background-color: #3c3c3c;
          }
          &.selected {
            color: white;
            background: #4f87ff; /* Selection color */
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
          /* Indentation handled by inline style */
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
          max-height: 50%; /* Limit details height */
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
