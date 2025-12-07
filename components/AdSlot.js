import { useEffect, useState, useRef } from 'react';

const AdSlot = ({
  id,
  position,
  height,
  marginTop,
  marginBottom,
  placement,
  index, // 👉 index in the list
  every // 👉 show ad every N items (optional)
}) => {
  const [isDev, setIsDev] = useState(false);
  const [isVisible, setIsVisible] = useState(true); // 👈 controls whether container renders
  const isLoaded = useRef(false);
  const containerRef = useRef(null);

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

  // Hide/remove empty ad container if nothing loads
  useEffect(() => {
    // don't do the empty-check in dev (we always want to see placeholder)
    if (!shouldRender || isDev) return;

    const el = containerRef.current;
    if (!el) return;

    const timeout = setTimeout(() => {
      // If the slot has no height (or tiny), assume no ad filled
      if (!el.offsetHeight || el.offsetHeight < 10) {
        setIsVisible(false); // 👈 remove it entirely
      }
    }, 4000);

    return () => clearTimeout(timeout);
  }, [id, isDev, shouldRender]);

  // If this instance shouldn't render or we've determined it's empty, bail out
  if (!shouldRender || (!isDev && !isVisible)) {
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
          minHeight: height || '120px'
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
      ref={containerRef}
      className='ezoic-ad-slot-container'
      style={{
        marginTop,
        marginBottom: marginBottom || '1rem',
        minHeight: height
      }}
    >
      <div id={`ezoic-pub-ad-placeholder-${id}`} />
    </div>
  );
};

export default AdSlot;
