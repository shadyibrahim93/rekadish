import { useEffect, useState, useRef } from 'react';

const AdSlot = ({
  id,
  position,
  marginTop,
  marginBottom,
  placement,
  index, // index in the list
  every // show ad every N items (optional)
}) => {
  const [isDev, setIsDev] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
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
    if (!shouldRender || isDev) return;

    const timeout = setTimeout(() => {
      if (typeof window === 'undefined') return;

      const placeholder = document.getElementById(
        `ezoic-pub-ad-placeholder-${id}`
      );

      // If there's no placeholder or it's basically empty / zero height,
      // assume no ad was filled and hide the slot.
      if (
        !placeholder ||
        placeholder.offsetHeight < 5 ||
        placeholder.childElementCount === 0
      ) {
        setIsVisible(false);
      }
    }, 4000); // wait a bit for Ezoic to attempt fill

    return () => clearTimeout(timeout);
  }, [id, shouldRender, isDev]);

  // If this instance shouldn't render at all or we decided it's empty → bail
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
      ref={containerRef}
      className='ezoic-ad-slot-container'
      style={{
        marginTop,
        marginBottom: marginBottom || '1rem'
        // no minHeight in prod – let Ezoic set it if it fills
      }}
    >
      <div id={`ezoic-pub-ad-placeholder-${id}`} />
    </div>
  );
};

export default AdSlot;
