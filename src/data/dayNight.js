export const DAY_NIGHT_CONFIG = {
  dayDurationSeconds: 240,
  nightDurationSeconds: 120,
  transitionDurationSeconds: 30,
  warningSeconds: 30,
  dawnHour: 6,
  duskHour: 18,
  warningTone: {
    frequency: 440,
    secondFrequency: 330,
    duration: 0.18,
    volume: 0.08
  }
};

export const DAY_NIGHT_TOTAL_SECONDS =
  DAY_NIGHT_CONFIG.dayDurationSeconds + DAY_NIGHT_CONFIG.nightDurationSeconds;
