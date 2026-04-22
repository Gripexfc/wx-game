class PetPoseController {
  constructor() {
    this.activePose = 'idle';
    this.poseExpiresAt = 0;
  }

  onThemeChanged(theme, source, nowMs) {
    if (source === 'task') {
      if (theme === 'fitness_power') this.setPose('fitness_showoff', nowMs + 8000);
      else if (theme === 'read_focus') this.setPose('read_focus', nowMs + 8000);
      else if (theme === 'eat_vitality') this.setPose('eat_vitality', nowMs + 8000);
      return;
    }
    if (nowMs >= this.poseExpiresAt) this.activePose = 'idle';
  }

  setPose(pose, expireAt) {
    this.activePose = pose || 'idle';
    this.poseExpiresAt = expireAt || 0;
  }

  update(nowMs) {
    if (this.activePose !== 'idle' && nowMs >= this.poseExpiresAt) {
      this.activePose = 'idle';
    }
  }

  getPose() {
    return this.activePose;
  }
}

module.exports = PetPoseController;

