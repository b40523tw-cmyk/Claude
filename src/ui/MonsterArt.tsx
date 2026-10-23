/**
 * Hand-drawn-ish monster portraits. Cute shapes, thick ink outline,
 * and one detail per monster that is slightly wrong.
 */
const INK = '#2a2230';
const S = { stroke: INK, strokeWidth: 5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

function Eye({ x, y, r = 9, look = 0 }: { x: number; y: number; r?: number; look?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#fffaf0" {...S} strokeWidth={4} />
      <circle cx={x + look} cy={y + 1} r={r * 0.45} fill={INK} />
      <circle cx={x + look - r * 0.2} cy={y - r * 0.2} r={r * 0.15} fill="#fff" />
    </g>
  );
}

function Grin({ x, y, w, teeth = 6 }: { x: number; y: number; w: number; teeth?: number }) {
  const step = w / teeth;
  return (
    <g>
      <path d={`M${x - w / 2} ${y} Q${x} ${y + w * 0.55} ${x + w / 2} ${y} Z`} fill="#5a1f2b" {...S} strokeWidth={4} />
      {Array.from({ length: teeth - 1 }, (_, i) => (
        <path key={i} d={`M${x - w / 2 + step * (i + 0.6)} ${y + 1} l${step * 0.4} ${7} l${step * 0.4} -7`} fill="#fffaf0" stroke={INK} strokeWidth={1.5} />
      ))}
    </g>
  );
}

const art: Record<string, () => preact.JSX.Element> = {
  rent: () => (
    <g>
      <rect x="128" y="34" width="20" height="40" fill="#b5513f" {...S} />
      <text x="138" y="26" font-size="22" text-anchor="middle" fill="#f2c14e" font-weight="bold">%</text>
      <path d="M40 98 L100 44 L160 98 Z" fill="#d9614f" {...S} />
      <rect x="52" y="94" width="96" height="84" rx="10" fill="#f3d9a4" {...S} />
      <Eye x={80} y={120} r={12} look={2} />
      <Eye x={120} y={120} r={12} look={-2} />
      <Grin x={100} y={146} w={58} teeth={9} />
      <path d="M150 150 l18 -16 m0 0 l-2 10 m2 -10 l-10 2" fill="none" {...S} strokeWidth={4} />
    </g>
  ),
  phone: () => (
    <g>
      <rect x="62" y="22" width="76" height="150" rx="16" fill="#3b3f58" {...S} />
      <rect x="70" y="38" width="60" height="118" rx="8" fill="#9fe3ff" stroke={INK} strokeWidth={3} />
      <circle cx="80" cy="30" r="5" fill={INK} />
      <circle cx="92" cy="30" r="5" fill={INK} />
      <circle cx="104" cy="30" r="5" fill="#e2574c" />
      <Eye x={88} y={84} r={10} />
      <Eye x={113} y={84} r={10} />
      <path d="M84 118 Q100 132 116 118" fill="none" {...S} strokeWidth={4} />
      <text x="100" y="148" font-size="11" text-anchor="middle" fill={INK}>NEW</text>
      <path d="M78 172 v14 M122 172 v14" {...S} />
    </g>
  ),
  card: () => (
    <g>
      <path d="M50 20 H132 L152 40 V160 H50 Z" fill="#fbf4e4" {...S} />
      <path d="M132 20 V40 H152" fill="#e9dcc0" {...S} strokeWidth={4} />
      <text x="78" y="82" font-size="30" text-anchor="middle" fill="#2f8f5b" font-weight="bold">$</text>
      <text x="122" y="82" font-size="30" text-anchor="middle" fill="#2f8f5b" font-weight="bold">$</text>
      <path d="M64 46 h40 M64 56 h28" stroke="#b9ab8e" strokeWidth={4} strokeLinecap="round" />
      <path d="M78 104 Q100 118 122 104" fill="#5a1f2b" {...S} strokeWidth={4} />
      <path d="M92 110 h16 v62 l-4 4 l-4 -4 l-4 4 l-4 -4 Z" fill="#fbf4e4" {...S} strokeWidth={3} />
      <path d="M96 124 h8 M96 134 h8 M96 144 h8 M96 154 h8" stroke="#b9ab8e" strokeWidth={2} />
    </g>
  ),
  sub: () => (
    <g>
      <path d="M100 70 L30 50 Q38 90 22 118 Q50 104 66 118 Z" fill="#6c4a9e" {...S} />
      <path d="M100 70 L170 50 Q162 90 178 118 Q150 104 134 118 Z" fill="#6c4a9e" {...S} />
      <ellipse cx="100" cy="110" rx="48" ry="52" fill="#8e6bc4" {...S} />
      <circle cx="100" cy="76" r="13" fill="#e2574c" {...S} strokeWidth={3} />
      <path d="M96 70 l9 6 l-9 6 Z" fill="#fff" />
      <Eye x={82} y={106} r={9} look={1} />
      <Eye x={118} y={106} r={9} look={-1} />
      <path d="M84 132 Q100 140 116 132" fill="none" {...S} strokeWidth={4} />
      <path d="M90 134 l3 10 l3 -9 M104 135 l3 9 l3 -10" fill="#fff" stroke={INK} strokeWidth={2} />
    </g>
  ),
  scam: () => (
    <g>
      <path d="M150 150 C 190 160 180 190 150 186" fill="none" stroke={INK} strokeWidth={4} strokeDasharray="2 6" />
      <path d="M40 160 L56 90 H144 L160 160 Z" fill="#d9483b" {...S} />
      <path d="M30 76 Q100 30 170 76 L158 92 Q100 60 42 92 Z" fill="#b6362b" {...S} />
      <circle cx="100" cy="122" r="26" fill="#f6ecd9" {...S} strokeWidth={4} />
      <path d="M84 112 a6 6 0 1 1 6 6 a3 3 0 1 1 -3 -3" fill="none" stroke={INK} strokeWidth={3} />
      <path d="M112 112 a6 6 0 1 1 6 6 a3 3 0 1 1 -3 -3" fill="none" stroke={INK} strokeWidth={3} />
      <path d="M86 132 Q100 144 114 132" fill="none" {...S} strokeWidth={3.5} />
    </g>
  ),
  boss_evil: () => (
    <g>
      <ellipse cx="100" cy="122" rx="62" ry="58" fill="#3f4561" {...S} />
      <path d="M70 70 L100 104 L130 70" fill="#fffaf0" {...S} strokeWidth={4} />
      <path d="M94 96 L100 150 L106 96 Z" fill="#e2574c" {...S} strokeWidth={3} />
      <circle cx="100" cy="60" r="38" fill="#f3c9a0" {...S} />
      <path d="M68 46 Q100 18 132 46" fill="#5b4636" {...S} strokeWidth={4} />
      <circle cx="86" cy="58" r="3.5" fill={INK} />
      <circle cx="114" cy="58" r="3.5" fill={INK} />
      <Grin x={100} y={72} w={44} teeth={8} />
      <circle cx="160" cy="132" r="16" fill="#fffaf0" {...S} strokeWidth={4} />
      <path d="M160 122 v10 l8 4" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
    </g>
  ),
  nightmarket: () => (
    <g>
      <path d="M100 10 v18" {...S} />
      <ellipse cx="100" cy="94" rx="58" ry="66" fill="#e8553f" {...S} />
      <path d="M58 52 Q100 66 142 52 M48 94 Q100 108 152 94 M58 136 Q100 150 142 136" fill="none" stroke="#b33a2a" strokeWidth={4} />
      <rect x="76" y="26" width="48" height="10" rx="4" fill="#f2c14e" {...S} strokeWidth={4} />
      <rect x="76" y="152" width="48" height="10" rx="4" fill="#f2c14e" {...S} strokeWidth={4} />
      <Eye x={78} y={84} r={10} />
      <Eye x={122} y={84} r={10} />
      <Eye x={100} y={62} r={7} />
      <Grin x={100} y={112} w={46} teeth={7} />
      <path d="M86 162 v24 M100 162 v28 M114 162 v24" stroke="#f2c14e" strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  impulse: () => (
    <g>
      <path d="M76 70 Q76 40 100 40 Q124 40 124 70" fill="none" {...S} />
      <path d="M56 70 H144 L150 170 H50 Z" fill="#f29ab6" {...S} />
      <Eye x={84} y={108} r={10} look={3} />
      <Eye x={116} y={108} r={10} look={3} />
      <path d="M90 136 Q100 146 110 136 Q104 158 96 150" fill="#e2574c" {...S} strokeWidth={3} />
    </g>
  ),
  studentloan: () => (
    <g>
      <ellipse cx="100" cy="124" rx="66" ry="58" fill="#7fb07a" {...S} />
      <path d="M40 54 L100 30 L160 54 L100 78 Z" fill="#2f2b3d" {...S} />
      <path d="M72 66 v18 Q100 96 128 84 v-18" fill="#2f2b3d" {...S} strokeWidth={4} />
      <path d="M150 58 v36" stroke="#f2c14e" strokeWidth={4} />
      <circle cx="150" cy="98" r="5" fill="#f2c14e" />
      <Eye x={80} y={116} r={11} />
      <Eye x={120} y={116} r={11} />
      <path d="M68 128 q12 8 24 0 M108 128 q12 8 24 0" fill="none" stroke="#4d7a49" strokeWidth={3} />
      <path d="M84 150 Q100 142 116 150" fill="none" {...S} strokeWidth={4} />
      <path d="M150 150 l18 10 l-6 6 l14 8" fill="none" stroke="#9aa0ad" strokeWidth={5} strokeLinecap="round" strokeDasharray="6 4" />
    </g>
  ),
  revolving: () => (
    <g>
      <path d="M40 170 Q10 120 50 92 Q90 64 120 96 Q150 128 176 104" fill="none" stroke={INK} strokeWidth={34} strokeLinecap="round" />
      <path d="M40 170 Q10 120 50 92 Q90 64 120 96 Q150 128 176 104" fill="none" stroke="#c0392b" strokeWidth={24} strokeLinecap="round" />
      <path d="M40 170 Q10 120 50 92 Q90 64 120 96 Q150 128 176 104" fill="none" stroke="#e86a5a" strokeWidth={6} strokeDasharray="4 14" />
      <rect x="34" y="166" width="22" height="16" fill="#fbf4e4" {...S} strokeWidth={3} transform="rotate(-20 45 174)" />
      <rect x="20" y="182" width="22" height="14" fill="#fbf4e4" {...S} strokeWidth={3} transform="rotate(10 31 189)" />
      <circle cx="150" cy="58" r="40" fill="#e05a48" {...S} />
      <path d="M118 30 l-8 -18 l18 10 M182 30 l8 -18 l-18 10" fill="#e05a48" {...S} strokeWidth={4} />
      <circle cx="136" cy="54" r="9" fill="#ffe27a" {...S} strokeWidth={3} />
      <circle cx="164" cy="54" r="9" fill="#ffe27a" {...S} strokeWidth={3} />
      <path d="M136 50 v8 M164 50 v8" stroke={INK} strokeWidth={3} />
      <Grin x={150} y={74} w={40} teeth={6} />
      <text x="150" y="112" font-size="16" text-anchor="middle" fill="#ffe27a" font-weight="bold">15%</text>
    </g>
  ),
  minpay: () => (
    <g>
      <rect x="46" y="62" width="108" height="76" rx="6" fill="#fbf4e4" {...S} />
      <path d="M46 66 L100 106 L154 66" fill="none" {...S} strokeWidth={4} />
      <Eye x={84} y={118} r={7} />
      <Eye x={116} y={118} r={7} />
      <path d="M92 130 Q100 126 108 130" fill="none" {...S} strokeWidth={3} />
      <text x="140" y="56" font-size="14" fill="#e2574c" font-weight="bold">MIN</text>
    </g>
  ),
};

export function MonsterArt({ id, size = 140 }: { id: string; size?: number }) {
  const draw = art[id];
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true" class="monster-art">
      <ellipse cx="100" cy="190" rx="56" ry="8" fill="rgba(0,0,0,.28)" />
      {draw ? draw() : <circle cx="100" cy="100" r="60" fill="#888" {...S} />}
    </svg>
  );
}

export function Silhouette({ id, size = 80 }: { id: string; size?: number }) {
  return (
    <div class="silhouette" style={{ width: size, height: size }}>
      <MonsterArt id={id} size={size} />
    </div>
  );
}
