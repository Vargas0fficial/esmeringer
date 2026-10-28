import WritingLogo from './random/WritingLogo';

export default function SplashScreen({ leaving }) {
  return (
    <div className={`splash ${leaving ? 'splash-leaving' : ''}`} role="status" aria-label="Loading">
      <WritingLogo once stagger={0.08} />
      <p className="splash-tagline">
        Real People. Real Chats.
        <br />
        Maybe Something More.
      </p>
      <div className="splash-bar">
        <span />
      </div>
      <small>LOADING...</small>
    </div>
  );
}