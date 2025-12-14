import React from 'react';
import AdSlot from '../AdSlot.js';

export default function InstructionsSection({ recipe, cookingMode }) {
  // For SEO: when rendered on server, always use full instructions
  const isServer = typeof window === 'undefined';
  const showBeginner =
    isServer || cookingMode === null || cookingMode === 'beginner';

  const instructionsToShow = showBeginner
    ? recipe.instructions
    : recipe.instructions_condensed;

  return (
    <section className='vr-card vr-section-instructions'>
      <h3 className='vr-section-title'>Instructions</h3>

      <ol className='vr-instructions'>
        {instructionsToShow?.map((step, idx) => {
          const stepNumber = step?.step ?? idx + 1;
          const anchorId = `step-${stepNumber}`;

          return (
            <React.Fragment key={idx}>
              {/* 1. The Normal Instruction Step */}
              <li className='vr-instructions__step'>
                {/* ✅ Anchor for JSON-LD HowToStep.url */}
                <span
                  id={anchorId}
                  className='vr-step__anchor'
                  aria-hidden='true'
                />

                <div className='vr-step'>
                  <div className='vr-step__number'>{stepNumber}</div>
                  <div className='vr-step__text'>{step.text}</div>
                </div>
              </li>

              {/* 2. The Ad Slot (Inserted after Step 3) */}
              {idx + 1 === 3 && (
                <li
                  className='vr-instructions__ad'
                  aria-hidden='true'
                >
                  <AdSlot
                    id='106'
                    position='in-content-instructions'
                    marginTop={'1rem'}
                  />
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </section>
  );
}
