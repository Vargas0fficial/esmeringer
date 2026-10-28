import WritingLogo from './random/WritingLogo';

/** Pass `logo` to show the handwriting logo instead of the text title. It loops continuously. */
export default function SectionHeading({ eyebrow, title, subtitle, logo = false }) {
  return (
    <div className="section-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        {logo ? (
          <>
            <h1 className="visually-hidden">{title}</h1>
            <div className="heading-logo" aria-hidden="true">
              <WritingLogo stagger={0.08} />
            </div>
          </>
        ) : (
          <h1>{title}</h1>
        )}
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
  );
}