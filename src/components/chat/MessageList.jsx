import { useEffect, useRef } from 'react';

/** Scrollable message area that sticks to the newest message. */
export default function MessageList({ children, trigger }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [trigger]);
  return (
    <div className="random-conversation" ref={ref}>
      {children}
    </div>
  );
}
