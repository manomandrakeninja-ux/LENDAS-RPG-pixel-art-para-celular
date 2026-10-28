// Fichas dos NPCs (Fase 20 G-npcs). Cada ficha descreve corpo, rosto, cabelo, roupa em camadas,
// chapéu e o acessório da profissão; scripts/npc-paint/person.mjs pinta. `walks: true` = 4 direções x 4
// quadros (moradores que andam); sem isso = parado de frente com respiração e piscada.

const SKIN = {
  pale: '#f6ca9f',
  light: '#e69c69',
  tan: '#bf6f4a',
  brown: '#8a4836',
  ghost: '#c7cfdd'
};

export const PEOPLE = {
  // ---------------- Acampamento (campanha)
  vigia: {
    build: 'normal', skin: SKIN.light, brows: 'stern', mouth: 'neutral', scar: true,
    hair: { color: '#5d5d5d', style: 'short' }, beard: { color: '#b4b4b4', style: 'full', len: 2 },
    shirt: '#657392', sleeves: 'long', body: { kind: 'tunic', color: '#657392', hem: 1 }, pants: '#494834', boots: '#391f21', gloves: '#5d2c28',
    layers: [{ kind: 'mail', color: '#657392' }, { kind: 'tabard', color: '#8a4836', emblem: '#edab50' }, { kind: 'belt', color: '#391f21', pouch: '#5d2c28' }, { kind: 'scarf', color: '#891e2b' }],
    hat: { kind: 'helm', color: '#c7cfdd' },
    prop: { kind: 'spear' }
  },
  curandeira: {
    build: 'slim', skin: SKIN.pale, brows: 'kind', mouth: 'smile', lashes: true, freckles: true, blush: true,
    hair: { color: '#c64524', style: 'braids', len: 13, flower: '#f5555d' },
    shirt: '#f9e6cf', sleeves: 'long', body: { kind: 'dress', color: '#33984b' }, boots: '#5d2c28',
    layers: [{ kind: 'apron', color: '#f6ca9f', bib: false, long: true, pocket: true }, { kind: 'belt', color: '#8a4836', buckle: '#cba36f' }, { kind: 'satchel', color: '#8a4836', leaf: true }, { kind: 'cord', charm: '#5ac54f' }],
    prop: { kind: 'book' }
  },
  ferreiro: {
    build: 'stout', skin: SKIN.tan, brows: 'stern', mouth: 'neutral',
    hair: { color: '#391f21', style: 'short', fringe: 1.6 }, beard: { color: '#391f21', style: 'full', len: 4 },
    shirt: '#5d5d5d', sleeves: 'rolled', body: { kind: 'tunic', color: '#5d5d5d' }, pants: '#3d3d3d', boots: '#272727', bracer: '#391f21',
    layers: [{ kind: 'apron', color: '#8a4836', stain: true }, { kind: 'belt', color: '#391f21', buckle: '#92a1b9' }],
    hat: { kind: 'bandana', color: '#891e2b' },
    prop: { kind: 'hammer' }
  },
  cacador: {
    build: 'normal', skin: SKIN.light, brows: 'stern', mouth: 'neutral',
    hair: { color: '#5d2c28', style: 'short' }, beard: { color: '#5d2c28', style: 'full', len: 1 },
    shirt: '#494834', sleeves: 'long', body: { kind: 'tunic', color: '#1e6f50', hem: 2 }, pants: '#5d2c28', boots: '#391f21', bracer: '#8a4836',
    layers: [{ kind: 'belt', color: '#391f21', pouch: '#8a4836' }, { kind: 'sash', color: '#5d2c28' }, { kind: 'fur', color: '#cba36f' }],
    hat: { kind: 'hood', color: '#1e6f50', feather: '#ea323c' },
    back: { kind: 'quiver' },
    prop: { kind: 'bow' }
  },
  construtor: {
    build: 'stout', skin: SKIN.light, brows: 'kind', mouth: 'grin', freckles: true,
    hair: { color: '#8a4836', style: 'short' }, beard: { color: '#8a4836', style: 'mustache' },
    shirt: '#edab50', sleeves: 'rolled', body: { kind: 'tunic', color: '#424c6e' }, pants: '#5d2c28', boots: '#391f21',
    layers: [{ kind: 'vest', color: '#8a4836', buttons: '#edab50' }, { kind: 'belt', color: '#391f21' }, { kind: 'toolbelt', color: '#ad7954' }],
    hat: { kind: 'straw', color: '#edab50', band: '#5d2c28' },
    back: { kind: 'saw' },
    prop: { kind: 'mallet' }
  },
  capitao: {
    build: 'slim', skin: SKIN.tan, brows: 'stern', mouth: 'neutral', lashes: true,
    hair: { color: '#1a1932', style: 'ponytail' },
    shirt: '#891e2b', sleeves: 'long', body: { kind: 'tunic', color: '#891e2b', hem: 2 }, pants: '#2a2f4e', boots: '#1c121c', gloves: '#391f21',
    layers: [{ kind: 'plate', color: '#92a1b9', emblem: '#ffc825' }, { kind: 'belt', color: '#391f21', buckle: '#ffc825' }],
    cape: { color: '#c42430' },
    hat: { kind: 'helm', color: '#c7cfdd', plume: '#ea323c' },
    prop: { kind: 'sword' }
  },
  mercador: {
    build: 'stout', skin: SKIN.light, brows: 'kind', mouth: 'grin',
    hair: { color: '#391f21', style: 'short' }, beard: { color: '#391f21', style: 'mustache' },
    shirt: '#622461', sleeves: 'long', body: { kind: 'robe', color: '#622461' }, boots: '#391f21',
    layers: [{ kind: 'sash', color: '#edab50', studs: '#ffeb57' }, { kind: 'belt', color: '#edab50', buckle: '#ffc825', pouch: '#ad7954' }, { kind: 'collar', color: '#ffc825' }],
    hat: { kind: 'wide', color: '#3b1443', band: '#edab50', feather: '#ffc825' },
    back: { kind: 'pack', color: '#8a4836', roll: '#c64524' },
    prop: { kind: 'coins' }
  },
  // ---------------- Quem fala nas cenas
  barqueiro: {
    build: 'normal', skin: SKIN.tan, brows: 'kind', mouth: 'smile',
    hair: { color: '#5d2c28', style: 'short' }, beard: { color: '#5d2c28', style: 'full', len: 3 },
    shirt: '#c7cfdd', sleeves: 'rolled', body: { kind: 'tunic', color: '#0069aa', hem: 0 }, pants: '#00396d', boots: '#391f21',
    layers: [{ kind: 'vest', color: '#00396d' }, { kind: 'belt', color: '#391f21' }, { kind: 'scarf', color: '#ea323c' }],
    hat: { kind: 'cap', color: '#391f21', button: '#c42430' },
    prop: { kind: 'oar' }
  },
  aurelian: {
    build: 'tall', skin: '#9cc8e6', brows: 'worried', mouth: 'frown', eyes: '#ea323c', browColor: '#424c6e',
    hair: { color: '#ffffff', style: 'long', len: 15, front: 10 }, beard: { color: '#d5e8ef', style: 'full', len: 6 },
    shirt: '#622461', sleeves: 'long', body: { kind: 'robe', color: '#3b1443' }, boots: '#1c121c',
    layers: [{ kind: 'shawl', color: '#c42430', pin: '#ffc825' }, { kind: 'belt', color: '#ffc825', buckle: '#c42430' }],
    cape: { color: '#891e2b' },
    hat: { kind: 'crown', color: '#ffc825', cracked: true },
    prop: { kind: 'staff', top: 8, gem: '#c42430' }
  },
  saqueador: {
    build: 'normal', skin: SKIN.brown, brows: 'stern', mouth: 'neutral',
    hair: { color: '#131313', style: 'short' },
    shirt: '#3d3d3d', sleeves: 'long', body: { kind: 'tunic', color: '#391f21', hem: 1 }, pants: '#272727', boots: '#131313', gloves: '#1c121c',
    layers: [{ kind: 'vest', color: '#5d2c28' }, { kind: 'belt', color: '#131313', buckle: '#858585' }],
    hat: { kind: 'hood', color: '#272727', mask: '#3d3d3d' },
    prop: { kind: 'dagger' }
  },
  contrabandista: {
    build: 'slim', skin: SKIN.tan, brows: 'stern', mouth: 'neutral',
    hair: { color: '#131313', style: 'short' },
    shirt: '#2a2f4e', sleeves: 'long', body: { kind: 'robe', color: '#1a1932' }, boots: '#131313',
    layers: [{ kind: 'belt', color: '#391f21', pouch: '#5d2c28' }],
    hat: { kind: 'hood', color: '#1a1932' },
    prop: { kind: 'lantern' }
  },

  // ---------------- Moradores (andam)
  tiao: {
    walks: true, build: 'normal', skin: SKIN.tan, brows: 'kind', mouth: 'smile',
    hair: { color: '#c7cfdd', style: 'bald' }, beard: { color: '#c7cfdd', style: 'full', len: 6 },
    shirt: '#775c5b', sleeves: 'long', body: { kind: 'robe', color: '#775c5b' }, boots: '#391f21',
    layers: [{ kind: 'shawl', color: '#c42430' }, { kind: 'belt', color: '#391f21', pouch: '#5d2c28' }],
    prop: { kind: 'staff', top: 16, leaves: true }
  },
  nina: {
    walks: true, build: 'slim', skin: SKIN.light, brows: 'kind', mouth: 'smile', lashes: true, blush: true,
    hair: { color: '#5d2c28', style: 'bun' },
    shirt: '#c64524', sleeves: 'rolled', body: { kind: 'dress', color: '#c64524' }, boots: '#5d2c28',
    layers: [{ kind: 'apron', color: '#f9e6cf', long: true, stain: true }, { kind: 'belt', color: '#8a4836' }],
    hat: { kind: 'kerchief', color: '#c42430', dots: '#f9e6cf' },
    prop: { kind: 'ladle' }
  },
  joaquim: {
    walks: true, build: 'normal', skin: SKIN.light, brows: 'kind', mouth: 'smile', freckles: true,
    hair: { color: '#8a4836', style: 'short' }, beard: { color: '#8a4836', style: 'full', len: 1 },
    shirt: '#c42430', sleeves: 'rolled', body: { kind: 'tunic', color: '#c42430' }, pants: '#0069aa', boots: '#5d2c28',
    layers: [{ kind: 'apron', color: '#00396d', bib: true, pocket: true }, { kind: 'scarf', color: '#ea323c' }],
    hat: { kind: 'straw', color: '#edab50', band: '#c42430' },
    prop: { kind: 'pitchfork' }
  },
  rosa: {
    walks: true, build: 'slim', skin: SKIN.pale, brows: 'kind', mouth: 'smile', lashes: true, blush: true, freckles: true,
    hair: { color: '#c64524', style: 'long', len: 12, front: 8 },
    shirt: '#f9e6cf', sleeves: 'rolled', body: { kind: 'dress', color: '#c85086' }, boots: '#5d2c28',
    layers: [{ kind: 'apron', color: '#f9e6cf', bib: false, long: true }, { kind: 'belt', color: '#8a4836' }],
    hat: { kind: 'straw', color: '#ffc825', band: '#f68187' },
    prop: { kind: 'basket' }
  },
  borin: {
    walks: true, build: 'dwarf', skin: SKIN.tan, brows: 'stern', mouth: 'neutral',
    hair: { color: '#c64524', style: 'bald' }, beard: { color: '#c64524', style: 'full', len: 9, beads: '#ffc825' },
    shirt: '#424c6e', sleeves: 'rolled', body: { kind: 'tunic', color: '#424c6e' }, pants: '#3d3d3d', boots: '#272727', bracer: '#424c6e',
    layers: [{ kind: 'apron', color: '#391f21', bib: false, stain: true }, { kind: 'belt', color: '#272727', buckle: '#ffc825' }],
    hat: { kind: 'helm', color: '#657392' },
    prop: { kind: 'hammer' }
  },
  hilda: {
    walks: true, build: 'dwarf', skin: SKIN.light, brows: 'stern', mouth: 'smile', lashes: true, freckles: true,
    hair: { color: '#ffc825', style: 'braids', len: 12 },
    shirt: '#891e2b', sleeves: 'rolled', body: { kind: 'tunic', color: '#891e2b' }, pants: '#3d3d3d', boots: '#272727', bracer: '#424c6e',
    layers: [{ kind: 'apron', color: '#5d2c28', stain: true }, { kind: 'belt', color: '#272727', buckle: '#ffc825' }],
    hat: { kind: 'bandana', color: '#edab50' },
    prop: { kind: 'hammer' }
  },
  marta: {
    walks: true, build: 'slim', skin: SKIN.light, brows: 'kind', mouth: 'smile', lashes: true,
    hair: { color: '#391f21', style: 'bun' },
    shirt: '#0069aa', sleeves: 'long', body: { kind: 'dress', color: '#00396d' }, boots: '#391f21',
    layers: [{ kind: 'apron', color: '#f9e6cf', long: true, bib: false }, { kind: 'shawl', color: '#c7cfdd', pin: '#c42430' }, { kind: 'belt', color: '#5d2c28', pouch: '#8a4836' }],
    prop: { kind: 'broom' }
  },
  pipo: {
    walks: true, build: 'child', skin: SKIN.pale, brows: 'kind', mouth: 'grin', freckles: true, blush: true,
    hair: { color: '#8a4836', style: 'spiky' },
    shirt: '#ea323c', sleeves: 'short', body: { kind: 'tunic', color: '#ea323c' }, pants: '#5d2c28', boots: '#391f21',
    layers: [{ kind: 'belt', color: '#391f21' }, { kind: 'scarf', color: '#ffc825' }],
    prop: { kind: 'sword', wood: true }
  },
  otavio: {
    walks: true, build: 'stout', skin: SKIN.light, brows: 'kind', mouth: 'grin',
    hair: { color: '#272727', style: 'short' }, beard: { color: '#272727', style: 'full', len: 2 },
    shirt: '#93388f', sleeves: 'long', body: { kind: 'robe', color: '#622461' }, boots: '#391f21',
    layers: [{ kind: 'belt', color: '#edab50', buckle: '#ffc825', pouch: '#ad7954' }, { kind: 'collar', color: '#edab50' }],
    hat: { kind: 'wide', color: '#3b1443', band: '#edab50', feather: '#5ac54f' },
    back: { kind: 'pack', color: '#5d2c28', roll: '#ffc825' },
    prop: { kind: 'coins' }
  },
  selma: {
    walks: true, build: 'slim', skin: SKIN.brown, brows: 'kind', mouth: 'smile', lashes: true,
    hair: { color: '#131313', style: 'long', len: 13, front: 9 },
    shirt: '#1e6f50', sleeves: 'long', body: { kind: 'dress', color: '#134c4c' }, boots: '#391f21',
    layers: [{ kind: 'shawl', color: '#ffc825', pin: '#c42430' }, { kind: 'belt', color: '#edab50', pouch: '#ad7954' }, { kind: 'cord', color: '#ffc825', charm: '#0098dc' }],
    prop: { kind: 'coins' }
  },
  rui: {
    walks: true, build: 'normal', skin: SKIN.tan, brows: 'stern', mouth: 'neutral',
    hair: { color: '#391f21', style: 'short' }, beard: { color: '#391f21', style: 'mustache' },
    shirt: '#657392', sleeves: 'long', body: { kind: 'tunic', color: '#657392', hem: 1 }, pants: '#424c6e', boots: '#1c121c', gloves: '#391f21',
    layers: [{ kind: 'mail', color: '#657392' }, { kind: 'tabard', color: '#891e2b', emblem: '#ffc825' }, { kind: 'belt', color: '#391f21' }],
    hat: { kind: 'helm', color: '#858585' },
    prop: { kind: 'spear' }
  },
  iara: {
    walks: true, build: 'slim', skin: SKIN.brown, brows: 'stern', mouth: 'neutral', lashes: true,
    hair: { color: '#131313', style: 'ponytail' },
    shirt: '#494834', sleeves: 'long', body: { kind: 'tunic', color: '#494834', hem: 1 }, pants: '#2d2e25', boots: '#1c121c', gloves: '#391f21',
    layers: [{ kind: 'mail', color: '#5d5d5d' }, { kind: 'tabard', color: '#1e6f50', emblem: '#edab50' }, { kind: 'belt', color: '#391f21', pouch: '#5d2c28' }],
    hat: { kind: 'helm', color: '#858585' },
    prop: { kind: 'spear' }
  }
};
