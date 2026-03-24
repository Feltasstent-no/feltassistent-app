/*
  # Seed Data - Feltfigurer
  
  Legger inn eksempel feltfigurer med SVG-data.
  Figurene er forenklet og representerer typiske DFS-feltfigurer.
*/

-- FELTFIGURER
INSERT INTO field_figures (code, name, description, svg_data, category, difficulty, is_active) VALUES
  (
    'elk_standing',
    'Elg stående',
    'Elgfigur i stående stilling',
    '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="40" width="120" height="80" fill="#8B4513" rx="10"/><circle cx="140" cy="60" r="15" fill="#654321"/><path d="M 145 50 Q 155 45 160 50 Q 165 55 155 60 Z" fill="#654321"/><path d="M 145 70 Q 155 75 160 70 Q 165 65 155 60 Z" fill="#654321"/><rect x="50" y="120" width="15" height="40" fill="#8B4513"/><rect x="85" y="120" width="15" height="40" fill="#8B4513"/><rect x="100" y="120" width="15" height="40" fill="#8B4513"/><rect x="135" y="120" width="15" height="40" fill="#8B4513"/><circle cx="100" cy="80" r="20" fill="#FFD700" stroke="#000" stroke-width="2"/><text x="100" y="88" text-anchor="middle" font-size="20" font-weight="bold">10</text></svg>',
    'dyr',
    3,
    true
  ),
  (
    'deer_standing',
    'Hjort stående',
    'Hjortfigur i stående stilling',
    '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="50" y="50" width="100" height="70" fill="#A0522D" rx="8"/><circle cx="130" cy="70" r="12" fill="#8B4513"/><path d="M 135 60 Q 145 55 148 58" stroke="#654321" stroke-width="3" fill="none"/><path d="M 135 80 Q 145 85 148 82" stroke="#654321" stroke-width="3" fill="none"/><rect x="60" y="120" width="12" height="35" fill="#A0522D"/><rect x="88" y="120" width="12" height="35" fill="#A0522D"/><rect x="100" y="120" width="12" height="35" fill="#A0522D"/><rect x="128" y="120" width="12" height="35" fill="#A0522D"/><circle cx="100" cy="85" r="18" fill="#FFD700" stroke="#000" stroke-width="2"/><text x="100" y="92" text-anchor="middle" font-size="18" font-weight="bold">10</text></svg>',
    'dyr',
    2,
    true
  ),
  (
    'circular_target',
    'Rund feltskive',
    'Standard rund feltskive',
    '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="80" fill="#FFE4B5" stroke="#000" stroke-width="2"/><circle cx="100" cy="100" r="60" fill="#FFF" stroke="#000" stroke-width="2"/><circle cx="100" cy="100" r="40" fill="#FFD700" stroke="#000" stroke-width="2"/><circle cx="100" cy="100" r="20" fill="#FFA500" stroke="#000" stroke-width="2"/><circle cx="100" cy="100" r="10" fill="#FF4500" stroke="#000" stroke-width="2"/><text x="100" y="107" text-anchor="middle" font-size="14" font-weight="bold" fill="#FFF">10</text></svg>',
    'skive',
    1,
    true
  ),
  (
    'boar_standing',
    'Villsvin stående',
    'Villsvinfigur i stående stilling',
    '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="45" y="55" width="110" height="65" fill="#4A4A4A" rx="12"/><circle cx="135" cy="75" r="13" fill="#333"/><rect x="55" y="120" width="14" height="35" fill="#4A4A4A"/><rect x="83" y="120" width="14" height="35" fill="#4A4A4A"/><rect x="103" y="120" width="14" height="35" fill="#4A4A4A"/><rect x="131" y="120" width="14" height="35" fill="#4A4A4A"/><circle cx="100" cy="87" r="19" fill="#FFD700" stroke="#000" stroke-width="2"/><text x="100" y="95" text-anchor="middle" font-size="19" font-weight="bold">10</text></svg>',
    'dyr',
    3,
    true
  ),
  (
    'fox_sitting',
    'Rev sittende',
    'Revfigur i sittende stilling',
    '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><path d="M 70 100 Q 70 70 90 70 L 110 70 Q 130 70 130 100 L 130 140 Q 130 150 120 150 L 80 150 Q 70 150 70 140 Z" fill="#FF8C00"/><circle cx="110" cy="85" r="10" fill="#FFA500"/><path d="M 108 82 L 112 82 L 110 88 Z" fill="#654321"/><rect x="75" y="150" width="12" height="20" fill="#FF8C00"/><rect x="113" y="150" width="12" height="20" fill="#FF8C00"/><circle cx="100" cy="115" r="16" fill="#FFD700" stroke="#000" stroke-width="2"/><text x="100" y="122" text-anchor="middle" font-size="16" font-weight="bold">10</text></svg>',
    'dyr',
    2,
    true
  ),
  (
    'hare_running',
    'Hare løpende',
    'Harefigur i løpende stilling',
    '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><ellipse cx="90" cy="110" rx="40" ry="25" fill="#D2691E"/><circle cx="70" cy="105" r="15" fill="#BC8F8F"/><ellipse cx="65" cy="95" rx="5" ry="12" fill="#BC8F8F"/><ellipse cx="75" cy="93" rx="5" ry="12" fill="#BC8F8F"/><rect x="55" y="125" width="8" height="20" fill="#D2691E" transform="rotate(-20 59 135)"/><rect x="80" y="125" width="8" height="20" fill="#D2691E" transform="rotate(10 84 135)"/><rect x="105" y="125" width="8" height="20" fill="#D2691E" transform="rotate(-15 109 135)"/><rect x="120" y="125" width="8" height="20" fill="#D2691E" transform="rotate(5 124 135)"/><circle cx="85" cy="110" r="14" fill="#FFD700" stroke="#000" stroke-width="2"/><text x="85" y="116" text-anchor="middle" font-size="14" font-weight="bold">10</text></svg>',
    'dyr',
    4,
    true
  )
ON CONFLICT (code) DO NOTHING;