import { useEffect, useState, useRef } from 'react';

const AdSlot = ({
  id,
  position,
  marginTop,
  marginBottom,
  placement,
  index, // index in the list (for every N items)
  every // show ad every N items (optional)
}) => {
  const [isDev, setIsDev] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // 👈 start hidden in prod
  const [isDead, setIsDead] = useState(false); // 👈 fully remove if no ad
  const isLoaded = useRef(false);

  const shouldRender =
    typeof every === 'number' && typeof index === 'number'
      ? (index + 1) % every === 0
      : true;

  useEffect(() => {
    if (!shouldRender) return;

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        setIsDev(true);
        setIsVisible(true); // always visible in dev
        return;
      }
    }

    if (typeof window !== 'undefined') {
      window.ezstandalone = window.ezstandalone || {};
      window.ezstandalone.cmd = window.ezstandalone.cmd || [];

      window.ezstandalone.cmd.push(() => {
        if (isLoaded.current) return;

        try {
          window.ezstandalone.define(parseInt(id, 10));

          if (!window.ezstandalone.enabled) {
            window.ezstandalone.enable();
            window.ezstandalone.display();
          } else {
            window.ezstandalone.refresh();
          }

          isLoaded.current = true;
        } catch (err) {
          console.warn('Ezoic ad error:', err);
        }
      });
    }
  }, [id, shouldRender]);

  // Decide whether to show or kill the slot (without initial blank gap)
  useEffect(() => {
    if (!shouldRender || isDev) return;

    const timeout = setTimeout(() => {
      if (typeof window === 'undefined') return;

      const placeholder = document.getElementById(
        `ezoic-pub-ad-placeholder-${id}`
      );

      // If ad filled → show it
      if (
        placeholder &&
        placeholder.offsetHeight >= 5 &&
        placeholder.childElementCount > 0
      ) {
        setIsVisible(true);
      } else {
        // No ad → completely remove
        setIsDead(true);
      }
    }, 2500); // you can tweak this delay

    return () => clearTimeout(timeout);
  }, [id, shouldRender, isDev]);

  // If this instance isn't supposed to render at all, or we decided it's dead
  if (!shouldRender || isDead) {
    return null;
  }

  // LOCAL DEVELOPMENT VISUALIZER
  if (isDev) {
    return (
      <div
        style={{
          position: placement,
          top: '100px',
          backgroundColor: '#f0f0f0',
          color: '#666',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          borderRadius: '8px',
          marginTop,
          marginBottom: marginBottom || '1rem',
          minHeight: '120px'
        }}
      >
        EZOIC AD PLACEHOLDER
        <br />
        ID: {id}
        <br />
        Position: {position}
      </div>
    );
  }

  // LIVE PRODUCTION SLOT
  return (
    <div
      className='ezoic-ad-slot-container'
      style={{
        // 👇 keep it in the DOM for Ezoic, but don't show until we know an ad filled
        display: isVisible ? 'block' : 'none',
        marginTop: isVisible ? marginTop : 0,
        marginBottom: isVisible ? marginBottom || '1rem' : 0
      }}
    >
      <div id={`ezoic-pub-ad-placeholder-${id}`} />
    </div>
  );
};

export default AdSlot;
