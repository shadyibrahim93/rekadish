// components/Header.js
import { useEffect, useState } from 'react';
import SearchBox from './SearchBox';
import Link from 'next/link';
import { useRouter } from 'next/router'; // 1. Import useRouter
import { useUser } from './UserContext';
import { supabase } from '../lib/supabaseClient';
import CreateFromIngredients from './CreateFromIngredients.js';
import { BRAND_NAME } from '../lib/constants.js';
import { useModal } from './ModalContext.js';

export default function Header() {
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { setShowMealPlanner } = useModal();
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Helper to close menu
  const closeMenu = () => setMenuOpen(false);

  // Helper to navigate via button
  const handleNav = (path) => {
    closeMenu();
    router.push(path);
  };

  return (
    <>
      <header className='vr-header'>
        <div className='vr-header__inner'>
          {/* LEFT — Logo */}
          <Link href='/'>
            <div className='vr-header__brand'>
              <div className='vr-header__logo'>
                <img
                  src='/images/logo/brand_logo.webp'
                  alt='Value Recipe Logo'
                />
              </div>
              <div className='vr-header__brand-logo'>
                <span className='vr-header__title'>{BRAND_NAME}</span>
                <span className='vr-header__slogan'>
                  Make the Most of Every Ingredient.
                </span>
              </div>
            </div>
          </Link>

          {/* CENTER — Desktop search */}
          {!isMobile && (
            <div className='vr-header__search-desktop'>
              <SearchBox />
            </div>
          )}

          {/* RIGHT — Menu Button */}
          <button
            className={`vr-header__menu-btn ${menuOpen ? 'is-open' : ''}`}
            aria-label='Menu'
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className='bar bar1'></span>
            <span className='bar bar2'></span>
            <span className='bar bar3'></span>
          </button>
        </div>

        {/* MOBILE SEARCH BAR BELOW HEADER */}
        {isMobile && (
          <div className='vr-header__search-mobile'>
            <SearchBox />
          </div>
        )}
      </header>

      {/* MENU OVERLAY */}
      {menuOpen && (
        <div
          className='vr-menu-overlay'
          onClick={closeMenu}
        >
          <aside
            className='vr-menu'
            onClick={(e) => e.stopPropagation()}
          >
            <nav className='vr-menu__nav'>
              <Link
                href='/recipes'
                onClick={closeMenu}
              >
                <img
                  className='vr-menu__img'
                  src='/images/menu/recipes.webp'
                  alt='Recipes'
                />
                Recipes
              </Link>

              <Link
                href='/categories'
                onClick={closeMenu}
              >
                <img
                  className='vr-menu__img'
                  src='/images/menu/cuisine.webp'
                  alt='Cuisine'
                />
                Cuisine
              </Link>

              <Link
                href='/breakfast'
                onClick={closeMenu}
              >
                <img
                  className='vr-menu__img'
                  src='/images/menu/breakfast.webp'
                  alt='Breakfast'
                />
                Breakfast
              </Link>

              <Link
                href='/lunch'
                onClick={closeMenu}
              >
                <img
                  className='vr-menu__img'
                  src='/images/menu/lunch.webp'
                  alt='Lunch'
                />
                Lunch
              </Link>

              <Link
                href='/dinner'
                onClick={closeMenu}
              >
                <img
                  className='vr-menu__img'
                  src='/images/menu/dinner.webp'
                  alt='Dinner'
                />
                Dinner
              </Link>

              <Link
                href='/dessert'
                onClick={closeMenu}
              >
                <img
                  className='vr-menu__img'
                  src='/images/menu/dessert.webp'
                  alt='Desserts'
                />
                Desserts
              </Link>
              <Link
                href='#'
                onClick={(e) => [e.preventDefault(), setShowMealPlanner(true)]}
              >
                <img
                  className='vr-menu__img'
                  src='/images/menu/ingredients.webp'
                  alt='Meal Planner'
                />
                Meal Planner
              </Link>

              <div className='vr-menu__auth'>
                {!loading && !user && (
                  /* Converted to Button using router.push */
                  <button
                    className='vr-menu__auth-btn'
                    onClick={() => handleNav('/profile')}
                  >
                    Sign in / Sign up
                  </button>
                )}

                {!loading && user && (
                  <>
                    {/* Converted to Button using router.push */}
                    <button
                      className='vr-menu__auth-btn'
                      onClick={() => handleNav('/profile')}
                    >
                      Profile
                    </button>

                    <button
                      className='vr-menu__auth-btn'
                      onClick={async () => {
                        closeMenu();
                        await supabase.auth.signOut();
                      }}
                    >
                      Sign out
                    </button>
                  </>
                )}
              </div>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
