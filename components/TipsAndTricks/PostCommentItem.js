// components/TipsAndTricks/PostCommentItem.js
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { timeAgo } from '../../utils/timeAgo';
import { BRAND_NAME } from '../../lib/constants';

const EMOJIS = [
  { id: 'heart', icon: '❤️' },
  { id: 'chef', icon: '👨‍🍳' },
  { id: 'fire', icon: '🔥' },
  { id: 'clap', icon: '👏' },
  { id: 'laugh', icon: '😄' },
  { id: 'yum', icon: '😋' }
];

export default function PostCommentItem({
  comment,
  replies,
  user,
  postId,
  loadComments
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  const memberSinceYear = comment.profiles?.created_at
    ? new Date(comment.profiles.created_at).getFullYear()
    : null;

  /* ----------------------------------------
     SUBMIT A REPLY
  ---------------------------------------- */
  async function submitReply(e) {
    e.preventDefault();
    if (!replyText.trim()) return;

    if (!user) {
      alert('Please sign in to reply.');
      return;
    }

    const { error } = await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: user.id,
      comment_text: replyText,
      parent_id: comment.id
    });

    if (error) {
      console.error('Error adding reply to post comment:', error);
      return;
    }

    setReplyText('');
    setReplying(false);
    loadComments();
  }

  /* ----------------------------------------
     ADD A REACTION
  ---------------------------------------- */
  async function react(reactionId) {
    if (!user) {
      alert('Please sign in to react.');
      return;
    }

    const { error } = await supabase.rpc('add_post_comment_reaction', {
      comment_id: comment.id,
      user_id: user.id,
      reaction_id: reactionId
    });

    if (error) {
      console.error('Error adding reaction to post comment:', error);
      return;
    }

    loadComments();
  }

  return (
    <div className='vr-card vr-card--comments'>
      <div className='vr-comment'>
        <div className='vr-comment__header'>
          <div>
            <div className='vr-comment__name'>
              {comment.profiles?.first_name || `${BRAND_NAME} User`}
            </div>
            <div className='vr-comment__meta'>
              {memberSinceYear && (
                <span>
                  {BRAND_NAME} member since {memberSinceYear}
                  {' • '}
                </span>
              )}
              <span>{timeAgo(comment.created_at)}</span>
            </div>
          </div>
        </div>

        {/* COMMENT TEXT */}
        <p className='vr-comment__text'>{comment.comment_text}</p>

        {/* REACTIONS */}
        <div className='vr-comment__footer'>
          <div className='vr-comment__reactions'>
            {EMOJIS.map((e) => {
              const count = comment.reaction_counts?.[e.id] ?? 0;
              return (
                <button
                  key={e.id}
                  type='button'
                  onClick={() => react(e.id)}
                  className='vr-reaction-btn'
                >
                  <span className='vr-reaction-btn__icon'>{e.icon}</span>
                  <span className='vr-reaction-btn__count'>{count}</span>
                </button>
              );
            })}
          </div>

          <div className='vr-comment__actions'>
            <button
              type='button'
              onClick={() => setReplying((prev) => !prev)}
            >
              Reply
            </button>
          </div>
        </div>

        {/* REPLY INPUT */}
        {replying && (
          <form
            className='vr-reply-input'
            onSubmit={submitReply}
          >
            <textarea
              placeholder='Write a reply…'
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <div className='vr-reply-input__actions'>
              <button
                type='button'
                className='vr-reply-cancel'
                onClick={() => {
                  setReplying(false);
                  setReplyText('');
                }}
              >
                Cancel
              </button>

              <button
                type='submit'
                className='vr-reply-submit'
              >
                Reply
              </button>
            </div>
          </form>
        )}

        {/* REPLIES (ONE LEVEL) */}
        {replies?.length > 0 && (
          <div className='vr-replies'>
            {replies.map((reply) => {
              const replyMemberYear = reply.profiles?.created_at
                ? new Date(reply.profiles.created_at).getFullYear()
                : null;

              return (
                <div
                  key={reply.id}
                  className='vr-reply'
                >
                  <div className='vr-comment__header'>
                    <div>
                      <div className='vr-comment__name'>
                        {reply.profiles?.first_name || `${BRAND_NAME} User`}
                      </div>
                      <div className='vr-comment__meta'>
                        {replyMemberYear && (
                          <span>
                            {BRAND_NAME} member since {replyMemberYear}
                            {' • '}
                          </span>
                        )}
                        <span>{timeAgo(reply.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <p className='vr-comment__text'>{reply.comment_text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
