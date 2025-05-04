import React, { useRef, useEffect } from 'react';
import { css } from '@firebolt-dev/css';

export function CanvasView({ world }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !world || !world.graphics) return;

    // --- Canvas Setup ---
    // TODO: Verify how world.graphics expects to be connected.
    // Does it take a canvas element? Does it create its own?
    // Assuming world.graphics.setCanvas(canvas) or similar is needed.
    // This might need adjustment based on the graphics engine API.
    try {
      // Example: Attach canvas to graphics engine if needed
      if (typeof world.graphics.setCanvas === 'function') {
         world.graphics.setCanvas(canvas);
      } else if (world.graphics.canvas !== canvas) {
        // If the engine holds a reference, update it? 
        // Or maybe the engine *provides* the canvas?
        console.warn('CanvasView: Unsure how to attach canvas to world.graphics');
      }
      
      // Initial resize
      const initialWidth = container.offsetWidth;
      const initialHeight = container.offsetHeight;
      if (initialWidth > 0 && initialHeight > 0 && typeof world.graphics.resize === 'function') {
        world.graphics.resize(initialWidth, initialHeight);
      }
    } catch (error) {
      console.error("Error during canvas setup in CanvasView:", error);
    }
    
    // --- Resize Observer ---
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        // Use contentRect for observing the container size
        const { width, height } = entry.contentRect;
        
        if (width > 0 && height > 0 && typeof world.graphics.resize === 'function') {
          try {
            // Update graphics resolution when container size changes
            world.graphics.resize(width, height);
          } catch (error) {
             console.error("Error during canvas resize:", error);
          }
        }
      }
    });

    // Observe the container element
    resizeObserver.observe(container);

    // --- Cleanup ---
    return () => {
      resizeObserver.disconnect();
      // Optional: Notify graphics engine that canvas is being removed
      // if (typeof world.graphics.detachCanvas === 'function') {
      //   world.graphics.detachCanvas(canvas);
      // }
    };
  // Re-run effect if world or graphics object changes instance
  }, [world, world?.graphics]); 

  return (
    <div 
      ref={containerRef} 
      className="canvas-container" 
      css={css`
        width: 100%; 
        height: 100%; 
        overflow: hidden; /* Ensure canvas doesn't overflow container */
        position: relative; /* Or absolute, depending on context */
        display: flex; /* Use flex to easily center canvas if needed */
        justify-content: center;
        align-items: center;
      `}
    >
      <canvas 
        ref={canvasRef} 
        css={css`
          display: block; /* Removes bottom space */
          width: 100%; 
          height: 100%;
          outline: none;
          /* Optional: Add background or other styling */
          /* background: #111; */
        `}
        // It's often recommended to handle tabIndex for keyboard input focus
        tabIndex={-1} 
      />
    </div>
  );
} 