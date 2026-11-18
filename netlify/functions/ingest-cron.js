// Roda a cada hora (netlify.toml): puxa todas as fontes de todos os temas e grava na base (Supabase).
// Processa em lotes paralelos para caber no limite de tempo das funções agendadas.
const { THEMES, fetchLive, archiveWrite, mergeSort } = require('./_lib');

exports.handler = async () => {
  const report = {};
  const themes = Object.keys(THEMES);
  for (let i = 0; i < themes.length; i += 6) {
    await Promise.all(themes.slice(i, i + 6).map(async theme => {
      try {
        const { items } = await fetchLive(theme);
        const list = mergeSort(items, 30);
        await archiveWrite(theme, list);
        report[theme] = list.length;
      } catch (e) { report[theme] = 'erro: ' + e.message; }
    }));
  }
  console.log(JSON.stringify(report));
  return { statusCode: 200, body: JSON.stringify(report) };
};
