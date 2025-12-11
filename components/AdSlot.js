import { useEffect, useState, useRef } from 'react';

const AdSlot = ({
  id,
  index,
  every,
  minHeight = '250px' // Start with this height reserved
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isAdFilled, setIsAdFilled] = useState(true); // Assume it will fill initially to keep space reserved
  const isInitialized = useRef(false);

  const shouldRender =
    typeof every === 'number' && typeof index === 'number'
      ? (index + 1) % every === 0
      : true;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !shouldRender) return;
    if (isInitialized.current) return;

    // 1. Initialize Ezoic
    if (typeof window !== 'undefined' && window.ezstandalone) {
      try {
        const adId = parseInt(id, 10);
        window.ezstandalone.cmd = window.ezstandalone.cmd || [];
        window.ezstandalone.cmd.push(() => {
          window.ezstandalone.define(adId);
          if (!window.ezstandalone.enabled) {
            window.ezstandalone.enable();
            window.ezstandalone.display();
          } else {
            window.ezstandalone.refresh();
          }
        });
        isInitialized.current = true;
      } catch (err) {
        console.warn('Ezoic Init Error:', err);
      }
    }

    // 2. "Smart Cleanup" Timer
    // Wait 4 seconds. If the ad is still empty (height < 10px), collapse the box.
    const timer = setTimeout(() => {
      const placeholder = document.getElementById(
        `ezoic-pub-ad-placeholder-${id}`
      );

      // If element exists but has no height or no children, consider it failed/blocked
      if (
        placeholder &&
        (placeholder.offsetHeight < 10 || placeholder.childElementCount === 0)
      ) {
        setIsAdFilled(false); // This will trigger the collapse
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [isMounted, shouldRender, id]);

  if (!shouldRender) return null;

  // If we decided the ad failed (isAdFilled === false), return null to remove it from DOM
  if (!isAdFilled) return null;

  return (
    <div
      className='ad-slot-container'
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        // Keep space reserved until we know for sure it failed
        minHeight: minHeight,
        margin: '2rem 0',
        overflow: 'hidden',
        // Optional: Add a smooth transition if it collapses
        transition: 'min-height 0.3s ease-out'
      }}
    >
      {isMounted ? (
        <div id={`ezoic-pub-ad-placeholder-${id}`} />
      ) : (
        <div style={{ height: minHeight, width: '100%' }} />
      )}
    </div>
  );
};

export default AdSlot;
