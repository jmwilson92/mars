import ruizUrl from '../../assets/people/ruiz.jpg';
import okonkwoUrl from '../../assets/people/okonkwo.jpg';
import chenUrl from '../../assets/people/chen.jpg';
import vossUrl from '../../assets/people/voss.jpg';
import haleUrl from '../../assets/people/hale.jpg';
import mccUrl from '../../assets/textures/mcc.jpg';

export const STAFF = [
  { id: 'ruiz', name: 'M. RUIZ', role: 'COMPTROLLER', station: 'budget', url: ruizUrl, xOff: 0.85, zOff: 1.15 },
  { id: 'okonkwo', name: 'A. OKONKWO', role: 'CAPCOM', station: 'schedule', url: okonkwoUrl, xOff: 0.85, zOff: 1.15 },
  { id: 'chen', name: 'L. CHEN', role: 'CARGO INTEGRATION', station: 'manifest', url: chenUrl, xOff: 0.85, zOff: 1.15 },
  { id: 'voss', name: 'D. VOSS', role: 'CHIEF SCIENTIST', station: 'research', url: vossUrl, xOff: 0.85, zOff: 1.15 },
  { id: 'hale', name: 'K. HALE', role: 'LANDING SITES', station: 'site', url: haleUrl, xOff: 0.85, zOff: 1.15 },
];

export const MCC_URL = mccUrl;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(url));
    img.src = url;
  });
}

/** Tight chroma on studio green so olive cardigans and khaki survive. */
export function keyGreen(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i];
    const gr = p[i + 1];
    const b = p[i + 2];
    const chroma = gr - Math.max(r, b);
    if (gr > 90 && chroma > 28) {
      const a = Math.max(0, 1 - chroma / 70);
      p[i + 3] = Math.floor(p[i + 3] * a);
    }
  }
  g.putImageData(data, 0, 0);
  return c;
}

export async function loadStaffArt() {
  const [mcc, ...people] = await Promise.all([
    loadImage(mccUrl),
    ...STAFF.map((s) => loadImage(s.url)),
  ]);
  return {
    mcc,
    staff: STAFF.map((s, i) => ({ ...s, canvas: keyGreen(people[i]) })),
  };
}

export function staffAt(stationId) {
  return STAFF.find((s) => s.station === stationId) ?? null;
}
