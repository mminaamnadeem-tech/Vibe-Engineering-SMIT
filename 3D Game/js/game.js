// ============================================================================
// Subway Surfers Lite 3D - Main Game Loop, Camera, Input, State Machine & UI
// Ultra-smooth 60+ FPS, Three.js WebGL, Multi-platform Touch & Keyboard
// ============================================================================

class Game {
  constructor() {
    this.container = document.getElementById('game-container');
    this.scoreEl = document.getElementById('hud-score');
    this.coinsEl = document.getElementById('hud-coins');
    this.multiplierBadge = document.getElementById('hud-multiplier');
    this.powerupsContainer = document.getElementById('hud-powerups');
    
    // Screens & Modals
    this.startScreen = document.getElementById('screen-start');
    this.pauseModal = document.getElementById('modal-pause');
    this.gameOverModal = document.getElementById('modal-gameover');
    this.shopModal = document.getElementById('modal-shop');
    
    // Stats & Persistence
    this.score = 0;
    this.coinsThisRun = 0;
    this.distance = 0;
    this.baseSpeed = 18;
    this.currentSpeed = 18;
    this.maxSpeed = 40;
    
    this.highScore = parseInt(localStorage.getItem('subway_highscore') || '0', 10);
    this.totalCoins = parseInt(localStorage.getItem('subway_coins') || '0', 10);
    this.unlockedSkins = JSON.parse(localStorage.getItem('subway_skins') || '["dash"]');
    this.unlockedBoards = JSON.parse(localStorage.getItem('subway_boards') || '["cyber"]');
    this.selectedSkin = localStorage.getItem('subway_selected_skin') || 'dash';
    this.selectedBoard = localStorage.getItem('subway_selected_board') || 'cyber';

    // Game States: 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER'
    this.state = 'MENU';
    this.clock = new THREE.Clock();

    this.initThree();
    this.initWorld();
    this.initPlayer();
    this.initParticles();
    this.initInputs();
    this.initUI();

    // Start render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    // 1. Scene & Depth Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f121d);
    this.scene.fog = new THREE.FogExp2(0x0f121d, 0.014);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
    this.cameraOffset = new THREE.Vector3(0, 3.4, -5.8);
    this.cameraTarget = new THREE.Vector3(0, 1.2, 8);
    this.camera.position.set(0, 3.8, -6);
    this.camera.lookAt(0, 1.2, 8);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xdff9fb, 0.7);
    this.scene.add(ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfffae6, 1.1);
    this.dirLight.position.set(15, 30, 10);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 80;
    this.dirLight.shadow.camera.left = -15;
    this.dirLight.shadow.camera.right = 15;
    this.dirLight.shadow.camera.top = 20;
    this.dirLight.shadow.camera.bottom = -20;
    this.scene.add(this.dirLight);

    // Dynamic Player Light
    this.playerLight = new THREE.PointLight(0x00f3ff, 1.2, 12);
    this.playerLight.position.set(0, 2, 0);
    this.scene.add(this.playerLight);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initWorld() {
    this.worldManager = new WorldManager(this.scene);
    this.worldManager.reset();
  }

  initPlayer() {
    this.player = new Player(this.scene);
    this.player.setSkin(this.selectedSkin);
    this.player.setBoardSkin(this.selectedBoard);
  }

  initParticles() {
    // Particle burst system for coin pickups and crash sparks
    this.particleCount = 60;
    const geom = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.particleCount * 3);
    this.particleVelocities = [];
    this.particleLifes = [];

    for (let i = 0; i < this.particleCount; i++) {
      this.particlePositions[i * 3] = 0;
      this.particlePositions[i * 3 + 1] = -100;
      this.particlePositions[i * 3 + 2] = 0;
      this.particleVelocities.push(new THREE.Vector3());
      this.particleLifes.push(0);
    }

    geom.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.22,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(geom, mat);
    this.scene.add(this.particleSystem);
  }

  spawnParticleBurst(x, y, z, colorHex = 0xffd700, count = 12) {
    this.particleSystem.material.color.setHex(colorHex);
    let spawned = 0;
    for (let i = 0; i < this.particleCount && spawned < count; i++) {
      if (this.particleLifes[i] <= 0) {
        this.particlePositions[i * 3] = x;
        this.particlePositions[i * 3 + 1] = y;
        this.particlePositions[i * 3 + 2] = z;
        this.particleVelocities[i].set(
          (Math.random() - 0.5) * 8,
          Math.random() * 7 + 2,
          (Math.random() - 0.5) * 8
        );
        this.particleLifes[i] = 0.5 + Math.random() * 0.3;
        spawned++;
      }
    }
  }

  updateParticles(delta) {
    const posAttr = this.particleSystem.geometry.attributes.position;
    for (let i = 0; i < this.particleCount; i++) {
      if (this.particleLifes[i] > 0) {
        this.particleLifes[i] -= delta;
        this.particleVelocities[i].y -= 20 * delta; // gravity
        this.particlePositions[i * 3] += this.particleVelocities[i].x * delta;
        this.particlePositions[i * 3 + 1] += this.particleVelocities[i].y * delta;
        this.particlePositions[i * 3 + 2] += this.particleVelocities[i].z * delta;
      } else {
        this.particlePositions[i * 3 + 1] = -100; // hide
      }
    }
    posAttr.needsUpdate = true;
  }

  // --- Input Management ---

  initInputs() {
    // 1. Keyboard
    window.addEventListener('keydown', (e) => {
      // Audio resume on first action
      window.soundEngine.resume();

      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
        return;
      }

      if (this.state === 'MENU') {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp' || e.code === 'KeyW') {
          this.startGame();
        }
        return;
      }

      if (this.state === 'GAMEOVER') {
        if (e.code === 'Space' || e.code === 'Enter') {
          this.restartGame();
        }
        return;
      }

      if (this.state !== 'PLAYING') return;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.player.moveLeft();
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.player.moveRight();
          break;
        case 'ArrowUp':
        case 'KeyW':
          this.player.jump();
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.player.slide();
          break;
        case 'Space':
        case 'KeyB':
          this.player.activateHoverboard();
          break;
      }
    });

    // 2. Touch & Swipe Controls for Mobile/Tablet
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTapTime = 0;

    window.addEventListener('touchstart', (e) => {
      window.soundEngine.resume();
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }

      // Detect Double Tap for Hoverboard
      const now = Date.now();
      if (now - lastTapTime < 300) {
        if (this.state === 'PLAYING') {
          this.player.activateHoverboard();
        }
      }
      lastTapTime = now;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (this.state === 'MENU') {
        this.startGame();
        return;
      }

      if (this.state !== 'PLAYING') return;

      if (!e.changedTouches || e.changedTouches.length === 0) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      const threshold = 30; // Minimum swipe distance

      if (Math.max(absDx, absDy) > threshold) {
        if (absDx > absDy) {
          // Horizontal Swipe
          if (dx > 0) this.player.moveRight();
          else this.player.moveLeft();
        } else {
          // Vertical Swipe
          if (dy > 0) this.player.slide(); // Swipe down
          else this.player.jump(); // Swipe up
        }
      }
    }, { passive: true });
  }

  // --- UI Controller ---

  initUI() {
    // High score & Coins Display
    document.getElementById('start-highscore').innerText = this.highScore.toLocaleString();
    document.getElementById('start-coins').innerText = this.totalCoins.toLocaleString();

    // Start Button
    document.getElementById('btn-play').addEventListener('click', () => {
      window.soundEngine.resume();
      this.startGame();
    });

    // Shop Button
    document.getElementById('btn-shop').addEventListener('click', () => {
      this.openShop();
    });
    document.getElementById('btn-close-shop').addEventListener('click', () => {
      this.closeShop();
    });

    // Pause Controls
    document.getElementById('btn-pause').addEventListener('click', () => {
      this.togglePause();
    });
    document.getElementById('btn-resume').addEventListener('click', () => {
      this.togglePause();
    });
    document.getElementById('btn-restart-pause').addEventListener('click', () => {
      this.restartGame();
    });

    // Game Over Buttons
    document.getElementById('btn-play-again').addEventListener('click', () => {
      this.restartGame();
    });

    // Audio & Mute Toggle
    const muteBtn = document.getElementById('btn-mute');
    muteBtn.addEventListener('click', () => {
      const isMuted = window.soundEngine.toggleMute();
      muteBtn.innerText = isMuted ? '🔇' : '🔊';
    });

    // Render Shop items
    this.renderShopItems();
  }

  renderShopItems() {
    const skinsContainer = document.getElementById('shop-skins-list');
    const boardsContainer = document.getElementById('shop-boards-list');
    if (!skinsContainer || !boardsContainer) return;

    const skins = [
      { id: 'dash', name: 'Speedster Dash', price: 0, desc: 'Street runner ready for neon rails' },
      { id: 'neon', name: 'Cyber Neon', price: 150, desc: 'Futuristic purple & electric green runner' },
      { id: 'gold', name: 'Golden Champion', price: 300, desc: 'Glorious gold plated speed master' }
    ];

    const boards = [
      { id: 'cyber', name: 'Cyber Wave', price: 0, desc: 'Cyan glowing anti-gravity board' },
      { id: 'flame', name: 'Inferno Flame', price: 200, desc: 'High-heat jet propelled board' },
      { id: 'plasma', name: 'Plasma Surge', price: 400, desc: 'Electric purple overdrive board' }
    ];

    skinsContainer.innerHTML = skins.map(skin => {
      const isUnlocked = this.unlockedSkins.includes(skin.id);
      const isSelected = this.selectedSkin === skin.id;
      return `
        <div class="shop-card ${isSelected ? 'selected' : ''}">
          <div class="shop-card-header">
            <h4>${skin.name}</h4>
            <span class="shop-badge">${isUnlocked ? (isSelected ? 'EQUIPPED' : 'OWNED') : `🪙 ${skin.price}`}</span>
          </div>
          <p class="shop-desc">${skin.desc}</p>
          <button class="btn ${isSelected ? 'btn-secondary' : 'btn-primary'}" onclick="window.game.selectSkin('${skin.id}', ${skin.price})">
            ${isSelected ? 'Selected' : (isUnlocked ? 'Equip' : `Unlock (🪙 ${skin.price})`)}
          </button>
        </div>
      `;
    }).join('');

    boardsContainer.innerHTML = boards.map(board => {
      const isUnlocked = this.unlockedBoards.includes(board.id);
      const isSelected = this.selectedBoard === board.id;
      return `
        <div class="shop-card ${isSelected ? 'selected' : ''}">
          <div class="shop-card-header">
            <h4>${board.name}</h4>
            <span class="shop-badge">${isUnlocked ? (isSelected ? 'EQUIPPED' : 'OWNED') : `🪙 ${board.price}`}</span>
          </div>
          <p class="shop-desc">${board.desc}</p>
          <button class="btn ${isSelected ? 'btn-secondary' : 'btn-primary'}" onclick="window.game.selectBoard('${board.id}', ${board.price})">
            ${isSelected ? 'Selected' : (isUnlocked ? 'Equip' : `Unlock (🪙 ${board.price})`)}
          </button>
        </div>
      `;
    }).join('');
  }

  selectSkin(id, price) {
    if (this.unlockedSkins.includes(id)) {
      this.selectedSkin = id;
      this.player.setSkin(id);
      localStorage.setItem('subway_selected_skin', id);
    } else if (this.totalCoins >= price) {
      this.totalCoins -= price;
      this.unlockedSkins.push(id);
      this.selectedSkin = id;
      this.player.setSkin(id);
      localStorage.setItem('subway_coins', this.totalCoins);
      localStorage.setItem('subway_skins', JSON.stringify(this.unlockedSkins));
      localStorage.setItem('subway_selected_skin', id);
      window.soundEngine.playPowerup();
    } else {
      alert("Not enough coins! Collect more in your subway runs.");
    }
    this.updateCoinsDisplay();
    this.renderShopItems();
  }

  selectBoard(id, price) {
    if (this.unlockedBoards.includes(id)) {
      this.selectedBoard = id;
      this.player.setBoardSkin(id);
      localStorage.setItem('subway_selected_board', id);
    } else if (this.totalCoins >= price) {
      this.totalCoins -= price;
      this.unlockedBoards.push(id);
      this.selectedBoard = id;
      this.player.setBoardSkin(id);
      localStorage.setItem('subway_coins', this.totalCoins);
      localStorage.setItem('subway_boards', JSON.stringify(this.unlockedBoards));
      localStorage.setItem('subway_selected_board', id);
      window.soundEngine.playPowerup();
    } else {
      alert("Not enough coins! Collect more in your subway runs.");
    }
    this.updateCoinsDisplay();
    this.renderShopItems();
  }

  openShop() {
    this.shopModal.classList.remove('hidden');
    this.updateCoinsDisplay();
    this.renderShopItems();
  }

  closeShop() {
    this.shopModal.classList.add('hidden');
  }

  updateCoinsDisplay() {
    document.getElementById('start-coins').innerText = this.totalCoins.toLocaleString();
    const shopCoins = document.getElementById('shop-total-coins');
    if (shopCoins) shopCoins.innerText = this.totalCoins.toLocaleString();
  }

  // --- Game Flow ---

  startGame() {
    this.state = 'PLAYING';
    this.score = 0;
    this.coinsThisRun = 0;
    this.distance = 0;
    this.currentSpeed = this.baseSpeed;
    
    this.worldManager.reset();
    this.player.reset();

    this.startScreen.classList.add('hidden');
    this.pauseModal.classList.add('hidden');
    this.gameOverModal.classList.add('hidden');
    this.shopModal.classList.add('hidden');

    window.soundEngine.startBGM();
  }

  restartGame() {
    this.startGame();
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.pauseModal.classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.pauseModal.classList.add('hidden');
    }
  }

  triggerGameOver() {
    this.state = 'GAMEOVER';
    window.soundEngine.stopBGM();

    // Check High Score
    const isNewRecord = this.score > this.highScore;
    if (isNewRecord) {
      this.highScore = this.score;
      localStorage.setItem('subway_highscore', this.highScore);
    }

    // Save Bank Coins
    this.totalCoins += this.coinsThisRun;
    localStorage.setItem('subway_coins', this.totalCoins);

    // Update Game Over Modal UI
    document.getElementById('go-final-score').innerText = this.score.toLocaleString();
    document.getElementById('go-coins-run').innerText = this.coinsThisRun.toLocaleString();
    document.getElementById('go-total-coins').innerText = this.totalCoins.toLocaleString();
    document.getElementById('go-high-score').innerText = this.highScore.toLocaleString();
    
    const newRecordBadge = document.getElementById('go-new-record');
    if (newRecordBadge) {
      newRecordBadge.style.display = isNewRecord ? 'block' : 'none';
    }

    this.gameOverModal.classList.remove('hidden');
  }

  // --- Main Animation & Logic Loop ---

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.08); // limit large spikes

    if (this.state === 'PLAYING') {
      this.updateGame(delta);
    } else if (this.state === 'MENU') {
      // Gentle menu camera bobbing
      const time = Date.now() * 0.0015;
      this.camera.position.x = Math.sin(time) * 1.2;
      this.camera.position.y = 3.6 + Math.cos(time * 1.5) * 0.3;
      this.camera.lookAt(0, 1.2, 6);
    }

    this.renderer.render(this.scene, this.camera);
  }

  updateGame(delta) {
    // 1. Progressive Speed curve
    this.currentSpeed = Math.min(this.maxSpeed, this.baseSpeed + this.distance * 0.014);

    // 2. Advance player forward along track Z
    const moveZ = this.currentSpeed * delta;
    this.player.z += moveZ;
    this.distance += moveZ;

    // 3. Update Player & World
    this.player.update(delta, this.currentSpeed, this.worldManager.activeObstacles);
    this.worldManager.update(delta, this.player.z);
    this.updateParticles(delta);

    // 4. Smooth Camera Tracking
    const targetCamX = this.player.x * 0.6;
    const targetCamY = Math.max(3.2, this.player.y + 2.8);
    const targetCamZ = this.player.z - 5.6;

    this.camera.position.x += (targetCamX - this.camera.position.x) * delta * 8;
    this.camera.position.y += (targetCamY - this.camera.position.y) * delta * 8;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * delta * 14;

    this.camera.lookAt(this.player.x * 0.3, this.player.y + 1.2, this.player.z + 9);

    // Dynamic light following player
    this.playerLight.position.set(this.player.x, this.player.y + 2, this.player.z + 1);
    this.dirLight.position.set(this.player.x + 15, 30, this.player.z + 10);
    this.dirLight.target.position.set(this.player.x, 0, this.player.z + 15);
    this.dirLight.target.updateMatrixWorld();

    // 5. Magnet Attraction Physics
    if (this.player.isMagnetActive) {
      this.worldManager.activeCoins.forEach(coin => {
        if (coin.collected) return;
        const dx = this.player.x - coin.x;
        const dy = (this.player.y + 0.8) - coin.y;
        const dz = this.player.z - coin.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < 160) { // Attraction radius ~12.5m
          const pullSpeed = 35 * delta;
          coin.mesh.position.x += dx * pullSpeed;
          coin.mesh.position.y += dy * pullSpeed;
          coin.mesh.position.z += dz * pullSpeed;
          coin.x = coin.mesh.position.x;
          coin.y = coin.mesh.position.y;
          coin.z = coin.mesh.position.z;
        }
      });
    }

    // 6. Coin Collection Collisions
    const pBox = this.player.getHitbox();
    this.worldManager.activeCoins.forEach(coin => {
      if (coin.collected) return;
      if (
        Math.abs(this.player.x - coin.x) < 0.85 &&
        Math.abs((this.player.y + 0.8) - coin.y) < 1.3 &&
        Math.abs(this.player.z - coin.z) < 0.9
      ) {
        coin.collected = true;
        this.coinsThisRun++;
        const coinScore = this.player.isMultiplierActive ? 100 : 50;
        this.score += coinScore;
        window.soundEngine.playCoin();
        this.spawnParticleBurst(coin.x, coin.y, coin.z, 0xffd700, 8);
      }
    });

    // 7. Power-up Item Collisions
    this.worldManager.activePowerups.forEach(p => {
      if (p.collected) return;
      if (
        Math.abs(this.player.x - p.x) < 1.1 &&
        Math.abs((this.player.y + 0.8) - p.y) < 1.4 &&
        Math.abs(this.player.z - p.z) < 1.1
      ) {
        p.collected = true;
        this.player.activatePowerup(p.type);
        this.spawnParticleBurst(p.x, p.y + 0.8, p.z, 0x00f3ff, 16);
      }
    });

    // 8. Obstacle Collisions & Roof Handling
    for (let obs of this.worldManager.activeObstacles) {
      if (this.checkObstacleCollision(pBox, obs)) {
        const isGameOver = this.player.triggerCrash();
        this.spawnParticleBurst(this.player.x, this.player.y + 1, this.player.z, 0xff3838, 20);
        if (isGameOver) {
          this.triggerGameOver();
          break;
        }
      }
    }

    // 9. Update Score & HUD
    const multiplier = this.player.isMultiplierActive ? 2 : 1;
    this.score += Math.floor(moveZ * 1.2 * multiplier);
    
    this.scoreEl.innerText = this.score.toLocaleString();
    this.coinsEl.innerText = this.coinsThisRun.toLocaleString();
    this.multiplierBadge.style.display = this.player.isMultiplierActive ? 'inline-flex' : 'none';

    this.updatePowerupHUD();
  }

  checkObstacleCollision(pBox, obs) {
    // If invulnerable or flying high in jetpack, ignore ground obstacles
    if (this.player.isInvulnerable) return false;
    if (this.player.isJetpackActive && this.player.y > 4.5) return false;

    const halfLen = (obs.length || 0.4) / 2;
    const halfWidth = (obs.width || 2.0) / 2;

    // Check 3D AABB overlap
    const overlapX = pBox.maxX >= (obs.x - halfWidth) && pBox.minX <= (obs.x + halfWidth);
    const overlapZ = pBox.maxZ >= (obs.z - halfLen) && pBox.minZ <= (obs.z + halfLen);

    if (!overlapX || !overlapZ) return false;

    if (obs.type === 'TRAIN') {
      // If player is on or above roof surface, safe!
      if (this.player.y >= obs.roofY - 0.25) {
        return false;
      }
      // Running into front face of train
      return true;
    }

    if (obs.type === 'RAMP') {
      // Ramps are safe slopes, no crash
      return false;
    }

    if (obs.type === 'BARRIER_LOW') {
      // Jump clearance check
      if (pBox.minY >= obs.height - 0.15) {
        return false; // Safely jumped over!
      }
      return true;
    }

    if (obs.type === 'BARRIER_HIGH') {
      // Slide clearance check
      if (this.player.isSliding && pBox.maxY <= obs.minY + 0.15) {
        return false; // Safely slided under!
      }
      return true;
    }

    return false;
  }

  updatePowerupHUD() {
    let html = '';

    if (this.player.hasHoverboard) {
      const pct = Math.max(0, (this.player.hoverboardTime / 20) * 100);
      html += `
        <div class="hud-powerup-item">
          <span class="hud-powerup-icon">🛹</span>
          <div class="hud-powerup-bar"><div class="hud-powerup-fill" style="width:${pct}%; background:#1dd1a1;"></div></div>
        </div>
      `;
    }

    if (this.player.isMagnetActive) {
      const pct = Math.max(0, (this.player.magnetTime / 15) * 100);
      html += `
        <div class="hud-powerup-item">
          <span class="hud-powerup-icon">🧲</span>
          <div class="hud-powerup-bar"><div class="hud-powerup-fill" style="width:${pct}%; background:#00d2d3;"></div></div>
        </div>
      `;
    }

    if (this.player.isMultiplierActive) {
      const pct = Math.max(0, (this.player.multiplierTime / 15) * 100);
      html += `
        <div class="hud-powerup-item">
          <span class="hud-powerup-icon">⚡</span>
          <div class="hud-powerup-bar"><div class="hud-powerup-fill" style="width:${pct}%; background:#ff9f43;"></div></div>
        </div>
      `;
    }

    if (this.player.isJetpackActive) {
      const pct = Math.max(0, (this.player.jetpackTime / 12) * 100);
      html += `
        <div class="hud-powerup-item">
          <span class="hud-powerup-icon">🚀</span>
          <div class="hud-powerup-bar"><div class="hud-powerup-fill" style="width:${pct}%; background:#a55eea;"></div></div>
        </div>
      `;
    }

    this.powerupsContainer.innerHTML = html;
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
