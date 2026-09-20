import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  // Настройка CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const KEY = 'inshort_real_votes';
  const BASE_VOTES = 154; // Стартовое число

  try {
    if (request.method === 'GET') {
      let count = await kv.get(KEY);
      if (count === null || count === undefined) {
        count = BASE_VOTES;
        await kv.set(KEY, count);
      }
      return response.status(200).json({ count: Number(count) });
    }

    if (request.method === 'POST') {
      // Инициализируем ключ, если база ещё пуста
      const exists = await kv.get(KEY);
      if (exists === null || exists === undefined) {
        await kv.set(KEY, BASE_VOTES);
      }
      // Атомарно увеличиваем значение на 1
      const updatedCount = await kv.incr(KEY);
      return response.status(200).json({ count: Number(updatedCount) });
    }

    return response.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}