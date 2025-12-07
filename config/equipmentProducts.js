// config/equipmentProducts.js

/** @typedef {{
 *   id: string;
 *   asin: string;
 *   label: string;
 *   imageUrl?: string;
 *   shortDescription?: string;
 *   details?: string[];
 *   keywords?: string[];
 *   isDefault?: boolean;
 * }} RecipeEquipmentProduct
 */

/**
 * Master list of equipment / specialty items.
 * - `keywords` are used to detect matches in the instructions text.
 * - `isDefault: true` means it can be used as a fallback if nothing matches.
 */
export const EQUIPMENT_PRODUCTS = /** @type {RecipeEquipmentProduct[]} */ ([
  {
    id: 'nonstick-skillet-12in',
    asin: 'B09ZV37WC6',
    label: '12-Inch Nonstick Skillet',
    imageUrl: '91+39wrEAAL._AC_SL1500_.jpg',
    shortDescription: 'Perfect for searing, sautéing, and one-pan meals.',
    details: ['Even heat distribution', 'Comfortable handle', 'Easy to clean'],
    keywords: ['skillet', 'frying pan', 'nonstick pan', 'non-stick pan']
  },
  {
    id: 'sheet-pan',
    asin: 'B0049C2S32',
    label: 'Half-Sheet Baking Pan',
    imageUrl: '61PeuS71mCL._AC_.jpg',
    shortDescription: 'Sturdy aluminum sheet pan for roasting and baking.',
    details: ['Warp-resistant', 'Oven-safe', 'Great for sheet-pan dinners'],
    keywords: [
      'sheet pan',
      'baking sheet',
      'sheet-pan',
      'sheet tray',
      'baking tray',
      'baking'
    ]
  },
  {
    id: 'mixing-bowl-set',
    asin: 'B88HHUSSK94J',
    label: 'Stainless Steel Mixing Bowl Set',
    imageUrl: '81-YpxiBgKL._AC_SL1500_.jpg',
    shortDescription:
      'Handy nesting bowls for mixing batters, salads, and more.',
    details: ['Multiple sizes', 'Nesting design', 'Dishwasher safe'],
    keywords: ['mixing bowl', 'large bowl', 'medium bowl', 'small bowl', 'mix']
  },
  {
    id: '9x13-baking-dish',
    asin: 'B087QZQX8V',
    label: 'Glass Baking Dish Set With Lids',
    imageUrl: '51LNekJ0dbL._AC_.jpg',
    shortDescription: 'Ideal for casseroles, baked pasta, and desserts.',
    details: ['Oven-safe', 'Microwave-safe', 'Great for casseroles'],
    keywords: ['9x13', 'baking dish', 'casserole dish', 'rectangular pan']
  },
  {
    id: 'immersion-blender',
    asin: 'B0CTR49RS1',
    label: 'Immersion Hand Blender',
    imageUrl: '71kaI9J+kDL._AC_SL1500_.jpg',
    shortDescription: 'Blend soups and sauces directly in the pot.',
    details: ['Detachable shaft', 'Easy cleanup', 'Compact storage'],
    keywords: ['immersion blender', 'hand blender', 'stick blender']
  },
  {
    id: 'silicone-spatula-set',
    asin: 'B07LHJWVDB',
    label: 'Silicone Spatula Set',
    imageUrl: 'A1+hdDzE+0L._AC_SL1500_.jpg',
    shortDescription:
      'Heat-resistant silicone spatulas for stirring, folding, and scraping bowls clean.',
    details: ['Heat-resistant', 'Gentle on nonstick pans', 'Easy to clean'],
    keywords: [
      'spatula',
      'silicone spatula',
      'rubber spatula',
      'scrape the sides'
    ]
  },

  {
    id: 'balloon-whisk',
    asin: 'B08HMXNKL4',
    label: 'Balloon Whisk',
    imageUrl: '71Kdi0ExFaL._AC_SL1500_.jpg',
    shortDescription:
      'Perfect for whisking eggs, sauces, and batters until smooth and airy.',
    details: ['Comfortable handle', 'Great for sauces & eggs'],
    keywords: [
      'whisk',
      'whisk together',
      'whisk until',
      'beat the eggs',
      'beat until smooth'
    ]
  },

  {
    id: 'box-grater',
    asin: 'B01FNR4REY',
    label: 'Box Grater',
    imageUrl: '9132rNpaY8L._AC_SL1500_.jpg',
    shortDescription:
      'Multi-sided grater for shredding cheese, veggies, and more.',
    details: ['Multiple grating sizes', 'Sturdy base'],
    keywords: [
      'grate',
      'grated',
      'shred',
      'shredded cheese',
      'grate the cheese'
    ]
  },

  {
    id: 'citrus-zester',
    asin: 'B0738C7RXF',
    label: 'Citrus Zester / Microplane',
    imageUrl: '71S4DfQEwXL._AC_SL1500_.jpg',
    shortDescription: 'Finely zest citrus and grate hard cheeses with ease.',
    details: ['Razor-sharp blades', 'Great for lemon zest'],
    keywords: ['zest', 'zester', 'lemon zest', 'lime zest', 'microplane']
  },

  {
    id: 'silicone-baking-mats',
    asin: 'B0725GYNG6',
    label: 'Silicone Baking Mats',
    imageUrl: '81sZX3Zl40L._AC_SL1500_.jpg',
    shortDescription:
      'Reusable mats that replace parchment paper on baking sheets.',
    details: ['Nonstick surface', 'Reusable', 'Easy cleanup'],
    keywords: [
      'parchment',
      'parchment paper',
      'line the pan',
      'line a baking sheet'
    ]
  },

  {
    id: 'cooling-rack',
    asin: 'B0757ZHMMX',
    label: 'Wire Cooling Rack',
    imageUrl: '81zJwOntZwL._AC_SL1500_.jpg',
    shortDescription:
      'Let cookies, cakes, and fried foods cool or drain properly.',
    details: ['Oven-safe', 'Fits standard sheet pans'],
    keywords: ['cooling rack', 'wire rack', 'cool on a rack', 'set on a rack']
  },

  {
    id: 'colander-strainer',
    asin: 'B07CTJFSSJ',
    label: 'Large Colander / Strainer',
    imageUrl: '6170+Gtr3iL._AC_SL1010_.jpg',
    shortDescription: 'Drain pasta, beans, and vegetables quickly and safely.',
    details: ['Large capacity', 'Sturdy handles'],
    keywords: [
      'colander',
      'strainer',
      'drain the pasta',
      'drain the beans',
      'drain in a colander'
    ]
  },

  {
    id: 'kitchen-tongs',
    asin: 'B07V49KW72',
    label: 'Stainless Steel Kitchen Tongs',
    imageUrl: '81rDE73xOqL._AC_SL1500_.jpg',
    shortDescription:
      'Ideal for flipping chicken, tossing salads, and serving hot foods.',
    details: ['Locking handle', 'Silicone tips (nonstick-safe)'],
    keywords: ['tongs', 'flip the chicken', 'turn the wings', 'turn the pieces']
  },
  {
    id: 'air-fryer',
    asin: 'B089TQWJKK',
    label: 'Air Fryer',
    imageUrl: '91NjZc9MtcL._AC_SL1500_.jpg',
    shortDescription:
      'Crisp fries, wings, and more with less oil using hot air circulation.',
    details: ['Multiple temperature settings', 'Nonstick basket'],
    keywords: [
      'air fryer',
      'air-fry',
      'air fryer basket',
      'place in the air fryer'
    ]
  },
  {
    id: 'muffin-pan-12cup',
    asin: 'B001K26ZPG',
    label: '12-Cup Muffin Pan',
    imageUrl: '91pgZIGNTKL._AC_SL1500_.jpg',
    shortDescription: 'Bake muffins, cupcakes, and mini egg bites evenly.',
    details: ['Standard 12-cup size', 'Nonstick interior'],
    keywords: ['muffin pan', 'cupcake pan', 'muffin tin', 'cupcake tin']
  },
  // --- DEFAULTS (used when no keyword matches) ---

  {
    id: 'default-cutting-board',
    asin: 'B07S3Z6DZH',
    label: 'Large Cutting Board',
    imageUrl: '71Kn1SjOY-L._AC_SL1500_.jpg',
    shortDescription:
      'A sturdy cutting board you’ll use in almost every recipe.',
    details: ['Juice groove', 'Durable', 'Easy to clean'],
    isDefault: true
  },
  {
    id: 'default-chef-knife',
    asin: 'B07Q1FFC65',
    label: '8-Inch Chef’s Knife',
    imageUrl: '71MgEJ1H5CL._AC_SL1200_.jpg',
    shortDescription:
      'A versatile chef’s knife for chopping, slicing, and dicing.',
    details: ['Balanced weight', 'Sharp edge', 'Comfort grip'],
    isDefault: true
  },
  {
    id: 'default-measuring-cups',
    asin: 'B01E2HU4A2',
    label: 'Measuring Cups & Spoons Set',
    imageUrl: '81JHy7eIk8L._AC_SL1500_.jpg',
    shortDescription: 'Accurate measurements for consistent results.',
    details: ['Cups and spoons', 'Stackable', 'Easy to read markings'],
    isDefault: true
  }
]);
