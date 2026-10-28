import { LOGO_GLYPHS, LOGO_VIEWBOX } from './logoPaths';

const LOGO_LABEL = 'esmeringer';

/**
 * Glyph order and horizontal shift for each letter of "esmeringer".
 * `from` is the index in LOGO_GLYPHS (which was generated as "esmirenger"),
 * `dx` moves the letter so it sits in its new spot.
 */
const LAYOUT = [
  { from: 0, dx: 0 }, // e
  { from: 1, dx: 0 }, // s
  { from: 2, dx: 0 }, // m
  { from: 5, dx: -65 }, // e
  { from: 4, dx: 21 }, // r
  { from: 3, dx: 90 }, // i
  { from: 6, dx: 18 }, // n
  { from: 7, dx: 18 }, // g
  { from: 8, dx: 18 }, // e
  { from: 9, dx: 18 }, // r
];

// Make the viewBox wider by the extra space the shifted letters need.
const EXTRA_WIDTH = 18;
const [vx, vy, vw, vh] = LOGO_VIEWBOX.split(' ').map(Number);
const VIEWBOX = `${vx} ${vy} ${vw + EXTRA_WIDTH} ${vh}`;

/**
 * The logo text, drawn letter by letter like handwriting. The animation lives in the CSS.
 * Default: loops (used while searching). `once`: writes itself one time and stays (splash screen).
 */
export default function WritingLogo({ once = false, stagger = 0.12 }) {
  return (
    <svg
      className={`writing-logo ${once ? 'once' : ''}`}
      viewBox={VIEWBOX}
      role="img"
      aria-label={LOGO_LABEL}
    >
      {LAYOUT.map(({ from, dx }, index) => (
        <g key={index} transform={`translate(${dx} 0)`}>
          <path
            d={LOGO_GLYPHS[from]}
            pathLength="1"
            style={{ animationDelay: `${index * stagger}s` }}
          />
        </g>
      ))}
    </svg>
  );
}