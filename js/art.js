// Реестр спрайтов: всё рисуется один раз при загрузке.
import { buildPlayers, buildCats, buildBoss, hatIcon } from './sprites_chars.js';
import {
  THEMES, furnSprite, woolSprite, yarnSprite, bowlSprite, turboSprite, robotSprite,
  heartSprite, sparkSprite, buildRoomBg, buildVignette, iconCanvas,
} from './sprites_props.js';
import { FURN } from './defs.js';

let built = null;

export function getArt() {
  if (built) return built;
  const furnCache = new Map();
  built = {
    players: buildPlayers('none'),
    setHat(hat) { built.players = buildPlayers(hat); },
    hatIcon,
    cats: buildCats(),
    boss: buildBoss(),
    wool: [woolSprite(0), woolSprite(1)],
    yarn: Array.from({ length: 8 }, (_, i) => yarnSprite(i)),
    bowl: [bowlSprite(0), bowlSprite(1)],
    turbo: turboSprite(),
    robot: [robotSprite(0), robotSprite(1)],
    heart: heartSprite(),
    spark: sparkSprite(),
    vignette: buildVignette(),
    furn(type, theme, variant = 0) {
      const key = `${type}|${theme}|${FURN[type].name === 'counter' || FURN[type].name === 'pouf' ? variant : 0}`;
      if (!furnCache.has(key)) furnCache.set(key, furnSprite(type, THEMES[theme] || THEMES.living, variant));
      return furnCache.get(key);
    },
    roomBg: (theme, world, id) => buildRoomBg(theme, world, id),
    icon: (name, theme = 'living') => iconCanvas(name, THEMES[theme] || THEMES.living),
  };
  return built;
}
