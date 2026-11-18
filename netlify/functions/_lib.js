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


// Feeds RSS diretos de grandes portais (falha = ignora) e seções de tópico do Google News
const GTOPIC = { saude:'HEALTH', entretenimento:'ENTERTAINMENT', tecnologia:'TECHNOLOGY', negocios:'BUSINESS', esportes:'SPORTS' };
const SITE_FEEDS = {
  saude:[['CNN Brasil','https://www.cnnbrasil.com.br/saude/feed/'],['Veja Saúde','https://saude.abril.com.br/feed/'],['Folha','https://feeds.folha.uol.com.br/equilibrioesaude/rss091.xml'],['Metrópoles','https://www.metropoles.com/saude/feed']],
  entretenimento:[['CNN Brasil','https://www.cnnbrasil.com.br/entretenimento/feed/'],['Folha','https://feeds.folha.uol.com.br/ilustrada/rss091.xml'],['Metrópoles','https://www.metropoles.com/entretenimento/feed']],
  gastronomia:[['Folha','https://feeds.folha.uol.com.br/comida/rss091.xml'],['Metrópoles','https://www.metropoles.com/colunas/mariana-ferro/feed']],
  tecnologia:[['CNN Brasil','https://www.cnnbrasil.com.br/tecnologia/feed/'],['Folha','https://feeds.folha.uol.com.br/tec/rss091.xml'],['Canaltech','https://canaltech.com.br/rss/'],['Tecnoblog','https://tecnoblog.net/feed/']],
  moda:[['Folha','https://feeds.folha.uol.com.br/comida/rss091.xml'],['Metrópoles','https://www.metropoles.com/vida-e-estilo/feed']],
  negocios:[['CNN Brasil','https://www.cnnbrasil.com.br/economia/feed/'],['Folha','https://feeds.folha.uol.com.br/mercado/rss091.xml'],['Exame','https://exame.com/feed/']],
  esportes:[['CNN Brasil','https://www.cnnbrasil.com.br/esportes/feed/'],['Folha','https://feeds.folha.uol.com.br/esporte/rss091.xml'],['Lance!','https://www.lance.com.br/rss.xml']],
  turismo:[['CNN Brasil','https://www.cnnbrasil.com.br/viagemegastronomia/feed/'],['Folha','https://feeds.folha.uol.com.br/turismo/rss091.xml']],
  passeios:[['Folha','https://feeds.folha.uol.com.br/turismo/rss091.xml'],['Metrópoles','https://www.metropoles.com/vida-e-estilo/feed']],
  cinema:[['CNN Brasil','https://www.cnnbrasil.com.br/entretenimento/feed/'],['Folha','https://feeds.folha.uol.com.br/ilustrada/rss091.xml']],
};
// temas específicos de saúde herdam os feeds de saúde e filtram por palavra-chave
for (const t of ['saude-ocular','nutricao','odonto','psicologia','fisioterapia','cardiologia','estetica']) SITE_FEEDS[t] = SITE_FEEDS.saude;

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
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 6000);
  try { const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' }, signal: ctrl.signal }); return r.ok ? await r.text() : ''; }
  catch { return ''; } finally { clearTimeout(to); }
}

async function fetchLive(theme) {
  const cfg = THEMES[theme] || { q: [theme], g1: [], broad: true };
  const kwFilter = list => cfg.broad ? list : (cfg.kw?.length ? list.filter(a => cfg.kw.some(k => (a.title + ' ' + a.summary).toLowerCase().includes(k))) : []);
  const jobs = []; // [nome, promessa]
  const add = (name, p) => jobs.push(p.then(items => ({ name, items })));
  for (const q of cfg.q) {
    const e = encodeURIComponent(q);
    add('Google News', get(`https://news.google.com/rss/search?q=${e}%20when:7d&hl=pt-BR&gl=BR&ceid=BR:pt-419`).then(x => parseRSS(x, 'Google News')));
    add('Bing', get(`https://www.bing.com/news/search?q=${e}&format=rss&setmkt=pt-BR`).then(x => parseRSS(x, 'Bing Notícias')));
  }
  if (GTOPIC[theme]) add('Google Tópico', get(`https://news.google.com/rss/headlines/section/topic/${GTOPIC[theme]}?hl=pt-BR&gl=BR&ceid=BR:pt-419`).then(x => parseRSS(x, 'Google News')));
  for (const f of cfg.g1) {
    const url = cfg.ge && f.startsWith('ge/') ? 'https://ge.globo.com/rss/ge/' : `https://g1.globo.com/rss/${f}/`;
    add('Globo', get(url).then(x => kwFilter(parseRSS(x, f.startsWith('ge') ? 'ge.globo' : 'g1.globo.com'))));
  }
  for (const [name, url] of (SITE_FEEDS[theme] || [])) add(name, get(url).then(x => kwFilter(parseRSS(x, name))));
  const res = await Promise.all(jobs);
  const stats = {};
  for (const r of res) stats[r.name] = (stats[r.name] || 0) + r.items.length;
  return { items: res.flatMap(r => r.items), stats };
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


// Fontes consideradas confiáveis (aparecem primeiro nas buscas por assunto)
const TRUSTED = ['g1','globo','ge.globo','folha','cnn brasil','estadão','estadao','uol','veja','agência brasil','agencia brasil','ministério da saúde','ministerio da saude','fiocruz','butantan','einstein','sírio-libanês','sirio-libanes','drauzio','usp','unicamp','unifesp','cbo','conselho brasileiro de oftalmologia','sociedade brasileira','sbc','sbp','abeso','crn','cfm','cfp','cfo','anvisa','oms','who','exame','valor','infomoney','sebrae','metrópoles','metropoles','correio braziliense','o globo','band','record','sbt','terra','istoé','istoe','época','epoca','revista oeste','nexo','bbc','dw','canaltech','tecnoblog','olhar digital','adoro cinema','omelete','lance','gazeta esportiva','cbf','cob','embratur','panrotas','viagem e turismo'];
const isTrusted = src => { const x = (src||'').toLowerCase(); return TRUSTED.some(t => x === t || x.includes(t)); };

async function fetchSearch(theme, term) {
  const cfg = THEMES[theme] || { q: [theme] };
  const ctx = (cfg.q[0] || '').split(' ').slice(0, 2).join(' ');
  const full = `"${term}" ${ctx}`.trim();
  const jobs = [];
  for (const q of [full, term]) {
    const e = encodeURIComponent(q);
    jobs.push(get(`https://news.google.com/rss/search?q=${e}%20when:1y&hl=pt-BR&gl=BR&ceid=BR:pt-419`).then(x => parseRSS(x, 'Google News')));
    jobs.push(get(`https://www.bing.com/news/search?q=${e}&format=rss&setmkt=pt-BR`).then(x => parseRSS(x, 'Bing Notícias')));
  }
  const nt = norm2(term);
  return (await Promise.all(jobs)).flat().filter(a => norm2(a.title + ' ' + a.summary).includes(nt));
}
const norm2 = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

async function archiveSearch(theme, term) {
  try {
    const t = encodeURIComponent(`*${term.replace(/[*,()]/g, ' ').trim()}*`);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/social_articles?theme=eq.${encodeURIComponent(theme)}&or=(title.ilike.${t},summary.ilike.${t})&order=published_at.desc&limit=40`, { headers: sbHeaders });
    if (!r.ok) return []; const rows = await r.json();
    return rows.map(a => ({ title: a.title, summary: a.summary, source: a.source, url: a.source_url, published_at: a.published_at }));
  } catch { return []; }
}
// confiáveis primeiro, depois mais recentes
function mergeRelevant(list, max = 30) {
  const seen = new Set(), arr = [];
  for (const a of list) { const k = norm(a.title); if (seen.has(k) || !a.url) continue; seen.add(k); arr.push({ ...a, trusted: isTrusted(a.source) }); }
  arr.sort((x, y) => (y.trusted - x.trusted) || (new Date(y.published_at) - new Date(x.published_at)));
  return arr.slice(0, max);
}

module.exports = { fetchSearch, archiveSearch, mergeRelevant, isTrusted, parseRSS, THEMES, fetchLive, archiveRead, archiveWrite, mergeSort, rel };
