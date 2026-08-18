// ============================================================================
// Subway Surfers Lite 3D - Animated Procedural 3D Runner & Physics
// Hierarchical bone-like limb animation, snappy 3-lane physics, hoverboard & jetpack
// ============================================================================

class Player {
  constructor(scene) {
    this.scene = scene;
    this.currentLane = 0; // -1: Left, 0: Mid, 1: Right
    this.targetX = 0;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.velocityY = 0;
    this.gravity = -34;
    this.jumpForce = 13.5;
    this.groundY = 0;
    this.currentSurfaceY = 0;

    // State flags
    this.isGrounded = true;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.slideDuration = 0.75;
    this.hasHoverboard = false;
    this.hoverboardTime = 0;
    this.isJetpackActive = false;
    this.jetpackTime = 0;
    this.isMagnetActive = false;
    this.magnetTime = 0;
    this.isMultiplierActive = false;
    this.multiplierTime = 0;
    
    this.isInvulnerable = false;
    this.invulnerableTimer = 0;
    this.isDead = false;

    // Animation time
    this.animTime = 0;
    this.activeSkin = 'dash';
    this.activeBoardSkin = 'cyber';

    this.initMeshes();
  }

  initMeshes() {
    this.group = new THREE.Group();
    
    // Color Palettes for Skins
    this.skinPalettes = {
      dash: { hoodie: 0xe74c3c, pants: 0x2c3e50, skin: 0xffdbac, cap: 0x3498db, shoes: 0xecf0f1 },
      neon: { hoodie: 0x8e44ad, pants: 0x111111, skin: 0xf5cd79, cap: 0x00f3ff, shoes: 0x2ecc71 },
      gold: { hoodie: 0xf39c12, pants: 0xd35400, skin: 0xffeaa7, cap: 0xf1c40f, shoes: 0xfdcb6e }
    };

    this.boardPalettes = {
      cyber: { base: 0x00f3ff, glow: 0xff0077 },
      flame: { base: 0xe74c3c, glow: 0xf1c40f },
      plasma: { base: 0x9b59b6, glow: 0x3498db }
    };

    this.buildCharacterMesh();
    this.buildHoverboardMesh();
    this.buildJetpackMesh();

    this.scene.add(this.group);
  }

  buildCharacterMesh() {
    this.charGroup = new THREE.Group();
    const p = this.skinPalettes[this.activeSkin];

    const skinMat = new THREE.MeshStandardMaterial({ color: p.skin, roughness: 0.7 });
    const hoodieMat = new THREE.MeshStandardMaterial({ color: p.hoodie, roughness: 0.5 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: p.pants, roughness: 0.6 });
    const capMat = new THREE.MeshStandardMaterial({ color: p.cap, roughness: 0.4 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: p.shoes, roughness: 0.3 });

    this.materials = { skinMat, hoodieMat, pantsMat, capMat, shoeMat };

    // 1. Torso
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.35), hoodieMat);
    this.torso.position.y = 0.95;
    this.torso.castShadow = true;
    this.charGroup.add(this.torso);

    // 2. Head & Cap
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.45, 0);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), skinMat);
    head.castShadow = true;
    this.headGroup.add(head);

    // Cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 12), capMat);
    cap.position.set(0, 0.12, -0.02);
    cap.rotation.x = -0.15;
    this.headGroup.add(cap);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.22), capMat);
    visor.position.set(0, 0.06, 0.2);
    visor.rotation.x = 0.1;
    this.headGroup.add(visor);

    this.charGroup.add(this.headGroup);

    // 3. Limbs (Pivoted for smooth rotation)
    // Left Leg
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.16, 0.65, 0);
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.2), pantsMat);
    lLeg.position.y = -0.25;
    lLeg.castShadow = true;
    this.leftLegPivot.add(lLeg);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.32), shoeMat);
    lShoe.position.set(0, -0.5, 0.06);
    this.leftLegPivot.add(lShoe);
    this.charGroup.add(this.leftLegPivot);

    // Right Leg
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.16, 0.65, 0);
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.2), pantsMat);
    rLeg.position.y = -0.25;
    rLeg.castShadow = true;
    this.rightLegPivot.add(rLeg);
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.32), shoeMat);
    rShoe.position.set(0, -0.5, 0.06);
    this.rightLegPivot.add(rShoe);
    this.charGroup.add(this.rightLegPivot);

    // Left Arm
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.36, 1.2, 0);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.15), hoodieMat);
    lArm.position.y = -0.22;
    this.leftArmPivot.add(lArm);
    const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), skinMat);
    lHand.position.y = -0.45;
    this.leftArmPivot.add(lHand);
    this.charGroup.add(this.leftArmPivot);

    // Right Arm
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.36, 1.2, 0);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.15), hoodieMat);
    rArm.position.y = -0.22;
    this.rightArmPivot.add(rArm);
    const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), skinMat);
    rHand.position.y = -0.45;
    this.rightArmPivot.add(rHand);
    this.charGroup.add(this.rightArmPivot);

    this.group.add(this.charGroup);
  }

  buildHoverboardMesh() {
    this.hoverboardGroup = new THREE.Group();
    const bp = this.boardPalettes[this.activeBoardSkin];

    const boardMat = new THREE.MeshStandardMaterial({ color: bp.base, metalness: 0.8, roughness: 0.2 });
    const glowMat = new THREE.MeshBasicMaterial({ color: bp.glow });

    // Sleek deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 1.6), boardMat);
    deck.position.y = 0.06;
    this.hoverboardGroup.add(deck);

    // Neon edge strip
    const stripL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 1.55), glowMat);
    stripL.position.set(-0.33, 0.06, 0);
    this.hoverboardGroup.add(stripL);

    const stripR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 1.55), glowMat);
    stripR.position.set(0.33, 0.06, 0);
    this.hoverboardGroup.add(stripR);

    // Twin jet thrusters at back
    const thrusterGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.25, 8);
    const thrusterL = new THREE.Mesh(thrusterGeom, boardMat);
    thrusterL.rotation.x = Math.PI / 2;
    thrusterL.position.set(-0.2, 0.04, -0.8);
    this.hoverboardGroup.add(thrusterL);

    const thrusterR = new THREE.Mesh(thrusterGeom, boardMat);
    thrusterR.rotation.x = Math.PI / 2;
    thrusterR.position.set(0.2, 0.04, -0.8);
    this.hoverboardGroup.add(thrusterR);

    // Thruster flame glow
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const flameL = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 8), flameMat);
    flameL.rotation.x = -Math.PI / 2;
    flameL.position.set(-0.2, 0.04, -1.0);
    this.hoverboardGroup.add(flameL);

    const flameR = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 8), flameMat);
    flameR.rotation.x = -Math.PI / 2;
    flameR.position.set(0.2, 0.04, -1.0);
    this.hoverboardGroup.add(flameR);

    this.hoverboardGroup.visible = false;
    this.group.add(this.hoverboardGroup);
  }

  buildJetpackMesh() {
    this.jetpackGroup = new THREE.Group();
    const jpMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.8, roughness: 0.2 });
    const nozzleMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.9 });
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });

    // Twin fuel canisters
    const canL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.65, 10), jpMat);
    canL.position.set(-0.16, 1.05, -0.28);
    this.jetpackGroup.add(canL);

    const canR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.65, 10), jpMat);
    canR.position.set(0.16, 1.05, -0.28);
    this.jetpackGroup.add(canR);

    // Rocket flames
    const flameL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 8), fireMat);
    flameL.rotation.x = Math.PI;
    flameL.position.set(-0.16, 0.5, -0.28);
    this.jetpackGroup.add(flameL);

    const flameR = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 8), fireMat);
    flameR.rotation.x = Math.PI;
    flameR.position.set(0.16, 0.5, -0.28);
    this.jetpackGroup.add(flameR);

    this.jetpackGroup.visible = false;
    this.group.add(this.jetpackGroup);
  }

  setSkin(skinId) {
    if (!this.skinPalettes[skinId]) return;
    this.activeSkin = skinId;
    const p = this.skinPalettes[skinId];
    this.materials.skinMat.color.setHex(p.skin);
    this.materials.hoodieMat.color.setHex(p.hoodie);
    this.materials.pantsMat.color.setHex(p.pants);
    this.materials.capMat.color.setHex(p.cap);
    this.materials.shoeMat.color.setHex(p.shoes);
  }

  setBoardSkin(boardId) {
    if (!this.boardPalettes[boardId]) return;
    this.activeBoardSkin = boardId;
  }

  reset() {
    this.currentLane = 0;
    this.targetX = 0;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.velocityY = 0;
    this.groundY = 0;
    this.currentSurfaceY = 0;
    this.isGrounded = true;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.hasHoverboard = false;
    this.hoverboardTime = 0;
    this.isJetpackActive = false;
    this.jetpackTime = 0;
    this.isMagnetActive = false;
    this.magnetTime = 0;
    this.isMultiplierActive = false;
    this.multiplierTime = 0;
    this.isInvulnerable = false;
    this.invulnerableTimer = 0;
    this.isDead = false;
    this.animTime = 0;

    this.hoverboardGroup.visible = false;
    this.jetpackGroup.visible = false;
    this.group.position.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
    this.charGroup.position.set(0, 0, 0);
    this.charGroup.rotation.set(0, 0, 0);
  }

  // --- Input Handlers ---

  moveLeft() {
    if (this.isDead) return;
    if (this.currentLane > -1) {
      this.currentLane--;
      this.targetX = LANES[this.currentLane + 1];
      window.soundEngine.playLaneSwitch();
    }
  }

  moveRight() {
    if (this.isDead) return;
    if (this.currentLane < 1) {
      this.currentLane++;
      this.targetX = LANES[this.currentLane + 1];
      window.soundEngine.playLaneSwitch();
    }
  }

  jump() {
    if (this.isDead || this.isJetpackActive) return;
    if (this.isGrounded) {
      this.velocityY = this.jumpForce;
      this.isGrounded = false;
      this.isJumping = true;
      this.isSliding = false;
      window.soundEngine.playJump();
    }
  }

  slide() {
    if (this.isDead || this.isJetpackActive) return;
    if (!this.isGrounded) {
      // Fast Drop from mid-air!
      this.velocityY = -22;
    }
    this.isSliding = true;
    this.slideTimer = this.slideDuration;
    window.soundEngine.playSlide();
  }

  activateHoverboard() {
    if (this.isDead || this.hasHoverboard) return;
    this.hasHoverboard = true;
    this.hoverboardTime = 20; // 20s active duration
    this.hoverboardGroup.visible = true;
    window.soundEngine.playHoverboard();
  }

  activatePowerup(type) {
    window.soundEngine.playPowerup();
    if (type === 'magnet') {
      this.isMagnetActive = true;
      this.magnetTime = 15;
    } else if (type === 'multiplier') {
      this.isMultiplierActive = true;
      this.multiplierTime = 15;
    } else if (type === 'jetpack') {
      this.isJetpackActive = true;
      this.jetpackTime = 12;
      this.jetpackGroup.visible = true;
      this.isMagnetActive = true; // Auto magnet while flying!
      this.magnetTime = Math.max(this.magnetTime, 12);
    } else if (type === 'hoverboard') {
      this.activateHoverboard();
    }
  }

  // --- Physics & Animation Update ---

  update(delta, currentSpeed, obstacles) {
    if (this.isDead) return;

    this.animTime += delta * (currentSpeed / 10);

    // 1. Snappy Horizontal Lane Interpolation
    const laneSpeed = 16.0;
    this.x += (this.targetX - this.x) * Math.min(1.0, delta * laneSpeed);

    // Dynamic bank lean angle when switching lanes
    const dx = this.targetX - this.x;
    const targetLean = -dx * 0.25;
    this.charGroup.rotation.z += (targetLean - this.charGroup.rotation.z) * delta * 12;

    // 2. Power-up Timers
    if (this.hasHoverboard) {
      this.hoverboardTime -= delta;
      if (this.hoverboardTime <= 0) {
        this.hasHoverboard = false;
        this.hoverboardGroup.visible = false;
      }
    }

    if (this.isMagnetActive) {
      this.magnetTime -= delta;
      if (this.magnetTime <= 0) this.isMagnetActive = false;
    }

    if (this.isMultiplierActive) {
      this.multiplierTime -= delta;
      if (this.multiplierTime <= 0) this.isMultiplierActive = false;
    }

    if (this.isJetpackActive) {
      this.jetpackTime -= delta;
      // Fly up to high altitude
      const targetFlightY = 6.2;
      this.y += (targetFlightY - this.y) * delta * 5.0;
      this.velocityY = 0;
      this.isGrounded = false;

      if (this.jetpackTime <= 0) {
        this.isJetpackActive = false;
        this.jetpackGroup.visible = false;
      }
    } else {
      // 3. Vertical Gravity & Ground Check (Floors + Train Roofs)
      this.currentSurfaceY = this.findSurfaceHeight(obstacles);

      this.velocityY += this.gravity * delta;
      this.y += this.velocityY * delta;

      if (this.y <= this.currentSurfaceY) {
        this.y = this.currentSurfaceY;
        this.velocityY = 0;
        this.isGrounded = true;
        this.isJumping = false;
      } else {
        this.isGrounded = false;
      }
    }

    // 4. Slide Timer
    if (this.isSliding) {
      this.slideTimer -= delta;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    // 5. Invulnerability blink timer
    if (this.isInvulnerable) {
      this.invulnerableTimer -= delta;
      this.group.visible = Math.floor(Date.now() / 80) % 2 === 0;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
        this.group.visible = true;
      }
    }

    // 6. Update Transform
    this.group.position.set(this.x, this.y, this.z);

    // 7. Limb Animations
    this.animateLimbs(delta);
  }

  findSurfaceHeight(obstacles) {
    let surfaceY = 0;
    const playerZ = this.z;
    const playerX = this.x;

    for (let obs of obstacles) {
      if (obs.type === 'TRAIN' || obs.type === 'RAMP') {
        const halfLen = obs.length / 2;
        const halfWidth = obs.width / 2;
        // Check if player is on this train lane and within its Z span
        if (Math.abs(playerX - obs.x) < halfWidth + 0.3) {
          if (playerZ >= obs.z - halfLen && playerZ <= obs.z + halfLen) {
            if (obs.type === 'RAMP') {
              // Linear slope up ramp
              const progress = (playerZ - (obs.z - halfLen)) / obs.length;
              const rampY = Math.max(0, Math.min(obs.roofY, progress * obs.roofY));
              if (this.y >= rampY - 0.5) {
                surfaceY = Math.max(surfaceY, rampY);
              }
            } else {
              // Flat train roof
              if (this.y >= obs.roofY - 0.4) {
                surfaceY = Math.max(surfaceY, obs.roofY);
              }
            }
          }
        }
      }
    }
    return surfaceY;
  }

  animateLimbs(delta) {
    if (this.isSliding) {
      // Crouch / Slide roll pose
      this.charGroup.position.y = -0.35;
      this.torso.rotation.x = Math.PI / 3;
      this.headGroup.position.set(0, 0.9, 0.35);
      this.leftLegPivot.rotation.x = -Math.PI / 3;
      this.rightLegPivot.rotation.x = -Math.PI / 3;
      this.leftArmPivot.rotation.x = Math.PI / 4;
      this.rightArmPivot.rotation.x = Math.PI / 4;
    } else if (this.isJumping || !this.isGrounded) {
      // Jump pose
      this.charGroup.position.y = 0;
      this.torso.rotation.x = 0.1;
      this.headGroup.position.set(0, 1.45, 0);
      this.leftLegPivot.rotation.x = -0.7;
      this.rightLegPivot.rotation.x = 0.4;
      this.leftArmPivot.rotation.x = -1.5;
      this.rightArmPivot.rotation.x = -1.5;
    } else if (this.hasHoverboard) {
      // Surfing pose on hoverboard
      this.charGroup.position.y = 0.12;
      this.charGroup.rotation.y = -0.5; // stylish side stance
      this.leftLegPivot.rotation.x = 0.2;
      this.rightLegPivot.rotation.x = -0.2;
      this.leftArmPivot.rotation.z = 0.6;
      this.rightArmPivot.rotation.z = -0.6;
      this.torso.rotation.x = 0;
    } else {
      // Dynamic Running Stride
      this.charGroup.position.y = Math.abs(Math.sin(this.animTime * 14)) * 0.08;
      this.charGroup.rotation.y = 0;
      this.torso.rotation.x = 0.15;
      this.headGroup.position.set(0, 1.45, 0);

      const legSwing = Math.sin(this.animTime * 14) * 0.85;
      this.leftLegPivot.rotation.x = legSwing;
      this.rightLegPivot.rotation.x = -legSwing;

      this.leftArmPivot.rotation.x = -legSwing * 0.9;
      this.rightArmPivot.rotation.x = legSwing * 0.9;
      this.leftArmPivot.rotation.z = 0;
      this.rightArmPivot.rotation.z = 0;
    }
  }

  // Hitbox for collision detection
  getHitbox() {
    const height = this.isSliding ? 0.75 : 1.75;
    return {
      minX: this.x - 0.45,
      maxX: this.x + 0.45,
      minY: this.y,
      maxY: this.y + height,
      minZ: this.z - 0.35,
      maxZ: this.z + 0.35
    };
  }

  triggerCrash() {
    if (this.isInvulnerable) return false;

    if (this.hasHoverboard) {
      // Hoverboard shields the player from crash!
      this.hasHoverboard = false;
      this.hoverboardGroup.visible = false;
      this.isInvulnerable = true;
      this.invulnerableTimer = 2.0; // 2s shield blink
      window.soundEngine.playCrash();
      return false; // Not game over!
    }

    // Fatal Crash
    this.isDead = true;
    window.soundEngine.playCrash();
    return true; // Game over!
  }
}

window.Player = Player;
