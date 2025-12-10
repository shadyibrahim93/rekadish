// components/Header.js
import { useEffect, useState } from 'react';
import SearchBox from './SearchBox';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useUser } from './UserContext';
import { supabase } from '../lib/supabaseClient';
import { BRAND_NAME } from '../lib/constants.js';
import { useModal } from './ModalContext.js';
import { IoPerson, IoPersonOutline } from 'react-icons/io5';

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

  const closeMenu = () => setMenuOpen(false);

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

          {/* RIGHT — ACTIONS WRAPPER */}
          <div className='vr-header__actions'>
            {/* PROFILE ICON BUTTON */}
            <button
              className={`vr-header__profile-btn ${user ? 'is-logged-in' : ''}`}
              onClick={() => {
                closeMenu();
                router.push('/profile');
              }}
              aria-label={user ? 'My Kitchen' : 'Sign In'}
              title={user ? 'My Kitchen' : 'Sign In'}
            >
              {!loading && user ? (
                <IoPerson size={22} />
              ) : (
                <IoPersonOutline size={24} />
              )}
            </button>

            {/* HAMBURGER MENU BUTTON */}
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
              <h4 className='vr-category__title'>Explore Meals</h4>
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

              <h4 className='vr-category__title'>Kitchen Guides</h4>
              <Link
                href='/tips-and-tricks'
                onClick={closeMenu}
              >
                <img
                  className='vr-menu__img'
                  src='/images/menu/tips-and-tricks.webp'
                  alt='Tips and tricks'
                />
                Tips And Tricks
              </Link>

              <Link
                href='/team'
                onClick={closeMenu}
              >
                <img
                  className='vr-menu__img'
                  src='/images/menu/team.webp'
                  alt='RekaDish Team'
                />
                {BRAND_NAME} Team
              </Link>

              <div className='vr-menu__auth'>
                {!loading && !user && (
                  <button
                    className='vr-menu__auth-btn'
                    onClick={() => handleNav('/profile')}
                  >
                    Sign in / Sign up
                  </button>
                )}

                {!loading && user && (
                  <>
                    <h4 className='vr-category__title'>My Kitchen</h4>
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
