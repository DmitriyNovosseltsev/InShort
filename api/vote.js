export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Автоматический поиск URL и TOKEN среди созданных переменных Upstash
  const envKeys = Object.keys(process.env);
  const urlKey = envKeys.find(k => k.includes('UPSTASH') && (k.includes('REST_URL') || k.includes('API_URL') || k.includes('KV_URL')));
  const tokenKey = envKeys.find(k => k.includes('UPSTASH') && (k.includes('REST_TOKEN') || k.includes('_TOKEN')) && !k.includes('READ_ONLY'));

  const url = process.env[urlKey];
  const token = process.env[tokenKey];

  if (!url || !token) {
    return response.status(500).json({ 
      error: 'Не найдены ключи Upstash', 
      foundKeys: envKeys.filter(k => k.includes('UPSTASH')) 
    });
  }

  const KEY = 'inshort_real_votes_v2';
  const BASE_VOTES = 0;

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