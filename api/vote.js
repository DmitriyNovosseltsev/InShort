export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Переменные окружения, которые автоматически добавил Upstash
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return response.status(500).json({ error: 'База Upstash не подключена к проекту' });
  }

  const KEY = 'inshort_real_votes';
  const BASE_VOTES = 154;

  // Вспомогательная функция для отправки команд в Redis по REST API
  async function runRedisCommand(command, ...args) {
    const res = await fetch(`${url}/${command}/${args.map(encodeURIComponent).join('/')}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return await res.json();
  }

  try {
    if (request.method === 'GET') {
      const data = await runRedisCommand('get', KEY);
      let count = data.result;

      if (count === null || count === undefined) {
        count = BASE_VOTES;
        await runRedisCommand('set', KEY, count);
      }

      return response.status(200).json({ count: Number(count) });
    }

    if (request.method === 'POST') {
      const check = await runRedisCommand('get', KEY);
      if (check.result === null || check.result === undefined) {
        await runRedisCommand('set', KEY, BASE_VOTES);
      }

      const increment = await runRedisCommand('incr', KEY);
      return response.status(200).json({ count: Number(increment.result) });
    }

    return response.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}