import { DAY_NIGHT_CONFIG, DAY_NIGHT_TOTAL_SECONDS } from '../data/dayNight.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (value) => value * value * (3 - 2 * value);

export function migrateLegacyDayTime(dayTime = 0) {
  const normalized = ((dayTime % 1) + 1) % 1;
  const legacyHour = normalized * 24;
  const { dayDurationSeconds, nightDurationSeconds, dawnHour, duskHour } = DAY_NIGHT_CONFIG;
  const dayHours = duskHour - dawnHour;
  if (legacyHour >= dawnHour && legacyHour < duskHour) {
    return ((legacyHour - dawnHour) / dayHours) * dayDurationSeconds;
  }
  const nightHour = legacyHour < dawnHour ? legacyHour + 24 : legacyHour;
  const nightProgress = (nightHour - duskHour) / (24 - dayHours);
  return dayDurationSeconds + nightProgress * nightDurationSeconds;
}

export class DayNightCycle {
  constructor(saved = {}) {
    const savedTime = Number(saved.cycleTime);
    this.cycleTime = Number.isFinite(savedTime)
      ? clamp(savedTime, 0, DAY_NIGHT_TOTAL_SECONDS - 0.001)
      : migrateLegacyDayTime(saved.dayTime ?? (8 / 24));
    this.dayCount = Math.max(1, Number(saved.dayCount) || 1);
    this.rolledOver = false;
  }

  update(delta) {
    this.rolledOver = false;
    this.cycleTime += Math.max(0, delta) / 1000;
    while (this.cycleTime >= DAY_NIGHT_TOTAL_SECONDS) {
      this.cycleTime -= DAY_NIGHT_TOTAL_SECONDS;
      this.dayCount += 1;
      this.rolledOver = true;
    }
    return this.getState();
  }

  advanceGameMinutes(minutes = 0) {
    const gameMinutes = Math.max(0, Number(minutes) || 0);
    const minutesPerRealSecond = (DAY_NIGHT_CONFIG.duskHour - DAY_NIGHT_CONFIG.dawnHour) * 60 /
      DAY_NIGHT_CONFIG.dayDurationSeconds;
    this.cycleTime += gameMinutes / minutesPerRealSecond;
    while (this.cycleTime >= DAY_NIGHT_TOTAL_SECONDS) {
      this.cycleTime -= DAY_NIGHT_TOTAL_SECONDS;
      this.dayCount += 1;
      this.rolledOver = true;
    }
    return this.getState();
  }

  skipToNextDay() {
    this.cycleTime = 0;
    this.dayCount += 1;
    this.rolledOver = true;
    return this.getState();
  }

  skipNight() {
    const state = this.getState();
    if (state.phase !== 'night' && state.phase !== 'dawn') return false;
    this.cycleTime = 0;
    this.dayCount += 1;
    this.rolledOver = true;
    return true;
  }

  getState() {
    const {
      dayDurationSeconds,
      nightDurationSeconds,
      transitionDurationSeconds,
      warningSeconds,
      dawnHour,
      duskHour
    } = DAY_NIGHT_CONFIG;
    const total = dayDurationSeconds + nightDurationSeconds;
    const duskStart = dayDurationSeconds - transitionDurationSeconds;
    const dawnStart = total - transitionDurationSeconds;

    let phase = 'day';
    let lightLevel = 0;
    if (this.cycleTime >= duskStart && this.cycleTime < dayDurationSeconds) {
      phase = 'dusk';
      lightLevel = smoothstep((this.cycleTime - duskStart) / transitionDurationSeconds);
    } else if (this.cycleTime >= dayDurationSeconds && this.cycleTime < dawnStart) {
      phase = 'night';
      lightLevel = 1;
    } else if (this.cycleTime >= dawnStart) {
      phase = 'dawn';
      lightLevel = 1 - smoothstep((this.cycleTime - dawnStart) / transitionDurationSeconds);
    }

    const isNight = phase === 'night';
    const secondsUntilNight = phase === 'dusk'
      ? Math.max(0, Math.ceil(dayDurationSeconds - this.cycleTime))
      : null;
    const warningActive = secondsUntilNight !== null && secondsUntilNight <= warningSeconds;

    let hour;
    if (this.cycleTime < dayDurationSeconds) {
      hour = dawnHour + (this.cycleTime / dayDurationSeconds) * (duskHour - dawnHour);
    } else {
      hour = duskHour + ((this.cycleTime - dayDurationSeconds) / nightDurationSeconds) * (24 - (duskHour - dawnHour));
      if (hour >= 24) hour -= 24;
    }
    const hourValue = Math.floor(hour);
    const minuteValue = Math.floor((hour - hourValue) * 60);

    return {
      phase,
      isNight,
      lightLevel,
      hour: hourValue,
      minute: minuteValue,
      clock: `${String(hourValue).padStart(2, '0')}:${String(minuteValue).padStart(2, '0')}`,
      dayCount: this.dayCount,
      cycleTime: this.cycleTime,
      secondsUntilNight,
      warningActive,
      rolledOver: this.rolledOver
    };
  }
}
