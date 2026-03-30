const STORAGE_KEY = 'dfs-user-preferences';

export type AssistanceMode = 'minimal' | 'standard' | 'guided';

interface UserPreferences {
  lastShooterClassId?: string;
  lastShooterClassCode?: string;
  lastTrainingLocation?: string;
  assistanceMode?: AssistanceMode;
  lastBallisticDefaults?: {
    sight_height_mm?: string;
    sight_radius_cm?: string;
    front_sight_height_mm?: string;
    sight_type?: string;
    weapon_id?: string;
    barrel_id?: string;
  };
}

function load(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(prefs: UserPreferences) {
  try {
    const existing = load();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...prefs }));
  } catch {
    // localStorage unavailable
  }
}

export function getLastShooterClassId(): string | undefined {
  return load().lastShooterClassId;
}

export function setLastShooterClassId(id: string) {
  save({ lastShooterClassId: id });
}

export function getLastBallisticDefaults() {
  return load().lastBallisticDefaults;
}

export function setLastBallisticDefaults(defaults: UserPreferences['lastBallisticDefaults']) {
  save({ lastBallisticDefaults: defaults });
}

export function getLastShooterClassCode(): string | undefined {
  return load().lastShooterClassCode;
}

export function setLastShooterClassCode(code: string) {
  save({ lastShooterClassCode: code });
}

export function getLastTrainingLocation(): string | undefined {
  return load().lastTrainingLocation;
}

export function setLastTrainingLocation(location: string) {
  save({ lastTrainingLocation: location });
}

export function getAssistanceMode(): AssistanceMode {
  return load().assistanceMode || 'standard';
}

export function setAssistanceMode(mode: AssistanceMode) {
  save({ assistanceMode: mode });
}
