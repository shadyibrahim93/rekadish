import Timer from './Timer';
import { useState } from 'react';
import Image from 'next/image';
import AdSlot from './AdSlot';

export default function CookingMode({
  instructions = [],
  ingredients = [],
  onClose = () => {}
}) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(null); // { word, image, x, y }

  const step = instructions[index] || { text: 'Done', step: index + 1 };

  // Turn ingredient names inside step.text into interactive spans
  function renderText(text) {
    let processed = text;
    const uniqueMatches = [];

    ingredients.forEach((ing) => {
      const name = ing.ingredient;
      const image = ing.image;

      // Create a regex that matches the ingredient word in any case
      const regex = new RegExp(`\\b${name}\\b`, 'i');

      if (regex.test(processed)) {
        uniqueMatches.push({ name, image, regex });
      }
    });

    // Apply wrapping
    uniqueMatches.forEach(({ name, image, regex }) => {
      processed = processed.replace(
        regex,
        `<span class="vr-cooking" data-img="${image}">${name}</span>`
      );
    });

    return processed;
  }

  function handleHover(e) {
    if (!e.target.classList.contains('vr-cooking')) {
      setHovered(null);
      return;
    }

    const rect = e.target.getBoundingClientRect();
    const image = e.target.dataset.img;

    setHovered({
      image,
      // Get absolute horizontal center of the word
      x: rect.left + rect.width / 2,
      // Get absolute top of the word minus padding
      y: rect.top - 10
    });
  }

  function handleClick(e) {
    if (e.target.classList.contains('vr-cooking')) {
      const rect = e.target.getBoundingClientRect();
      const image = e.target.dataset.img;

      setHovered({
        image,
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
    } else {
      setHovered(null);
    }
  }

  return (
    <div
      className='vr-modal__backdrop'
      role='dialog'
      aria-modal='true'
      onMouseMove={handleHover}
      onClick={handleClick}
    >
      <div className='vr-modal__content'>
        <button
          onClick={onClose}
          className='vr-modal__close'
        >
          ×
        </button>
        {/* Header */}
        <div className='vr-cook__title'>Cooking Mode</div>
        <div className='vr-cook__steps'>
          Step {step.step} of {instructions.length}
        </div>

        {/* Step text */}
        <div
          className='vr-cook__step'
          dangerouslySetInnerHTML={{ __html: renderText(step.text) }}
        ></div>

        {/* Floating ingredient preview */}
        {hovered && (
          <div
            className='vr-cook-preview'
            style={{
              // FIXED: Use fixed to match getBoundingClientRect coordinates
              position: 'fixed',
              left: hovered.x,
              top: hovered.y,
              // FIXED: -50% centers X, -100% moves it to sit ON TOP of the Y coordinate
              transform: 'translate(-50%, -90%)',
              pointerEvents: 'none',
              zIndex: 9999 // Ensure it floats above the modal text
            }}
          >
            <Image
              src={`/images/ingredients/${hovered.image}.webp`}
              alt=''
              width={70}
              height={70}
              style={{
                borderRadius: '12px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                background: '#000'
              }}
            />
          </div>
        )}

        {/* Controls */}
        <div className='vr-cook__controls'>
          <div>
            <button
              className='vr-card'
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              Back
            </button>
            <button
              className='vr-card'
              onClick={() =>
                setIndex((i) => Math.min(instructions.length - 1, i + 1))
              }
            >
              Next
            </button>
          </div>
          <Timer />
        </div>
        {/* --- NEW AD SLOT --- */}
        <AdSlot
          id='105'
          position='cooking-mode-footer'
          marginTop='20px'
        />
      </div>
    </div>
  );
}
