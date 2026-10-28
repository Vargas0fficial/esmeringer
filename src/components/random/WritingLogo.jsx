import { LOGO_GLYPHS, LOGO_TEXT, LOGO_VIEWBOX } from './logoPaths';

/**
 * The logo text, drawn letter by letter like handwriting. The animation lives in the CSS.
 * Default: loops (used while searching). `once`: writes itself one time and stays (splash screen).
 */
export default function WritingLogo({ once = false, stagger = 0.12 }) {
  return (
    <svg
      className={`writing-logo ${once ? 'once' : ''}`}
      viewBox={LOGO_VIEWBOX}
      role="img"
      aria-label={LOGO_TEXT}
    >
      {LOGO_GLYPHS.map((d, index) => (
        <path
          key={index}
          d={d}
          pathLength="1"
          style={{ animationDelay: `${index * stagger}s` }}
        />
      ))}
    </svg>
  );
}