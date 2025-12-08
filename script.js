// 游戏配置
const config = {
    gridSize: 20,
    initialSpeed: 150,
    speedIncrease: 5,
    maxSpeed: 50,
    colors: {
        snakeHead: '#ff2a6d',
        snakeBody: '#05d9e8',
        food: '#01ffc3',
        background: '#001219',
        grid: 'rgba(1, 205, 254, 0.1)'
    }
};

// 游戏状态
const gameState = {
    snake: [],
    food: {},
    direction: 'right',
    nextDirection: 'right',
    score: 0,
    highScore: localStorage.getItem('snakeHighScore') || 0,
    level: 1,
    gameOver: true,
    paused: false,
    speed: config.initialSpeed,
    canvas: null,
    ctx: null,
    animationId: null,
    lastTime: 0,
    showGrid: true,
    soundEnabled: false,
    particles: [],
    trailOpacity: 1
};

// DOM 元素
const elements = {
    canvas: null,
    score: null,
    highScore: null,
    level: null,
    startButton: null,
    pauseButton: null,
    resetButton: null,
    soundButton: null,
    directionButtons: {}
};

// 音效（使用Web Audio API创建简单音效）
const audio = {
    context: null,
    eatSound: null,
    collisionSound: null,
    createSound: function(freq, type = 'sine', duration = 0.2) {
        if (!this.context) return;
        
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();
        
        oscillator.type = type;
        oscillator.frequency.value = freq;
        gainNode.gain.setValueAtTime(0.3, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        oscillator.start();
        oscillator.stop(this.context.currentTime + duration);
    }
};

// 初始化游戏
function initGame() {
    // 获取DOM元素
    elements.canvas = document.getElementById('gameCanvas');
    elements.score = document.getElementById('score');
    elements.highScore = document.getElementById('high-score');
    elements.level = document.getElementById('level');
    elements.startButton = document.getElementById('startButton');
    elements.pauseButton = document.getElementById('pauseButton');
    elements.resetButton = document.getElementById('resetButton');
    elements.soundButton = document.getElementById('soundButton');
    elements.directionButtons.up = document.getElementById('up');
    elements.directionButtons.down = document.getElementById('down');
    elements.directionButtons.left = document.getElementById('left');
    elements.directionButtons.right = document.getElementById('right');
    
    // 设置画布尺寸
    const containerWidth = elements.canvas.parentElement.clientWidth;
    const size = Math.min(containerWidth - 20, 600);
    elements.canvas.width = size;
    elements.canvas.height = size;
    
    gameState.canvas = elements.canvas;
    gameState.ctx = elements.canvas.getContext('2d');
    
    // 初始化音频上下文
    try {
        audio.context = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('Web Audio API not supported');
    }
    
    // 更新高分显示
    updateHighScoreDisplay();
    
    // 添加事件监听
    addEventListeners();
    
    // 绘制初始界面
    drawStartScreen();
}

// 添加事件监听器
function addEventListeners() {
    // 按钮事件
    elements.startButton.addEventListener('click', startGame);
    elements.pauseButton.addEventListener('click', togglePause);
    elements.resetButton.addEventListener('click', resetGame);
    elements.soundButton.addEventListener('click', toggleSound);
    
    // 方向键控制
    document.addEventListener('keydown', handleKeyPress);
    
    // 移动设备触摸控制
    elements.directionButtons.up.addEventListener('click', () => changeDirection('up'));
    elements.directionButtons.down.addEventListener('click', () => changeDirection('down'));
    elements.directionButtons.left.addEventListener('click', () => changeDirection('left'));
    elements.directionButtons.right.addEventListener('click', () => changeDirection('right'));
    
    // 窗口大小改变时重新调整画布
    window.addEventListener('resize', resizeCanvas);
    
    // 触摸滑动控制（移动设备）
    let touchStartX = 0;
    let touchStartY = 0;
    
    elements.canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });
    
    elements.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault(); // 防止页面滚动
    });
    
    elements.canvas.addEventListener('touchend', (e) => {
        if (!gameState.gameOver && !gameState.paused) {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            
            // 判断滑动方向
            if (Math.abs(diffX) > Math.abs(diffY)) {
                // 水平滑动
                if (diffX > 0 && gameState.direction !== 'left') {
                    changeDirection('right');
                } else if (diffX < 0 && gameState.direction !== 'right') {
                    changeDirection('left');
                }
            } else {
                // 垂直滑动
                if (diffY > 0 && gameState.direction !== 'up') {
                    changeDirection('down');
                } else if (diffY < 0 && gameState.direction !== 'down') {
                    changeDirection('up');
                }
            }
        }
    });
}

// 调整画布大小
function resizeCanvas() {
    const containerWidth = elements.canvas.parentElement.clientWidth;
    const size = Math.min(containerWidth - 20, 600);
    
    // 保存当前的游戏状态
    const tempState = {
        gameOver: gameState.gameOver,
        paused: gameState.paused,
        score: gameState.score,
        highScore: gameState.highScore,
        level: gameState.level
    };
    
    // 重新设置画布尺寸
    elements.canvas.width = size;
    elements.canvas.height = size;
    
    // 重绘当前界面
    if (tempState.gameOver) {
        drawStartScreen();
    } else if (tempState.paused) {
        drawPauseScreen();
    } else {
        drawGame();
    }
}

// 处理键盘按键
function handleKeyPress(e) {
    // 游戏暂停/继续
    if (e.code === 'Space') {
        e.preventDefault();
        if (!gameState.gameOver) {
            togglePause();
        }
    }
    
    // 游戏开始
    if (e.code === 'Enter' && gameState.gameOver) {
        startGame();
    }
    
    // 方向控制
    if (!gameState.gameOver && !gameState.paused) {
        switch (e.code) {
            case 'ArrowUp':
                changeDirection('up');
                break;
            case 'ArrowDown':
                changeDirection('down');
                break;
            case 'ArrowLeft':
                changeDirection('left');
                break;
            case 'ArrowRight':
                changeDirection('right');
                break;
        }
    }
}

// 改变蛇的移动方向
function changeDirection(newDirection) {
    // 防止180度转向
    if (
        (newDirection === 'up' && gameState.direction !== 'down') ||
        (newDirection === 'down' && gameState.direction !== 'up') ||
        (newDirection === 'left' && gameState.direction !== 'right') ||
        (newDirection === 'right' && gameState.direction !== 'left')
    ) {
        gameState.nextDirection = newDirection;
    }
}

// 开始游戏
function startGame() {
    // 重置游戏状态
    resetGameState();
    
    // 更新UI
    elements.startButton.disabled = true;
    elements.pauseButton.disabled = false;
    
    // 开始游戏循环
    gameState.lastTime = performance.now();
    gameLoop(gameState.lastTime);
}

// 重置游戏状态
function resetGameState() {
    const gridCount = Math.floor(elements.canvas.width / config.gridSize);
    const center = Math.floor(gridCount / 2);
    
    gameState.snake = [
        { x: center, y: center },
        { x: center - 1, y: center },
        { x: center - 2, y: center }
    ];
    
    gameState.direction = 'right';
    gameState.nextDirection = 'right';
    gameState.score = 0;
    gameState.level = 1;
    gameState.gameOver = false;
    gameState.paused = false;
    gameState.speed = config.initialSpeed;
    gameState.particles = [];
    gameState.trailOpacity = 1;
    
    // 生成第一个食物
    generateFood();
    
    // 更新分数显示
    updateScoreDisplay();
    updateLevelDisplay();
}

// 生成食物
function generateFood() {
    const gridCount = Math.floor(elements.canvas.width / config.gridSize);
    let x, y;
    let onSnake;
    
    do {
        onSnake = false;
        x = Math.floor(Math.random() * gridCount);
        y = Math.floor(Math.random() * gridCount);
        
        // 检查食物是否生成在蛇身上
        for (let segment of gameState.snake) {
            if (segment.x === x && segment.y === y) {
                onSnake = true;
                break;
            }
        }
    } while (onSnake);
    
    gameState.food = { x, y };
    
    // 添加食物出现特效
    createFoodParticles(x, y);
}

// 创建食物出现特效
function createFoodParticles(x, y) {
    const particleCount = 8;
    const centerX = (x + 0.5) * config.gridSize;
    const centerY = (y + 0.5) * config.gridSize;
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        
        gameState.particles.push({
            x: centerX,
            y: centerY,
            size: 2 + Math.random() * 3,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed,
            color: config.colors.food,
            life: 30 + Math.random() * 20,
            maxLife: 50
        });
    }
}

// 切换暂停状态
function togglePause() {
    if (gameState.gameOver) return;
    
    gameState.paused = !gameState.paused;
    
    if (gameState.paused) {
        // 暂停游戏
        cancelAnimationFrame(gameState.animationId);
        drawPauseScreen();
        elements.pauseButton.textContent = '继续';
    } else {
        // 继续游戏
        gameState.lastTime = performance.now();
        gameLoop(gameState.lastTime);
        elements.pauseButton.textContent = '暂停';
    }
}

// 重置游戏
function resetGame() {
    // 停止游戏循环
    cancelAnimationFrame(gameState.animationId);
    
    // 重置游戏状态
    gameState.gameOver = true;
    
    // 更新UI
    elements.startButton.disabled = false;
    elements.pauseButton.disabled = true;
    elements.pauseButton.textContent = '暂停';
    
    // 绘制开始界面
    drawStartScreen();
}

// 切换音效
function toggleSound() {
    gameState.soundEnabled = !gameState.soundEnabled;
    elements.soundButton.textContent = gameState.soundEnabled ? '静音' : '音效';
    
    // 如果音效启用但音频上下文被暂停，尝试恢复
    if (gameState.soundEnabled && audio.context && audio.context.state === 'suspended') {
        audio.context.resume();
    }
}

// 游戏循环
function gameLoop(currentTime) {
    if (gameState.gameOver || gameState.paused) return;
    
    const deltaTime = currentTime - gameState.lastTime;
    
    // 控制游戏速度
    if (deltaTime > gameState.speed) {
        gameState.lastTime = currentTime;
        
        // 更新游戏状态
        updateGame();
        
        // 绘制游戏
        drawGame();
    }
    
    // 继续下一帧
    gameState.animationId = requestAnimationFrame(gameLoop);
}

// 更新游戏状态
function updateGame() {
    // 更新方向
    gameState.direction = gameState.nextDirection;
    
    // 获取蛇头位置
    const head = { ...gameState.snake[0] };
    
    // 根据方向移动蛇头
    switch (gameState.direction) {
        case 'up':
            head.y--;
            break;
        case 'down':
            head.y++;
            break;
        case 'left':
            head.x--;
            break;
        case 'right':
            head.x++;
            break;
    }
    
    // 检查边界碰撞
    const gridCount = Math.floor(elements.canvas.width / config.gridSize);
    if (head.x < 0 || head.x >= gridCount || head.y < 0 || head.y >= gridCount) {
        gameOver();
        return;
    }
    
    // 检查自身碰撞
    for (let segment of gameState.snake) {
        if (segment.x === head.x && segment.y === head.y) {
            gameOver();
            return;
        }
    }
    
    // 添加新的蛇头
    gameState.snake.unshift(head);
    
    // 检查是否吃到食物
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
        // 增加分数
        gameState.score += 10 * gameState.level;
        
        // 播放吃食物音效
        if (gameState.soundEnabled) {
            audio.createSound(880, 'sine', 0.15);
        }
        
        // 生成新食物
        generateFood();
        
        // 检查是否升级
        const newLevel = Math.floor(gameState.score / 100) + 1;
        if (newLevel > gameState.level) {
            levelUp();
        }
        
        // 更新分数显示
        updateScoreDisplay();
        
        // 创建得分特效
        createScoreParticles(head.x, head.y, 10 * gameState.level);
    } else {
        // 如果没吃到食物，移除尾部
        gameState.snake.pop();
    }
    
    // 更新粒子效果
    updateParticles();
}

// 升级
function levelUp() {
    gameState.level++;
    
    // 增加游戏速度（但不超过最大速度）
    gameState.speed = Math.max(config.maxSpeed, config.initialSpeed - (gameState.level - 1) * config.speedIncrease);
    
    // 播放升级音效
    if (gameState.soundEnabled) {
        audio.createSound(1318.51, 'square', 0.3);
        setTimeout(() => {
            if (gameState.soundEnabled) {
                audio.createSound(1567.98, 'square', 0.3);
            }
        }, 150);
    }
    
    // 更新等级显示
    updateLevelDisplay();
    
    // 等级提升特效
    createLevelUpEffect();
}

// 创建等级提升特效
function createLevelUpEffect() {
    const centerX = elements.canvas.width / 2;
    const centerY = elements.canvas.height / 2;
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        const color = i % 2 === 0 ? '#FFD700' : '#FFA500';
        
        gameState.particles.push({
            x: centerX,
            y: centerY,
            size: 3 + Math.random() * 4,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed,
            color: color,
            life: 50 + Math.random() * 30,
            maxLife: 80
        });
    }
}

// 创建得分特效
function createScoreParticles(x, y, points) {
    const centerX = (x + 0.5) * config.gridSize;
    const centerY = (y + 0.5) * config.gridSize;
    const text = `+${points}`;
    
    gameState.particles.push({
        x: centerX,
        y: centerY,
        text: text,
        size: 16,
        speedX: 0,
        speedY: -3,
        color: '#FFD700',
        life: 40,
        maxLife: 40
    });
}

// 更新粒子效果
function updateParticles() {
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const particle = gameState.particles[i];
        
        // 更新位置
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        // 减速
        particle.speedX *= 0.95;
        particle.speedY *= 0.95;
        
        // 减少生命值
        particle.life--;
        
        // 移除死亡的粒子
        if (particle.life <= 0) {
            gameState.particles.splice(i, 1);
        }
    }
}

// 游戏结束
function gameOver() {
    gameState.gameOver = true;
    
    // 播放碰撞音效
    if (gameState.soundEnabled) {
        audio.createSound(110, 'sawtooth', 0.5);
    }
    
    // 创建死亡特效
    createDeathEffect();
    
    // 检查并更新高分
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('snakeHighScore', gameState.highScore);
        updateHighScoreDisplay();
    }
    
    // 更新UI
    elements.startButton.disabled = false;
    elements.pauseButton.disabled = true;
    
    // 绘制游戏结束界面
    setTimeout(() => {
        drawGameOverScreen();
    }, 500);
}

// 创建死亡特效
function createDeathEffect() {
    const head = gameState.snake[0];
    const centerX = (head.x + 0.5) * config.gridSize;
    const centerY = (head.y + 0.5) * config.gridSize;
    const particleCount = 50;
    
    // 蛇身体爆炸特效
    for (let segment of gameState.snake) {
        const segCenterX = (segment.x + 0.5) * config.gridSize;
        const segCenterY = (segment.y + 0.5) * config.gridSize;
        const segParticleCount = 3;
        
        for (let i = 0; i < segParticleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const hue = Math.random() * 60 + 0; // 红色调
            const color = `hsl(${hue}, 100%, 50%)`;
            
            gameState.particles.push({
                x: segCenterX,
                y: segCenterY,
                size: 2 + Math.random() * 4,
                speedX: Math.cos(angle) * speed,
                speedY: Math.sin(angle) * speed,
                color: color,
                life: 30 + Math.random() * 40,
                maxLife: 70
            });
        }
    }
    
    // 头部爆炸特效
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        const hue = Math.random() * 60 + 0; // 红色调
        const color = `hsl(${hue}, 100%, 50%)`;
        
        gameState.particles.push({
            x: centerX,
            y: centerY,
            size: 3 + Math.random() * 5,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed,
            color: color,
            life: 40 + Math.random() * 50,
            maxLife: 90
        });
    }
}

// 绘制开始界面
function drawStartScreen() {
    const ctx = gameState.ctx;
    const width = elements.canvas.width;
    const height = elements.canvas.height;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制背景
    ctx.fillStyle = config.colors.background;
    ctx.fillRect(0, 0, width, height);
    
    // 绘制网格（如果启用）
    if (gameState.showGrid) {
        drawGrid();
    }
    
    // 绘制标题
    ctx.font = '48px Orbitron, sans-serif';
    ctx.fillStyle = '#00f5ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 10;
    ctx.fillText('贪吃蛇', width / 2, height / 2 - 60);
    ctx.shadowBlur = 0;
    
    // 绘制提示信息
    ctx.font = '20px Orbitron, sans-serif';
    ctx.fillStyle = '#b0b0b0';
    ctx.fillText('按Enter键开始游戏', width / 2, height / 2);
    ctx.font = '16px Orbitron, sans-serif';
    ctx.fillText('使用方向键控制蛇的移动', width / 2, height / 2 + 40);
    
    // 绘制示例蛇
    const gridCount = Math.floor(width / config.gridSize);
    const center = Math.floor(gridCount / 2);
    const snakeExample = [
        { x: center, y: center },
        { x: center - 1, y: center },
        { x: center - 2, y: center }
    ];
    
    for (let i = 0; i < snakeExample.length; i++) {
        const segment = snakeExample[i];
        const isHead = i === 0;
        
        drawSnakeSegment(segment.x, segment.y, isHead);
    }
}

// 绘制暂停界面
function drawPauseScreen() {
    const ctx = gameState.ctx;
    const width = elements.canvas.width;
    const height = elements.canvas.height;
    
    // 绘制半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    
    // 绘制暂停文字
    ctx.font = '48px Orbitron, sans-serif';
    ctx.fillStyle = '#ff2a6d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff2a6d';
    ctx.shadowBlur = 10;
    ctx.fillText('游戏暂停', width / 2, height / 2 - 30);
    ctx.shadowBlur = 0;
    
    // 绘制提示
    ctx.font = '20px Orbitron, sans-serif';
    ctx.fillStyle = '#b0b0b0';
    ctx.fillText('按空格键继续', width / 2, height / 2 + 30);
}

// 绘制游戏结束界面
function drawGameOverScreen() {
    const ctx = gameState.ctx;
    const width = elements.canvas.width;
    const height = elements.canvas.height;
    
    // 绘制半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    
    // 绘制游戏结束文字
    ctx.font = '48px Orbitron, sans-serif';
    ctx.fillStyle = '#ff2a6d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff2a6d';
    ctx.shadowBlur = 10;
    ctx.fillText('游戏结束', width / 2, height / 2 - 80);
    ctx.shadowBlur = 0;
    
    // 绘制最终得分
    ctx.font = '28px Orbitron, sans-serif';
    ctx.fillStyle = '#00f5ff';
    ctx.fillText(`最终得分: ${gameState.score}`, width / 2, height / 2 - 20);
    
    // 绘制提示
    ctx.font = '20px Orbitron, sans-serif';
    ctx.fillStyle = '#b0b0b0';
    ctx.fillText('按Enter键重新开始', width / 2, height / 2 + 40);
}

// 绘制游戏
function drawGame() {
    const ctx = gameState.ctx;
    const width = elements.canvas.width;
    const height = elements.canvas.height;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制背景
    ctx.fillStyle = config.colors.background;
    ctx.fillRect(0, 0, width, height);
    
    // 绘制网格（如果启用）
    if (gameState.showGrid) {
        drawGrid();
    }
    
    // 绘制蛇
    drawSnake();
    
    // 绘制食物
    drawFood();
    
    // 绘制粒子效果
    drawParticles();
}

// 绘制网格
function drawGrid() {
    const ctx = gameState.ctx;
    const width = elements.canvas.width;
    const height = elements.canvas.height;
    const gridCount = Math.floor(width / config.gridSize);
    
    ctx.strokeStyle = config.colors.grid;
    ctx.lineWidth = 1;
    
    // 绘制垂直线
    for (let i = 0; i <= gridCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * config.gridSize, 0);
        ctx.lineTo(i * config.gridSize, height);
        ctx.stroke();
    }
    
    // 绘制水平线
    for (let i = 0; i <= gridCount; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * config.gridSize);
        ctx.lineTo(width, i * config.gridSize);
        ctx.stroke();
    }
}

// 绘制蛇
function drawSnake() {
    // 绘制蛇身体
    for (let i = gameState.snake.length - 1; i >= 0; i--) {
        const segment = gameState.snake[i];
        const isHead = i === 0;
        
        // 为身体部分创建渐变色彩
        const gradientPos = i / gameState.snake.length;
        const r = Math.floor(1 + gradientPos * 204);
        const g = Math.floor(205 + gradientPos * 50);
        const b = Math.floor(254 - gradientPos * 253);
        const color = `rgb(${r}, ${g}, ${b})`;
        
        // 绘制蛇段
        if (isHead) {
            drawSnakeHead(segment.x, segment.y);
        } else {
            drawSnakeSegment(segment.x, segment.y, false, color);
        }
    }
}

// 绘制蛇头
function drawSnakeHead(x, y) {
    const ctx = gameState.ctx;
    const size = config.gridSize;
    const centerX = (x + 0.5) * size;
    const centerY = (y + 0.5) * size;
    
    // 创建头部渐变
    const gradient = ctx.createRadialGradient(
        centerX - size / 4, 
        centerY - size / 4, 
        2,
        centerX, 
        centerY, 
        size / 2
    );
    gradient.addColorStop(0, '#ff6b8b');
    gradient.addColorStop(1, config.colors.snakeHead);
    
    // 绘制头部
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#ff2a6d';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // 绘制眼睛
    ctx.fillStyle = '#ffffff';
    
    // 根据方向调整眼睛位置
    let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
    const eyeSize = size / 8;
    const eyeOffset = size / 3;
    
    switch (gameState.direction) {
        case 'up':
            leftEyeX = centerX - eyeOffset / 2;
            leftEyeY = centerY - eyeOffset;
            rightEyeX = centerX + eyeOffset / 2;
            rightEyeY = centerY - eyeOffset;
            break;
        case 'down':
            leftEyeX = centerX - eyeOffset / 2;
            leftEyeY = centerY + eyeOffset;
            rightEyeX = centerX + eyeOffset / 2;
            rightEyeY = centerY + eyeOffset;
            break;
        case 'left':
            leftEyeX = centerX - eyeOffset;
            leftEyeY = centerY - eyeOffset / 2;
            rightEyeX = centerX - eyeOffset;
            rightEyeY = centerY + eyeOffset / 2;
            break;
        case 'right':
            leftEyeX = centerX + eyeOffset;
            leftEyeY = centerY - eyeOffset / 2;
            rightEyeX = centerX + eyeOffset;
            rightEyeY = centerY + eyeOffset / 2;
            break;
    }
    
    // 绘制左眼
    ctx.beginPath();
    ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制右眼
    ctx.beginPath();
    ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制眼球
    ctx.fillStyle = '#000000';
    
    // 左眼眼球
    ctx.beginPath();
    ctx.arc(leftEyeX, leftEyeY, eyeSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 右眼眼球
    ctx.beginPath();
    ctx.arc(rightEyeX, rightEyeY, eyeSize / 2, 0, Math.PI * 2);
    ctx.fill();
}

// 绘制蛇身体段
function drawSnakeSegment(x, y, isHead = false, color = config.colors.snakeBody) {
    const ctx = gameState.ctx;
    const size = config.gridSize;
    
    // 绘制身体段
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.roundRect(x * size + 2, y * size + 2, size - 4, size - 4, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // 添加高光效果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.roundRect(x * size + 4, y * size + 4, size - 12, size - 12, 3);
    ctx.fill();
}

// 绘制食物
function drawFood() {
    const ctx = gameState.ctx;
    const size = config.gridSize;
    const x = gameState.food.x * size;
    const y = gameState.food.y * size;
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    
    // 创建食物渐变
    const gradient = ctx.createRadialGradient(
        centerX - size / 4, 
        centerY - size / 4, 
        2,
        centerX, 
        centerY, 
        size / 2
    );
    gradient.addColorStop(0, '#70ffcb');
    gradient.addColorStop(1, config.colors.food);
    
    // 绘制食物
    ctx.fillStyle = gradient;
    ctx.shadowColor = config.colors.food;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(centerX, centerY, size / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // 添加食物脉动效果
    const pulseFactor = 1 + Math.sin(Date.now() / 300) * 0.1;
    ctx.strokeStyle = config.colors.food;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, (size / 2 - 2) * pulseFactor, 0, Math.PI * 2);
    ctx.stroke();
}

// 绘制粒子效果
function drawParticles() {
    const ctx = gameState.ctx;
    
    for (let particle of gameState.particles) {
        const alpha = particle.life / particle.maxLife;
        
        if (particle.text) {
            // 绘制文字粒子
            ctx.font = `${particle.size}px Orbitron, sans-serif`;
            ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(particle.text, particle.x, particle.y);
        } else {
            // 绘制普通粒子
            ctx.fillStyle = `rgba(${hexToRgb(particle.color)}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// 十六进制颜色转RGB
function hexToRgb(hex) {
    // 移除#号
    hex = hex.replace('#', '');
    
    // 解析RGB值
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
}

// 更新分数显示
function updateScoreDisplay() {
    elements.score.textContent = gameState.score;
    
    // 添加分数变化动画
    elements.score.classList.add('score-animation');
    setTimeout(() => {
        elements.score.classList.remove('score-animation');
    }, 300);
}

// 更新高分显示
function updateHighScoreDisplay() {
    elements.highScore.textContent = gameState.highScore;
}

// 更新等级显示
function updateLevelDisplay() {
    elements.level.textContent = gameState.level;
    
    // 添加等级变化动画
    elements.level.classList.add('level-animation');
    setTimeout(() => {
        elements.level.classList.remove('level-animation');
    }, 500);
}

// 页面加载完成后初始化游戏
window.addEventListener('load', initGame);