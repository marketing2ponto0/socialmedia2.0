// Roda a cada hora (netlify.toml): puxa todas as fontes de todos os temas e grava na base (Supabase).
const { THEMES, fetchLive, archiveWrite, mergeSort } = require('./_lib');

exports.handler = async () => {
  const report = {};
  for (const theme of Object.keys(THEMES)) {
    const { items } = await fetchLive(theme);
    const list = mergeSort(items, 30);
    await archiveWrite(theme, list);
    report[theme] = list.length;
  }
  return { statusCode: 200, body: JSON.stringify(report) };
};
