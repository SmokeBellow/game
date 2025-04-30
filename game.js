const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Аудио элементы
const backgroundMusic = document.getElementById('background-music');
const woolCollectSound = document.getElementById('wool-collect-sound');

// Переменная для состояния звука
let isSoundOn = false;

let keys = {};
let player = {
  x: 100, y: 100,
  targetX: 100, targetY: 100, // Target position for easing
  width: 40, height: 60,
  speed: 300, // Pixels per second
  color: 'blue',
  img: null,
  facingRight: true, // For sprite flipping
  scale: 0.4
};
let wools = [];
let obstacles = [];
let woolCollected = 0;
let totalWool = 0;
let currentLevel = 1;
let character = 'masha';
let woolImage = new Image();
woolImage.src = 'images/sherst.png';
let levelComplete = false;
let showingMessage = false;
let passedLevel8 = false;

let cats = [];
// Массив для кадров анимации кота (только 2 кадра)
const catAnimationFrames = [
  new Image(),
  new Image()
];
catAnimationFrames[0].src = 'images/cat_enemy1.png';
catAnimationFrames[1].src = 'images/cat_enemy2.png';

// Длительность отображения одного кадра анимации (в миллисекундах)
const animationFrameDuration = 200;

let messagePhrases = ["Отлично!", "Шерсть собрана!", "Молодец!", "Чистота - залог уюта!"];
let levelCompletePhrases = [
  "Великолепно! Уровень покорен!",
  "Ты молодец! Еще одна победа!",
  "Супер! Дом стал чище!",
  "Превосходно! На шаг ближе к цели!",
  "Ура! Уровень успешно пройден!"
];
let catFacts = [
  "😺 У каждой кошки свой уникальный отпечаток носа — как у людей отпечатки пальцев!",
  "👂 В каждом ушке кошки 32 мышцы — они вращают ими, словно антеннами!",
  "🌙 Кошки видят в темноте в 6 раз лучше человека — идеальные ночные охотницы!",
  "😸 Мурлыканье — это не только удовольствие, но и способ успокоиться и даже исцелиться.",
  "🎯 Усы кошки — это сенсоры: они чувствуют всё, даже воздух перед преградой.",
  "🔊 Кошки слышат ультразвук — именно так они выслеживают мышей и других мелких зверьков.",
  "😴 Кошки спят по 16–20 часов в сутки — настоящие мастера отдыха и расслабления.",
  "🐈 У кошек тоже есть ведущая лапа — они бывают правшами и левшами, как и мы!"
];

const obstacleImages = {
  table: new Image(),
  chair: new Image(),
  bed: new Image(),
  sofa: new Image(),
};

obstacleImages.table.src = 'images/table.png';
obstacleImages.chair.src = 'images/chair.png';
obstacleImages.bed.src = 'images/bed.png';
obstacleImages.sofa.src = 'images/sofa.png';

document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Управление звуком
const soundToggleButton = document.getElementById('sound-toggle');
const soundIcon = document.getElementById('sound-icon');

function toggleSound() {
  isSoundOn = !isSoundOn;
  soundIcon.src = isSoundOn ? 'images/sound-on.png' : 'images/sound-off.png';
  
  if (isSoundOn) {
    backgroundMusic.volume = 0.5;
    backgroundMusic.play().catch(error => {
      console.warn("Не удалось воспроизвести фоновую музыку:", error);
    });
    woolCollectSound.volume = 1.0;
  } else {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    woolCollectSound.volume = 0;
  }
}

soundToggleButton.addEventListener('click', toggleSound);

function resizeCanvas() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width;
  canvas.height = height;
}

function showMurMyakScreen() {
  const murmyakScreen = document.getElementById('murmyak-screen');
  if (!murmyakScreen) {
    console.error("Ошибка: элемент #murmyak-screen не найден в DOM");
    showGameNameScreen();
    return;
  }

  console.log("Показ экрана MurMyak");
  murmyakScreen.style.display = 'flex';
  murmyakScreen.style.opacity = 1;

  setTimeout(() => {
    console.log("Начало затухания экрана MurMyak");
    murmyakScreen.style.opacity = 0;

    setTimeout(() => {
      console.log("Скрытие экрана MurMyak и переход к следующему экрану");
      murmyakScreen.style.display = 'none';
      showGameNameScreen();
    }, 1000);
  }, 3000);
}

function showGameNameScreen() {
  const gameNameScreen = document.getElementById('gamename-screen');
  const sherstinyText = document.getElementById('sherstiny-text');
  if (!gameNameScreen || !sherstinyText) {
    console.error("Ошибка: элементы #gamename-screen или #sherstiny-text не найдены");
    showCharacterSelectScreen();
    return;
  }

  console.log("Показ экрана GameName");
  gameNameScreen.style.opacity = 1;

  const fonts = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Comic Sans MS'];
  let fontIndex = 0;

  const fontInterval = setInterval(() => {
    sherstinyText.style.fontFamily = fonts[fontIndex];
    fontIndex = (fontIndex + 1) % fonts.length;
  }, 300);

  setTimeout(() => {
    clearInterval(fontInterval);
    console.log("Начало затухания экрана GameName");
    gameNameScreen.style.opacity = 0;
    setTimeout(() => {
      console.log("Переход к экрану выбора персонажа");
      showCharacterSelectScreen();
    }, 1000);
  }, 5000);
}

function showCharacterSelectScreen() {
  const characterSelect = document.getElementById('character-select');
  if (!characterSelect) {
    console.error("Ошибка: элемент #character-select не найден");
    return;
  }

  console.log("Показ экрана выбора персонажа");
  characterSelect.style.display = 'flex';
  document.getElementById('masha-image').style.display = 'block';
  document.getElementById('anton-image').style.display = 'block';

  if (passedLevel8) {
    document.getElementById('vika-image').style.display = 'block';
  }
}

function selectCharacter(selected) {
  character = selected;
  player = {
    x: 100,
    y: 100,
    targetX: 100,
    targetY: 100,
    width: 40,
    height: 60,
    speed: 300,
    color: 'blue',
    img: new Image(),
    facingRight: true,
    scale: 0.4
  };
  player.img.onload = () => {
    const desiredWidth = 60;
    player.scale = desiredWidth / player.img.width;
    player.width = player.img.width * player.scale;
    player.height = player.img.height * player.scale;
    document.getElementById('character-select').style.display = 'none';
    currentLevel = 1;
    startGame();
  };
  player.img.onerror = () => console.error(`Ошибка загрузки изображения игрока: images/player_${selected}.png`);
  if (selected === 'vika' && passedLevel8) {
    player.img.src = 'images/player_vika.png';
  } else if (selected === 'anton') {
    player.img.src = 'images/player_anton.png';
  } else {
    player.img.src = 'images/player_masha.png';
  }
}

function startGame() {
  if (isSoundOn) {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
  }

  generateLevel();
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function isFullyInsideScreen(x, y, width, height) {
  return x >= 0 && x + width <= canvas.width && y >= 0 && y + height <= canvas.height;
}

function isSafeFromObstacles(x, y, width, height) {
  return !obstacles.some(o =>
    x < o.x + o.width &&
    x + width > o.x &&
    y < o.y + o.height &&
    y + height > o.y
  );
}

function generateCatPath() {
  const edges = [
    { edge: 'left', x: 0, y: () => Math.random() * canvas.height },
    { edge: 'right', x: canvas.width - 60, y: () => Math.random() * canvas.height },
    { edge: 'top', x: () => Math.random() * canvas.width, y: 0 },
    { edge: 'bottom', x: () => Math.random() * canvas.width, y: canvas.height - 60 }
  ];

  const startEdgeIndex = Math.floor(Math.random() * edges.length);
  let startEdge = edges[startEdgeIndex];
  let startX = typeof startEdge.x === 'function' ? startEdge.x() : startEdge.x;
  let startY = typeof startEdge.y === 'function' ? startEdge.y() : startEdge.y;

  let endEdgeIndex;
  do {
    endEdgeIndex = Math.floor(Math.random() * edges.length);
  } while (endEdgeIndex === startEdgeIndex);
  let endEdge = edges[endEdgeIndex];
  let endX = typeof endEdge.x === 'function' ? endEdge.x() : endEdge.x;
  let endY = typeof endEdge.y === 'function' ? endEdge.y() : endEdge.y;

  return { startX, startY, endX, endY };
}

function generateLevel() {
  obstacles = [];
  wools = [];
  woolCollected = 0;
  levelComplete = false;
  showingMessage = false;
  totalWool = 5 + currentLevel * 2;

  cats = [];
  if (currentLevel === 3 || currentLevel === 4) {
    const { startX, startY, endX, endY } = generateCatPath();
    cats.push({
      x: startX,
      y: startY,
      startX: startX,
      startY: startY,
      endX: endX,
      endY: endY,
      width: 60,
      height: 60,
      speed: 100,
      lastWoolDrop: Date.now(),
      isVisible: true,
      disappearTime: null,
      currentFrame: 0,
      lastFrameUpdate: Date.now()
    });
  }
  else if (currentLevel === 5 || currentLevel === 6) {
    const { startX, startY, endX, endY } = generateCatPath();
    cats.push({
      x: startX,
      y: startY,
      startX: startX,
      startY: startY,
      endX: endX,
      endY: endY,
      width: 60,
      height: 60,
      speed: 100,
      lastWoolDrop: Date.now(),
      isVisible: true,
      disappearTime: null,
      currentFrame: 0,
      lastFrameUpdate: Date.now()
    });
  }
  else if (currentLevel === 7 || currentLevel === 8) {
    for (let i = 0; i < 2; i++) {
      const { startX, startY, endX, endY } = generateCatPath();
      cats.push({
        x: startX,
        y: startY,
        startX: startX,
        startY: startY,
        endX: endX,
        endY: endY,
        width: 60,
        height: 60,
        speed: 100,
        lastWoolDrop: Date.now(),
        isVisible: true,
        disappearTime: null,
        currentFrame: 0,
        lastFrameUpdate: Date.now()
      });
    }
  }

  let obstacleTypes = [];
  if (currentLevel <= 2) {
    obstacleTypes = ["chair"];
  } else if (currentLevel <= 4) {
    obstacleTypes = ["chair", "table", "sofa"];
  } else {
    obstacleTypes = ["chair", "table", "sofa", "bed"];
  }

  for (let i = 0; i < 5 + currentLevel; i++) {
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    let w = 0, h = 0;
    if (type === "table") { w = 100; h = 60; }
    if (type === "chair") { w = 40; h = 40; }
    if (type === "bed") { w = 140; h = 80; }
    if (type === "sofa") { w = 120; h = 70; }
    let ox = Math.random() * (canvas.width - w - 20) + 10;
    let oy = Math.random() * (canvas.height - h - 20) + 10;

    while (Math.hypot(player.x - ox, player.y - oy) < 100) {
      ox = Math.random() * (canvas.width - w - 20) + 10;
      oy = Math.random() * (canvas.height - h - 20) + 10;
    }

    obstacles.push({ x: ox, y: oy, width: w, height: h, type });
  }

  let attempts = 0;
  const maxAttempts = 1000;
  while (wools.length < totalWool && attempts < maxAttempts) {
    let x = Math.random() * (canvas.width - 30);
    let y = Math.random() * (canvas.height - 30);

    if (!isFullyInsideScreen(x, y, 30, 30)) {
      attempts++;
      continue;
    }

    if (!isSafeFromObstacles(x, y, 30, 30)) {
      attempts++;
      continue;
    }

    const safeFromPlayer = Math.hypot(player.x - x, player.y - y) > 100;

    if (safeFromPlayer) {
      wools.push({ x, y, scale: 1 });
    }
    attempts++;
  }

  if (wools.length < totalWool) {
    console.warn(`Не удалось разместить всю шерсть: размещено ${wools.length} из ${totalWool} после ${attempts} попыток`);
    totalWool = wools.length;
  } else {
    console.log(`Успешно размещено ${wools.length} шерсти`);
  }

  document.getElementById('level-text').textContent = "Уровень " + currentLevel;
  document.getElementById('level-text').style.opacity = 1;

  updateWoolCounter();
}

function showMessage(text, isLevelComplete = false) {
  const message = document.getElementById('message-text');
  const catFact = document.getElementById('cat-fact');

  if (isLevelComplete) {
    let availablePhrases = currentLevel === 1
      ? levelCompletePhrases.filter(phrase => phrase !== "Ты молодец! Еще одна победа!")
      : levelCompletePhrases;
    const randomIndex = Math.floor(Math.random() * availablePhrases.length);
    message.textContent = availablePhrases[randomIndex];

    if (currentLevel <= 8) {
      catFact.textContent = catFacts[currentLevel - 1];
      catFact.style.opacity = 1;
    } else {
      catFact.textContent = "";
      catFact.style.opacity = 0;
    }
  } else {
    message.textContent = text;
    catFact.textContent = "";
    catFact.style.opacity = 0;
  }

  message.style.opacity = 1;
  showingMessage = true;

  setTimeout(() => {
    message.style.opacity = 0;
    catFact.style.opacity = 0;
    showingMessage = false;
  }, 3000);
}

function updateWoolCounter() {
  const woolCounter = document.getElementById('wool-count');
  woolCounter.textContent = `Шерсть: ${woolCollected}/${totalWool}`;
}

function updateCats(deltaTime) {
  const now = Date.now();
  const shouldDisappear = (currentLevel === 3 || currentLevel === 4 || currentLevel === 7 || currentLevel === 8);
  const disappearDuration = (currentLevel === 7 || currentLevel === 8) ? 5000 : 7000;

  cats.forEach(cat => {
    if (!cat.isVisible) {
      if (shouldDisappear && now - cat.disappearTime >= disappearDuration) {
        const { startX, startY, endX, endY } = generateCatPath();
        cat.x = startX;
        cat.y = startY;
        cat.startX = startX;
        cat.startY = startY;
        cat.endX = endX;
        cat.endY = endY;
        cat.isVisible = true;
        cat.disappearTime = null;
        cat.lastWoolDrop = now;
        cat.currentFrame = 0;
        cat.lastFrameUpdate = now;
      }
      return;
    }

    const dx = cat.endX - cat.startX;
    const dy = cat.endY - cat.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return;

    const moveX = (dx / distance) * cat.speed * deltaTime;
    const moveY = (dy / distance) * cat.speed * deltaTime;
    cat.x += moveX;
    cat.y += moveY;

    const distToEnd = Math.hypot(cat.x - cat.endX, cat.y - cat.endY);
    if (distToEnd < (cat.speed * deltaTime)) {
      if (shouldDisappear) {
        cat.isVisible = false;
        cat.disappearTime = now;
      } else {
        const { startX, startY, endX, endY } = generateCatPath();
        cat.x = startX;
        cat.y = startY;
        cat.startX = startX;
        cat.startY = startY;
        cat.endX = endX;
        cat.endY = endY;
      }
      return;
    }

    if (now - cat.lastFrameUpdate >= animationFrameDuration) {
      cat.currentFrame = (cat.currentFrame + 1) % 2;
      cat.lastFrameUpdate = now;
    }

    if (now - cat.lastWoolDrop >= 2000) {
      const woolX = cat.x + cat.width / 2;
      const woolY = cat.y + cat.height;

      if (!isFullyInsideScreen(woolX, woolY, 30, 30)) {
        cat.lastWoolDrop = now;
        return;
      }

      if (!isSafeFromObstacles(woolX, woolY, 30, 30)) {
        cat.lastWoolDrop = now;
        return;
      }

      wools.push({ x: woolX, y: woolY, scale: 1 });
      totalWool++;
      updateWoolCounter();
      cat.lastWoolDrop = now;
    }
  });
}

let lastTime = 0;

function gameLoop(timestamp) {
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!levelComplete) {
    handlePlayerMovement(deltaTime);
    handleCollisions();
    updateCats(deltaTime);
    drawGame();
  }

  if (woolCollected === totalWool && !levelComplete) {
    levelComplete = true;
    currentLevel++;
    showMessage("", true);
    if (currentLevel > 8) {
      passedLevel8 = true;
      showVictoryScreen();
    } else {
      setTimeout(() => {
        generateLevel();
      }, 3000);
    }
  }

  requestAnimationFrame(gameLoop);
}

function showVictoryScreen() {
  if (isSoundOn) {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
  }

  const victoryScreen = document.createElement('div');
  victoryScreen.style.position = 'absolute';
  victoryScreen.style.top = '0';
  victoryScreen.style.left = '0';
  victoryScreen.style.width = '100%';
  victoryScreen.style.height = '100%';
  victoryScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  victoryScreen.style.color = 'white';
  victoryScreen.style.textAlign = 'center';
  victoryScreen.style.display = 'flex';
  victoryScreen.style.flexDirection = 'column';
  victoryScreen.style.justifyContent = 'center';
  victoryScreen.style.alignItems = 'center';
  victoryScreen.innerHTML = `
    <h1>Победа! Вы собрали целую кошку!</h1>
    <img src="images/win.png" alt="Win Image" style="width: 300px; height: auto;">
  `;

  document.body.appendChild(victoryScreen);

  setTimeout(() => {
    victoryScreen.style.opacity = '0';
    setTimeout(() => {
      victoryScreen.remove();
      showObIgreScreen();
    }, 1000);
  }, 4000);
}

function showObIgreScreen() {
  const obIgreScreen = document.getElementById('ob-igre-screen');
  const credits = [
    document.getElementById('credit-1'),
    document.getElementById('credit-2'),
    document.getElementById('credit-3'),
    document.getElementById('credit-4'),
    document.getElementById('credit-5')
  ];

  credits.forEach(credit => {
    credit.classList.remove('visible');
  });

  obIgreScreen.style.display = 'flex';
  obIgreScreen.style.opacity = '1';

  credits.forEach((credit, index) => {
    setTimeout(() => {
      credit.classList.add('visible');
    }, index * 1500);
  });

  const newGameButton = document.getElementById('new-game-button');
  newGameButton.onclick = () => {
    obIgreScreen.style.opacity = '0';
    setTimeout(() => {
      obIgreScreen.style.display = 'none';
      showCharacterSelectScreen();
    }, 1000);
  };
}

function handlePlayerMovement(deltaTime) {
  let vx = 0, vy = 0;

  if (keys['w'] || keys['ц']) vy -= player.speed;
  if (keys['a'] || keys['ф']) vx -= player.speed;
  if (keys['s'] || keys['ы']) vy += player.speed;
  if (keys['d'] || keys['в']) vx += player.speed;

  // Normalize diagonal movement
  if (vx !== 0 && vy !== 0) {
    const magnitude = Math.sqrt(vx * vx + vy * vy);
    vx = (vx / magnitude) * player.speed;
    vy = (vy / magnitude) * player.speed;
  }

  // Update target position
  const newTargetX = player.targetX + vx * deltaTime;
  const newTargetY = player.targetY + vy * deltaTime;

  // Check collision at target position
  if (!checkCollisionWithObstacles(newTargetX, newTargetY)) {
    player.targetX = newTargetX;
    player.targetY = newTargetY;
  }

  // Linear interpolation (lerp) to smooth movement
  const lerpFactor = 0.1; // Adjust for desired smoothness (0.05 = slower, 0.2 = faster)
  player.x += (player.targetX - player.x) * lerpFactor;
  player.y += (player.targetY - player.y) * lerpFactor;

  // Update facing direction for sprite flipping
  if (vx !== 0) {
    player.facingRight = vx > 0;
  }

  // Boundary checks
  if (player.x < 0) player.x = player.targetX = 0;
  if (player.x + player.width > canvas.width) player.x = player.targetX = canvas.width - player.width;
  if (player.y < 0) player.y = player.targetY = 0;
  if (player.y + player.height > canvas.height) player.y = player.targetY = canvas.height - player.height;
}

function checkCollisionWithObstacles(newX, newY) {
  return obstacles.some(o => 
    newX < o.x + o.width &&
    newX + player.width > o.x &&
    newY < o.y + o.height &&
    newY + player.height > o.y
  );
}

function handleCollisions() {
  wools = wools.filter(wool => {
    if (player.x < wool.x + 30 && player.x + player.width > wool.x && 
        player.y < wool.y + 30 && player.y + player.height > wool.y) {
      woolCollected++;
      updateWoolCounter();
      if (isSoundOn) {
        woolCollectSound.currentTime = 0;
        woolCollectSound.play().catch(error => {
          console.warn("Не удалось воспроизвести звук сбора шерсти:", error);
        });
      }
      if (woolCollected === totalWool) {
        showMessage("Шерсть собрана!");
      }
      return false;
    }
    return true;
  });
}

function drawGame() {
  // Draw player with horizontal flipping
  ctx.save();
  ctx.translate(Math.round(player.x + player.width / 2), Math.round(player.y + player.height / 2));
  if (!player.facingRight) {
    ctx.scale(-1, 1); // Flip horizontally for left movement
  }
  if (player.img && player.img.complete && player.img.naturalWidth !== 0) {
    ctx.drawImage(
      player.img,
      -player.width / 2,
      -player.height / 2,
      player.width,
      player.height
    );
  } else {
    console.warn("Изображение игрока не загружено");
  }
  ctx.restore();

  // Draw wool
  if (!woolImage.complete || woolImage.naturalWidth === 0) {
    console.warn("Изображение шерсти (sherst.png) не загружено");
  } else {
    wools.forEach(wool => {
      if (wool.x !== undefined && wool.y !== undefined) {
        ctx.drawImage(woolImage, wool.x, wool.y, 30, 30);
      } else {
        console.warn("Некорректный объект шерсти:", wool);
      }
    });
  }

  // Draw obstacles
  obstacles.forEach(o => {
    ctx.drawImage(obstacleImages[o.type], o.x, o.y, o.width, o.height);
  });

  // Draw cats
  cats.forEach(cat => {
    if (cat.isVisible) {
      ctx.save();
      ctx.translate(cat.x + cat.width / 2, cat.y + cat.height / 2);
      const dx = cat.endX - cat.startX;
      const dy = cat.endY - cat.startY;
      const angle = Math.atan2(dy, dx);
      ctx.rotate(angle);
      if (dx < 0) {
        ctx.scale(1, -1);
      }
      ctx.drawImage(
        catAnimationFrames[cat.currentFrame],
        -cat.width / 2,
        -cat.height / 2,
        cat.width,
        cat.height
      );
      ctx.restore();
    }
  });
}

document.addEventListener('keydown', function(event) {
  if (keys['1'] && keys['2'] && keys['3']) {
    levelComplete = true;
    currentLevel++;
    if (currentLevel > 8) {
      passedLevel8 = true;
      showVictoryScreen();
    } else {
      setTimeout(() => {
        generateLevel();
      }, 3000);
    }
  }
});

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
showMurMyakScreen();