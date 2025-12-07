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
  const isLoaded = useRef(false); // Prevents double-firing Ezoic
  const containerRef = useRef(null); // For hiding empty slots

  // Should this particular instance actually render?
  const shouldRender =
    typeof every === 'number' && typeof index === 'number'
      ? (index + 1) % every === 0
      : true;

  useEffect(() => {
    // If this instance isn't supposed to render, skip all Ezoic logic
    if (!shouldRender) return;

    // 1. Check if we are in local development
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        setIsDev(true);
        return;
      }
    }

    // 2. Queue Ezoic Logic (The Safe Way)
    if (typeof window !== 'undefined') {
      window.ezstandalone = window.ezstandalone || {};
      window.ezstandalone.cmd = window.ezstandalone.cmd || [];

      window.ezstandalone.cmd.push(() => {
        // Prevent React from running this twice
        if (isLoaded.current) return;

        try {
          // Define the placeholder
          window.ezstandalone.define(parseInt(id, 10)); // ensure ID is a number

          // Logic: Enable if new, Refresh if existing
          if (!window.ezstandalone.enabled) {
            window.ezstandalone.enable();
            window.ezstandalone.display();
          } else {
            window.ezstandalone.refresh();
          }

          isLoaded.current = true; // Mark as done
        } catch (err) {
          console.warn('Ezoic ad error:', err);
        }
      });
    }
  }, [id, shouldRender]);

  // Hide empty ad container if nothing loads (no more empty boxes)
  useEffect(() => {
    if (!shouldRender || isDev) return;

    const el = containerRef.current;
    if (!el) return;

    const timeout = setTimeout(() => {
      // If the slot has no height (or tiny), assume no ad filled
      if (!el.offsetHeight || el.offsetHeight < 10) {
        el.style.display = 'none';
      }
    }, 4000); // wait a bit for Ezoic to fill

    return () => clearTimeout(timeout);
  }, [id, isDev, shouldRender]);

  // If this instance isn't supposed to render (e.g., not every 6th item)
  if (!shouldRender) {
    return null;
  }

  // LOCAL DEVELOPMENT VISUALIZER
  if (isDev) {
    return (
      <div
        style={{
          position: `${placement}`,
          top: '100px',
          backgroundColor: '#f0f0f0',
          color: '#666',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          borderRadius: '8px',
          marginTop: marginTop,
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
        marginTop: marginTop,
        marginBottom: marginBottom || '1rem',
        minHeight: height // Prevent layout shift (CLS)
      }}
    >
      {/* The ID here must match the placeholder ID generated in Ezoic Dashboard */}
      <div id={`ezoic-pub-ad-placeholder-${id}`}></div>
    </div>
  );
};

export default AdSlot;
