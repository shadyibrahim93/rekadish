import Head from 'next/head';
import React from 'react';
import AdSlot from '../AdSlot';

export default function QuestionsSection({ recipe }) {
  if (!recipe.questions || recipe.questions.length === 0) return null;

  // ------------------------------------
  // Build FAQ JSON-LD structured data
  // ------------------------------------
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: recipe.questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer
      }
    }))
  };

  return (
    <section
      className='vr-card vr-section-questions'
      itemScope
      itemType='https://schema.org/FAQPage'
    >
      {/* Inject FAQ Schema */}
      <Head>
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </Head>

      <h3 className='vr-section-title'>
        Frequently Asked Questions About {recipe.title}
      </h3>

      <div className='vr-questions'>
        {recipe.questions.map((q, idx) => (
          <React.Fragment key={idx}>
            {/* 1. The Question Item */}
            <div
              className='vr-question'
              itemScope
              itemType='https://schema.org/Question'
            >
              <div
                className='vr-question__q'
                itemProp='name'
              >
                {q.question}
              </div>

              <div
                className='vr-question__a'
                itemScope
                itemProp='acceptedAnswer'
                itemType='https://schema.org/Answer'
              >
                <div itemProp='text'>{q.answer}</div>
              </div>
            </div>

            {/* 2. The Ad Slot (Inserted after the 2nd question) */}
            {idx + 1 === 2 && (
              <div className='vr-ad-container'>
                {/* Ensure you create a placeholder ID "107" in Ezoic for "In-Content FAQ" */}
                <AdSlot
                  id='107'
                  position='in-faq'
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
