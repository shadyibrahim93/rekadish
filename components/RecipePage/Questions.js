import Head from 'next/head';
import React, { useMemo } from 'react';
import AdSlot from '../AdSlot';

export default function QuestionsSection({ recipe }) {
  const questions = recipe?.questions || [];
  if (!questions.length) return null;

  const faqJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: questions
        .map((q) => {
          const question = String(q?.question || '').trim();
          const answer = String(q?.answer || '').trim();
          if (!question || !answer) return null;

          return {
            '@type': 'Question',
            name: question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: answer
            }
          };
        })
        .filter(Boolean)
    }),
    [questions]
  );

  // If all questions were empty after trimming, don't emit schema
  if (!faqJsonLd.mainEntity.length) return null;

  return (
    <section className='vr-card vr-section-questions'>
      {/* ✅ JSON-LD only (avoid duplicate FAQPage microdata) */}
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
        {questions.map((q, idx) => (
          <React.Fragment key={idx}>
            <div className='vr-question'>
              <div className='vr-question__q'>{q.question}</div>
              <div className='vr-question__a'>{q.answer}</div>
            </div>

            {idx + 1 === 2 && (
              <div
                className='vr-ad-container'
                aria-hidden='true'
              >
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
