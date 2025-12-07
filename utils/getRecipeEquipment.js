// utils/getRecipeEquipment.js
import { EQUIPMENT_PRODUCTS } from '../config/equipmentProducts.js';

/**
 * Collect instructions + condensed instructions into one lowercase blob.
 * Works on the full recipe object.
 */
function collectInstructionText(recipe) {
  if (!recipe) return '';

  const parts = [];

  if (Array.isArray(recipe.instructions)) {
    recipe.instructions.forEach((step) => {
      if (typeof step === 'string') parts.push(step);
      else if (step?.text) parts.push(step.text);
      else if (step?.instruction) parts.push(step.instruction);
    });
  }

  if (Array.isArray(recipe.instructions_condensed)) {
    recipe.instructions_condensed.forEach((step) => {
      if (typeof step === 'string') parts.push(step);
      else if (step?.text) parts.push(step.text);
      else if (step?.instruction) parts.push(step.instruction);
    });
  }

  return parts.join(' ').toLowerCase();
}

/**
 * Always returns up to `maxItems` products.
 * - Uses keyword matches from EQUIPMENT_PRODUCTS first
 * - If fewer than `maxItems` matches, fills the rest with default products
 */
export function getRecipeEquipmentForInstructions(recipe, maxItems = 3) {
  if (!recipe) return [];

  const instructionsText = collectInstructionText(recipe);

  // 1) Score products by keyword matches
  const scoredMatches = EQUIPMENT_PRODUCTS.map((product) => {
    let score = 0;

    // Support either `matchKeywords` or `keywords`
    const keywordList = product.matchKeywords || product.keywords || [];

    if (Array.isArray(keywordList)) {
      for (const keyword of keywordList) {
        if (!keyword) continue;
        if (instructionsText.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
    }

    return { product, score };
  }).filter((entry) => entry.score > 0);

  // Sort matches by score, then by optional defaultWeight
  scoredMatches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.product.defaultWeight || 0) - (a.product.defaultWeight || 0);
  });

  const result = [];
  const usedIds = new Set();

  // 2) Take top matches (up to maxItems)
  for (const entry of scoredMatches) {
    if (result.length >= maxItems) break;
    if (usedIds.has(entry.product.id)) continue;
    usedIds.add(entry.product.id);
    result.push(entry.product);
  }

  // 3) Fill remaining slots with default products
  if (result.length < maxItems) {
    const defaults = EQUIPMENT_PRODUCTS.filter((p) => p.isDefault) // mark defaults in config with isDefault: true
      .sort((a, b) => (b.defaultWeight || 0) - (a.defaultWeight || 0));

    for (const product of defaults) {
      if (result.length >= maxItems) break;
      if (usedIds.has(product.id)) continue;
      usedIds.add(product.id);
      result.push(product);
    }
  }

  return result.slice(0, maxItems);
}

export function getRandomEquipmentProducts(maxItems = 3) {
  if (!Array.isArray(EQUIPMENT_PRODUCTS) || EQUIPMENT_PRODUCTS.length === 0) {
    return [];
  }

  // Create a shallow copy so we don't mutate the original array
  const pool = EQUIPMENT_PRODUCTS.slice();

  // Fisher-Yates shuffle (better than sort + Math.random)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, maxItems);
}
