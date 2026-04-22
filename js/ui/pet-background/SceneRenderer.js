function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) * 0.5));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function drawScene(ctx, rect, theme, tick) {
  const x = rect.x;
  const y = rect.y;
  const w = rect.w;
  const h = rect.h;

  const palettes = {
    home_cozy: ['rgba(255,251,238,0.95)', 'rgba(255,239,209,0.95)', 'rgba(245,224,185,0.26)'],
    park_breeze: ['rgba(238,251,236,0.95)', 'rgba(214,241,214,0.92)', 'rgba(177,223,177,0.24)'],
    work_focus: ['rgba(242,247,255,0.95)', 'rgba(222,233,247,0.92)', 'rgba(165,188,220,0.2)'],
    fitness_power: ['rgba(255,243,232,0.96)', 'rgba(255,222,196,0.93)', 'rgba(255,154,103,0.2)'],
    read_focus: ['rgba(250,246,235,0.96)', 'rgba(238,228,205,0.93)', 'rgba(193,165,119,0.2)'],
    eat_vitality: ['rgba(246,255,233,0.96)', 'rgba(223,244,198,0.92)', 'rgba(138,203,101,0.2)'],
  };
  const p = palettes[theme] || palettes.home_cozy;

  const wallBaseY = y + h * 0.66;
  const base = ctx.createLinearGradient(x, y, x, wallBaseY);
  base.addColorStop(0, p[0]);
  base.addColorStop(1, p[1]);
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, wallBaseY - y);

  // 地面层：和墙体分离，制造前后景
  const floor = ctx.createLinearGradient(x, wallBaseY, x, y + h);
  floor.addColorStop(0, 'rgba(205, 185, 156, 0.22)');
  floor.addColorStop(1, 'rgba(176, 153, 125, 0.3)');
  ctx.fillStyle = floor;
  ctx.fillRect(x, wallBaseY, w, h - (wallBaseY - y));

  // 墙地交界线（弱透视）
  ctx.strokeStyle = 'rgba(145, 122, 97, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.04, wallBaseY);
  ctx.lineTo(x + w * 0.96, wallBaseY);
  ctx.stroke();

  const diagonal = ctx.createLinearGradient(x, y + h, x + w, y);
  diagonal.addColorStop(0, p[2]);
  diagonal.addColorStop(1, 'rgba(255,255,255,0.08)');
  ctx.fillStyle = diagonal;
  ctx.fillRect(x, y, w, h);

  if (theme === 'home_cozy') {
    // 暖色窗户
    roundRectPath(ctx, x + w * 0.08, y + h * 0.12, w * 0.24, h * 0.3, 12);
    const win = ctx.createLinearGradient(x, y + h * 0.12, x, y + h * 0.42);
    win.addColorStop(0, 'rgba(255, 235, 185, 0.88)');
    win.addColorStop(1, 'rgba(255, 212, 145, 0.82)');
    ctx.fillStyle = win;
    ctx.fill();
    ctx.strokeStyle = 'rgba(171, 121, 71, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(188, 139, 89, 0.6)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.13);
    ctx.lineTo(x + w * 0.2, y + h * 0.41);
    ctx.moveTo(x + w * 0.09, y + h * 0.27);
    ctx.lineTo(x + w * 0.31, y + h * 0.27);
    ctx.stroke();

    // 左右窗帘
    roundRectPath(ctx, x + w * 0.06, y + h * 0.12, w * 0.04, h * 0.32, 6);
    ctx.fillStyle = 'rgba(236, 178, 132, 0.62)';
    ctx.fill();
    roundRectPath(ctx, x + w * 0.3, y + h * 0.12, w * 0.04, h * 0.32, 6);
    ctx.fillStyle = 'rgba(236, 178, 132, 0.62)';
    ctx.fill();

    // 沙发
    ctx.fillStyle = 'rgba(60, 45, 30, 0.08)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.72, y + h * 0.82, w * 0.2, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    roundRectPath(ctx, x + w * 0.56, y + h * 0.66, w * 0.32, h * 0.14, 12);
    ctx.fillStyle = 'rgba(226, 176, 126, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 103, 57, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    roundRectPath(ctx, x + w * 0.58, y + h * 0.62, w * 0.28, h * 0.06, 8);
    ctx.fillStyle = 'rgba(239, 198, 154, 0.82)';
    ctx.fill();
  } else if (theme === 'park_breeze') {
    // 云朵
    ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.24, y + h * 0.22, w * 0.12, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.72, y + h * 0.18, w * 0.1, h * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();

    // 草地
    ctx.fillStyle = 'rgba(141, 203, 118, 0.65)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.24, y + h * 0.78, w * 0.26, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.74, y + h * 0.76, w * 0.22, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // 两棵树（树干+树冠）
    ctx.fillStyle = 'rgba(132, 90, 52, 0.78)';
    roundRectPath(ctx, x + w * 0.17, y + h * 0.38, w * 0.024, h * 0.2, 4);
    ctx.fill();
    roundRectPath(ctx, x + w * 0.79, y + h * 0.35, w * 0.024, h * 0.22, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(109, 179, 94, 0.78)';
    ctx.beginPath();
    ctx.arc(x + w * 0.182, y + h * 0.34, w * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w * 0.802, y + h * 0.31, w * 0.065, 0, Math.PI * 2);
    ctx.fill();

    // 长椅
    ctx.fillStyle = 'rgba(60, 45, 30, 0.08)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.79, w * 0.22, h * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
    roundRectPath(ctx, x + w * 0.34, y + h * 0.67, w * 0.32, h * 0.035, 5);
    ctx.fillStyle = 'rgba(167, 120, 74, 0.8)';
    ctx.fill();
    roundRectPath(ctx, x + w * 0.36, y + h * 0.71, w * 0.28, h * 0.022, 4);
    ctx.fillStyle = 'rgba(144, 102, 62, 0.78)';
    ctx.fill();
  } else if (theme === 'work_focus') {
    // 书架（替代灰块）
    roundRectPath(ctx, x + w * 0.1, y + h * 0.2, w * 0.24, h * 0.18, 10);
    ctx.fillStyle = 'rgba(164, 186, 224, 0.7)';
    ctx.fill();
    roundRectPath(ctx, x + w * 0.66, y + h * 0.22, w * 0.22, h * 0.16, 10);
    ctx.fillStyle = 'rgba(158, 181, 220, 0.68)';
    ctx.fill();
    ctx.fillStyle = 'rgba(235, 243, 255, 0.6)';
    roundRectPath(ctx, x + w * 0.12, y + h * 0.22, w * 0.08, h * 0.03, 5);
    ctx.fill();
    roundRectPath(ctx, x + w * 0.69, y + h * 0.24, w * 0.08, h * 0.03, 5);
    ctx.fill();

    // 桌面
    ctx.fillStyle = 'rgba(60, 45, 30, 0.08)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.82, w * 0.24, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    roundRectPath(ctx, x + w * 0.15, y + h * 0.68, w * 0.7, h * 0.1, 10);
    ctx.fillStyle = 'rgba(170, 188, 220, 0.74)';
    ctx.fill();
    // 显示器
    roundRectPath(ctx, x + w * 0.42, y + h * 0.54, w * 0.16, h * 0.09, 7);
    ctx.fillStyle = 'rgba(103, 126, 168, 0.86)';
    ctx.fill();
    roundRectPath(ctx, x + w * 0.485, y + h * 0.63, w * 0.03, h * 0.04, 3);
    ctx.fillStyle = 'rgba(105, 127, 165, 0.7)';
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
    roundRectPath(ctx, x + w * 0.435, y + h * 0.555, w * 0.06, h * 0.02, 3);
    ctx.fill();
  } else if (theme === 'fitness_power') {
    ctx.strokeStyle = 'rgba(255, 126, 72, 0.24)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.86);
    ctx.lineTo(x + w * 0.8, y + h * 0.86);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 151, 90, 0.18)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.8, w * 0.28, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    // 光束改为柔和聚光（去掉硬块）
    const beam = Math.sin(tick * 0.04) * w * 0.01;
    const spot = ctx.createLinearGradient(x + w * 0.42 + beam, y + h * 0.1, x + w * 0.5, y + h * 0.72);
    spot.addColorStop(0, 'rgba(255, 183, 126, 0.42)');
    spot.addColorStop(1, 'rgba(255, 183, 126, 0.08)');
    ctx.fillStyle = spot;
    ctx.beginPath();
    ctx.moveTo(x + w * (0.36 + beam), y + h * 0.1);
    ctx.lineTo(x + w * (0.46 + beam), y + h * 0.1);
    ctx.lineTo(x + w * 0.57, y + h * 0.72);
    ctx.lineTo(x + w * 0.47, y + h * 0.72);
    ctx.closePath();
    ctx.fill();

    // 哑铃造型
    ctx.fillStyle = 'rgba(60, 45, 30, 0.08)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.79, w * 0.24, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    roundRectPath(ctx, x + w * 0.24, y + h * 0.73, w * 0.52, h * 0.02, 4);
    ctx.fillStyle = 'rgba(185, 104, 62, 0.6)';
    ctx.fill();
    roundRectPath(ctx, x + w * 0.21, y + h * 0.715, w * 0.04, h * 0.05, 5);
    ctx.fillStyle = 'rgba(223, 126, 79, 0.74)';
    ctx.fill();
    roundRectPath(ctx, x + w * 0.75, y + h * 0.715, w * 0.04, h * 0.05, 5);
    ctx.fillStyle = 'rgba(223, 126, 79, 0.74)';
    ctx.fill();
  } else if (theme === 'read_focus') {
    // 书架
    roundRectPath(ctx, x + w * 0.64, y + h * 0.22, w * 0.18, h * 0.18, 8);
    ctx.fillStyle = 'rgba(177, 145, 105, 0.72)';
    ctx.fill();
    ctx.fillStyle = 'rgba(230, 209, 173, 0.68)';
    roundRectPath(ctx, x + w * 0.66, y + h * 0.25, w * 0.04, h * 0.11, 4);
    ctx.fill();
    roundRectPath(ctx, x + w * 0.71, y + h * 0.25, w * 0.04, h * 0.11, 4);
    ctx.fill();

    ctx.fillStyle = 'rgba(60, 45, 30, 0.08)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.8, w * 0.22, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    roundRectPath(ctx, x + w * 0.18, y + h * 0.7, w * 0.64, h * 0.08, 9); // 桌面
    ctx.fillStyle = 'rgba(176, 141, 95, 0.62)';
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 224, 171, 0.34)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.28, y + h * 0.28, w * 0.18, h * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    roundRectPath(ctx, x + w * 0.62, y + h * 0.24, w * 0.12, h * 0.2, 6); // 书脊
    ctx.fillStyle = 'rgba(193, 164, 122, 0.62)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 117, 75, 0.55)';
    ctx.lineWidth = 1.2;
    roundRectPath(ctx, x + w * 0.62, y + h * 0.24, w * 0.12, h * 0.2, 6);
    ctx.stroke();
  } else if (theme === 'eat_vitality') {
    // 餐桌与果盘
    ctx.fillStyle = 'rgba(60, 45, 30, 0.08)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.81, w * 0.22, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    roundRectPath(ctx, x + w * 0.3, y + h * 0.71, w * 0.4, h * 0.04, 6);
    ctx.fillStyle = 'rgba(189, 155, 108, 0.72)';
    ctx.fill();
    ctx.fillStyle = 'rgba(154, 210, 108, 0.42)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.76, w * 0.34, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 199, 120, 0.5)';
    ctx.beginPath();
    ctx.arc(x + w * 0.32, y + h * 0.3, w * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(246, 145, 106, 0.46)';
    ctx.beginPath();
    ctx.arc(x + w * 0.68, y + h * 0.34, w * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }

  // 前景暗角，进一步拉开景深
  const vignette = ctx.createRadialGradient(
    x + w * 0.5, y + h * 0.75, w * 0.08,
    x + w * 0.5, y + h * 0.75, w * 0.75
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(88, 60, 34, 0.07)');
  ctx.fillStyle = vignette;
  ctx.fillRect(x, y, w, h);
}

module.exports = {
  drawScene,
};

