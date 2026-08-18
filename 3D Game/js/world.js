// ============================================================================
// Subway Surfers Lite 3D - Procedural World, Track & Obstacle System
// Optimized object pooling, zero external 3D asset downloads, dynamic 60 FPS
// ============================================================================

const LANE_WIDTH = 2.4;
const LANES = [LANE_WIDTH, 0, -LANE_WIDTH]; // Left (+2.4), Middle (0), Right (-2.4) when looking along +Z
const CHUNK_LENGTH = 60;
const VISIBLE_CHUNKS = 6;

class WorldManager {
  constructor(scene) {
    this.scene = scene;
    this.chunks = [];
    this.activeObstacles = [];
    this.activeCoins = [];
    this.activePowerups = [];
    this.activeTrains = [];
    this.nextChunkZ = 0;
    
    // Shared Materials for high performance batching & low draw calls
    this.initMaterials();
  }

  initMaterials() {
    this.materials = {
      ground: new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.85, metalness: 0.1 }),
      rail: new THREE.MeshStandardMaterial({ color: 0x00f3ff, roughness: 0.3, metalness: 0.8, emissive: 0x004455, emissiveIntensity: 0.3 }),
      sleeper: new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.9 }),
      ballast: new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.95 }),
      wall: new THREE.MeshStandardMaterial({ color: 0x222630, roughness: 0.7 }),
      wallGlow: new THREE.MeshBasicMaterial({ color: 0xff0077 }),
      building: new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.9 }),
      buildingWindow: new THREE.MeshBasicMaterial({ color: 0xffd000 }),
      
      // Obstacle Materials
      trainRed: new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.4, metalness: 0.5 }),
      trainBlue: new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.4, metalness: 0.5 }),
      trainYellow: new THREE.MeshStandardMaterial({ color: 0xfdcb6e, roughness: 0.4, metalness: 0.5 }),
      trainRoof: new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.7 }),
      trainWindow: new THREE.MeshBasicMaterial({ color: 0x81ecec }),
      trainHeadlight: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      
      barrierWood: new THREE.MeshStandardMaterial({ color: 0xe17055, roughness: 0.6 }),
      barrierStripe: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
      metalPole: new THREE.MeshStandardMaterial({ color: 0x636e72, metalness: 0.8, roughness: 0.3 }),
      warningGantry: new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.4 }),
      rampMaterial: new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.5 }),
      
      // Collectibles
      coin: new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.15, emissive: 0xff9900, emissiveIntensity: 0.3 }),
      powerupMagnet: new THREE.MeshStandardMaterial({ color: 0x00d2d3, metalness: 0.8, roughness: 0.2, emissive: 0x01a3a4, emissiveIntensity: 0.6 }),
      powerup2X: new THREE.MeshStandardMaterial({ color: 0xff9f43, metalness: 0.8, roughness: 0.2, emissive: 0xee5253, emissiveIntensity: 0.6 }),
      powerupJetpack: new THREE.MeshStandardMaterial({ color: 0xa55eea, metalness: 0.8, roughness: 0.2, emissive: 0x8854d0, emissiveIntensity: 0.6 }),
      powerupBoard: new THREE.MeshStandardMaterial({ color: 0x10ac84, metalness: 0.8, roughness: 0.2, emissive: 0x1dd1a1, emissiveIntensity: 0.6 }),
    };

    // Shared Geometries
    this.geometries = {
      coin: new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16),
      powerupBox: new THREE.BoxGeometry(0.7, 0.7, 0.7),
      rail: new THREE.BoxGeometry(0.08, 0.1, CHUNK_LENGTH),
      sleeper: new THREE.BoxGeometry(1.6, 0.1, 0.3),
      barrierLow: new THREE.BoxGeometry(2.0, 0.75, 0.2),
      barrierHigh: new THREE.BoxGeometry(2.0, 0.4, 0.2),
      pole: new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8),
      ramp: this.createRampGeometry(2.1, 2.2, 5.0)
    };
  }

  createRampGeometry(width, height, length) {
    const geom = new THREE.BufferGeometry();
    // Triangular prism wedge for smooth train roof access
    const vertices = new Float32Array([
      // Front face
      -width/2, 0, length/2,
       width/2, 0, length/2,
       width/2, height, -length/2,
      -width/2, 0, length/2,
       width/2, height, -length/2,
      -width/2, height, -length/2,
      // Left side
      -width/2, 0, length/2,
      -width/2, height, -length/2,
      -width/2, 0, -length/2,
      // Right side
       width/2, 0, length/2,
       width/2, 0, -length/2,
       width/2, height, -length/2,
      // Back face
      -width/2, 0, -length/2,
      -width/2, height, -length/2,
       width/2, height, -length/2,
      -width/2, 0, -length/2,
       width/2, height, -length/2,
       width/2, 0, -length/2
    ]);
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.computeVertexNormals();
    return geom;
  }

  reset() {
    // Clear all chunks and active objects
    this.chunks.forEach(c => this.scene.remove(c.group));
    this.activeObstacles.forEach(o => this.scene.remove(o.mesh));
    this.activeCoins.forEach(c => this.scene.remove(c.mesh));
    this.activePowerups.forEach(p => this.scene.remove(p.mesh));
    this.activeTrains.forEach(t => this.scene.remove(t.mesh));

    this.chunks = [];
    this.activeObstacles = [];
    this.activeCoins = [];
    this.activePowerups = [];
    this.activeTrains = [];
    this.nextChunkZ = -10;

    // Spawn initial safe starting tracks
    for (let i = 0; i < VISIBLE_CHUNKS; i++) {
      this.spawnChunk(i === 0 || i === 1); // first 2 chunks safe with only coins
    }
  }

  spawnChunk(isSafe = false) {
    const chunkZ = this.nextChunkZ;
    const chunkGroup = new THREE.Group();
    chunkGroup.position.z = chunkZ;

    // 1. Ground & Track Base
    const groundGeom = new THREE.PlaneGeometry(16, CHUNK_LENGTH);
    const ground = new THREE.Mesh(groundGeom, this.materials.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, CHUNK_LENGTH / 2);
    ground.receiveShadow = true;
    chunkGroup.add(ground);

    // Ballast track beds & rails for 3 lanes
    LANES.forEach(laneX => {
      // Left and Right Rails
      const railLeft = new THREE.Mesh(this.geometries.rail, this.materials.rail);
      railLeft.position.set(laneX - 0.6, 0.05, CHUNK_LENGTH / 2);
      chunkGroup.add(railLeft);

      const railRight = new THREE.Mesh(this.geometries.rail, this.materials.rail);
      railRight.position.set(laneX + 0.6, 0.05, CHUNK_LENGTH / 2);
      chunkGroup.add(railRight);

      // Sleepers
      const sleeperCount = Math.floor(CHUNK_LENGTH / 1.5);
      for (let s = 0; s < sleeperCount; s++) {
        const sleeper = new THREE.Mesh(this.geometries.sleeper, this.materials.sleeper);
        sleeper.position.set(laneX, 0.02, s * 1.5);
        chunkGroup.add(sleeper);
      }
    });

    // 2. Tunnel Walls & Neon Accents
    const wallGeom = new THREE.BoxGeometry(0.6, 4.5, CHUNK_LENGTH);
    const wallLeft = new THREE.Mesh(wallGeom, this.materials.wall);
    wallLeft.position.set(-8, 2.25, CHUNK_LENGTH / 2);
    chunkGroup.add(wallLeft);

    const wallRight = new THREE.Mesh(wallGeom, this.materials.wall);
    wallRight.position.set(8, 2.25, CHUNK_LENGTH / 2);
    chunkGroup.add(wallRight);

    // Neon wall light strip
    const stripGeom = new THREE.BoxGeometry(0.1, 0.15, CHUNK_LENGTH);
    const stripLeft = new THREE.Mesh(stripGeom, this.materials.wallGlow);
    stripLeft.position.set(-7.65, 3.2, CHUNK_LENGTH / 2);
    chunkGroup.add(stripLeft);

    const stripRight = new THREE.Mesh(stripGeom, this.materials.wallGlow);
    stripRight.position.set(7.65, 3.2, CHUNK_LENGTH / 2);
    chunkGroup.add(stripRight);

    // 3. Overhead Signal Gantries
    for (let g = 10; g < CHUNK_LENGTH; g += 30) {
      const gantryGroup = this.createGantry();
      gantryGroup.position.set(0, 0, g);
      chunkGroup.add(gantryGroup);
    }

    // 4. Distant City Skyline Buildings outside walls
    for (let b = 0; b < CHUNK_LENGTH; b += 12) {
      const h1 = 12 + Math.random() * 20;
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(6, h1, 8), this.materials.building);
      b1.position.set(-14, h1 / 2, b + 4);
      chunkGroup.add(b1);

      const h2 = 12 + Math.random() * 20;
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(6, h2, 8), this.materials.building);
      b2.position.set(14, h2 / 2, b + 4);
      chunkGroup.add(b2);
    }

    this.scene.add(chunkGroup);
    this.chunks.push({ group: chunkGroup, z: chunkZ });

    // 5. Populate Obstacles & Collectibles
    if (!isSafe) {
      this.populateChunk(chunkZ);
    } else {
      // Just coins for introductory run
      this.spawnCoinArc(0, chunkZ + 15, 6);
    }

    this.nextChunkZ += CHUNK_LENGTH;
  }

  createGantry() {
    const g = new THREE.Group();
    // Left & right poles
    const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 8), this.materials.metalPole);
    poleL.position.set(-7.5, 2.5, 0);
    g.add(poleL);

    const poleR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 8), this.materials.metalPole);
    poleR.position.set(7.5, 2.5, 0);
    g.add(poleR);

    // Cross beam
    const beam = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.3, 0.4), this.materials.warningGantry);
    beam.position.set(0, 4.8, 0);
    g.add(beam);

    // Traffic signal lights for each lane
    LANES.forEach(lx => {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
      light.position.set(lx, 4.5, 0);
      g.add(light);
    });

    return g;
  }

  populateChunk(chunkStartZ) {
    const patterns = ['TRAIN_LANE', 'BARRIER_COMBO', 'RAMP_TRAIN', 'MOVING_TRAIN', 'COIN_RUSH'];
    const chosenPattern = patterns[Math.floor(Math.random() * patterns.length)];

    const laneIndices = [0, 1, 2];
    // Shuffle lanes
    laneIndices.sort(() => Math.random() - 0.5);

    switch (chosenPattern) {
      case 'TRAIN_LANE': {
        // One lane has a stationary train, another has a low barrier, third has coin arc
        const trainLane = LANES[laneIndices[0]];
        const barrierLane = LANES[laneIndices[1]];
        const safeLane = LANES[laneIndices[2]];

        this.spawnTrain(trainLane, chunkStartZ + 20, false);
        this.spawnBarrierLow(barrierLane, chunkStartZ + 15);
        this.spawnBarrierHigh(barrierLane, chunkStartZ + 35);
        this.spawnCoinArc(safeLane, chunkStartZ + 10, 8);
        this.maybeSpawnPowerup(safeLane, chunkStartZ + 45);
        break;
      }

      case 'RAMP_TRAIN': {
        // Ramp leading directly onto a train roof!
        const rampLane = LANES[laneIndices[0]];
        const otherLane = LANES[laneIndices[1]];

        this.spawnTrainWithRamp(rampLane, chunkStartZ + 15);
        this.spawnBarrierLow(otherLane, chunkStartZ + 25);
        this.maybeSpawnPowerup(LANES[laneIndices[2]], chunkStartZ + 20);
        break;
      }

      case 'MOVING_TRAIN': {
        // Approaching oncoming train in one lane!
        const movingLane = LANES[laneIndices[0]];
        const blockLane = LANES[laneIndices[1]];
        const clearLane = LANES[laneIndices[2]];

        this.spawnTrain(movingLane, chunkStartZ + 35, true); // moving train!
        this.spawnBarrierLow(blockLane, chunkStartZ + 18);
        this.spawnCoinArc(clearLane, chunkStartZ + 10, 8);
        break;
      }

      case 'BARRIER_COMBO': {
        // Low and high hurdles testing jump and slide reflexes
        const l1 = LANES[laneIndices[0]];
        const l2 = LANES[laneIndices[1]];
        const l3 = LANES[laneIndices[2]];

        this.spawnBarrierLow(l1, chunkStartZ + 15);
        this.spawnBarrierHigh(l1, chunkStartZ + 30);
        this.spawnCoinArc(l1, chunkStartZ + 15, 6, true); // jumping coins

        this.spawnBarrierHigh(l2, chunkStartZ + 15);
        this.spawnBarrierLow(l2, chunkStartZ + 32);

        this.spawnTrain(l3, chunkStartZ + 22, false);
        this.maybeSpawnPowerup(l1, chunkStartZ + 45);
        break;
      }

      case 'COIN_RUSH': {
        // Generous coin lanes with moderate hurdles
        LANES.forEach((lane, idx) => {
          if (idx === 0) {
            this.spawnCoinArc(lane, chunkStartZ + 10, 10);
            this.spawnBarrierLow(lane, chunkStartZ + 45);
          } else if (idx === 1) {
            this.spawnBarrierHigh(lane, chunkStartZ + 20);
            this.spawnCoinArc(lane, chunkStartZ + 28, 8);
          } else {
            this.spawnTrain(lane, chunkStartZ + 25, false);
          }
        });
        this.maybeSpawnPowerup(LANES[1], chunkStartZ + 12);
        break;
      }
    }
  }

  // --- Obstacle Builders ---

  spawnTrain(laneX, zPos, isMoving = false) {
    const trainGroup = new THREE.Group();
    const length = 18;
    const height = 2.4;
    const width = 2.1;

    // Train Body
    const bodyMat = isMoving ? this.materials.trainYellow : (Math.random() > 0.5 ? this.materials.trainRed : this.materials.trainBlue);
    const bodyGeom = new THREE.BoxGeometry(width, height, length);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.set(0, height / 2, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    trainGroup.add(body);

    // Train Roof (flat surface you can run on!)
    const roofGeom = new THREE.BoxGeometry(width + 0.1, 0.15, length + 0.1);
    const roof = new THREE.Mesh(roofGeom, this.materials.trainRoof);
    roof.position.set(0, height + 0.07, 0);
    roof.receiveShadow = true;
    trainGroup.add(roof);

    // Side Windows
    const winGeom = new THREE.BoxGeometry(0.05, 0.6, 1.2);
    for (let w = -length/2 + 2; w < length/2 - 1; w += 2.8) {
      const winL = new THREE.Mesh(winGeom, this.materials.trainWindow);
      winL.position.set(-width/2 - 0.02, height * 0.65, w);
      trainGroup.add(winL);

      const winR = new THREE.Mesh(winGeom, this.materials.trainWindow);
      winR.position.set(width/2 + 0.02, height * 0.65, w);
      trainGroup.add(winR);
    }

    // Front Headlights
    const lightGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 8);
    const hl1 = new THREE.Mesh(lightGeom, this.materials.trainHeadlight);
    hl1.rotation.x = Math.PI / 2;
    hl1.position.set(-0.6, 0.9, -length/2 - 0.02);
    trainGroup.add(hl1);

    const hl2 = new THREE.Mesh(lightGeom, this.materials.trainHeadlight);
    hl2.rotation.x = Math.PI / 2;
    hl2.position.set(0.6, 0.9, -length/2 - 0.02);
    trainGroup.add(hl2);

    trainGroup.position.set(laneX, 0, zPos);
    this.scene.add(trainGroup);

    const obstacleObj = {
      type: 'TRAIN',
      mesh: trainGroup,
      laneX: laneX,
      x: laneX,
      y: height / 2,
      z: zPos,
      width: width,
      height: height,
      length: length,
      roofY: height,
      isMoving: isMoving,
      speedZ: isMoving ? -12 : 0 // moves towards player
    };

    this.activeObstacles.push(obstacleObj);
    if (isMoving) {
      this.activeTrains.push(obstacleObj);
    }

    // Spawn coins on train roof
    for (let cz = -length/2 + 3; cz <= length/2 - 3; cz += 2.5) {
      this.spawnCoin(laneX, height + 0.6, zPos + cz);
    }
  }

  spawnTrainWithRamp(laneX, zPos) {
    // 1. Train
    this.spawnTrain(laneX, zPos + 11.5, false);

    // 2. Ramp placed immediately in front of the train
    const rampLength = 5.0;
    const rampHeight = 2.4;
    const ramp = new THREE.Mesh(this.geometries.ramp, this.materials.rampMaterial);
    ramp.position.set(laneX, 0, zPos);
    ramp.receiveShadow = true;
    ramp.castShadow = true;
    this.scene.add(ramp);

    this.activeObstacles.push({
      type: 'RAMP',
      mesh: ramp,
      laneX: laneX,
      x: laneX,
      y: rampHeight / 2,
      z: zPos,
      width: 2.1,
      height: rampHeight,
      length: rampLength,
      roofY: rampHeight
    });

    // Coins leading up the ramp onto the train!
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      const coinZ = zPos - rampLength/2 + t * rampLength;
      const coinY = 0.5 + t * rampHeight;
      this.spawnCoin(laneX, coinY, coinZ);
    }
  }

  spawnBarrierLow(laneX, zPos) {
    const group = new THREE.Group();
    // Low striped hurdle (must jump over)
    const hurdle = new THREE.Mesh(this.geometries.barrierLow, this.materials.barrierWood);
    hurdle.position.set(0, 0.75 / 2, 0);
    hurdle.castShadow = true;
    group.add(hurdle);

    // White stripes
    const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.76, 0.22), this.materials.barrierStripe);
    stripe1.position.set(-0.5, 0.75 / 2, 0);
    group.add(stripe1);
    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.76, 0.22), this.materials.barrierStripe);
    stripe2.position.set(0.5, 0.75 / 2, 0);
    group.add(stripe2);

    group.position.set(laneX, 0, zPos);
    this.scene.add(group);

    this.activeObstacles.push({
      type: 'BARRIER_LOW',
      mesh: group,
      laneX: laneX,
      x: laneX,
      y: 0.75 / 2,
      z: zPos,
      width: 2.0,
      height: 0.8,
      length: 0.4
    });
  }

  spawnBarrierHigh(laneX, zPos) {
    const group = new THREE.Group();
    // Side support poles
    const poleL = new THREE.Mesh(this.geometries.pole, this.materials.metalPole);
    poleL.position.set(-0.95, 1.4, 0);
    group.add(poleL);

    const poleR = new THREE.Mesh(this.geometries.pole, this.materials.metalPole);
    poleR.position.set(0.95, 1.4, 0);
    group.add(poleR);

    // High warning crossbar (must slide under!)
    const bar = new THREE.Mesh(this.geometries.barrierHigh, this.materials.warningGantry);
    bar.position.set(0, 1.9, 0); // Clearance beneath is ~1.5m
    bar.castShadow = true;
    group.add(bar);

    group.position.set(laneX, 0, zPos);
    this.scene.add(group);

    this.activeObstacles.push({
      type: 'BARRIER_HIGH',
      mesh: group,
      laneX: laneX,
      x: laneX,
      y: 1.9,
      z: zPos,
      width: 2.0,
      height: 0.8,
      minY: 1.3, // player can slide underneath if Y <= 1.3
      length: 0.4
    });
  }

  // --- Collectibles & Power-ups ---

  spawnCoin(laneX, yPos, zPos) {
    const coin = new THREE.Mesh(this.geometries.coin, this.materials.coin);
    coin.rotation.z = Math.PI / 2;
    coin.position.set(laneX, yPos, zPos);
    coin.castShadow = false;
    this.scene.add(coin);

    this.activeCoins.push({
      mesh: coin,
      x: laneX,
      y: yPos,
      z: zPos,
      collected: false
    });
  }

  spawnCoinArc(laneX, startZ, count = 6, highArc = false) {
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      // Parabolic jump arc or flat line
      const y = highArc ? 0.6 + Math.sin(t * Math.PI) * 2.2 : 0.6;
      const z = startZ + i * 2.2;
      this.spawnCoin(laneX, y, z);
    }
  }

  maybeSpawnPowerup(laneX, zPos) {
    if (Math.random() > 0.4) return; // 40% chance per chunk segment
    const types = ['magnet', 'multiplier', 'jetpack', 'hoverboard'];
    const type = types[Math.floor(Math.random() * types.length)];

    let mat = this.materials.powerupMagnet;
    if (type === 'multiplier') mat = this.materials.powerup2X;
    if (type === 'jetpack') mat = this.materials.powerupJetpack;
    if (type === 'hoverboard') mat = this.materials.powerupBoard;

    const group = new THREE.Group();
    const box = new THREE.Mesh(this.geometries.powerupBox, mat);
    box.position.y = 0.8;
    box.rotation.y = Math.PI / 4;
    group.add(box);

    // Glowing halo ring
    const ringGeom = new THREE.TorusGeometry(0.55, 0.05, 8, 24);
    const ring = new THREE.Mesh(ringGeom, mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.8;
    group.add(ring);

    group.position.set(laneX, 0, zPos);
    this.scene.add(group);

    this.activePowerups.push({
      type: type,
      mesh: group,
      ring: ring,
      box: box,
      x: laneX,
      y: 0.8,
      z: zPos,
      collected: false
    });
  }

  // --- Animation & Recycling Loop ---

  update(delta, playerZ) {
    // 1. Move oncoming trains
    this.activeTrains.forEach(train => {
      train.mesh.position.z += train.speedZ * delta;
      train.z = train.mesh.position.z;
    });

    // 2. Rotate Coins & Power-ups
    const spin = delta * 3.5;
    this.activeCoins.forEach(coin => {
      coin.mesh.rotation.y += spin;
    });

    this.activePowerups.forEach(p => {
      p.box.rotation.y += spin * 0.8;
      p.box.rotation.x += spin * 0.4;
      p.ring.rotation.z += spin * 1.2;
    });

    // 3. Chunk Recycling & Spawning
    if (playerZ + CHUNK_LENGTH * (VISIBLE_CHUNKS - 2) > this.nextChunkZ) {
      this.spawnChunk(false);
    }

    // Cleanup old chunks that are far behind player (playerZ - 40)
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const chunk = this.chunks[i];
      if (chunk.z + CHUNK_LENGTH < playerZ - 35) {
        this.scene.remove(chunk.group);
        this.chunks.splice(i, 1);
      }
    }

    // Cleanup passed obstacles
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obs = this.activeObstacles[i];
      if (obs.z + (obs.length || 2) < playerZ - 20) {
        this.scene.remove(obs.mesh);
        this.activeObstacles.splice(i, 1);
        const tIdx = this.activeTrains.indexOf(obs);
        if (tIdx !== -1) this.activeTrains.splice(tIdx, 1);
      }
    }

    // Cleanup collected or passed coins
    for (let i = this.activeCoins.length - 1; i >= 0; i--) {
      const coin = this.activeCoins[i];
      if (coin.collected || coin.z < playerZ - 15) {
        this.scene.remove(coin.mesh);
        this.activeCoins.splice(i, 1);
      }
    }

    // Cleanup powerups
    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
      const p = this.activePowerups[i];
      if (p.collected || p.z < playerZ - 15) {
        this.scene.remove(p.mesh);
        this.activePowerups.splice(i, 1);
      }
    }
  }
}

window.WorldManager = WorldManager;
window.LANE_WIDTH = LANE_WIDTH;
window.LANES = LANES;
