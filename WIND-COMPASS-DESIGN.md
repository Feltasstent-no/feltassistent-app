# Wind Compass Design Documentation

## Visual Design

### Component Structure
```
┌─────────────────────────┐
│   Wind Compass (SVG)    │
│                         │
│         ↑ N             │
│         │               │
│    ←────●────→          │  ● = Center (shooter)
│         │               │  Blue arrow = Wind direction (where wind comes FROM)
│         ↓ S             │  Red arrow = Correction (where to aim)
│                         │
│   Text Labels Below     │
└─────────────────────────┘
```

## Wind Angle Mapping

```
        0° (Bakfra)
           ↓
           |
270° ←─────●─────→ 90°
(Venstre)  |    (Høyre)
           ↑
       180° (Forfra)
```

## Test Cases

### Test 1: Full Crosswind from Left (270°)
```
Input: windAngleDeg = 270, windSpeedMs = 10
Expected:
  - Blue arrow: Points from LEFT to center (wind coming from left)
  - Red arrow: Points from center to RIGHT (aim correction to right)
  - Label: "Venstre"
  - Effective crosswind: 10.0 m/s
```

### Test 2: Full Crosswind from Right (90°)
```
Input: windAngleDeg = 90, windSpeedMs = 10
Expected:
  - Blue arrow: Points from RIGHT to center (wind coming from right)
  - Red arrow: Points from center to LEFT (aim correction to left)
  - Label: "Høyre"
  - Effective crosswind: 10.0 m/s
```

### Test 3: Tailwind (0°)
```
Input: windAngleDeg = 0, windSpeedMs = 10
Expected:
  - Blue arrow: Points from BOTTOM to center (wind from behind)
  - Red arrow: NOT shown (no lateral correction needed)
  - Label: "Bakfra"
  - Effective crosswind: 0.0 m/s
```

### Test 4: Headwind (180°)
```
Input: windAngleDeg = 180, windSpeedMs = 10
Expected:
  - Blue arrow: Points from TOP to center (wind from front)
  - Red arrow: NOT shown (no lateral correction needed)
  - Label: "Forfra"
  - Effective crosswind: 0.0 m/s
```

### Test 5: Diagonal Wind (45°)
```
Input: windAngleDeg = 45, windSpeedMs = 10
Expected:
  - Blue arrow: Points from top-right to center
  - Red arrow: Points from center to bottom-left
  - Label: "Bakfra høyre"
  - Effective crosswind: ~7.1 m/s (10 * sin(45°))
```

## Math Formulas

### Effective Crosswind
```typescript
effective_crosswind = windSpeedMs * |sin(windAngleDeg)|
```

### Arrow Coordinates
```typescript
// Wind arrow (pointing INTO center)
windArrowX = center + sin(windAngleRad) * arrowLength
windArrowY = center - cos(windAngleRad) * arrowLength

// Correction arrow (pointing OUT from center)
correctionAngleRad = windAngleRad + π (180° opposite)
correctionArrowX = center + sin(correctionAngleRad) * arrowLength
correctionArrowY = center - cos(correctionAngleRad) * arrowLength
```

### Direction Labels
```
0° - 22.5°:      "Bakfra"
22.5° - 67.5°:   "Bakfra høyre"
67.5° - 112.5°:  "Høyre"
112.5° - 157.5°: "Forfra høyre"
157.5° - 202.5°: "Forfra"
202.5° - 247.5°: "Forfra venstre"
247.5° - 292.5°: "Venstre"
292.5° - 337.5°: "Bakfra venstre"
337.5° - 360°:   "Bakfra"
```

## Color Scheme
- **Blue (#3b82f6)**: Wind direction arrow (input)
- **Red (#ef4444)**: Correction arrow (output/action)
- **Gray (#9ca3af)**: Compass cardinal markers
- **Light Gray (#e5e7eb)**: Circle border

## UX Features
1. **Minimal UI**: Only shows essential information
2. **Mobile-friendly**: Touch-safe, appropriate sizing
3. **Contextual**: Red correction arrow only shows for significant crosswind (>0.5 m/s)
4. **Legend**: Clear color-coded labels below compass
5. **Precise values**: Shows both total wind and effective crosswind

## Integration Points
- Used in: `ShotRecommendationDisplay` component
- Placement: Below wind correction card, above notes
- Size: 140px (configurable)
- Responsive: Centers in container
