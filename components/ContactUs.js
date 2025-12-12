import { useMemo, useRef, useState } from 'react';
import {
  FiMail,
  FiSend,
  FiAlertTriangle,
  FiHelpCircle,
  FiBookOpen
} from 'react-icons/fi';
import { BRAND_NAME } from '../lib/constants';

const TOPIC_OPTIONS = [
  { key: 'recipe', label: 'Submit a Recipe', icon: <FiBookOpen /> },
  { key: 'issue', label: 'Report an Issue', icon: <FiAlertTriangle /> },
  { key: 'question', label: 'Ask a Question', icon: <FiHelpCircle /> }
];

function getTopicMeta(topicKey) {
  switch (topicKey) {
    case 'recipe':
      return {
        headline: 'Share a recipe with us',
        sub: 'Send your best idea — we love featuring community favorites.',
        subjectPrefix: `${BRAND_NAME} Recipe Submission`,
        detailsLabel: 'Recipe name (optional)',
        detailsPlaceholder: 'e.g., Creamy Tuscan Chicken Orzo',
        messagePlaceholder:
          'Tell us:\n• Ingredients\n• Steps\n• Cook time\n• Any tips or substitutions\n\nPaste it here…'
      };
    case 'issue':
      return {
        headline: 'Help us fix an issue',
        sub: 'If something isn’t working, we’ll jump on it.',
        subjectPrefix: `${BRAND_NAME} Issue Report`,
        detailsLabel: 'Issue summary (optional)',
        detailsPlaceholder: 'e.g., Search results are empty on chicken recipes',
        messagePlaceholder:
          'Tell us:\n• What you expected\n• What happened instead\n• Steps to reproduce\n• Device / browser (if you know)\n\nDetails…'
      };
    default:
      return {
        headline: 'Ask us anything',
        sub: 'We’ll get back to you as soon as we can.',
        subjectPrefix: `${BRAND_NAME} Question`,
        detailsLabel: 'Question summary (optional)',
        detailsPlaceholder: 'e.g., Can I scale recipes to 4 servings?',
        messagePlaceholder:
          'What can we help with?\n\nAdd any context that might help us answer faster…'
      };
  }
}

function buildSubject(topicKey, details) {
  const meta = getTopicMeta(topicKey);
  const clean = String(details || '').trim();

  // Unique + sensible per choice:
  // - Recipe: "RekaDish Recipe Submission — <recipe name or 'New recipe idea'>"
  // - Issue:  "RekaDish Issue Report — <summary or 'Something isn’t working'>"
  // - Q:      "RekaDish Question — <summary or 'Quick help'>"
  if (topicKey === 'recipe')
    return `${meta.subjectPrefix} — ${clean || 'New recipe idea'}`;
  if (topicKey === 'issue')
    return `${meta.subjectPrefix} — ${clean || 'Something isn’t working'}`;
  return `${meta.subjectPrefix} — ${clean || 'Quick help'}`;
}

export default function Contact() {
  const formRef = useRef(null);

  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const [topicKey, setTopicKey] = useState('question');
  const [details, setDetails] = useState('');

  const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

  const canSend = Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);

  const topicMeta = useMemo(() => getTopicMeta(topicKey), [topicKey]);
  const computedSubject = useMemo(
    () => buildSubject(topicKey, details),
    [topicKey, details]
  );
  const topicLabel = useMemo(
    () =>
      TOPIC_OPTIONS.find((t) => t.key === topicKey)?.label || 'Ask a Question',
    [topicKey]
  );

  const sendEmail = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    // honeypot
    const hpValue = formRef.current?.querySelector(
      'input[name="website"]'
    )?.value;
    if (hpValue) {
      setStatus({
        type: 'success',
        message: 'Thanks! Your message has been sent.'
      });
      e.target.reset();
      setDetails('');
      setTopicKey('question');
      return;
    }

    if (!canSend) {
      setStatus({
        type: 'error',
        message:
          'Email service is not configured yet. Please email us directly at support@rekadish.com.'
      });
      return;
    }

    try {
      setSending(true);
      const emailjs = (await import('@emailjs/browser')).default;

      await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, formRef.current, {
        publicKey: PUBLIC_KEY
      });

      setStatus({
        type: 'success',
        message: "Message sent! We'll reply soon."
      });
      e.target.reset();
      setDetails('');
      setTopicKey('question');
    } catch (err) {
      const detailsTxt = err?.text ? ` (${err.status}) ${err.text}` : '';
      setStatus({
        type: 'error',
        message:
          'Sorry — something went wrong sending your message.' +
          detailsTxt +
          ' Please email support@rekadish.com.'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className='vr-contact'>
      <div className='vr-contact__hero'>
        <div className='vr-contact__heroText'>
          <h1 className='vr-contact__title'>Contact {BRAND_NAME}</h1>
          <p className='vr-contact__subtitle'>
            Choose a topic below and send us a note — or email us anytime at{' '}
            <a
              href='mailto:support@rekadish.com'
              className='vr-contact__link'
            >
              support@rekadish.com{' '}
              <FiMail style={{ verticalAlign: 'middle' }} />
            </a>
          </p>
        </div>
      </div>

      <div className='vr-contact__card'>
        <div className='vr-contact__topicHeader'>
          <div>
            <div className='vr-contact__topicHeadline'>
              {topicMeta.headline}
            </div>
            <div className='vr-contact__topicSub'>{topicMeta.sub}</div>
          </div>

          <div
            className='vr-contact__subjectPill'
            title={computedSubject}
          >
            Subject: <strong>{computedSubject}</strong>
          </div>
        </div>

        <form
          ref={formRef}
          className='vr-contact__form'
          onSubmit={sendEmail}
        >
          {/* Honeypot */}
          <div
            className='vr-contact__hp'
            aria-hidden='true'
          >
            <label>
              Website
              <input
                name='website'
                type='text'
                tabIndex={-1}
                autoComplete='off'
              />
            </label>
          </div>

          {/* Pills */}
          <div className='vr-contact__pills'>
            {TOPIC_OPTIONS.map((opt) => {
              const active = topicKey === opt.key;
              return (
                <button
                  key={opt.key}
                  type='button'
                  className={`vr-contact__pill ${
                    active ? 'vr-contact__pill--active' : ''
                  }`}
                  onClick={() => setTopicKey(opt.key)}
                  aria-pressed={active}
                >
                  <span className='vr-contact__pillIcon'>{opt.icon}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Hidden fields for EmailJS */}
          <input
            type='hidden'
            name='topic'
            value={topicLabel}
          />
          <input
            type='hidden'
            name='topic_key'
            value={topicKey}
          />
          <input
            type='hidden'
            name='subject'
            value={computedSubject}
          />

          <div className='vr-contact__grid'>
            <label className='vr-auth__field'>
              <span>Name</span>
              <input
                type='text'
                name='from_name'
                required
                placeholder='Your name'
                autoComplete='name'
              />
            </label>

            <label className='vr-auth__field'>
              <span>Email</span>
              <input
                type='email'
                name='user_email'
                required
                placeholder='you@example.com'
                autoComplete='email'
              />
            </label>
          </div>

          {/* Details (drives subject) */}
          <label className='vr-auth__field'>
            <span>{topicMeta.detailsLabel}</span>
            <input
              type='text'
              name='details'
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={topicMeta.detailsPlaceholder}
              maxLength={90}
            />
            <small className='vr-contact__hint'>
              We’ll use this to craft a clear email subject.
            </small>
          </label>

          <label className='vr-auth__field'>
            <span>Message</span>
            <textarea
              name='message'
              required
              rows={7}
              placeholder={topicMeta.messagePlaceholder}
              style={{ resize: 'vertical' }}
            />
          </label>

          <button
            className='vr-auth__submit vr-contact__submit'
            type='submit'
            disabled={sending}
          >
            {sending ? (
              'Sending…'
            ) : (
              <>
                Send Message{' '}
                <FiSend style={{ marginLeft: 8, verticalAlign: 'middle' }} />
              </>
            )}
          </button>

          {status?.message && (
            <p
              className={`vr-auth__message ${
                status.type === 'success' ? 'is-success' : 'is-error'
              }`}
            >
              {status.message}
            </p>
          )}

          {!canSend && (
            <p
              className='vr-auth__message'
              style={{ marginTop: '0.5rem' }}
            >
              (EmailJS keys not set yet — fallback: support@rekadish.com)
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
