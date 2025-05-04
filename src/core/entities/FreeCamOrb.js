import { Entity } from './Entity'
import { clamp } from '../utils'
import * as THREE from '../extras/three'
import { ControlPriorities } from '../extras/ControlPriorities'
import { DEG2RAD, RAD2DEG } from '../extras/general'

const UP = new THREE.Vector3(0, 1, 0)
const FORWARD = new THREE.Vector3(0, 0, -1)
const POINTER_LOOK_SPEED = 0.1
const FLIGHT_SPEED = 15
const BOOST_SPEED = 30

const v1 = new THREE.Vector3()
const v2 = new THREE.Vector3()
const q1 = new THREE.Quaternion()
const e1 = new THREE.Euler(0, 0, 0, 'YXZ')

export class FreeCamOrb extends Entity {
  constructor(world, data, local) {
    super(world, data, local)
    
    // Create the base object for positioning and rotating the camera
    this.base = new THREE.Object3D()
    this.base.rotation.order = 'YXZ'
    this.world.stage.scene.add(this.base)
    
    // Direction vectors
    this.moveDir = new THREE.Vector3()
    this.flyDir = new THREE.Vector3()
    
    // Movement state
    this.flying = true
    this.moving = false
    this.boosting = false
    
    // Set initial position from data
    if (data.position) {
      this.base.position.fromArray(data.position)
    }
    
    // Set initial rotation from data
    if (data.rotation) {
      this.base.quaternion.fromArray(data.rotation)
    }
    
    // Initialize control if this is a local player's orb
    if (local) {
      this.initControl()
    }
    
    // Make the camera active for updates
    this.world.setHot(this, true)
  }
  
  initControl() {
    // Get player entity
    this.player = this.world.entities.player;
    
    if (this.player) {
      // Store player's state to restore later
      this.playerHotBeforeOrb = this.world.hot.has(this.player);
      
      // Temporarily disable player updates while in freecam
      this.world.setHot(this.player, false);
      
      // Ensure we start from current camera position
      if (this.player.control && this.player.control.camera) {
        // Copy position from player's camera
        this.base.position.copy(this.player.control.camera.position);
        
        // Copy rotation from player's camera
        if (this.data.rotation) {
          this.base.quaternion.fromArray(this.data.rotation);
        } else if (this.player.control.camera.quaternion) {
          this.base.quaternion.copy(this.player.control.camera.quaternion);
        }
      } else if (this.data.position) {
        // Fallback to data position if available
        this.base.position.fromArray(this.data.position);
      }
    }
    
    // Bind our own controls with higher priority
    this.control = this.world.controls.bind({
      priority: ControlPriorities.BUILDER + 1,
    });
    
    // Take over camera control
    this.control.camera.write = true;
    this.control.camera.position.copy(this.base.position);
    this.control.camera.quaternion.copy(this.base.quaternion);
    this.control.camera.zoom = 0;
    
    // Lock the pointer for first-person control
    if (!this.control.pointer.locked) {
      this.control.pointer.lock();
    }
  }
  
  update(delta) {
    if (!this.control) return;
    
    // Update camera look direction with pointer movement
    if (this.control.pointer.locked) {
      this.base.rotation.x += -this.control.pointer.delta.y * POINTER_LOOK_SPEED * delta;
      this.base.rotation.y += -this.control.pointer.delta.x * POINTER_LOOK_SPEED * delta;
      this.base.rotation.z = 0;
      
      // Clamp vertical look angle
      this.base.rotation.x = clamp(this.base.rotation.x, -89 * DEG2RAD, 89 * DEG2RAD);
    }
    
    // Calculate movement direction based on WASD keys
    this.moveDir.set(0, 0, 0);
    
    // Forward/backward movement
    if (this.control.keyW.down) this.moveDir.z -= 1;
    if (this.control.keyS.down) this.moveDir.z += 1;
    
    // Left/right movement
    if (this.control.keyA.down) this.moveDir.x -= 1;
    if (this.control.keyD.down) this.moveDir.x += 1;
    
    // Up/down movement (now space for up, C for down)
    if (this.control.keyE.down || this.control.space.down) this.moveDir.y += 1;
    if (this.control.keyC.down) this.moveDir.y -= 1;
    
    // Track if we're moving at all
    this.moving = this.moveDir.lengthSq() > 0;
    
    // Check if boost is active
    this.boosting = this.control.shiftLeft.down;
    
    // Normalize direction
    if (this.moving) {
      this.moveDir.normalize();
    }
    
    // Apply camera rotation to movement vector
    this.flyDir.copy(this.moveDir);
    e1.set(this.base.rotation.x, this.base.rotation.y, 0); // Use base rotation
    q1.setFromEuler(e1);
    this.flyDir.applyQuaternion(q1);
    
    // Apply movement to position
    if (this.moving) {
      const speed = this.boosting ? BOOST_SPEED : FLIGHT_SPEED;
      this.base.position.addScaledVector(this.flyDir, speed * delta);
      
      // Send position update to network
      this.world.network.send('entityModified', {
        id: this.data.id,
        p: this.base.position.toArray(),
        q: this.base.quaternion.toArray(), // Use base quaternion
      });
    }
  }
  
  lateUpdate(delta) {
    if (!this.control) return;
    
    // Update the controlled camera
    this.control.camera.position.copy(this.base.position);
    this.control.camera.quaternion.copy(this.base.quaternion); // Use base quaternion
    this.control.camera.zoom = 0;
  }
  
  destroy() {
    try {
      // Store the final camera position and rotation if possible
      let finalPosition, finalQuaternion;
      try {
        if (this.base && this.base.position) {
          finalPosition = this.base.position.clone();
        }
        if (this.base && this.base.quaternion) { // Use base quaternion
          finalQuaternion = this.base.quaternion.clone();
        }
      } catch (err) {
        console.error('Error saving camera position/rotation:', err);
        // Fallback values if cloning fails
        finalPosition = new THREE.Vector3();
        finalQuaternion = new THREE.Quaternion();
      }

      // Clean up controls
      try {
        if (this.control) {
          // Disable our camera control
          if (this.control.camera) {
            this.control.camera.write = false;
          }
          this.control.unbind();
          this.control = null;
        }
      } catch (err) {
        console.error('Error cleaning up controls:', err);
      }
      
      // Restore player if it exists
      try {
        if (this.player) {
          // Reactivate player updates if it was previously active
          if (this.playerHotBeforeOrb) {
            this.world.setHot(this.player, true);
          }
          
          // Let the player reinitialize its control
          if (typeof this.player.initControl === 'function') {
            try {
              this.player.initControl();
              
              // Set player camera to our final position if possible
              if (finalPosition && finalQuaternion && 
                  this.player.control && this.player.control.camera) {
                this.player.control.camera.position.copy(finalPosition);
                this.player.control.camera.quaternion.copy(finalQuaternion);
                this.player.control.camera.write = true;
              }
            } catch (err) {
              console.error('Error restoring player control:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error restoring player:', err);
      }
      
      // Stop updating this entity
      try {
        this.world.setHot(this, false);
      } catch (err) {
        console.error('Error removing from hot list:', err);
      }
      
      // Clean up 3D objects
      try {
        // No orbModel to remove anymore
        if (this.base && this.world && this.world.stage && this.world.stage.scene) {
          this.world.stage.scene.remove(this.base);
        }
      } catch (err) {
        console.error('Error cleaning up 3D objects:', err);
      }
      
      super.destroy();
    } catch (err) {
      console.error('Error in FreeCamOrb.destroy:', err);
    }
  }
} 