const THEME_KEYWORDS = {
  'saude':'saúde bem-estar dicas saúde','saude-ocular':'saúde ocular oftalmologia olhos visão',
  'nutricao':'nutrição nutricionista alimentação saudável','odonto':'odontologia dentista saúde bucal',
  'psicologia':'psicologia saúde mental ansiedade terapia','fisioterapia':'fisioterapia reabilitação lesão',
  'cardiologia':'cardiologia coração saúde cardiovascular','estetica':'estética beleza procedimentos cosméticos',
  'entretenimento':'entretenimento celebridades famosos','gastronomia':'gastronomia culinária receitas restaurantes',
  'tecnologia':'tecnologia inovação apps gadgets','moda':'moda beleza tendências fashion',
  'negocios':'negócios empreendedorismo startup mercado','esportes':'esportes futebol competição',
  'turismo':'turismo viagens destinos passeios','passeios':'dicas passeio lazer fim de semana',
  'cinema':'cinema filmes lançamentos streaming',
};
function parseRSS(xml) {
  const items = [];
  const entries = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  const sorted = entries.sort((a,b) => {
    const dA = new Date((a.match(/<pubDate>([\s\S]*?)<\/pubDate>/)||[])[1]||0);
    const dB = new Date((b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)||[])[1]||0);
    return dB - dA;
  });
  for (const entry of sorted.slice(0,20)) {
    const getTag = (tag) => { const m = entry.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`)); return m?(m[1]||m[2]||'').trim():''; };
    const title = getTag('title'); if(!title) continue;
    const link = getTag('link')||getTag('guid');
    const desc = getTag('description').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').substring(0,200);
    const pubDate = getTag('pubDate');
    const d = pubDate ? new Date(pubDate) : new Date();
    const h = Math.round((Date.now()-d)/3600000);
    const time = h<1?'Agora':h<24?`${h}h atrás`:h<48?'Ontem':`${Math.floor(h/24)}d atrás`;
    items.push({id:Math.random().toString(36).substr(2,9),title:title.trim(),summary:desc||'Clique para ler.',url:link.trim(),time,source:getTag('source')||'Google News'});
  }
  return items;
}
exports.handler = async (event) => {
  const theme = event.queryStringParameters?.theme||'saude';
  const keyword = THEME_KEYWORDS[theme]||theme;
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  try {
    const res = await fetch(rssUrl,{headers:{'User-Agent':'Mozilla/5.0'}});
    const xml = await res.text();
    return {statusCode:200,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify({theme,news:parseRSS(xml)})};
  } catch(e) { return {statusCode:500,body:JSON.stringify({error:e.message,theme,news:[]})}; }
};
