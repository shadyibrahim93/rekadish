// components/TipsAndTricks/PostComments.js
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import PostCommentItem from './PostCommentItem';

export default function PostComments({ postId, user }) {
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loading, setLoading] = useState(true);

  /* ----------------------------------------
     LOAD ALL COMMENTS FOR THIS POST
  ---------------------------------------- */
  async function loadComments() {
    if (!postId) return;

    const { data, error } = await supabase
      .from('post_comments')
      .select(
        `
        id,
        post_id,
        user_id,
        parent_id,
        comment_text,
        reaction_counts,
        user_reactions,
        created_at,
        profiles ( first_name, created_at )
      `
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading post comments:', error);
      setComments([]);
    } else {
      setComments(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  /* ----------------------------------------
     SUBMIT TOP-LEVEL COMMENT
  ---------------------------------------- */
  async function submitComment(e) {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    if (!user) {
      alert('Please sign in to leave a comment.');
      return;
    }

    const { error } = await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: user.id,
      comment_text: newCommentText,
      parent_id: null
    });

    if (error) {
      console.error('Error adding post comment:', error);
      return;
    }

    setNewCommentText('');
    loadComments();
  }

  /* ----------------------------------------
     SPLIT TOP-LEVEL & REPLIES
  ---------------------------------------- */
  const topLevel = comments.filter((c) => !c.parent_id);
  const replies = comments.filter((c) => c.parent_id);

  return (
    <div className='vr-card'>
      <div className='vr-section'>
        <h3 className='vr-category__title'>Comments</h3>

        {/* COMMENT INPUT */}
        <form
          className='vr-comment-input'
          onSubmit={submitComment}
        >
          <textarea
            placeholder={
              user
                ? 'Share your thoughts, tips, or questions about this guide…'
                : 'Sign in to share your thoughts…'
            }
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            disabled={!user}
          />
          <button
            type='submit'
            disabled={!user || !newCommentText.trim()}
          >
            Comment
          </button>
        </form>

        {loading && <p className='vr-comment__empty'>Loading comments…</p>}

        {!loading && topLevel.length === 0 && (
          <p className='vr-comment__empty'>
            No comments yet. Be the first to share your experience!
          </p>
        )}

        {/* LIST OF COMMENTS */}
        <div className='vr-comments-list'>
          {topLevel.map((comment) => (
            <PostCommentItem
              key={comment.id}
              comment={comment}
              replies={replies.filter((r) => r.parent_id === comment.id)}
              user={user}
              postId={postId}
              loadComments={loadComments}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
