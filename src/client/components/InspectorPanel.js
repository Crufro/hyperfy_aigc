import { css } from '@firebolt-dev/css';
import React, { useMemo } from 'react';
import { PanelHeader } from './PanelHeader'; // Assuming PanelHeader is extracted
import { formatBytes } from '../../core/extras/formatBytes';

// Utility function copied from AppsPane.js
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  const million = 1000000;
  const thousand = 1000;
  let result;
  if (num >= million) {
    result = (num / million).toFixed(1) + 'M';
  } else if (num >= thousand) {
    result = (num / thousand).toFixed(1) + 'K';
  } else {
    result = Math.round(num).toString();
  }
  return result
    .replace(/\.0+([KM])?$/, '$1') // Replace .0K with K or .0M with M
    .replace(/(\.\d+[1-9])0+([KM])?$/, '$1$2'); // Trim trailing zeros (1.50M → 1.5M)
}

export function InspectorPanel({ selectedApp, world, width, onClose }) {

  // Calculate stats for the selected app
  const appStats = useMemo(() => {
    if (!selectedApp || !world?.loader) return null;

    const blueprint = selectedApp.blueprint;
    if (!blueprint) return null;

    let stats = { // Default stats
      geometries: 0,
      triangles: 0,
      textureBytes: 0,
      fileBytes: 0,
    };

    const modelUrl = blueprint.model;
    if (modelUrl) {
      const type = modelUrl.endsWith('.vrm') ? 'avatar' : 'model';
      const model = world.loader.get(type, modelUrl); // Get model from cache
      if (model) {
        stats = model.getStats(); // Use cached stats if model is loaded
      }
    }

    return {
      id: selectedApp.data?.id,
      name: blueprint.name || selectedApp.name || `App ${selectedApp.data?.id}`,
      geometries: stats.geometries?.size ?? stats.geometries ?? 0, // Handle Set or number
      triangles: stats.triangles ?? 0,
      textureSize: formatBytes(stats.textureBytes ?? 0),
      code: blueprint.script ? 'Yes' : 'No',
      fileSize: formatBytes(stats.fileBytes ?? 0),
    };

  }, [selectedApp, world?.loader]); // Recompute when selection or loader changes

  return (
    <div
      className="inspector-panel"
      style={{ width: width }}
      css={css`
        background-color: #303030;
        border-left: 1px solid #1a1a1a;
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        overflow: hidden; /* Prevent content overflow */
      `}
    >
      <PanelHeader title="Inspector" onClose={onClose} />
      <div 
        className="panel-content"
        css={css`
          flex: 1; 
          padding: 10px; 
          overflow: auto; 
          min-height: 0; 
          font-size: 11px; /* Smaller font for details */
          line-height: 1.6; /* Better readability */

          .stat-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            border-bottom: 1px solid #3a3a3a; /* Separator line */
            padding-bottom: 4px;
          }
          .stat-label {
            color: #aaa;
            margin-right: 10px;
          }
          .stat-value {
            color: #ddd;
            text-align: right;
            white-space: nowrap;
          }
          .no-selection {
            color: #888;
          }
        `}
      >
        {appStats ? (
          <div>
            <div className="stat-row">
              <span className="stat-label">Name</span>
              <span className="stat-value">{appStats.name}</span>
            </div>
             <div className="stat-row">
              <span className="stat-label">Instance ID</span>
              <span className="stat-value">{appStats.id}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Geometries</span>
              <span className="stat-value">{appStats.geometries}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Triangles</span>
              <span className="stat-value">{formatNumber(appStats.triangles)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Texture Mem</span>
              <span className="stat-value">{appStats.textureSize}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Has Code</span>
              <span className="stat-value">{appStats.code}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">File Size</span>
              <span className="stat-value">{appStats.fileSize}</span>
            </div>
            {/* Add more stats or components here as needed */}
          </div>
        ) : (
          <div className="no-selection">
            Select an item in the Hierarchy to inspect.
          </div>
        )}
      </div>
    </div>
  );
} 