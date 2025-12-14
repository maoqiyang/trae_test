// 游戏配置
const flappyConfig = {
    gravity: 0.5,
    jumpForce: -8,
    pipeSpeed: 5,
    pipeGap: 150,
    pipeFrequency: 150,
    initialSpeed: 5,
    speedIncrease: 0.1,
    maxSpeed: 8,
    colors: {
        bird: '#ff2a6d',
        pipe: '#05d9e8',
        sky: '#0b3d91',
        ground: '#ffd166',
        text: '#ffffff'
    },
    backgroundSpeed: 1
};

// 游戏状态
const flappyState = {
    bird: { x: 0, y: 0, velocity: 0, rotation: 0 },
    pipes: [],
    score: 0,
    highScore: localStorage.getItem('flappyHighScore') || 0,
    gameOver: true,
    paused: false,
    speed: flappyConfig.initialSpeed,
    canvas: null,
    ctx: null,
    animationId: null,
    lastTime: 0,
    pipeTimer: 0,
    soundEnabled: false,
    particles: [],
    backgroundOffset: 0,
    groundOffset: 0,
    stars: [],
    lastScore: 0
};

// DOM 元素
const flappyElements = {
    canvas: null,
    score: null,
    highScore: null,
    speed: null,
    startButton: null,
    pauseButton: null,
    resetButton: null,
    soundButton: null,
    tapButton: null
};

// 音效（使用Web Audio API创建简单音效）
const flappyAudio = {
    context: null,
    jumpSound: null,
    pointSound: null,
    hitSound: null,
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
function initFlappyGame() {
    // 获取DOM元素
    flappyElements.canvas = document.getElementById('flappyCanvas');
    flappyElements.score = document.getElementById('flappy-score');
    flappyElements.highScore = document.getElementById('flappy-high-score');
    flappyElements.speed = document.getElementById('flappy-speed');
    flappyElements.startButton = document.getElementById('flappy-startButton');
    flappyElements.pauseButton = document.getElementById('flappy-pauseButton');
    flappyElements.resetButton = document.getElementById('flappy-resetButton');
    flappyElements.soundButton = document.getElementById('flappy-soundButton');
    flappyElements.tapButton = document.getElementById('flappy-tapButton');
    
    // 设置画布尺寸
    const containerWidth = flappyElements.canvas.parentElement.clientWidth;
    const width = Math.min(containerWidth - 20, 600);
    const height = width * 1.5; // 保持16:9比例
    flappyElements.canvas.width = width;
    flappyElements.canvas.height = height;
    
    flappyState.canvas = flappyElements.canvas;
    flappyState.ctx = flappyElements.canvas.getContext('2d');
    
    // 初始化音频上下文
    try {
        flappyAudio.context = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('Web Audio API not supported');
    }
    
    // 初始化背景星星
    initStars();
    
    // 更新高分显示
    updateFlappyHighScoreDisplay();
    
    // 添加事件监听
    addFlappyEventListeners();
    
    // 绘制初始界面
    drawFlappyStartScreen();
}

// 初始化背景星星
function initStars() {
    const width = flappyElements.canvas.width;
    const height = flappyElements.canvas.height;
    const starCount = 50;
    
    flappyState.stars = [];
    
    for (let i = 0; i < starCount; i++) {
        flappyState.stars.push({
            x: Math.random() * width,
            y: Math.random() * height * 0.7, // 只在天空部分生成星星
            radius: Math.random() * 2,
            brightness: 0.3 + Math.random() * 0.7,
            blinkSpeed: 0.01 + Math.random() * 0.05,
            phase: Math.random() * Math.PI * 2
        });
    }
}

// 添加事件监听器
function addFlappyEventListeners() {
    // 按钮事件
    flappyElements.startButton.addEventListener('click', startFlappyGame);
    flappyElements.pauseButton.addEventListener('click', toggleFlappyPause);
    flappyElements.resetButton.addEventListener('click', resetFlappyGame);
    flappyElements.soundButton.addEventListener('click', toggleFlappySound);
    flappyElements.tapButton.addEventListener('click', birdJump);
    
    // 空格键跳跃
    document.addEventListener('keydown', handleFlappyKeyPress);
    
    // 鼠标点击跳跃
    flappyElements.canvas.addEventListener('click', birdJump);
    
    // 触摸屏点击跳跃
    flappyElements.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        birdJump();
    });
    
    // 窗口大小改变时重新调整画布
    window.addEventListener('resize', resizeFlappyCanvas);
}

// 调整画布大小
function resizeFlappyCanvas() {
    const containerWidth = flappyElements.canvas.parentElement.clientWidth;
    const width = Math.min(containerWidth - 20, 600);
    const height = width * 1.5;
    
    // 保存当前的游戏状态
    const tempState = {
        gameOver: flappyState.gameOver,
        paused: flappyState.paused,
        score: flappyState.score,
        highScore: flappyState.highScore
    };
    
    // 重新设置画布尺寸
    flappyElements.canvas.width = width;
    flappyElements.canvas.height = height;
    
    // 重新初始化星星
    initStars();
    
    // 重绘当前界面
    if (tempState.gameOver) {
        drawFlappyStartScreen();
    } else if (tempState.paused) {
        drawFlappyPauseScreen();
    } else {
        // 如果游戏正在进行，重置小鸟和管道位置
        resetFlappyGameState();
        drawFlappyGame();
    }
}

// 处理键盘按键
function handleFlappyKeyPress(e) {
    // 游戏暂停/继续
    if (e.code === 'Space') {
        e.preventDefault();
        if (!flappyState.gameOver) {
            if (flappyState.paused) {
                toggleFlappyPause();
            } else {
                birdJump();
            }
        }
    }
    
    // 游戏开始
    if (e.code === 'Enter' && flappyState.gameOver) {
        startFlappyGame();
    }
}

// 小鸟跳跃
function birdJump() {
    if (flappyState.gameOver || flappyState.paused) return;
    
    // 应用跳跃力
    flappyState.bird.velocity = flappyConfig.jumpForce;
    
    // 播放跳跃音效
    if (flappyState.soundEnabled) {
        flappyAudio.createSound(440, 'sine', 0.1);
    }
    
    // 添加跳跃特效
    createJumpParticles(flappyState.bird.x, flappyState.bird.y);
}

// 创建跳跃特效
function createJumpParticles(x, y) {
    const particleCount = 5;
    const size = 20; // 小鸟大小
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.PI + Math.random() * Math.PI;
        const speed = 2 + Math.random() * 3;
        
        flappyState.particles.push({
            x: x + size / 2,
            y: y + size,
            size: 2 + Math.random() * 3,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed,
            color: '#ff2a6d',
            life: 20 + Math.random() * 10,
            maxLife: 30
        });
    }
}

// 开始游戏
function startFlappyGame() {
    // 重置游戏状态
    resetFlappyGameState();
    
    // 更新UI
    flappyElements.startButton.disabled = true;
    flappyElements.pauseButton.disabled = false;
    
    // 开始游戏循环
    flappyState.lastTime = performance.now();
    flappyGameLoop(flappyState.lastTime);
}

// 重置游戏状态
function resetFlappyGameState() {
    const width = flappyElements.canvas.width;
    const height = flappyElements.canvas.height;
    
    flappyState.bird = {
        x: width * 0.2,
        y: height * 0.5,
        velocity: 0,
        rotation: 0
    };
    
    flappyState.pipes = [];
    flappyState.score = 0;
    flappyState.gameOver = false;
    flappyState.paused = false;
    flappyState.speed = flappyConfig.initialSpeed;
    flappyState.pipeTimer = 0;
    flappyState.particles = [];
    flappyState.backgroundOffset = 0;
    flappyState.groundOffset = 0;
    flappyState.lastScore = 0;
    
    // 更新分数显示
    updateFlappyScoreDisplay();
    updateFlappySpeedDisplay();
}

// 切换暂停状态
function toggleFlappyPause() {
    if (flappyState.gameOver) return;
    
    flappyState.paused = !flappyState.paused;
    
    if (flappyState.paused) {
        // 暂停游戏
        cancelAnimationFrame(flappyState.animationId);
        drawFlappyPauseScreen();
        flappyElements.pauseButton.textContent = '继续';
    } else {
        // 继续游戏
        flappyState.lastTime = performance.now();
        flappyGameLoop(flappyState.lastTime);
        flappyElements.pauseButton.textContent = '暂停';
    }
}

// 重置游戏
function resetFlappyGame() {
    // 停止游戏循环
    cancelAnimationFrame(flappyState.animationId);
    
    // 重置游戏状态
    flappyState.gameOver = true;
    
    // 更新UI
    flappyElements.startButton.disabled = false;
    flappyElements.pauseButton.disabled = true;
    flappyElements.pauseButton.textContent = '暂停';
    
    // 绘制开始界面
    drawFlappyStartScreen();
}

// 切换音效
function toggleFlappySound() {
    flappyState.soundEnabled = !flappyState.soundEnabled;
    flappyElements.soundButton.textContent = flappyState.soundEnabled ? '静音' : '音效';
    
    // 如果音效启用但音频上下文被暂停，尝试恢复
    if (flappyState.soundEnabled && flappyAudio.context && flappyAudio.context.state === 'suspended') {
        flappyAudio.context.resume();
    }
}

// 游戏循环
function flappyGameLoop(currentTime) {
    if (flappyState.gameOver || flappyState.paused) return;
    
    const deltaTime = currentTime - flappyState.lastTime;
    flappyState.lastTime = currentTime;
    
    // 更新游戏状态
    updateFlappyGame(deltaTime);
    
    // 绘制游戏
    drawFlappyGame();
    
    // 继续下一帧
    flappyState.animationId = requestAnimationFrame(flappyGameLoop);
}

// 更新游戏状态
function updateFlappyGame(deltaTime) {
    const width = flappyElements.canvas.width;
    const height = flappyElements.canvas.height;
    
    // 更新背景滚动
    flappyState.backgroundOffset = (flappyState.backgroundOffset + flappyConfig.backgroundSpeed) % width;
    flappyState.groundOffset = (flappyState.groundOffset + flappyState.speed * 0.5) % width;
    
    // 更新星星闪烁
    updateStars();
    
    // 更新小鸟位置和速度
    flappyState.bird.velocity += flappyConfig.gravity;
    flappyState.bird.y += flappyState.bird.velocity;
    
    // 更新小鸟旋转角度
    flappyState.bird.rotation = Math.min(Math.max(flappyState.bird.velocity * 0.05, -1), 1);
    
    // 检查地面碰撞
    const groundHeight = height * 0.2;
    if (flappyState.bird.y + 10 > height - groundHeight) {
        flappyState.bird.y = height - groundHeight - 10;
        flappyGameOver();
        return;
    }
    
    // 检查天空碰撞
    if (flappyState.bird.y < 0) {
        flappyState.bird.y = 0;
        flappyState.bird.velocity = 0;
    }
    
    // 生成管道
    flappyState.pipeTimer += deltaTime;
    if (flappyState.pipeTimer > flappyConfig.pipeFrequency) {
        generatePipe();
        flappyState.pipeTimer = 0;
    }
    
    // 更新管道位置
    updatePipes();
    
    // 检查碰撞
    checkCollisions();
    
    // 检查得分
    checkScore();
    
    // 更新粒子效果
    updateFlappyParticles();
    
    // 随着分数增加，提高游戏速度
    if (flappyState.score > flappyState.lastScore && flappyState.score % 5 === 0) {
        flappyState.speed = Math.min(flappyConfig.maxSpeed, flappyConfig.initialSpeed + flappyState.score * flappyConfig.speedIncrease);
        updateFlappySpeedDisplay();
        flappyState.lastScore = flappyState.score;
    }
}

// 更新星星
function updateStars() {
    for (let star of flappyState.stars) {
        star.phase += star.blinkSpeed;
        star.brightness = 0.3 + Math.sin(star.phase) * 0.35;
    }
}

// 生成管道
function generatePipe() {
    const width = flappyElements.canvas.width;
    const height = flappyElements.canvas.height;
    const pipeWidth = 80;
    const minHeight = 50;
    const maxHeight = height * 0.5;
    
    // 随机生成管道高度
    const topPipeHeight = minHeight + Math.random() * (maxHeight - minHeight);
    const bottomPipeY = topPipeHeight + flappyConfig.pipeGap;
    const bottomPipeHeight = height - bottomPipeY - height * 0.2; // 减去地面高度
    
    // 添加上下管道
    flappyState.pipes.push({
        x: width,
        width: pipeWidth,
        topHeight: topPipeHeight,
        bottomY: bottomPipeY,
        bottomHeight: bottomPipeHeight,
        passed: false,
        color: flappyConfig.colors.pipe,
        highlight: false,
        highlightTimer: 0
    });
}

// 更新管道位置
function updatePipes() {
    for (let i = flappyState.pipes.length - 1; i >= 0; i--) {
        const pipe = flappyState.pipes[i];
        
        // 移动管道
        pipe.x -= flappyState.speed;
        
        // 更新高亮效果
        if (pipe.highlight) {
            pipe.highlightTimer--;
            if (pipe.highlightTimer <= 0) {
                pipe.highlight = false;
            }
        }
        
        // 移除屏幕外的管道
        if (pipe.x + pipe.width < 0) {
            flappyState.pipes.splice(i, 1);
        }
    }
}

// 检查碰撞
function checkCollisions() {
    const birdSize = 20;
    
    for (let pipe of flappyState.pipes) {
        // 检查小鸟是否与管道碰撞
        if (
            flappyState.bird.x + birdSize > pipe.x &&
            flappyState.bird.x < pipe.x + pipe.width &&
            (
                flappyState.bird.y < pipe.topHeight ||
                flappyState.bird.y + birdSize > pipe.bottomY
            )
        ) {
            // 播放碰撞音效
            if (flappyState.soundEnabled) {
                flappyAudio.createSound(110, 'sawtooth', 0.3);
            }
            
            // 创建碰撞特效
            createCollisionParticles(flappyState.bird.x, flappyState.bird.y);
            
            // 游戏结束
            flappyGameOver();
            return;
        }
    }
}

// 创建碰撞特效
function createCollisionParticles(x, y) {
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 5;
        const hue = Math.random() * 60 + 0; // 红色调
        const color = `hsl(${hue}, 100%, 50%)`;
        
        flappyState.particles.push({
            x: x + 10,
            y: y + 10,
            size: 3 + Math.random() * 5,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed,
            color: color,
            life: 40 + Math.random() * 30,
            maxLife: 70
        });
    }
}

// 检查得分
function checkScore() {
    const birdSize = 20;
    
    for (let pipe of flappyState.pipes) {
        // 检查小鸟是否通过了管道
        if (!pipe.passed && flappyState.bird.x > pipe.x + pipe.width) {
            flappyState.score++;
            pipe.passed = true;
            pipe.highlight = true;
            pipe.highlightTimer = 10;
            
            // 更新分数显示
            updateFlappyScoreDisplay();
            
            // 播放得分音效
            if (flappyState.soundEnabled) {
                flappyAudio.createSound(880, 'sine', 0.1);
            }
            
            // 创建得分特效
            createScoreParticles(pipe.x + pipe.width, flappyElements.canvas.height * 0.5);
        }
    }
}

// 创建得分特效
function createScoreParticles(x, y) {
    flappyState.particles.push({
        x: x,
        y: y,
        text: '+1',
        size: 16,
        speedX: 2,
        speedY: -3,
        color: '#FFD700',
        life: 40,
        maxLife: 40
    });
}

// 更新粒子效果
function updateFlappyParticles() {
    for (let i = flappyState.particles.length - 1; i >= 0; i--) {
        const particle = flappyState.particles[i];
        
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
            flappyState.particles.splice(i, 1);
        }
    }
}

// 游戏结束
function flappyGameOver() {
    flappyState.gameOver = true;
    
    // 检查并更新高分
    if (flappyState.score > flappyState.highScore) {
        flappyState.highScore = flappyState.score;
        localStorage.setItem('flappyHighScore', flappyState.highScore);
        updateFlappyHighScoreDisplay();
    }
    
    // 更新UI
    flappyElements.startButton.disabled = false;
    flappyElements.pauseButton.disabled = true;
    
    // 绘制游戏结束界面
    setTimeout(() => {
        drawFlappyGameOverScreen();
    }, 500);
}

// 绘制开始界面
function drawFlappyStartScreen() {
    const ctx = flappyState.ctx;
    const width = flappyElements.canvas.width;
    const height = flappyElements.canvas.height;
    
    // 绘制背景
    drawFlappyBackground();
    
    // 绘制半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);
    
    // 绘制标题
    ctx.font = '48px Orbitron, sans-serif';
    ctx.fillStyle = '#00f5ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 10;
    ctx.fillText('管道小鸟', width / 2, height / 2 - 80);
    ctx.shadowBlur = 0;
    
    // 绘制小鸟示例
    ctx.save();
    ctx.translate(width / 2, height / 2 - 20);
    drawBird(0, 0, 0);
    ctx.restore();
    
    // 绘制提示信息
    ctx.font = '24px Orbitron, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('点击或按空格键跳跃', width / 2, height / 2 + 50);
    
    ctx.font = '20px Orbitron, sans-serif';
    ctx.fillStyle = '#b0b0b0';
    ctx.fillText('按Enter键开始游戏', width / 2, height / 2 + 80);
}

// 绘制暂停界面
function drawFlappyPauseScreen() {
    const ctx = flappyState.ctx;
    const width = flappyElements.canvas.width;
    const height = flappyElements.canvas.height;
    
    // 绘制游戏画面
    drawFlappyGame();
    
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
function drawFlappyGameOverScreen() {
    const ctx = flappyState.ctx;
    const width = flappyElements.canvas.width;
    const height = flappyElements.canvas.height;
    
    // 绘制游戏画面
    drawFlappyGame();
    
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
    ctx.fillText(`最终得分: ${flappyState.score}`, width / 2, height / 2 - 20);
    
    // 绘制提示
    ctx.font = '20px Orbitron, sans-serif';
    ctx.fillStyle = '#b0b0b0';
    ctx.fillText('按Enter键重新开始', width / 2, height / 2 + 40);
}

// 绘制游戏
function drawFlappyGame() {
    const ctx = flappyState.ctx;
    const width = flappyElements.canvas.width;
    const height = flappyElements.canvas.height;
    
    // 绘制背景
    drawFlappyBackground();
    
    // 绘制管道
    drawPipes();
    
    // 绘制地面
    drawGround();
    
    // 绘制小鸟
    ctx.save();
    ctx.translate(flappyState.bird.x, flappyState.bird.y);
    ctx.rotate(flappyState.bird.rotation);
    drawBird(0, 0);
    ctx.restore();
    
    // 绘制粒子效果
    drawFlappyParticles();
}

// 绘制背景
function drawFlappyBackground() {
    const ctx = flappyState.ctx;
    const width = flappyElements.canvas.width;
    const height = flappyElements.canvas.height;
    
    // 绘制天空渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, height * 0.8);
    gradient.addColorStop(0, '#0b3d91');
    gradient.addColorStop(1, '#1a5fb4');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // 绘制星星
    drawStars();
    
    // 绘制背景云（简单表示）
    drawClouds();
}

// 绘制星星
function drawStars() {
    const ctx = flappyState.ctx;
    
    for (let star of flappyState.stars) {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 绘制云朵
function drawClouds() {
    const ctx = flappyState.ctx;
    const width = flappyElements.canvas.width;
    const height = flappyElements.canvas.height;
    
    // 绘制滚动的云朵背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    
    // 云朵1
    drawCloud(ctx, width - flappyState.backgroundOffset, height * 0.2, 60);
    
    // 云朵2
    drawCloud(ctx, width - flappyState.backgroundOffset + width * 0.3, height * 0.35, 80);
    
    // 云朵3
    drawCloud(ctx, width - flappyState.backgroundOffset + width * 0.7, height * 0.25, 50);
    
    // 重复云朵以创建连续效果
    drawCloud(ctx, -flappyState.backgroundOffset, height * 0.2, 60);
    drawCloud(ctx, -flappyState.backgroundOffset + width * 0.3, height * 0.35, 80);
    drawCloud(ctx, -flappyState.backgroundOffset + width * 0.7, height * 0.25, 50);
}

// 绘制单个云朵
function drawCloud(ctx, x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.3, y - size * 0.2, size * 0.3, 0, Math.PI * 2);
    ctx.arc(x + size * 0.6, y - size * 0.1, size * 0.35, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.5, y + size * 0.2, size * 0.3, 0, Math.PI * 2);
    ctx.arc(x + size * 0.2, y + size * 0.2, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
}

// 绘制小鸟
function drawBird(x, y, rotation = 0) {
    const ctx = flappyState.ctx;
    const size = 20;
    
    // 创建小鸟渐变
    const gradient = ctx.createRadialGradient(
        x - size / 4, 
        y - size / 4, 
        2,
        x, 
        y, 
        size / 2
    );
    gradient.addColorStop(0, '#ff6b8b');
    gradient.addColorStop(1, flappyConfig.colors.bird);
    
    // 绘制小鸟身体
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#ff2a6d';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // 绘制小鸟眼睛
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + size / 3, y - size / 5, size / 5, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制眼球
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x + size / 2.5, y - size / 5, size / 10, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制小鸟嘴巴
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y);
    ctx.lineTo(x + size, y - size / 6);
    ctx.lineTo(x + size / 2, y + size / 6);
    ctx.closePath();
    ctx.fill();
    
    // 绘制小鸟翅膀
    ctx.fillStyle = '#ff4a7d';
    ctx.beginPath();
    ctx.moveTo(x - size / 4, y - size / 5);
    ctx.lineTo(x - size / 1.5, y - size / 10);
    ctx.lineTo(x - size / 4, y + size / 10);
    ctx.closePath();
    ctx.fill();
}

// 绘制管道
function drawPipes() {
    const ctx = flappyState.ctx;
    
    for (let pipe of flappyState.pipes) {
        // 创建管道渐变
        const gradient = ctx.createLinearGradient(
            pipe.x, 
            0, 
            pipe.x + pipe.width, 
            0
        );
        
        if (pipe.highlight) {
            gradient.addColorStop(0, '#70ffcb');
            gradient.addColorStop(1, '#01ffc3');
        } else {
            gradient.addColorStop(0, '#79f1fc');
            gradient.addColorStop(1, flappyConfig.colors.pipe);
        }
        
        // 绘制上管道
        ctx.fillStyle = gradient;
        ctx.shadowColor = pipe.highlight ? '#01ffc3' : flappyConfig.colors.pipe;
        ctx.shadowBlur = 10;
        ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
        
        // 绘制上管道顶部
        ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, pipe.width + 10, 20);
        
        // 绘制下管道
        ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, pipe.bottomHeight);
        
        // 绘制下管道顶部
        ctx.fillRect(pipe.x - 5, pipe.bottomY, pipe.width + 10, 20);
        ctx.shadowBlur = 0;
    }
}

// 绘制地面
function drawGround() {
    const ctx = flappyState.ctx;
    const width = flappyElements.canvas.width;
    const height = flappyElements.canvas.height;
    const groundHeight = height * 0.2;
    
    // 创建地面渐变
    const gradient = ctx.createLinearGradient(0, height - groundHeight, 0, height);
    gradient.addColorStop(0, '#ffd166');
    gradient.addColorStop(1, '#ff9f1c');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - groundHeight, width, groundHeight);
    
    // 绘制地面纹理
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    const groundPatternWidth = 50;
    
    for (let i = 0; i < width / groundPatternWidth + 2; i++) {
        ctx.fillRect(
            i * groundPatternWidth - flappyState.groundOffset, 
            height - groundHeight + 10, 
            5, 
            groundHeight - 20
        );
    }
}

// 绘制粒子效果
function drawFlappyParticles() {
    const ctx = flappyState.ctx;
    
    for (let particle of flappyState.particles) {
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
function updateFlappyScoreDisplay() {
    flappyElements.score.textContent = flappyState.score;
    
    // 添加分数变化动画
    flappyElements.score.classList.add('score-animation');
    setTimeout(() => {
        flappyElements.score.classList.remove('score-animation');
    }, 300);
}

// 更新高分显示
function updateFlappyHighScoreDisplay() {
    flappyElements.highScore.textContent = flappyState.highScore;
}

// 更新速度显示
function updateFlappySpeedDisplay() {
    flappyElements.speed.textContent = flappyState.speed.toFixed(1) + 'x';
}

// 页面加载完成后初始化游戏
window.addEventListener('load', initFlappyGame);