// Base de notícias do Agente Social Media M2.0 (mesma ideia do Agente de Notícias):
// várias fontes por tema + arquivo no Supabase (tabela social_articles) alimentado a cada hora.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yuqidbvfilomxkwaaerl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_t3Qiwi-26sBX-0mbtdjXCA__h26yp3p';

// q: consultas de busca (Google News + Bing News) · g1: feeds de seção Globo · broad: aceita G1 sem filtro
const THEMES = {
  'saude':{q:['saúde dicas bem-estar','saúde prevenção médicos'],g1:['g1/saude'],broad:true},
  'saude-ocular':{q:['saúde ocular oftalmologia','olhos visão miopia glaucoma catarata'],g1:['g1/saude'],kw:['olho','ocular','visão','miopia','oftalm','glaucoma','catarata','lente']},
  'nutricao':{q:['nutrição nutricionista alimentação saudável','dieta emagrecimento alimentos'],g1:['g1/saude'],kw:['nutri','aliment','dieta','vitamina','alimento','obesidade','emagrec']},
  'odonto':{q:['odontologia dentista saúde bucal','dentes clareamento implante'],g1:['g1/saude'],kw:['dent','odont','bucal','sorriso']},
  'psicologia':{q:['psicologia saúde mental','ansiedade depressão terapia'],g1:['g1/saude'],kw:['psic','mental','ansiedade','depress','terapia','burnout']},
  'fisioterapia':{q:['fisioterapia reabilitação','dor lombar postura exercícios'],g1:['g1/saude'],kw:['fisio','reabilit','lombar','postura','lesão','muscul']},
  'cardiologia':{q:['cardiologia coração saúde cardiovascular','pressão alta colesterol infarto'],g1:['g1/saude'],kw:['cora','cardi','pressão','colesterol','infarto','avc']},
  'estetica':{q:['estética beleza procedimentos','skincare dermatologia pele'],g1:['g1/saude'],kw:['estétic','pele','beleza','dermat','skincare','botox','harmoniza']},
  'entretenimento':{q:['entretenimento celebridades famosos','famosos novela reality'],g1:['g1/pop-arte'],broad:true},
  'gastronomia':{q:['gastronomia culinária receitas','restaurantes chef cozinha'],g1:[],kw:[]},
  'tecnologia':{q:['tecnologia inovação gadgets','inteligência artificial aplicativos'],g1:['g1/tecnologia'],broad:true},
  'moda':{q:['moda tendências fashion','beleza maquiagem look'],g1:['g1/pop-arte'],kw:['moda','fashion','look','estilo','beleza','maquiagem']},
  'negocios':{q:['negócios empreendedorismo pequenas empresas','mercado startup economia'],g1:['g1/economia'],broad:true},
  'esportes':{q:['esportes futebol campeonato','vôlei basquete corrida'],g1:['ge/ge'],broad:true,ge:true},
  'turismo':{q:['turismo viagens destinos','companhias aéreas hotéis pacotes'],g1:['g1/turismo-e-viagem'],broad:true},
  'passeios':{q:['passeios lazer fim de semana','parques trilhas eventos programação'],g1:['g1/turismo-e-viagem'],kw:['passeio','parque','trilha','evento','lazer','fim de semana']},
  'cinema':{q:['cinema filmes lançamentos estreias','streaming séries'],g1:['g1/pop-arte'],kw:['cinema','filme','estreia','série','streaming','ator','atriz']},
};

const ent = s => s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
const decode = s => ent(ent((s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')).replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();

function parseRSS(xml, defaultSource) {
  const out = [];
  for (const entry of (xml.match(/<item[\s>][\s\S]*?<\/item>/g) || [])) {
    const tag = t => { const m = entry.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? decode(m[1]) : ''; };
    let title = tag('title'); if (!title) continue;
    const srcM = entry.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    let source = srcM ? decode(srcM[1]) : defaultSource;
    // Google News coloca " - Fonte" no fim do título
    const dash = title.lastIndexOf(' - ');
    if (dash > 20 && title.length - dash < 45) { source = source === defaultSource ? title.slice(dash + 3) : source; title = title.slice(0, dash); }
    let link = tag('link') || tag('guid');
    const d = new Date(tag('pubDate') || Date.now());
    let summary = tag('description').slice(0, 220);
    if (summary.toLowerCase().startsWith(title.toLowerCase().slice(0, 30))) summary = '';
    out.push({ title, summary: summary || 'Toque para ver os detalhes da matéria.', url: link, source, published_at: isNaN(d) ? new Date().toISOString() : d.toISOString() });
  }
  return out;
}

async function get(url) {
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 8000);
  try { const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' }, signal: ctrl.signal }); return r.ok ? await r.text() : ''; }
  catch { return ''; } finally { clearTimeout(to); }
}

async function fetchLive(theme) {
  const cfg = THEMES[theme] || { q: [theme], g1: [], broad: true };
  const jobs = [];
  for (const q of cfg.q) {
    const e = encodeURIComponent(q);
    jobs.push(get(`https://news.google.com/rss/search?q=${e}%20when:7d&hl=pt-BR&gl=BR&ceid=BR:pt-419`).then(x => parseRSS(x, 'Google News')));
    jobs.push(get(`https://www.bing.com/news/search?q=${e}&format=rss&setmkt=pt-BR`).then(x => parseRSS(x, 'Bing Notícias')));
  }
  for (const f of cfg.g1) {
    const url = cfg.ge && f.startsWith('ge/') ? 'https://ge.globo.com/rss/ge/' : `https://g1.globo.com/rss/${f}/`;
    jobs.push(get(url).then(x => parseRSS(x, f.startsWith('ge') ? 'ge.globo' : 'g1.globo.com')).then(list => cfg.broad || !cfg.kw?.length ? (cfg.broad ? list : []) : list.filter(a => cfg.kw.some(k => (a.title + ' ' + a.summary).toLowerCase().includes(k)))));
  }
  const all = (await Promise.all(jobs)).flat();
  return all;
}

const norm = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').split(' ').slice(0, 8).join(' ');
function mergeSort(list, max = 20) {
  const seen = new Set(), out = [];
  for (const a of list.sort((x, y) => new Date(y.published_at) - new Date(x.published_at))) {
    const k = norm(a.title); if (seen.has(k) || !a.url) continue; seen.add(k); out.push(a);
    if (out.length >= max) break;
  }
  return out;
}
function rel(iso) {
  const h = Math.round((Date.now() - new Date(iso)) / 3600000);
  return h < 1 ? 'Agora' : h < 24 ? `${h}h atrás` : h < 48 ? 'Ontem' : `${Math.floor(h / 24)}d atrás`;
}

const sbHeaders = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' };
async function archiveRead(theme) {
  try {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const r = await fetch(`${SUPABASE_URL}/rest/v1/social_articles?theme=eq.${encodeURIComponent(theme)}&published_at=gte.${since}&order=published_at.desc&limit=40`, { headers: sbHeaders });
    if (!r.ok) return []; const rows = await r.json();
    return rows.map(a => ({ title: a.title, summary: a.summary, source: a.source, url: a.source_url, published_at: a.published_at }));
  } catch { return []; }
}
async function archiveWrite(theme, list) {
  if (!list.length) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/social_articles?on_conflict=theme,source_url`, {
      method: 'POST', headers: { ...sbHeaders, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(list.map(a => ({ theme, title: a.title, summary: a.summary, source: a.source, source_url: a.url, published_at: a.published_at })))
    });
  } catch {}
}

module.exports = { parseRSS, THEMES, fetchLive, archiveRead, archiveWrite, mergeSort, rel };
