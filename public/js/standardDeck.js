// ============================================================
// standardDeck.js  —  初心者向けスタンダードデッキ
// カード9枚（コスト1×3 / コスト2×3 / コスト3×3）+ デッキ定義
// ============================================================

const _s = (svg) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

// カードアート SVG（120x90 / 4:3 に合わせた viewBox）
const ART = {
  slime: _s(`<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
<rect width="120" height="90" fill="#0d2a3a"/>
<ellipse cx="60" cy="80" rx="28" ry="5" fill="rgba(0,0,0,0.3)"/>
<path d="M32 58 Q28 38 42 24 Q60 10 78 24 Q92 38 88 58 Q80 74 60 74 Q40 74 32 58Z" fill="#22c55e"/>
<ellipse cx="52" cy="28" rx="9" ry="5" fill="rgba(255,255,255,0.25)" transform="rotate(-20 52 28)"/>
<circle cx="48" cy="50" r="8" fill="white"/>
<circle cx="72" cy="50" r="8" fill="white"/>
<circle cx="50" cy="52" r="4" fill="#0d2a3a"/>
<circle cx="74" cy="52" r="4" fill="#0d2a3a"/>
<circle cx="48" cy="48" r="2" fill="white"/>
<circle cx="72" cy="48" r="2" fill="white"/>
<path d="M50 63 Q60 70 70 63" stroke="#0d2a3a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<circle cx="18" cy="20" r="3" fill="#22c55e" opacity="0.5"/>
<circle cx="105" cy="15" r="2" fill="#22c55e" opacity="0.4"/>
</svg>`),

  chick: _s(`<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
<rect width="120" height="90" fill="#1a2a0a"/>
<ellipse cx="60" cy="82" rx="22" ry="4" fill="rgba(0,0,0,0.3)"/>
<ellipse cx="60" cy="64" rx="22" ry="20" fill="#fbbf24"/>
<ellipse cx="60" cy="40" rx="18" ry="17" fill="#fde68a"/>
<ellipse cx="52" cy="28" rx="7" ry="4.5" fill="rgba(255,255,255,0.3)" transform="rotate(-20 52 28)"/>
<circle cx="48" cy="38" r="6" fill="white"/>
<circle cx="72" cy="38" r="6" fill="white"/>
<circle cx="50" cy="40" r="3.5" fill="#1a2a0a"/>
<circle cx="74" cy="40" r="3.5" fill="#1a2a0a"/>
<circle cx="49" cy="38" r="1.5" fill="white"/>
<circle cx="73" cy="38" r="1.5" fill="white"/>
<path d="M54 48 L60 52 L66 48" fill="#f97316" stroke="#f97316" stroke-width="1"/>
<ellipse cx="36" cy="58" rx="10" ry="8" fill="#fbbf24"/>
<ellipse cx="84" cy="58" rx="10" ry="8" fill="#fbbf24"/>
<circle cx="28" cy="18" r="2.5" fill="#fbbf24" opacity="0.5"/>
<circle cx="98" cy="12" r="2" fill="#fbbf24" opacity="0.4"/>
</svg>`),

  leaf: _s(`<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
<rect width="120" height="90" fill="#0a1f0a"/>
<path d="M10 80 Q30 50 60 20 Q80 5 110 10 Q100 40 80 60 Q55 80 10 80Z" fill="#22c55e"/>
<path d="M10 80 Q30 50 60 20 Q80 5 110 10 Q100 40 80 60 Q55 80 10 80Z" fill="#16a34a" opacity="0.4"/>
<ellipse cx="62" cy="34" rx="16" ry="8" fill="rgba(255,255,255,0.2)" transform="rotate(-40 62 34)"/>
<line x1="60" y1="20" x2="30" y2="75" stroke="#15803d" stroke-width="2.5" stroke-linecap="round"/>
<line x1="45" y1="42" x2="75" y2="35" stroke="#15803d" stroke-width="1.5" stroke-linecap="round"/>
<line x1="38" y1="53" x2="65" y2="48" stroke="#15803d" stroke-width="1.5" stroke-linecap="round"/>
<line x1="32" y1="63" x2="56" y2="60" stroke="#15803d" stroke-width="1.5" stroke-linecap="round"/>
<path d="M90 55 Q100 45 108 55 Q100 65 90 55" fill="#4ade80" opacity="0.6"/>
<path d="M18 30 Q10 20 20 15 Q25 25 18 30" fill="#4ade80" opacity="0.5"/>
</svg>`),

  swordsman: _s(`<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
<rect width="120" height="90" fill="#1a1a2e"/>
<ellipse cx="60" cy="87" rx="20" ry="3" fill="rgba(0,0,0,0.4)"/>
<rect x="46" y="44" width="28" height="28" rx="4" fill="#4a80ff"/>
<ellipse cx="60" cy="36" rx="14" ry="14" fill="#fde68a"/>
<path d="M46 32 Q46 18 60 16 Q74 18 74 32Z" fill="#60a5fa"/>
<rect x="44" y="30" width="32" height="6" rx="2" fill="#3b82f6"/>
<circle cx="54" cy="36" r="2.5" fill="#1a1a2e"/>
<circle cx="66" cy="36" r="2.5" fill="#1a1a2e"/>
<rect x="78" y="10" width="5" height="52" rx="2" fill="#d4d4d8"/>
<rect x="70" y="38" width="22" height="5" rx="2" fill="#a1a1aa"/>
<rect x="79" y="6" width="4" height="8" rx="1" fill="#fbbf24"/>
<ellipse cx="38" cy="54" rx="10" ry="12" fill="#1d4ed8" stroke="#3b82f6" stroke-width="1.5"/>
<line x1="38" y1="42" x2="38" y2="66" stroke="#60a5fa" stroke-width="1.5"/>
<line x1="28" y1="54" x2="48" y2="54" stroke="#60a5fa" stroke-width="1.5"/>
<rect x="48" y="70" width="10" height="16" rx="3" fill="#1d4ed8"/>
<rect x="62" y="70" width="10" height="16" rx="3" fill="#1d4ed8"/>
</svg>`),

  wizard: _s(`<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
<rect width="120" height="90" fill="#1a0a2e"/>
<ellipse cx="60" cy="87" rx="18" ry="3" fill="rgba(0,0,0,0.4)"/>
<path d="M42 50 Q36 72 32 85 L88 85 Q84 72 78 50Z" fill="#7c3aed"/>
<rect x="46" y="44" width="28" height="16" rx="4" fill="#6d28d9"/>
<ellipse cx="60" cy="36" rx="13" ry="13" fill="#fde68a"/>
<path d="M42 28 L60 4 L78 28Z" fill="#4c1d95"/>
<rect x="38" y="26" width="44" height="6" rx="3" fill="#5b21b6"/>
<circle cx="60" cy="8" r="3" fill="#fbbf24"/>
<circle cx="54" cy="36" r="2" fill="#4c1d95"/>
<circle cx="66" cy="36" r="2" fill="#4c1d95"/>
<path d="M50 42 Q60 50 70 42" fill="#f3f4f6" opacity="0.7"/>
<rect x="82" y="30" width="4" height="55" rx="2" fill="#92400e"/>
<circle cx="84" cy="26" r="8" fill="#fbbf24" opacity="0.9"/>
<circle cx="84" cy="26" r="5" fill="#f59e0b"/>
<circle cx="96" cy="18" r="2.5" fill="#a78bfa" opacity="0.8"/>
<circle cx="100" cy="10" r="1.5" fill="#c4b5fd" opacity="0.7"/>
<circle cx="108" cy="20" r="2" fill="#a78bfa" opacity="0.6"/>
<circle cx="20" cy="15" r="2" fill="#a78bfa" opacity="0.6"/>
<circle cx="14" cy="25" r="1.5" fill="#c4b5fd" opacity="0.5"/>
</svg>`),

  shield: _s(`<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
<rect width="120" height="90" fill="#1a1a0a"/>
<ellipse cx="60" cy="87" rx="20" ry="3" fill="rgba(0,0,0,0.4)"/>
<rect x="44" y="48" width="32" height="30" rx="4" fill="#6b7280"/>
<ellipse cx="60" cy="36" rx="14" ry="14" fill="#fde68a"/>
<path d="M46 30 Q46 16 60 14 Q74 16 74 30Z" fill="#9ca3af"/>
<rect x="44" y="28" width="32" height="8" rx="2" fill="#6b7280"/>
<rect x="50" y="32" width="20" height="3" rx="1.5" fill="#1f2937"/>
<path d="M10 20 Q10 10 22 8 L60 8 L60 62 Q40 75 10 62Z" fill="#1d4ed8"/>
<path d="M10 20 Q10 10 22 8 L60 8 L60 62 Q40 75 10 62Z" fill="none" stroke="#60a5fa" stroke-width="2"/>
<line x1="35" y1="12" x2="35" y2="58" stroke="#93c5fd" stroke-width="2.5"/>
<line x1="12" y1="35" x2="58" y2="35" stroke="#93c5fd" stroke-width="2.5"/>
<circle cx="35" cy="35" r="8" fill="#2563eb" stroke="#93c5fd" stroke-width="1.5"/>
<text x="35" y="39" text-anchor="middle" font-size="9" fill="#fbbf24" font-family="sans-serif">★</text>
<rect x="46" y="76" width="11" height="12" rx="3" fill="#4b5563"/>
<rect x="63" y="76" width="11" height="12" rx="3" fill="#4b5563"/>
</svg>`),

  dragon: _s(`<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
<rect width="120" height="90" fill="#1a0a0a"/>
<ellipse cx="18" cy="45" rx="15" ry="8" fill="#f97316" opacity="0.7"/>
<ellipse cx="10" cy="42" rx="8" ry="5" fill="#fbbf24" opacity="0.8"/>
<ellipse cx="5" cy="40" rx="5" ry="3" fill="#fef08a" opacity="0.9"/>
<path d="M30 60 Q40 80 60 80 Q80 80 90 65 Q100 50 95 35 Q90 20 75 18 Q60 16 48 25 Q38 32 30 60Z" fill="#dc2626"/>
<path d="M55 30 Q35 10 15 25 Q25 35 48 38Z" fill="#b91c1c"/>
<path d="M75 28 Q95 8 110 22 Q98 32 78 36Z" fill="#b91c1c"/>
<path d="M60 78 Q80 88 100 82 Q110 78 112 70" stroke="#dc2626" stroke-width="8" fill="none" stroke-linecap="round"/>
<path d="M112 70 L118 64 L108 66Z" fill="#dc2626"/>
<ellipse cx="38" cy="38" rx="18" ry="14" fill="#dc2626"/>
<circle cx="32" cy="34" r="5" fill="#fbbf24"/>
<circle cx="33" cy="35" r="2.5" fill="#1a0a0a"/>
<ellipse cx="24" cy="40" rx="3" ry="2" fill="#b91c1c"/>
<path d="M42 26 L46 12 L48 26" fill="#fbbf24"/>
<ellipse cx="70" cy="50" rx="12" ry="8" fill="rgba(255,100,0,0.2)"/>
</svg>`),

  phoenix: _s(`<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
<rect width="120" height="90" fill="#1a0a00"/>
<ellipse cx="60" cy="50" rx="50" ry="40" fill="#f97316" opacity="0.12"/>
<path d="M60 70 Q40 88 20 82 Q35 72 45 58Z" fill="#f97316"/>
<path d="M60 70 Q60 90 45 88 Q50 76 52 62Z" fill="#fbbf24"/>
<path d="M60 70 Q80 88 100 82 Q85 72 75 58Z" fill="#f97316"/>
<path d="M60 70 Q60 90 75 88 Q70 76 68 62Z" fill="#fbbf24"/>
<path d="M60 38 Q30 24 8 38 Q20 50 45 48Z" fill="#f97316"/>
<path d="M60 38 Q30 24 8 38 Q18 42 40 42Z" fill="#fbbf24" opacity="0.7"/>
<path d="M60 38 Q90 24 112 38 Q100 50 75 48Z" fill="#f97316"/>
<path d="M60 38 Q90 24 112 38 Q102 42 80 42Z" fill="#fbbf24" opacity="0.7"/>
<ellipse cx="60" cy="50" rx="16" ry="22" fill="#fb923c"/>
<ellipse cx="57" cy="40" rx="8" ry="5" fill="rgba(255,255,255,0.25)" transform="rotate(-20 57 40)"/>
<ellipse cx="60" cy="28" rx="12" ry="11" fill="#fb923c"/>
<path d="M52 20 L48 8 L56 18" fill="#fbbf24"/>
<path d="M60 18 L58 5 L64 18" fill="#fde68a"/>
<path d="M68 20 L72 8 L64 18" fill="#fbbf24"/>
<circle cx="55" cy="28" r="4" fill="#fbbf24"/>
<circle cx="56" cy="29" r="2" fill="#7c2d12"/>
<path d="M50 31 L44 34 L50 35Z" fill="#fbbf24"/>
<circle cx="15" cy="20" r="2.5" fill="#fbbf24" opacity="0.7"/>
<circle cx="105" cy="18" r="2" fill="#fbbf24" opacity="0.6"/>
</svg>`),

  demonking: _s(`<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
<rect width="120" height="90" fill="#08000f"/>
<ellipse cx="60" cy="50" rx="50" ry="40" fill="#7c3aed" opacity="0.08"/>
<path d="M35 52 Q28 72 22 86 L98 86 Q92 72 85 52Z" fill="#1e1b4b"/>
<rect x="44" y="46" width="32" height="18" rx="4" fill="#312e81"/>
<ellipse cx="60" cy="34" rx="15" ry="14" fill="#1e1b4b"/>
<path d="M48 24 L40 4 L52 20" fill="#7c3aed"/>
<path d="M72 24 L80 4 L68 20" fill="#7c3aed"/>
<path d="M44 22 L48 12 L56 20 L60 10 L64 20 L72 12 L76 22Z" fill="#fbbf24"/>
<ellipse cx="52" cy="34" rx="5" ry="4" fill="#a855f7"/>
<ellipse cx="68" cy="34" rx="5" ry="4" fill="#a855f7"/>
<circle cx="52" cy="35" r="2.5" fill="#7c3aed"/>
<circle cx="68" cy="35" r="2.5" fill="#7c3aed"/>
<ellipse cx="52" cy="34" rx="7" ry="6" fill="#a855f7" opacity="0.2"/>
<ellipse cx="68" cy="34" rx="7" ry="6" fill="#a855f7" opacity="0.2"/>
<path d="M50 42 Q60 50 70 42" stroke="#4c1d95" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<rect x="88" y="38" width="4" height="46" rx="2" fill="#4c1d95"/>
<circle cx="90" cy="34" r="10" fill="#7c3aed" opacity="0.9"/>
<circle cx="90" cy="34" r="6" fill="#a855f7"/>
<circle cx="90" cy="34" r="3" fill="#e9d5ff"/>
<circle cx="15" cy="15" r="2.5" fill="#7c3aed" opacity="0.7"/>
<circle cx="108" cy="12" r="2" fill="#a855f7" opacity="0.6"/>
<circle cx="10" cy="70" r="1.5" fill="#7c3aed" opacity="0.6"/>
<circle cx="112" cy="65" r="2" fill="#a855f7" opacity="0.5"/>
</svg>`),
};

export const STANDARD_CARDS = [
  { id: 'std_slime',   name: 'スライム', cost: 1, imageSource: ART.slime,     imageTransform: { zoom: 1, cx: 0.5, cy: 0.5 }, text: '小さくて可愛いモンスター。弱いけど愛嬌がある。', tags: ['モンスター'], attributes: {}, createdAt: 0 },
  { id: 'std_chick',   name: 'ひよこ',   cost: 1, imageSource: ART.chick,     imageTransform: { zoom: 1, cx: 0.5, cy: 0.5 }, text: 'うまれたばかりのひよこ。元気いっぱい！', tags: ['動物'], attributes: {}, createdAt: 0 },
  { id: 'std_leaf',    name: '木の葉',   cost: 1, imageSource: ART.leaf,      imageTransform: { zoom: 1, cx: 0.5, cy: 0.5 }, text: '風に舞う一枚の葉。軽やかに踊る。', tags: ['自然'], attributes: {}, createdAt: 0 },
  { id: 'std_sword',   name: '剣士',     cost: 2, imageSource: ART.swordsman, imageTransform: { zoom: 1, cx: 0.5, cy: 0.5 }, text: '剣と盾を持つ若き戦士。勇敢に挑む。', tags: ['戦士'], attributes: {}, createdAt: 0 },
  { id: 'std_wizard',  name: '魔法使い', cost: 2, imageSource: ART.wizard,    imageTransform: { zoom: 1, cx: 0.5, cy: 0.5 }, text: '謎多き魔法使い。杖から放つ魔力は絶大。', tags: ['魔法'], attributes: {}, createdAt: 0 },
  { id: 'std_shield',  name: '盾騎士',   cost: 2, imageSource: ART.shield,    imageTransform: { zoom: 1, cx: 0.5, cy: 0.5 }, text: '仲間を守る鉄壁の騎士。盾は決して崩れない。', tags: ['防御'], attributes: {}, createdAt: 0 },
  { id: 'std_dragon',  name: '竜',       cost: 3, imageSource: ART.dragon,    imageTransform: { zoom: 1, cx: 0.5, cy: 0.5 }, text: '炎を吐く伝説の竜。その力は計り知れない。', tags: ['ドラゴン', '伝説'], attributes: {}, createdAt: 0 },
  { id: 'std_phoenix', name: '鳳凰',     cost: 3, imageSource: ART.phoenix,   imageTransform: { zoom: 1, cx: 0.5, cy: 0.5 }, text: '炎から蘇る不死鳥。何度でも立ち上がる。', tags: ['鳥', '不死'], attributes: {}, createdAt: 0 },
  { id: 'std_demon',   name: '魔王',     cost: 3, imageSource: ART.demonking, imageTransform: { zoom: 1, cx: 0.5, cy: 0.5 }, text: '闇の力を束ねる魔王。恐怖と力の象徴。', tags: ['魔王', '伝説'], attributes: {}, createdAt: 0 },
];

export const STANDARD_DECK = {
  id: 'standard',
  name: 'スタンダードデッキ',
  cardIds: STANDARD_CARDS.map((c) => c.id),
  createdAt: 0,
};
