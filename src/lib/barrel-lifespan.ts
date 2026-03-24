import { WeaponBarrel } from '../types/database';

export interface BarrelLifespanConfig {
  limit: number;
  thresholds: {
    green: number;
    yellow: number;
    orange: number;
  };
}

export const LIFESPAN_PROFILES: Record<string, BarrelLifespanConfig> = {
  field_ammo: {
    limit: 7500,
    thresholds: {
      green: 6000,
      yellow: 7000,
      orange: 7500,
    },
  },
  recruit_ammo: {
    limit: 12000,
    thresholds: {
      green: 9600,
      yellow: 11160,
      orange: 12000,
    },
  },
};

export interface BarrelHealthStatus {
  percentage: number;
  remaining: number;
  limit: number;
  status: string;
  statusColor: string;
  barColor: string;
  profileLabel: string;
}

export function getBarrelLifespanLimit(barrel: WeaponBarrel): number {
  if (barrel.ammo_lifespan_profile === 'custom' && barrel.custom_lifespan_limit) {
    return barrel.custom_lifespan_limit;
  }

  const profile = LIFESPAN_PROFILES[barrel.ammo_lifespan_profile];
  return profile?.limit || LIFESPAN_PROFILES.field_ammo.limit;
}

export function getBarrelHealthStatus(
  barrel: WeaponBarrel
): BarrelHealthStatus {
  const limit = getBarrelLifespanLimit(barrel);
  const shots = barrel.total_shots_fired;
  const percentage = (shots / limit) * 100;
  const remaining = Math.max(0, limit - shots);

  let status = '';
  let statusColor = '';
  let barColor = '';

  if (percentage < 80) {
    status = 'God status';
    statusColor = 'text-green-700';
    barColor = 'bg-green-500';
  } else if (percentage < 93) {
    status = 'Nærmer seg slitasjegrense';
    statusColor = 'text-yellow-700';
    barColor = 'bg-yellow-500';
  } else if (percentage < 100) {
    status = 'Bør følges opp';
    statusColor = 'text-orange-700';
    barColor = 'bg-orange-500';
  } else {
    status = 'Over veiledende levetid';
    statusColor = 'text-red-700';
    barColor = 'bg-red-500';
  }

  const profileLabels: Record<string, string> = {
    field_ammo: 'Feltammo',
    recruit_ammo: 'Rekruttammo',
    custom: 'Egendefinert',
  };

  const profileLabel = profileLabels[barrel.ammo_lifespan_profile] || 'Feltammo';

  return {
    percentage,
    remaining,
    limit,
    status,
    statusColor,
    barColor,
    profileLabel,
  };
}
