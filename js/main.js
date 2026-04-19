import './render';

const Lulu = require('./Lulu');
const TaskManager = require('./TaskManager');
const GrowthSystem = require('./GrowthSystem');
const Storage = require('./Storage');
const HomePage = require('./ui/HomePage');
const TaskPage = require('./ui/TaskPage');
const GalleryPage = require('./ui/GalleryPage');

class Game {
  constructor() {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // 初始化组件
    this.storage = new Storage();
    this.lulu = new Lulu();
    this.taskManager = new TaskManager();
    this.growth = new GrowthSystem();

    // UI 页面
    this.homePage = new HomePage(this);
    this.taskPage = new TaskPage(this);
    this.galleryPage = new GalleryPage(this);
    this.currentPage = 'home';

    // 加载存档
    this.loadData();

    // 设置页面
    this.homePage.setLulu(this.lulu);

    // 触摸事件
    this.setupTouchHandlers();

    // 启动游戏循环
    this.loop();
  }

  setupTouchHandlers() {
    wx.onTouchStart((res) => {
      if (res.touches.length > 0) {
        const touch = res.touches[0];
        this.handleClick(touch.clientX, touch.clientY);
      }
    });
  }

  handleClick(x, y) {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    switch (this.currentPage) {
      case 'home':
        if (this.homePage.handleClick(x, y, canvasWidth, canvasHeight)) return;
        break;
      case 'tasks':
        if (this.taskPage.handleClick(x, y)) return;
        break;
      case 'gallery':
        if (this.galleryPage.handleClick(x, y, canvasWidth, canvasHeight)) return;
        break;
    }
  }

  loadData() {
    // 加载噜噜数据
    const luluData = this.storage.get('lulu_data');
    if (luluData) {
      this.lulu.level = luluData.level || 1;
      this.lulu.xp = luluData.xp || 0;
    }

    // 加载任务数据
    const taskData = this.storage.get('task_data');
    if (taskData) {
      this.taskManager.deserialize(taskData);
    }
    this.taskManager.checkDailyReset();

    // 加载成长数据
    const growthData = this.storage.get('growth_data');
    if (growthData) {
      this.growth.deserialize(growthData);
    }
  }

  saveData() {
    this.storage.set('lulu_data', {
      level: this.lulu.level,
      xp: this.lulu.xp,
    });
    this.storage.set('task_data', this.taskManager.serialize());
    this.storage.set('growth_data', this.growth.serialize());
  }

  // 完成任务
  completeTask(taskId) {
    if (this.taskManager.completeTask(taskId)) {
      const taskXp = this.taskManager.getTodayTasks().find(t => t.id === taskId)?.xp || 0;
      const result = this.growth.addXp(taskXp);

      // 更新噜噜等级
      if (result.leveled) {
        this.lulu.level = result.newLevel;
      }

      this.saveData();
    }
  }

  // 噜噜互动
  onLuluInteraction() {
    // 互动反馈
    console.log('Lulu interaction!');
  }

  // 页面切换
  showHomePage() {
    this.currentPage = 'home';
  }

  showTaskPage() {
    this.currentPage = 'tasks';
  }

  showGalleryPage() {
    this.currentPage = 'gallery';
  }

  // 游戏循环
  loop() {
    this.update();
    this.render();
    wx.requestAnimationFrame(() => this.loop());
  }

  update() {
    if (this.currentPage === 'home') {
      this.lulu.update();
    }
  }

  render() {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    switch (this.currentPage) {
      case 'home':
        this.homePage.render(this.ctx, canvasWidth, canvasHeight);
        break;
      case 'tasks':
        this.taskPage.render(this.ctx, canvasWidth, canvasHeight);
        break;
      case 'gallery':
        this.galleryPage.render(this.ctx, canvasWidth, canvasHeight);
        break;
    }
  }
}

export default Game;