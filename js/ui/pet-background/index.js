const { ThemeEngine } = require('./ThemeEngine');
const { drawScene } = require('./SceneRenderer');
const ParticleSystem = require('./ParticleSystem');
const PetPoseController = require('./PetPoseController');

function getThemeTint(theme) {
  if (theme === 'fitness_power') return [255, 154, 92];
  if (theme === 'read_focus') return [206, 170, 120];
  if (theme === 'eat_vitality') return [146, 207, 120];
  if (theme === 'park_breeze') return [148, 206, 156];
  if (theme === 'work_focus') return [160, 184, 220];
  return [255, 205, 130];
}

class PetBackgroundSystem {
  constructor() {
    this.tick = 0;
    this.themeEngine = new ThemeEngine();
    this.particleSystem = new ParticleSystem();
    this.poseController = new PetPoseController();
    this.lastTheme = 'home_cozy';
  }

  onPetTap() {
    this.particleSystem.onPetTap();
  }

  onGoalCompleted(goal, visualFx) {
    const nowMs = Date.now();
    this.themeEngine.onGoalCompleted(goal, nowMs);
    this.particleSystem.onGoalCompleted(visualFx);
  }

  update(context, rect) {
    this.tick += 1;
    const nowMs = Date.now();
    this.themeEngine.update(context.moodValue, nowMs);
    const state = this.themeEngine.getState();
    if (state.activeTheme !== this.lastTheme || state.source === 'task') {
      this.poseController.onThemeChanged(state.activeTheme, state.source, nowMs);
      this.lastTheme = state.activeTheme;
    }
    this.poseController.update(nowMs);
    this.particleSystem.update(this.tick, rect);
  }

  draw(ctx, rect, context) {
    this.update(context, rect);
    const state = this.themeEngine.getState();
    drawScene(ctx, rect, state.activeTheme, this.tick);
    this.particleSystem.draw(ctx, rect, getThemeTint(state.activeTheme));
  }

  getPose() {
    return this.poseController.getPose();
  }
}

module.exports = {
  PetBackgroundSystem,
};

