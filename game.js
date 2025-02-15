// Set up the scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create larger ground
const groundGeometry = new THREE.PlaneGeometry(100, 100); // Doubled from 50 to 100
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x355e3b });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Create tree function
function createTree(x, z) {
    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
    const trunkMaterial = new THREE.MeshBasicMaterial({ color: 0x4a2810 }); // Brown
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, 1, z);

    // Tree top (cone shape)
    const topGeometry = new THREE.ConeGeometry(1.5, 3, 8);
    const topMaterial = new THREE.MeshBasicMaterial({ color: 0x0f5132 }); // Dark green
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.set(x, 3, z);

    scene.add(trunk);
    scene.add(top);

    return { trunk, top }; // Return for collision detection
}

// Create border trees
const trees = [];
const mapSize = 45; // Increased from 25 to 45
const borderSpacing = 1.5;

// Create denser border of trees
for (let i = -mapSize; i <= mapSize; i += borderSpacing) {
    // Double row of trees for North and South borders
    trees.push(createTree(i, -mapSize));
    trees.push(createTree(i, -mapSize + 1.5));
    trees.push(createTree(i, mapSize));
    trees.push(createTree(i, mapSize - 1.5));
    
    // Double row of trees for East and West borders
    trees.push(createTree(-mapSize, i));
    trees.push(createTree(-mapSize + 1.5, i));
    trees.push(createTree(mapSize, i));
    trees.push(createTree(mapSize - 1.5, i));
}

// Create tree clusters
function createTreeCluster(centerX, centerZ, numTrees) {
    for (let i = 0; i < numTrees; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 4; // Increased cluster spread
        const x = centerX + Math.cos(angle) * distance;
        const z = centerZ + Math.sin(angle) * distance;
        
        if (Math.abs(x) < mapSize - 3 && Math.abs(z) < mapSize - 3) {
            trees.push(createTree(x, z));
        }
    }
}

// Create more clusters for larger map
for (let i = 0; i < 30; i++) { // Increased from 15 to 30 clusters
    const x = (Math.random() - 0.5) * (mapSize * 1.5);
    const z = (Math.random() - 0.5) * (mapSize * 1.5);
    createTreeCluster(x, z, 6); // Increased from 5 to 6 trees per cluster
}

// Add more random individual trees
for (let i = 0; i < 100; i++) { // Increased from 50 to 100 trees
    const x = (Math.random() - 0.5) * (mapSize * 1.5);
    const z = (Math.random() - 0.5) * (mapSize * 1.5);
    
    if (Math.abs(x) < mapSize - 3 && Math.abs(z) < mapSize - 3) {
        trees.push(createTree(x, z));
    }
}

// Position the camera
camera.position.y = 1.6;
camera.position.z = mapSize - 5; // Adjusted starting position for larger map

// Add physics variables
let velocity = 0;
let isJumping = false;
const gravity = 0.015;
const jumpPower = 0.3;

// Update movement variables
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const baseSpeed = 0.08; // Increased from 0.06
const sprintMultiplier = 1.8; // 80% faster (was 1.3)

// Add sprint variable at the top with other controls
let isSprinting = false;

// Add hotbar variables
let selectedSlot = 0;
const hotbarItems = ['gun', 'blocks', 'medkit']; // Example items

// Add hotbar CSS
const hotbarStyle = document.createElement('style');
hotbarStyle.textContent = `
    .hotbar {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        z-index: 1000;
    }
    .hotbar-slot {
        width: 50px;
        height: 50px;
        background: rgba(0,0,0,0.5);
        border: 2px solid #666;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-family: Arial;
    }
    .selected {
        border-color: #fff;
        background: rgba(255,255,255,0.1);
    }
`;
document.head.appendChild(hotbarStyle);

// Create hotbar UI
const hotbar = document.createElement('div');
hotbar.className = 'hotbar';

// Add slots
for(let i = 0; i < 5; i++) {
    const slot = document.createElement('div');
    slot.className = `hotbar-slot ${i === 0 ? 'selected' : ''}`;
    slot.textContent = i+1;
    hotbar.appendChild(slot);
}
document.body.appendChild(hotbar);

// Add number key handling
document.addEventListener('keydown', (e) => {
    const num = parseInt(e.key);
    if(num >= 1 && num <= 5) {
        selectedSlot = num - 1;
        document.querySelectorAll('.hotbar-slot').forEach((slot, index) => {
            slot.classList.toggle('selected', index === selectedSlot);
        });
    }
});

// Update key handlers properly
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': if(!isJumping) { isJumping = true; velocity = jumpPower; } break;
        case 'ShiftLeft':
        case 'ShiftRight':
            isSprinting = true;
            e.preventDefault(); // Prevent browser shortcuts
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
        case 'ShiftLeft':
        case 'ShiftRight':
            isSprinting = false;
            e.preventDefault();
            break;
    }
});

// Mouse controls for looking around
let isMouseLocked = false;
const sensitivity = 0.002;

document.addEventListener('click', () => {
    if (!isMouseLocked) {
        renderer.domElement.requestPointerLock();
    }
});

document.addEventListener('pointerlockchange', () => {
    isMouseLocked = document.pointerLockElement === renderer.domElement;
});

document.addEventListener('mousemove', (event) => {
    if (isMouseLocked) {
        camera.rotation.y -= event.movementX * sensitivity;
    }
});

// Function to update selected slot
function updateSelectedSlot(newSlot) {
    // Remove selection from current slot
    const slots = hotbar.children;
    slots[selectedSlot].style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    slots[selectedSlot].style.border = '2px solid #ffffff66';

    // Update selection
    selectedSlot = newSlot;
    slots[selectedSlot].style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    slots[selectedSlot].style.border = '2px solid #ffffff';
}

// Add scroll wheel support for hotbar selection
document.addEventListener('wheel', (event) => {
    if (event.deltaY > 0) {
        // Scroll down
        updateSelectedSlot((selectedSlot + 1) % 5);
    } else {
        // Scroll up
        updateSelectedSlot((selectedSlot - 1 + 5) % 5);
    }
});

// Update collision detection function to be more strict
function checkTreeCollision(position) {
    const playerRadius = 0.8; // Increased from 0.5 for stricter collision
    for (const tree of trees) {
        const dx = tree.trunk.position.x - position.x;
        const dz = tree.trunk.position.z - position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Use the tree's specific radius plus a buffer for collision
        const collisionRadius = tree.radius + playerRadius;
        if (distance < collisionRadius) {
            return true; // Collision detected
        }
    }
    return false;
}

// Add this code near the top of your file (after scene setup)
const healthStyle = document.createElement('style');
healthStyle.textContent = `
    .health-bar {
        position: fixed;
        top: 20px;
        left: 20px;
        width: 600px;
        height: 20px;
        background-color: #2e2e2e;
        border-radius: 4px;
        overflow: hidden;
        z-index: 1000; // Increased to ensure visibility
    }
    .health-fill {
        width: 100%;
        height: 100%;
        background-color: #4CAF50;
        transition: width 0.3s ease;
    }
    .health-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-family: Arial, sans-serif;
        font-size: 16px;
        pointer-events: none;
    }
`;
document.head.appendChild(healthStyle);

// Create health elements
const healthBar = document.createElement('div');
healthBar.className = 'health-bar';

const healthFill = document.createElement('div');
healthFill.className = 'health-fill';

const healthText = document.createElement('div');
healthText.className = 'health-text';
healthText.textContent = '100';

healthBar.appendChild(healthFill);
healthBar.appendChild(healthText);
document.body.appendChild(healthBar);

// Add this test function to verify it works
function testHealthBar() {
    let health = 100;
    const interval = setInterval(() => {
        health -= 1;
        healthFill.style.width = `${health}%`;
        healthText.textContent = health;
        if(health <= 0) clearInterval(interval);
    }, 100);
}
// testHealthBar(); // Uncomment to see animated health decrease

// Add hunger bar below health
const hungerStyle = document.createElement('style');
hungerStyle.textContent = `
    .hunger-bar {
        position: fixed;
        top: 50px; /* Below health bar */
        left: 20px;
        width: 600px;
        height: 20px;
        background-color: #2e2e2e;
        border-radius: 4px;
        overflow: hidden;
        z-index: 1000;
    }
    .hunger-fill {
        width: 100%;
        height: 100%;
        background-color: #FFA500; /* Orange color */
        transition: width 0.3s ease;
    }
    .hunger-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-family: Arial, sans-serif;
        font-size: 16px;
        pointer-events: none;
    }
`;
document.head.appendChild(hungerStyle);

// Create hunger elements
const hungerBar = document.createElement('div');
hungerBar.className = 'hunger-bar';

const hungerFill = document.createElement('div');
hungerFill.className = 'hunger-fill';

const hungerText = document.createElement('div');
hungerText.className = 'hunger-text';
hungerText.textContent = '100';

hungerBar.appendChild(hungerFill);
hungerBar.appendChild(hungerText);
document.body.appendChild(hungerBar);

// Update hunger variables
let hunger = 100;
const hungerDrainRate = 5; // When sprinting
const hungerRegenRate = 0.5; // Per second when not sprinting
const healthDrainRate = 3; // When hunger is 0
let lastUpdateTime = Date.now();

// Add health variable
let health = 100;
const healthRegenRate = 2; // 10% every 5 seconds (2% per second)
let lastHealthRegen = Date.now();

// Add crosshair CSS
const crosshairStyle = document.createElement('style');
crosshairStyle.textContent = `
    .crosshair {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        pointer-events: none;
        z-index: 1000;
    }
    .crosshair::before,
    .crosshair::after {
        content: '';
        position: absolute;
        background: rgba(255, 255, 255, 0.8);
    }
    .crosshair::before {
        width: 2px;
        height: 100%;
        left: 50%;
        transform: translateX(-50%);
    }
    .crosshair::after {
        height: 2px;
        width: 100%;
        top: 50%;
        transform: translateY(-50%);
    }
`;
document.head.appendChild(crosshairStyle);

// Create crosshair element
const crosshair = document.createElement('div');
crosshair.className = 'crosshair';
document.body.appendChild(crosshair);

// Add zoom variables
let isZoomed = false;
const defaultFOV = 75;
const zoomFOV = 30;

// Add right-click handler
document.addEventListener('mousedown', (e) => {
    if(e.button === 2 && !isBuildingMode && document.pointerLockElement === renderer.domElement) {
        isZoomed = true;
        camera.fov = zoomFOV;
        camera.updateProjectionMatrix();
    }
});

document.addEventListener('mouseup', (e) => {
    if(e.button === 2) {
        isZoomed = false;
        camera.fov = defaultFOV;
        camera.updateProjectionMatrix();
    }
});

// Prevent context menu
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Add scope CSS
const scopeStyle = document.createElement('style');
scopeStyle.textContent = `
    .scope-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 500;
        display: none;
        background: radial-gradient(circle at 50% 50%, 
            transparent 40%, 
            rgba(0, 0, 0, 0.9) 41%);
    }
    .zoomed .scope-overlay {
        display: block;
    }
`;
document.head.appendChild(scopeStyle);

// Create scope element
const scope = document.createElement('div');
scope.className = 'scope-overlay';
document.body.appendChild(scope);

// Update right-click handlers
document.addEventListener('mousedown', (e) => {
    if(e.button === 2) {
        document.body.classList.add('zoomed');
    }
});

document.addEventListener('mouseup', (e => {
    if(e.button === 2) {
        document.body.classList.remove('zoomed');
    }
}));

// Modify animate loop
function animate() {
    requestAnimationFrame(animate);

    // Handle jumping physics
    if (isJumping) {
        camera.position.y += velocity;
        velocity -= gravity;

        if (camera.position.y <= 1.6) {
            camera.position.y = 1.6;
            velocity = 0;
            isJumping = false;
        }
    }

    // Calculate current speed
    let currentSpeed = baseSpeed;
    if(isSprinting) currentSpeed *= sprintMultiplier;
    if(isZoomed) currentSpeed *= 0.4; // 60% slower when zoomed

    // Movement handling
    const direction = new THREE.Vector3();
    if(moveForward) direction.z -= 1;
    if(moveBackward) direction.z += 1;
    if(moveLeft) direction.x -= 1;
    if(moveRight) direction.x += 1;
    
    if(direction.length() > 0) {
        direction.normalize();
        direction.applyEuler(new THREE.Euler(0, camera.rotation.y, 0));
        camera.position.addScaledVector(direction, currentSpeed);
    }

    const now = Date.now();
    const deltaTime = (now - lastUpdateTime) / 1000;

    // Hunger management
    if(deltaTime >= 0.2) {
        // Regenerate when not sprinting
        if(!isSprinting && hunger < 100) {
            hunger = Math.min(100, hunger + (hungerRegenRate * deltaTime));
        }
        // Drain when sprinting
        else if(isSprinting) {
            hunger = Math.max(0, hunger - (hungerDrainRate * deltaTime));
        }
        
        hungerFill.style.width = `${hunger}%`;
        hungerText.textContent = Math.round(hunger);

        // Health drain when hunger is 0
        if(hunger <= 0 && health > 0) {
            health = Math.max(0, health - (healthDrainRate * deltaTime));
            healthFill.style.width = `${health}%`;
            healthText.textContent = Math.round(health);
        }

        lastUpdateTime = now;
    }

    // Health regeneration (only when not starving)
    if(hunger > 0 && health < 100) {
        if((now - lastHealthRegen) >= 1000) { // Update every second
            health = Math.min(100, health + healthRegenRate);
            healthFill.style.width = `${health}%`;
            healthText.textContent = Math.round(health);
            lastHealthRegen = now;
        }
    }

    renderer.render(scene, camera);
}
animate();

