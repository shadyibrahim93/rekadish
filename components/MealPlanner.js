// components/MealPlanner.js
import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import {
  FiTrash2,
  FiMoreVertical,
  FiPrinter,
  FiCopy,
  FiShare2,
  FiX
} from 'react-icons/fi';
import { useMealPlanner } from './MealPlannerContext';
import formatFraction from '../utils/formatFraction';
import Image from 'next/image';
import { BRAND_NAME } from '../lib/constants';

const SERVINGS_STORAGE_KEY = 'vr-meal-planner-servings';

/* --- HELPER FUNCTIONS (Parsing, Units, etc.) --- */
function parseIngredientQuantity(str) {
  if (!str) return { value: 0, fullText: '' };
  const trimmed = String(str).trim();
  const regex = /^(\d+\s+\d+\/\d+|(?:\d+\/\d+)|\d+(?:\.\d+)?)\s*(.*)$/;
  const match = trimmed.match(regex);
  if (!match) return { value: 0, fullText: trimmed };

  const numberString = match[1];
  const rawUnitText = match[2] || '';
  let value = 0;

  if (numberString.includes(' ') && numberString.includes('/')) {
    const [wholeStr, fracStr] = numberString.split(' ');
    const [n, d] = fracStr.split('/').map(Number);
    value = parseFloat(wholeStr) + n / d;
  } else if (numberString.includes('/')) {
    const [n, d] = numberString.split('/').map(Number);
    value = d ? n / d : 0;
  } else {
    value = parseFloat(numberString);
  }
  return { value, fullText: rawUnitText };
}

function getBaseUnit(text) {
  if (!text) return null;
  const cleaned = text.replace(/[(),]/g, '').trim().toLowerCase();
  const words = cleaned.split(/\s+/);
  if (words.length === 0) return null;
  const firstWord = words[0];
  const standardUnits = new Set([
    'cup',
    'cups',
    'c',
    'teaspoon',
    'teaspoons',
    'tsp',
    'tsps',
    't',
    'tablespoon',
    'tablespoons',
    'tbsp',
    'tbsps',
    'T',
    'ounce',
    'ounces',
    'oz',
    'pound',
    'pounds',
    'lb',
    'lbs',
    'gram',
    'grams',
    'g',
    'kilogram',
    'kilograms',
    'kg',
    'milliliter',
    'milliliters',
    'ml',
    'liter',
    'liters',
    'l',
    'pint',
    'pints',
    'pt',
    'quart',
    'quarts',
    'qt',
    'gallon',
    'gallons',
    'gal',
    'clove',
    'cloves',
    'pinch',
    'pinches',
    'dash',
    'dashes',
    'slice',
    'slices',
    'can',
    'cans',
    'package',
    'packages',
    'pkt',
    'piece',
    'pieces'
  ]);
  if (
    firstWord === 'fluid' &&
    words[1] &&
    (words[1].startsWith('oz') || words[1].startsWith('ounce'))
  ) {
    return 'fl oz';
  }
  if (standardUnits.has(firstWord)) return firstWord;
  return null;
}

function buildAggregatedIngredients(
  plannerItems,
  servings,
  checkedIngredients
) {
  const map = new Map();
  const factor = Math.max(1, servings || 1);

  plannerItems.forEach((item) => {
    if (!item.includeIngredients) return;

    (item.ingredients || []).forEach((ing) => {
      if (!ing || !ing.ingredient) return;
      const key = ing.ingredient.trim().toLowerCase();
      const isChecked = checkedIngredients.includes(key);

      if (!map.has(key)) {
        map.set(key, {
          ingredient: ing.ingredient,
          image: ing.image || null,
          totalAmount: 0,
          baseUnit: null,
          displayUnit: null,
          isChecked: isChecked,
          lines: []
        });
      }

      const entry = map.get(key);
      entry.isChecked = isChecked; // Update check status
      const rawQty = ing.quantity || '';
      const { value, fullText } = parseIngredientQuantity(rawQty);
      const currentBaseUnit = getBaseUnit(fullText);

      let displayString = '';

      if (value > 0) {
        const scaledValue = value * factor;
        const niceNumber = formatFraction(scaledValue);
        displayString = fullText ? `${niceNumber} ${fullText}` : niceNumber;

        if (entry.baseUnit === null && entry.totalAmount === 0) {
          entry.baseUnit = currentBaseUnit;
          entry.displayUnit = fullText;
          entry.totalAmount = scaledValue;
        } else if (entry.baseUnit === currentBaseUnit) {
          entry.totalAmount += scaledValue;
        } else {
          entry.baseUnit = false;
        }
      } else {
        displayString = fullText || 'As needed';
        entry.baseUnit = false;
      }

      entry.lines.push({ recipeTitle: item.title, text: displayString });
    });
  });

  return Array.from(map.values()).sort((a, b) =>
    a.ingredient.localeCompare(b.ingredient)
  );
}

function formatTotal(entry) {
  if (entry.baseUnit !== false && entry.totalAmount > 0) {
    const nice = formatFraction(entry.totalAmount);
    return entry.displayUnit ? `${nice} ${entry.displayUnit}` : nice;
  }
  const uniqueLines = [...new Set(entry.lines.map((l) => l.text))];
  if (!uniqueLines.length) return 'As needed';
  return uniqueLines.join(', ');
}

export default function MealPlanner() {
  const {
    plannerItems,
    checkedIngredients,
    toggleIngredientCheck,
    toggleIncludeIngredients,
    removeRecipeFromPlanner,
    clearPlanner
  } = useMealPlanner();

  const [servings, setServings] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false); // Menu Toggle State
  const menuRef = useRef(null); // To detect clicks outside

  // Click Outside to close menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuRef]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(SERVINGS_STORAGE_KEY);
    if (!raw) return;
    const num = Number(raw);
    if (!Number.isNaN(num) && num > 0) setServings(num);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SERVINGS_STORAGE_KEY, String(servings));
  }, [servings]);

  const aggregated = useMemo(
    () =>
      buildAggregatedIngredients(plannerItems, servings, checkedIngredients),
    [plannerItems, servings, checkedIngredients]
  );

  const hasItems = plannerItems.length > 0;

  /* --- ACTIONS --- */

  const generateTextData = () => {
    const have = aggregated.filter((i) => i.isChecked);
    const need = aggregated.filter((i) => !i.isChecked);
    const title = `Meal Planner Shopping List (${servings} serving${
      servings === 1 ? '' : 's'
    })`;

    let text = `${title}\n\nLink: ${window.location.href}\n\n`;

    text += `[ITEMS TO BUY]\n`;
    text += need.length
      ? need.map((e) => `[ ] ${e.ingredient}: ${formatTotal(e)}`).join('\n')
      : '• None - you have everything!';

    text += `\n\n[ALREADY HAVE]\n`;
    text += have.length
      ? have.map((e) => `[x] ${e.ingredient}: ${formatTotal(e)}`).join('\n')
      : '• None yet';

    text += `\n\n[RECIPES INCLUDED]\n`;
    plannerItems.forEach((p) => {
      text += `${p.includeIngredients ? '[x]' : '[ ]'} ${p.title}\n`;
    });

    return { title, text };
  };

  const handleCopyList = async () => {
    const { text } = generateTextData();
    try {
      await navigator.clipboard.writeText(text);
      alert('Meal plan copied to clipboard!');
    } catch (err) {
      console.error('Copy failed', err);
    }
    setMenuOpen(false);
  };

  const handleShareList = async () => {
    const { title, text } = generateTextData();
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
      } else {
        handleCopyList(); // Fallback to copy
      }
    } catch (err) {
      console.error('Share failed', err);
    }
    setMenuOpen(false);
  };

  const handlePrintList = () => {
    setMenuOpen(false);
    window.print();
  };

  const handleChangeServings = (delta) => {
    setServings((prev) => Math.max(1, (prev || 1) + delta));
  };

  const handleServingsInputChange = (e) => {
    const value = Number(e.target.value);
    if (!Number.isNaN(value)) setServings(Math.min(99, Math.max(1, value)));
  };

  return (
    <div className='vr-card vr-meal-planner'>
      <div
        className='vr-section-header'
        style={{ position: 'relative' }}
      >
        <h4 className='vr-category__title'>Meal Planner</h4>

        {/* 3 DOT MENU BUTTON */}
        {hasItems && (
          <div
            className='vr-planner-menu-container'
            ref={menuRef}
          >
            <button
              type='button'
              className='vr-icon-btn vr-icon-btn--menu'
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <FiMoreVertical />
            </button>

            {menuOpen && (
              <div className='vr-planner-dropdown'>
                <button
                  type='button'
                  onClick={handleCopyList}
                >
                  <FiCopy /> Copy Plan
                </button>
                <button
                  type='button'
                  onClick={handlePrintList}
                >
                  <FiPrinter /> Print Plan
                </button>
                <button
                  type='button'
                  onClick={handleShareList}
                >
                  <FiShare2 /> Share Plan
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {!hasItems && (
        <p class='vr-meal-planner__empty'>
          Your planner is looking a little empty! Explore our recipes and click
          the <strong>+</strong> icon to start building your menu.
        </p>
      )}

      {hasItems && (
        <div className='vr-print-area'>
          {/* Note: Added vr-print-area wrapper to help CSS targeting */}
          <div className='vr-print-header'>
            <h1>Shopping List</h1>
            <p>
              Generated by {BRAND_NAME} • {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className='vr-meal-planner__controls no-print'>
            <div className='vr-meal-planner__servings'>
              <h5 className='vr-meal-planner__subheading'>Servings</h5>
              <div className='vr-meal-planner__servings-controls'>
                <button
                  type='button'
                  className='vr-meal-planner__servings-btn'
                  onClick={() => handleChangeServings(-1)}
                >
                  −
                </button>
                <input
                  type='number'
                  min={1}
                  max={99}
                  value={servings}
                  onChange={handleServingsInputChange}
                  className='vr-meal-planner__servings-input'
                />
                <button
                  type='button'
                  className='vr-meal-planner__servings-btn'
                  onClick={() => handleChangeServings(1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className='vr-meal-planner__recipes'>
            <h5 className='vr-meal-planner__subheading'>Planned recipes</h5>
            <ul>
              {plannerItems.map((item) => (
                <li
                  key={item.id}
                  className='vr-meal-planner__recipe'
                >
                  <div className='vr-meal-planner__recipe-main'>
                    <div className='vr-meal-planner__recipe-info'>
                      <label className='vr-meal-planner__include'>
                        <input
                          type='checkbox'
                          checked={item.includeIngredients}
                          onChange={() => toggleIncludeIngredients(item.id)}
                        />
                      </label>
                      <Link href={`/recipes/${item.slug || item.id}`}>
                        <span
                          className='vr-meal-planner__recipe-title'
                          data-print-check={
                            item.includeIngredients ? '[x]' : '[ ]'
                          }
                        >
                          {item.title}
                        </span>
                      </Link>
                      {/* Hide remove button in print */}
                      <button
                        className='vr-meal-planner__remove no-print'
                        onClick={() => removeRecipeFromPlanner(item.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className='vr-meal-planner__ingredients'>
            <h5 className='vr-meal-planner__subheading'>
              Combined ingredients
            </h5>
            {aggregated.length > 0 ? (
              <div className='vr-meal-planner__ingredient-list'>
                {aggregated.map((entry) => (
                  <div
                    key={entry.ingredient}
                    className='vr-meal-planner__ingredient-item'
                    style={{ position: 'relative' }}
                  >
                    <div
                      className={`vr-ingredient-check ${
                        entry.isChecked ? 'checked' : ''
                      }`}
                      onClick={() => toggleIngredientCheck(entry.ingredient)}
                    >
                      ✓
                    </div>

                    <div className='vr-meal-planner__ingredient-media no-print'>
                      <Image
                        src={
                          entry.image
                            ? `/images/ingredients/${entry.image}.webp`
                            : '/images/ingredients/placeholder.webp'
                        }
                        alt={entry.ingredient}
                        width={46}
                        height={46}
                      />
                    </div>
                    <div className='vr-meal-planner__ingredient-body'>
                      <div className='vr-meal-planner__ingredient-top'>
                        <span className='vr-meal-planner__ingredient-name'>
                          {entry.ingredient}
                        </span>
                        <span className='vr-meal-planner__ingredient-total'>
                          {formatTotal(entry)}
                        </span>
                      </div>
                      <div className='vr-meal-planner__ingredient-notes'>
                        {entry.lines.length > 1 && (
                          <span>
                            From:{' '}
                            {entry.lines.map((c) => c.recipeTitle).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='vr-meal-planner__empty'>
                <p>No ingredients selected.</p>
              </div>
            )}
          </div>

          <div className='vr-meal-planner__footer no-print'>
            <button
              type='button'
              className='vr-meal-planner__clear'
              onClick={clearPlanner}
            >
              <FiTrash2 /> <span>Clear planner</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
