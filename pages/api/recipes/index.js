// pages/api/recipes/index.js
import { getServerSupabase } from '../../../lib/supabaseClient.js';

export default async function handler(req, res) {
  const supabase = getServerSupabase();

  if (req.method === 'GET') {
    try {
      const {
        page = '1',
        per_page = '12',
        cuisine,
        ingredients,
        difficulty,
        ids,
        max_time,
        match_type = 'all'
      } = req.query;

      const pageNum = Number(page) || 1;
      const perPageNum = Number(per_page) || 12;

      // ------------------------------------------------
      // 1) SPECIAL CASE: FETCH BY IDS
      // ------------------------------------------------
      if (ids) {
        const idList = String(ids)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        if (idList.length === 0) {
          return res.status(200).json({
            data: [],
            total_pages: 1,
            total_count: 0
          });
        }

        // Fetch all recipes whose id is in idList
        let query = supabase.from('recipes').select('*');

        const { data, error } = await query.in('id', idList);

        if (error) {
          console.error('Error fetching recipes by ids:', error);
          return res.status(500).json({ error: error.message });
        }

        // Optional: reorder to match idList order
        const byId = Object.fromEntries(
          (data || []).map((r) => [String(r.id), r])
        );
        const ordered = idList.map((id) => byId[id]).filter(Boolean);

        return res.status(200).json({
          data: ordered,
          total_pages: 1,
          total_count: ordered.length
        });
      }

      let query = supabase.from('recipes').select('*', { count: 'exact' });

      // CUISINE
      if (cuisine && cuisine !== 'trending') {
        query = query.ilike('cuisine', `%${cuisine}%`);
      }

      // INGREDIENTS (JSONB)
      if (ingredients) {
        const list = ingredients
          .split(',')
          .map((str) => str.trim())
          .filter(Boolean);

        if (list.length > 0) {
          if (match_type === 'any') {
            // OR mode
            const orConditions = list
              .map(
                (slug) => `ingredients.cs.${JSON.stringify([{ image: slug }])}`
              )
              .join(',');

            query = query.or(orConditions);
          } else {
            // ALL mode
            for (const slug of list) {
              const jsonFilter = JSON.stringify([{ image: slug }]);
              query = query.filter('ingredients', 'cs', jsonFilter);
            }
          }
        }
      }

      // DIFFICULTY
      if (difficulty) {
        const list = difficulty.split(',').map((d) => d.trim());
        query = query.in('difficulty', list);
      }

      // MAX TIME
      if (max_time) {
        const maxTimeNum = Number(max_time);
        if (!Number.isNaN(maxTimeNum)) {
          query = query.lte('total_time', maxTimeNum);
        }
      }

      // SERVING TIME (breakfast / lunch / dinner, etc.)
      if (req.query.serving_time) {
        query = query.eq('serving_time', req.query.serving_time);
      }

      // PAGINATION
      const offset = (pageNum - 1) * perPageNum;
      query = query.range(offset, offset + perPageNum - 1);

      const { data, error, count } = await query;

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        data,
        total_pages: count != null ? Math.ceil(count / perPageNum) : 1,
        total_count: count ?? 0
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const key = req.headers['x-api-key'];
    if (key !== process.env.RECIPE_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const payload = req.body;
      const { data, error } = await supabase
        .from('recipes')
        .insert([payload])
        .select();

      if (error) return res.status(500).json({ error: error.message });

      return res.status(201).json({ data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
