const { fetchLive, archiveRead, archiveWrite, mergeSort, rel } = require('./_lib');

exports.handler = async (event) => {
  const theme = event.queryStringParameters?.theme || 'saude';
  try {
    const [{ items: live, stats }, stored] = await Promise.all([fetchLive(theme), archiveRead(theme)]);
    const news = mergeSort([...live, ...stored], 20).map(a => ({
      id: Math.random().toString(36).slice(2, 11), title: a.title, summary: a.summary, url: a.url, source: a.source, time: rel(a.published_at)
    }));
    await archiveWrite(theme, live); // cada consulta também alimenta a base
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ theme, news, live: live.length, archive: stored.length, sources: stats }) };
  } catch (e) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message, theme, news: [] }) };
  }
};
