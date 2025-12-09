// pages/profile.js
import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../components/UserContext';
import RecipeCard from '../components/RecipeCard';
import { getFavoriteIds } from '../lib/favorites';
import FavoriteAddBox from '../components/FavoriteAddBox';
import CreateFromIngredients from '../components/CreateFromIngredients';
import { BRAND_NAME } from '../lib/constants';
import SideBar from '../components/SideBar.js';

// System categories always present:
const SYSTEM_CATEGORIES = [
  { name: 'Favorites', slug: 'favorites' },
  { name: 'Christmas', slug: 'christmas' },
  { name: 'Thanksgiving', slug: 'thanksgiving' }
];

const SYSTEM_ORDER = ['favorites', 'christmas', 'thanksgiving'];

export default function ProfilePage() {
  const { user, loading } = useUser();

  // AUTH MODES
  const [authMode, setAuthMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  // SIGNUP FIELDS
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // PROFILE
  const [userProfile, setUserProfile] = useState(null);

  // PASSWORD CHANGE
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  // FAVORITES (local)
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);

  // COLLECTIONS
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [collectionRecipes, setCollectionRecipes] = useState({});

  // Newsletter state
  const [subscribed, setSubscribed] = useState(false);
  const [newsletterLoaded, setNewsletterLoaded] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState(user?.email || '');
  const [subscribeMessage, setSubscribeMessage] = useState('');

  // DELETING DATA
  const [deleteMessage, setDeleteMessage] = useState('');

  // -------------------------
  // AUTH HANDLERS
  // -------------------------
  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) setAuthMessage(error.message);
    else setAuthMessage('Signed in successfully.');
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthMessage('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, phone }
      }
    });

    if (error) return setAuthMessage(error.message);

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        phone
      });
    }

    setAuthMessage('Check your email to confirm your account.');
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setAuthMessage('');

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/profile`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });
    if (error) setAuthMessage(error.message);
    else setAuthMessage('Password reset email sent.');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg('');

    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) setPwMsg(error.message);
    else setPwMsg('Password updated successfully.');
  };

  const handleUnsubscribe = async () => {
    await fetch('/api/newsletter/newsletter-unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email })
    });

    setSubscribed(false);
    setSubscribeEmail(user.email);
  };

  const handleSubscribeBack = async (e) => {
    e.preventDefault();

    const res = await fetch('/api/newsletter/newsletter-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: subscribeEmail })
    });

    setSubscribeMessage("🎉 You're subscribed again!");
    setSubscribed(true);
  };

  // -------------------------
  // LOAD COLLECTIONS (reusable)
  // -------------------------
  const loadCollections = useCallback(async () => {
    if (!user) return;

    setCollectionsLoading(true);

    let { data: cols } = await supabase
      .from('user_collections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    cols = cols || [];

    // Ensure system categories exist
    const missing = SYSTEM_CATEGORIES.filter(
      (sys) => !cols.some((c) => c.slug === sys.slug)
    );

    if (missing.length > 0) {
      const { data: inserted } = await supabase
        .from('user_collections')
        .insert(
          missing.map((m) => ({
            user_id: user.id,
            name: m.name,
            slug: m.slug,
            is_system: true,
            recipes: []
          }))
        )
        .select();

      cols = [...cols, ...(inserted || [])];
    }

    // Normalize IDs
    cols = cols.map((c) => ({
      ...c,
      recipes: Array.isArray(c.recipes) ? c.recipes.map((id) => String(id)) : []
    }));

    // Order: system first
    cols.sort((a, b) => {
      const aIndex = SYSTEM_ORDER.indexOf(a.slug);
      const bIndex = SYSTEM_ORDER.indexOf(b.slug);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      return a.name.localeCompare(b.name);
    });

    setCollections(cols);
    setCollectionsLoading(false);
  }, [user]);

  // run when user is ready
  useEffect(() => {
    if (!user) return;
    loadCollections();
  }, [user, loadCollections]);

  // -------------------------
  // FETCH PROFILE
  // -------------------------
  useEffect(() => {
    if (!user) return;

    async function loadProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setUserProfile(data || null);
    }

    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    async function loadStatus() {
      const res = await fetch(
        `/api/newsletter/newsletter-status?email=${user.email}`
      );
      const json = await res.json();
      setSubscribed(json.subscribed);
      setNewsletterLoaded(true);
    }

    loadStatus();
  }, [user]);

  // -------------------------
  // LOAD FAVORITES (local)
  // -------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    async function loadFavorites() {
      const ids = getFavoriteIds();

      if (ids.length === 0) {
        setFavoriteRecipes([]);
        setFavoritesLoading(false);
        return;
      }

      const res = await fetch(
        `/api/recipes?ids=${encodeURIComponent(ids.join(','))}&per_page=${
          ids.length
        }`
      );
      const json = await res.json();

      setFavoriteRecipes(json.data || []);
      setFavoritesLoading(false);
    }

    loadFavorites();
  }, []);

  // -------------------------
  // REFRESH PROFILE WHEN CATEGORIES ARE SAVED
  // -------------------------
  useEffect(() => {
    if (!user) return;
    if (typeof window === 'undefined') return;

    function handleCollectionsSaved(e) {
      const detail = e.detail || {};
      const { userId } = detail;

      if (userId && userId !== user.id) return;

      // Just reload collections; recipes will follow via [collections] effect
      loadCollections();
    }

    window.addEventListener('vr-collections-saved', handleCollectionsSaved);

    return () => {
      window.removeEventListener(
        'vr-collections-saved',
        handleCollectionsSaved
      );
    };
  }, [user, loadCollections]);

  // -------------------------
  // LOAD RECIPES FOR EACH CATEGORY
  // -------------------------
  useEffect(() => {
    if (!collections.length) {
      setCollectionRecipes({});
      return;
    }

    async function loadRecipesForCollections() {
      const map = {};

      for (const col of collections) {
        const ids = Array.isArray(col.recipes) ? col.recipes : [];
        if (!ids.length) {
          map[col.id] = [];
          continue;
        }

        const res = await fetch(
          `/api/recipes?ids=${encodeURIComponent(ids.join(','))}&per_page=${
            ids.length
          }`
        );
        const json = await res.json();
        map[col.id] = json.data || [];
      }

      setCollectionRecipes(map);
    }

    loadRecipesForCollections();
  }, [collections]);

  // -------------------------
  // DELETE USER DATA
  // -------------------------
  const handleDeleteData = async () => {
    if (!user) return;
    if (!confirm('Delete all your recipe categories?')) return;

    const { error } = await supabase
      .from('user_collections')
      .delete()
      .eq('user_id', user.id);

    if (error) setDeleteMessage(error.message);
    else setDeleteMessage('Your collections have been deleted.');
  };

  // -------------------------
  // RENDER: NOT LOGGED IN
  // -------------------------
  if (!loading && !user) {
    return (
      <div className='vr-page'>
        <Head>
          <title>{BRAND_NAME} — Profile</title>
        </Head>

        <div className='vr-auth'>
          <h1 className='vr-page__title'>Your {BRAND_NAME} Profile</h1>
          <p className='vr-page__subtitle'>
            Sign in to save recipes, create categories, and more.
          </p>

          <div className='vr-auth__tabs'>
            {['signin', 'signup', 'forgot'].map((mode) => (
              <button
                key={mode}
                className={`vr-auth__tab ${
                  authMode === mode ? 'vr-auth__tab--active' : ''
                }`}
                onClick={() => setAuthMode(mode)}
              >
                {mode === 'signin' && 'Sign In'}
                {mode === 'signup' && 'Sign Up'}
                {mode === 'forgot' && 'Forgot Password'}
              </button>
            ))}
          </div>

          <form
            className='vr-auth__form'
            onSubmit={
              authMode === 'signin'
                ? handleSignIn
                : authMode === 'signup'
                ? handleSignUp
                : handleForgot
            }
          >
            <label className='vr-auth__field'>
              <span>Email</span>
              <input
                type='email'
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            {authMode === 'signup' && (
              <>
                <label className='vr-auth__field'>
                  <span>First Name</span>
                  <input
                    type='text'
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </label>

                <label className='vr-auth__field'>
                  <span>Last Name</span>
                  <input
                    type='text'
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </label>

                <label className='vr-auth__field'>
                  <span>Phone Number</span>
                  <input
                    type='tel'
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
              </>
            )}

            {authMode !== 'forgot' && (
              <label className='vr-auth__field'>
                <span>Password</span>
                <input
                  type='password'
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            )}

            <button
              className='vr-auth__submit'
              type='submit'
            >
              {authMode === 'signin'
                ? 'Sign In'
                : authMode === 'signup'
                ? 'Create Account'
                : 'Send Reset Email'}
            </button>

            {authMessage && <p className='vr-auth__message'>{authMessage}</p>}
          </form>
        </div>
      </div>
    );
  }

  // -------------------------
  // RENDER: LOGGED IN
  // -------------------------
  return (
    <div className='vr-page'>
      <Head>
        <title>
          {BRAND_NAME} —{' '}
          {userProfile?.first_name + "'s" ||
            user?.user_metadata?.first_name + "'s" ||
            'Chef'}{' '}
          Profile
        </title>
      </Head>

      <h1 className='vr-page__title'>
        Hello,{' '}
        {userProfile?.first_name || user?.user_metadata?.first_name || 'Chef'}
      </h1>

      <div className='vr-layout'>
        <div className='vr-layout__main'>
          {/* CREATE FROM INGREDIENTS */}
          <div className='vr-card'>
            <CreateFromIngredients />
          </div>

          {/* USER CATEGORIES */}
          {!collectionsLoading &&
            collections.map((col) => {
              const recipes = collectionRecipes[col.id] || [];

              return (
                <section
                  key={col.id}
                  className='vr-category vr-category--profile vr-card'
                >
                  <h2 className='vr-category__title'>
                    {col.name === 'Favorites'
                      ? 'Favorite Recipes'
                      : `${col.name} Menu`}
                  </h2>
                  <p className='vr-category__subtitle'>
                    Recipes saved to your “{col.name}” category.
                  </p>

                  <div className='vr-category__grid'>
                    {recipes.length === 0 ? (
                      <FavoriteAddBox label='Add Recipes' />
                    ) : (
                      recipes.map((r) => (
                        <RecipeCard
                          key={r.id}
                          recipe={r}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}

          {/* ACCOUNT SETTINGS */}
          <section className='vr-category vr-category--profile vr-card'>
            <h2 className='vr-category__title'>Account Settings</h2>

            <form
              className='vr-auth__form vr-auth__form--inline'
              onSubmit={handlePasswordChange}
            >
              <label className='vr-auth__field'>
                <span>Change Password</span>
                <input
                  type='password'
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder='New password'
                />
              </label>
              <button
                className='vr-auth__submit'
                type='submit'
              >
                Update Password
              </button>
            </form>
            {pwMsg && <p className='vr-auth__message'>{pwMsg}</p>}

            <div className='vr-account-actions'>
              <button
                type='button'
                className='vr-account-actions__btn'
                onClick={async () => {
                  const redirectTo =
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/profile`
                      : undefined;

                  await supabase.auth.resetPasswordForEmail(user.email, {
                    redirectTo
                  });
                  alert('Reset email sent.');
                }}
              >
                Forgot Password (send email)
              </button>

              <button
                type='button'
                className='vr-account-actions__btn vr-account-actions__btn--danger'
                onClick={handleDeleteData}
              >
                Delete My Data (collections)
              </button>
              {deleteMessage && (
                <p className='vr-auth__message'>{deleteMessage}</p>
              )}
            </div>
          </section>
          {/* NEWSLETTER SETTINGS */}
          <section className='vr-category vr-category--profile vr-card'>
            <h2 className='vr-category__title'>Newsletter Preferences</h2>

            {!newsletterLoaded ? (
              <p>Checking subscription…</p>
            ) : subscribed ? (
              <>
                <p>You are currently subscribed to our newsletter.</p>
                <button
                  type='button'
                  className='vr-account-actions__btn vr-account-actions__btn--danger'
                  onClick={handleUnsubscribe}
                >
                  Unsubscribe from Newsletter
                </button>
              </>
            ) : (
              <>
                <p>You’re not subscribed. Enter your email to subscribe:</p>

                <form
                  className='vr-auth__form vr-auth__form--inline'
                  onSubmit={handleSubscribeBack}
                >
                  <label className='vr-auth__field'>
                    <span>Email</span>
                    <input
                      type='email'
                      required
                      value={subscribeEmail}
                      onChange={(e) => setSubscribeEmail(e.target.value)}
                      placeholder='Enter your email'
                    />
                  </label>

                  <button
                    className='vr-auth__submit'
                    type='submit'
                  >
                    Subscribe
                  </button>
                </form>

                {subscribeMessage && (
                  <p className='vr-auth__message'>{subscribeMessage}</p>
                )}
              </>
            )}
          </section>
        </div>

        {/* SIDEBAR */}
        <SideBar />
      </div>
    </div>
  );
}
