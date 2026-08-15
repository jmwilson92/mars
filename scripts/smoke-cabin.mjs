function ctx2d() {
  return {
    fillRect() {},
    clearRect() {},
    strokeRect() {},
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    fillText() {},
    beginPath() {},
    arc() {},
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
  };
}

globalThis.document = {
  createElement() {
    return { width: 256, height: 256, getContext: () => ctx2d() };
  },
};
globalThis.window = globalThis;

const { ARK, DECK_META } = await import('../src/render/ship/constants.js');
const { buildCabin } = await import('../src/render/cabin.js');

if (ARK.decks !== 7) throw new Error('ARK must be 7 decks');
if (Math.abs(ARK.innerR - 4.1) > 0.01) throw new Error('usable radius must be 4.1 m');
if (DECK_META.length !== 7) throw new Error('seven deck names');

const cabin = buildCabin(null);
if (!cabin.scene) throw new Error('no scene');
if (!cabin.seats?.length) throw new Error('flight seats missing — fixtures never built');
if (cabin.interactables.filter((i) => i.kind === 'hatchway' || i.kind === 'ladder').length < 6) {
  throw new Error('shaft hatches missing');
}
const kinds = new Set(cabin.interactables.map((i) => i.kind));
for (const k of ['seat', 'hatchway', 'system', 'hatch']) {
  if (!kinds.has(k)) throw new Error(`missing interactable ${k}`);
}

const decks = [];
cabin.root.traverse((o) => {
  if (o.userData?.index != null && o.userData.shell) decks.push(o.userData.index);
});
if (decks.length < 7) throw new Error(`expected 7 deck groups, got ${decks.length}`);

cabin.setPlayerDeck(3);
if (cabin.playerDeck !== 3) throw new Error('setPlayerDeck failed');
cabin.setGravity(0);
if (cabin.gravity !== 0) throw new Error('setGravity failed');
cabin.onMeco();
cabin.setView('transit', 0.55);
cabin.tick(0.016, 'transit');

console.log('smoke-cabin ok', {
  decks: ARK.decks,
  innerR: ARK.innerR,
  seats: cabin.seats.length,
  interactables: cabin.interactables.length,
  name: cabin.hullClass,
});
