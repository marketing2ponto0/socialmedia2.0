import { useState, useEffect, useCallback } from "react";

const ALL_THEMES = [
  { id:"saude",          label:"Saúde Geral",      icon:"🏥", color:"#22c55e" },
  { id:"saude-ocular",   label:"Saúde Ocular",     icon:"👁️",  color:"#06b6d4" },
  { id:"nutricao",       label:"Nutrição",          icon:"🥗", color:"#84cc16" },
  { id:"odonto",         label:"Odontologia",       icon:"🦷", color:"#a3e635" },
  { id:"psicologia",     label:"Psicologia",        icon:"🧠", color:"#8b5cf6" },
  { id:"fisioterapia",   label:"Fisioterapia",      icon:"💪", color:"#f97316" },
  { id:"cardiologia",    label:"Cardiologia",       icon:"❤️‍🩹", color:"#ef4444" },
  { id:"estetica",       label:"Estética & Beleza", icon:"✨", color:"#ec4899" },
  { id:"entretenimento", label:"Entretenimento",    icon:"🎭", color:"#a855f7" },
  { id:"gastronomia",    label:"Gastronomia",       icon:"🍽️", color:"#fb923c" },
  { id:"tecnologia",     label:"Tecnologia",        icon:"💻", color:"#3b82f6" },
  { id:"moda",           label:"Moda & Beleza",     icon:"👗", color:"#f472b6" },
  { id:"negocios",       label:"Negócios",          icon:"📊", color:"#eab308" },
  { id:"esportes",       label:"Esportes",          icon:"⚽", color:"#ef4444" },
  { id:"turismo",        label:"Turismo",           icon:"✈️", color:"#06b6d4" },
  { id:"passeios",       label:"Passeios",          icon:"🗺️", color:"#84cc16" },
  { id:"cinema",         label:"Cinema",            icon:"🎬", color:"#f59e0b" },
];

const CLIENT_COLORS = ["#C8A96E","#3b82f6","#22c55e","#ec4899","#f97316","#a855f7","#ef4444","#06b6d4","#ffffff","#000000"];

function lsGet(k){try{const v=localStorage.getItem("sm20_"+k);return v?JSON.parse(v):null;}catch{return null;}}
function lsSet(k,v){try{localStorage.setItem("sm20_"+k,JSON.stringify(v));}catch{}}

function extractCanvaId(url){
  if(!url)return null;
  const m=url.match(/design\/([A-Za-z0-9_-]+)/);
  return m?m[1]:null;
}

async function fetchThemeNews(themeId){
  const res = await fetch(`/api/topics?theme=${themeId}`);
  const data = await res.json();
  return data.news||[];
}

async function callClaude(body){
  const res = await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  return res.json();
}

export default function App() {
  const [clients,setClients] = useState(()=>lsGet("clients")||[]);
  const [activeClientId,setActiveClientId] = useState(()=>lsGet("clients")?.[0]?.id||null);
  const [activeTheme,setActiveTheme] = useState(null);
  const [newsMap,setNewsMap] = useState({});
  const [loadingTheme,setLoadingTheme] = useState({});
  const [view,setView] = useState("home");
  const [editingClient,setEditingClient] = useState(null);
  const [generated,setGenerated] = useState(null);
  const [genLoading,setGenLoading] = useState(false);
  const [notification,setNotification] = useState(null);
  const [allThemes,setAllThemes] = useState(()=>[...ALL_THEMES,...(lsGet("customThemes")||[])]);
  const [artType,setArtType] = useState("simples");
  const [selectedTpl,setSelectedTpl] = useState(null);
  const [promptModal,setPromptModal] = useState(null);
  const [showTplPicker,setShowTplPicker] = useState(false);
  const [pendingArticle,setPendingArticle] = useState(null);
  const [freeText,setFreeText] = useState("");
  const [apiOk,setApiOk] = useState(null);

  const activeClient = clients.find(c=>c.id===activeClientId);
  useEffect(()=>{lsSet("clients",clients);},[clients]);
  useEffect(()=>{
    fetch('/api/status').then(r=>r.json()).then(d=>setApiOk(d.hasApiKey)).catch(()=>setApiOk(false));
  },[]);

  const notify = (msg,type="success")=>{ setNotification({msg,type}); setTimeout(()=>setNotification(null),3500); };

  const loadTheme = useCallback(async(themeId)=>{
    if(newsMap[themeId]||loadingTheme[themeId]) return;
    setLoadingTheme(p=>({...p,[themeId]:true}));
    try { const news=await fetchThemeNews(themeId); setNewsMap(p=>({...p,[themeId]:news})); }
    catch(e){console.error(e);}
    finally{setLoadingTheme(p=>({...p,[themeId]:false}));}
  },[newsMap,loadingTheme]);

  const refreshTheme = async(themeId)=>{
    setNewsMap(p=>{const n={...p};delete n[themeId];return n;});
    setLoadingTheme(p=>({...p,[themeId]:true}));
    try { const news=await fetchThemeNews(themeId); setNewsMap(p=>({...p,[themeId]:news})); notify("🔄 Atualizado!"); }
    catch{}
    finally{setLoadingTheme(p=>({...p,[themeId]:false}));}
  };

  const addTheme=(t)=>{
    setAllThemes(p=>p.find(x=>x.id===t.id)?p:[...p,t]);
    lsSet("customThemes",[...(lsGet("customThemes")||[]).filter(x=>x.id!==t.id),t]);
  };

  // carrega notícias ao abrir a tela de tema / de todos os conteúdos
  useEffect(()=>{
    if(view==="content"&&activeTheme) loadTheme(activeTheme);
    if(view==="allcontent"&&activeClient) (activeClient.themes||[]).forEach(id=>loadTheme(id));
  // eslint-disable-next-line
  },[view,activeTheme,activeClientId]);

  const doCanva=(article,tpl)=>{
    const theme=allThemes.find(t=>t.id===activeTheme);
    const g=generated&&generated.article&&generated.article.id===article.id?generated:null;
    const prompt=buildCanvaPrompt({client:activeClient,tpl,article,artType,generated:g,themeLabel:theme?.label});
    setSelectedTpl(tpl); setShowTplPicker(false);
    try{ navigator.clipboard.writeText(prompt).then(()=>notify("📋 Pedido copiado! Cole no Claude")).catch(()=>setPromptModal(prompt)); }catch{ setPromptModal(prompt); }
    window.open("https://claude.ai/new","_blank");
  };

  const handleGenerateClick = (article)=>{
    setPendingArticle(article); setShowTplPicker(true); setGenerated(null);
  };

  const doGenerate = async(article,tpl)=>{
    setSelectedTpl(tpl); setShowTplPicker(false); setGenLoading(true); setGenerated(null);
    try {
      const theme = allThemes.find(t=>t.id===activeTheme)||{label:"tema livre"};
      const isCarrossel = artType==="carrossel";
      const colorHint = (activeClient?.brandColors||[]).filter(Boolean).join(", ");
      const system = isCarrossel
        ? `Você é especialista em Social Media para "${activeClient?.name}" (${activeClient?.niche||theme.label}). ${colorHint?"Cores da marca: "+colorHint+".":""} Crie um CARROSSEL para Instagram. Responda SOMENTE JSON: {"headline":"max 8 palavras","slides":[{"titulo":"","texto":""},{"titulo":"","texto":""},{"titulo":"","texto":""}],"caption":"legenda com emojis max 250 chars","hashtags":"#tag1 #tag2 #tag3 #tag4 #tag5","cta":"call to action"}`
        : `Você é especialista em Social Media para "${activeClient?.name}" (${activeClient?.niche||theme.label}). ${colorHint?"Cores da marca: "+colorHint+".":""} Crie post SIMPLES para Instagram. Responda SOMENTE JSON: {"headline":"max 8 palavras","caption":"legenda com emojis max 280 chars","hashtags":"#tag1 #tag2 #tag3 #tag4 #tag5","cta":"call to action"}`;
      const freeNote = article.free ? " O social media NÃO tem notícia: ele informou um tema ou texto-base. Use-o para criar conteúdo ORIGINAL e útil (o headline é o tema da arte). Não invente estatísticas, estudos, preços nem dados específicos." : "";
      const sys2 = system+freeNote;
      const messages = [{role:"user",content: article.free ? `Tema/texto-base: "${article.summary}"\nCrie o conteúdo.` : `Notícia: "${article.title}"\nResumo: "${article.summary}"\nCrie o conteúdo.`}];
      const body = {model:"llama-3.3-70b-versatile",max_tokens:1000,system:sys2,messages};
      const data = await callClaude(body);
      const textBlocks = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n");
      const jsonMatch = textBlocks.match(/\{[\s\S]*\}/);
      let postData={};
      if(jsonMatch){ try{postData=JSON.parse(jsonMatch[0].replace(/```json|```/g,"").trim());}catch{} }
      setGenerated({...postData,canvaLink:null,artType,tplLabel:tpl?.label,article:article.free?{...article,title:postData.headline||article.title}:article});
      notify("✨ Conteúdo gerado!");
    } catch(e){ notify("Erro: "+e.message,"error"); }
    setGenLoading(false);
  };

  const saveClient=(form)=>{
    if(editingClient){ setClients(p=>p.map(c=>c.id===editingClient.id?{...form,id:editingClient.id}:c)); notify("✅ Cliente atualizado!"); }
    else { const id=Date.now().toString(); setClients(p=>[...p,{...form,id}]); setActiveClientId(id); notify("✅ Cliente adicionado!"); }
    setView("client"); setEditingClient(null);
  };
  const deleteClient=(id)=>{ const r=clients.filter(c=>c.id!==id); setClients(r); setActiveClientId(r[0]?.id||null); setView("home"); notify("🗑️ Cliente removido."); };

  // ── CLIENT TABS ──────────────────────────────────────────────────────
  const ClientTabs = ()=>(
    <div style={{borderBottom:"1px solid #111",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      <div style={{display:"flex",minWidth:"max-content",padding:"0 12px"}}>
        {clients.map(c=>(
          <button key={c.id} style={{background:"none",border:"none",borderBottom:`2px solid ${activeClientId===c.id?c.color:"transparent"}`,padding:"8px 12px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",color:activeClientId===c.id?"#fff":"#444",fontFamily:"'DM Sans',sans-serif"}}
            onClick={()=>{setActiveClientId(c.id);setActiveTheme(null);setGenerated(null);setView("client");}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:c.color,flexShrink:0}}/>
            {c.name}
          </button>
        ))}
        <button style={{background:"none",border:"none",padding:"8px 12px",color:"#333",cursor:"pointer",fontSize:16}} onClick={()=>{setEditingClient(null);setView("add-client");}}>+</button>
      </div>
    </div>
  );

  // ── GENERATED RESULT PANEL ────────────────────────────────────────────
  const GeneratedPanel = ({theme})=>{
    const themeObj = allThemes.find(t=>t.id===theme)||{color:"#C8A96E"};
    if(genLoading) return (
      <div style={S.genPanel}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:16,justifyContent:"center"}}>
          <div style={S.spinner}/>
          <span style={{color:"#C8A96E",fontSize:13}}>Gerando{selectedTpl?.url&&extractCanvaId(selectedTpl?.url)?" e criando no Canva":""}...</span>
        </div>
      </div>
    );
    if(!generated) return null;
    return (
      <div style={S.genPanel}>
        <div style={{fontSize:13,fontWeight:700,color:"#C8A96E",marginBottom:4,fontFamily:"'Syne',sans-serif"}}>
          {generated.artType==="carrossel"?"📚 Carrossel":"🖼️ Arte Simples"} · {activeClient?.name}
        </div>
        {generated.tplLabel&&<div style={{fontSize:11,color:"#555",marginBottom:14}}>Modelo: {generated.tplLabel}</div>}
        {generated.canvaLink&&(
          <a href={generated.canvaLink} target="_blank" rel="noreferrer"
            style={{display:"block",textAlign:"center",padding:"14px",background:"#C8A96E",color:"#000",borderRadius:12,fontWeight:700,fontSize:14,textDecoration:"none",margin:"0 0 16px"}}>
            🎨 Abrir Arte no Canva →
          </a>
        )}
        {generated.slides?(
          <div style={{marginBottom:14}}>
            <div style={{fontSize:9,letterSpacing:2,color:"#333",marginBottom:10}}>SLIDES</div>
            {generated.slides.map((sl,i)=>(
              <div key={i} style={{background:"#111",borderRadius:8,padding:"10px 12px",marginBottom:8,borderLeft:`3px solid ${themeObj.color}`}}>
                <div style={{fontSize:11,color:themeObj.color,fontWeight:700,marginBottom:3}}>Slide {i+1}: {sl.titulo}</div>
                <div style={{fontSize:12,color:"#aaa"}}>{sl.texto}</div>
              </div>
            ))}
            {[["Legenda",generated.caption,"#ccc"],["Hashtags",generated.hashtags,"#3b82f6"],["CTA",generated.cta,"#C8A96E"]].map(([l,v,c])=>v&&(
              <div key={l} style={{marginBottom:10}}>
                <div style={{fontSize:9,letterSpacing:2,color:"#333",marginBottom:3}}>{l}</div>
                <div style={{fontSize:12,color:c,lineHeight:1.6}}>{v}</div>
              </div>
            ))}
          </div>
        ):(
          <div style={{marginBottom:14}}>
            {[["Headline",generated.headline,"#fff"],["Legenda",generated.caption,"#ccc"],["Hashtags",generated.hashtags,"#3b82f6"],["CTA",generated.cta,"#C8A96E"]].map(([l,v,c])=>v&&(
              <div key={l} style={{marginBottom:12}}>
                <div style={{fontSize:9,letterSpacing:2,color:"#333",marginBottom:3}}>{l}</div>
                <div style={{fontSize:13,color:c,lineHeight:1.6}}>{v}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {selectedTpl?.url&&generated.article&&<button style={S.btnPrimary} onClick={()=>doCanva(generated.article,selectedTpl)}>🎨 Criar arte no Canva</button>}
          <button style={S.btnCopy} onClick={()=>{
            const txt=generated.slides
              ?`${generated.headline}\n\n${generated.slides.map((s,i)=>`Slide ${i+1}: ${s.titulo}\n${s.texto}`).join("\n\n")}\n\n${generated.caption}\n\n${generated.hashtags}\n\n${generated.cta}`
              :`${generated.headline}\n\n${generated.caption}\n\n${generated.hashtags}\n\n${generated.cta}`;
            navigator.clipboard?.writeText(txt);notify("📋 Copiado!");
          }}>📋 Copiar</button>
          <button style={S.btnCancel} onClick={()=>setGenerated(null)}>✕ Fechar</button>
        </div>
      </div>
    );
  };

  // ── ARTICLE CARD ──────────────────────────────────────────────────────
  const ArticleCard = ({article,themeObj})=>(
    <div style={{background:"#0f0f0f",border:"1px solid #161616",borderLeft:`3px solid ${themeObj.color}33`,borderRadius:12,padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:10,color:themeObj.color,fontWeight:600}}>{article.source}</span>
        <span style={{fontSize:10,color:"#333"}}>{article.time}</span>
      </div>
      <div style={{fontSize:14,fontWeight:600,color:"#fff",fontFamily:"'Syne',sans-serif",lineHeight:1.4,marginBottom:5}}>{article.title}</div>
      <div style={{fontSize:12,color:"#555",lineHeight:1.5,marginBottom:10}}>{article.summary}</div>
      <button style={{padding:"7px 16px",borderRadius:20,border:`1px solid ${themeObj.color}44`,background:themeObj.color+"1a",color:themeObj.color,fontSize:12,cursor:"pointer",fontWeight:600}}
        onClick={()=>handleGenerateClick(article)}>
        ✨ Gerar Arte
      </button>
    </div>
  );

  // ── HOME VIEW ─────────────────────────────────────────────────────────
  const HomeView = ()=>(
    <div style={S.page}>
      <div style={S.header}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><img src="/icons/logo.png" alt="M2.0" width="38" height="38" style={{borderRadius:10,display:"block"}}/><div><div style={S.logo}>M<span style={{color:"#C8A96E"}}>2</span>.0</div><div style={S.logoSub}>AGENTE SOCIAL MEDIA</div></div></div>
        {apiOk===false&&<div style={{fontSize:11,color:"#f97316",background:"#f9731611",border:"1px solid #f9731633",borderRadius:20,padding:"4px 10px"}}>⚠️ Sem Groq Key</div>}
      </div>
      {clients.length===0?(
        <div style={{textAlign:"center",padding:"60px 20px"}}>
          <div style={{fontSize:48,marginBottom:12}}>👥</div>
          <div style={{color:"#555",marginBottom:20,fontSize:14}}>Nenhum cliente cadastrado.</div>
          <button style={S.btnPrimary} onClick={()=>{setEditingClient(null);setView("add-client");}}>+ Adicionar Primeiro Cliente</button>
        </div>
      ):(
        <>
          <div style={S.sectionTitle}>SELECIONE O CLIENTE</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,padding:"0 16px 16px"}}>
            {clients.map(c=>(
              <div key={c.id} style={{background:"#111",border:`1px solid ${c.color}44`,borderRadius:14,padding:16,cursor:"pointer"}}
                onClick={()=>{setActiveClientId(c.id);setActiveTheme(null);setGenerated(null);setView("client");}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:c.color}}/>
                  {(c.brandColors||[]).filter(Boolean).slice(0,3).map((col,i)=>(
                    <div key={i} style={{width:12,height:12,borderRadius:3,background:col,border:"1px solid #333"}}/>
                  ))}
                </div>
                <div style={{fontSize:14,fontWeight:700,fontFamily:"'Syne',sans-serif",color:"#fff",marginBottom:2}}>{c.name}</div>
                <div style={{fontSize:11,color:"#555"}}>{c.niche}</div>
                <div style={{fontSize:10,color:"#333",marginTop:4}}>{(c.themes||[]).length} temas</div>
              </div>
            ))}
            <div style={{background:"#111",border:"1px dashed #1e1e1e",borderRadius:14,padding:16,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}
              onClick={()=>{setEditingClient(null);setView("add-client");}}>
              <div style={{fontSize:32,color:"#C8A96E"}}>+</div>
              <div style={{fontSize:11,color:"#444"}}>Novo Cliente</div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ── CLIENT VIEW ───────────────────────────────────────────────────────
  const ClientView = ()=>{
    if(!activeClient) return null;
    const clientThemes = allThemes.filter(t=>activeClient.themes.includes(t.id));
    return (
      <div style={S.page}>
        <div style={S.header}>
          <button onClick={()=>setView("home")} style={S.backBtn}>← Início</button>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setEditingClient(activeClient);setView("edit-client");}} style={S.iconBtn}>✏️</button>
            <button onClick={()=>deleteClient(activeClient.id)} style={{...S.iconBtn,color:"#ef4444"}}>🗑️</button>
          </div>
        </div>
        <ClientTabs/>
        <div style={{padding:"12px 16px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:activeClient.color}}/>
            <div style={{fontSize:20,fontWeight:700,fontFamily:"'Syne',sans-serif"}}>{activeClient.name}</div>
          </div>
          <div style={{color:"#555",fontSize:13,marginBottom:10}}>{activeClient.niche}</div>
          {(activeClient.brandColors||[]).filter(Boolean).length>0&&(
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:10,color:"#444"}}>Cores:</span>
              {activeClient.brandColors.filter(Boolean).map((c,i)=>(
                <div key={i} style={{width:20,height:20,borderRadius:5,background:c,border:"1px solid #2a2a2a"}} title={c}/>
              ))}
            </div>
          )}
          {(activeClient.templates?.feeds||[]).filter(f=>f.url).length>0&&(
            <div style={{marginBottom:8}}>
              <div style={{fontSize:9,color:"#333",letterSpacing:2,marginBottom:6}}>🖼️ FEEDS</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {(activeClient.templates.feeds||[]).filter(f=>f.url).map(f=>(
                  <a key={f.id} href={f.url} target="_blank" rel="noreferrer" style={S.tplLink}>{f.label}</a>
                ))}
              </div>
            </div>
          )}
          {(activeClient.templates?.stories||[]).filter(s=>s.url).length>0&&(
            <div style={{marginBottom:8}}>
              <div style={{fontSize:9,color:"#333",letterSpacing:2,marginBottom:6}}>📱 STORIES</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {(activeClient.templates.stories||[]).filter(s=>s.url).map(s=>(
                  <a key={s.id} href={s.url} target="_blank" rel="noreferrer" style={{...S.tplLink,borderColor:"#a855f733",color:"#a855f7"}}>{s.label}</a>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{padding:"0 16px 14px"}}>
          <button onClick={()=>{setGenerated(null);setView("free");}} style={{width:"100%",background:"#C8A96E15",border:"1px solid #C8A96E55",color:"#C8A96E",borderRadius:12,padding:14,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Syne',sans-serif"}}>✍️ Criar com tema livre (sem notícia)</button>
        </div>
        <div style={S.sectionTitle}>TEMAS DO CLIENTE</div>
        {clientThemes.length===0?(
          <div style={{padding:"0 16px",color:"#555",fontSize:13}}>
            Nenhum tema. <span style={{color:"#C8A96E",cursor:"pointer"}} onClick={()=>{setEditingClient(activeClient);setView("edit-client");}}>Editar →</span>
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"0 16px 16px"}}>
            {clientThemes.map(t=>(
              <div key={t.id} style={{background:"#111",border:`1px solid ${t.color}33`,borderRadius:12,padding:14,cursor:"pointer",textAlign:"center"}}
                onClick={()=>{setActiveTheme(t.id);loadTheme(t.id);setGenerated(null);setView("content");}}>
                <div style={{fontSize:26,marginBottom:6}}>{t.icon}</div>
                <div style={{fontSize:12,fontWeight:600,color:t.color,fontFamily:"'Syne',sans-serif"}}>{t.label}</div>
                <div style={{fontSize:10,color:"#333",marginTop:3}}>{loadingTheme[t.id]?"↻ buscando...":newsMap[t.id]?newsMap[t.id].length+" artigos":"Toque para carregar"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const FreeView = ()=>{
    if(!activeClient) return null;
    const go=()=>{
      const t=freeText.trim(); if(t.length<3){ notify("Escreva um tema ou texto","error"); return; }
      const title=t.split(/\n|\./)[0].slice(0,90);
      handleGenerateClick({id:"free-"+Date.now(),title,summary:t,source:"Tema livre",time:"",url:"#",free:true});
    };
    return (
      <div style={S.page}>
        <div style={S.header}>
          <button onClick={()=>setView("client")} style={S.backBtn}>← {activeClient.name}</button>
        </div>
        <ClientTabs/>
        <div style={{padding:"16px"}}>
          <div style={{fontSize:18,fontWeight:700,fontFamily:"'Syne',sans-serif",marginBottom:4}}>✍️ Criar com tema livre</div>
          <div style={{fontSize:12,color:"#555",marginBottom:12,lineHeight:1.5}}>Sem depender de notícia: escreva um tema ou cole um trecho de texto e a IA cria o tema da arte, a legenda e as hashtags.</div>
          <textarea value={freeText} onChange={e=>setFreeText(e.target.value)} rows={6}
            placeholder={"Ex.: Dicas para proteger os olhos do sol no verão\n\nou cole aqui um trecho de texto, ideia, promoção, data comemorativa..."}
            style={{width:"100%",background:"#111",border:"1px solid #222",borderRadius:10,color:"#fff",padding:12,fontSize:14,fontFamily:"'DM Sans',sans-serif",resize:"vertical"}}/>
          <button onClick={go} disabled={genLoading} style={{width:"100%",marginTop:10,background:"#C8A96E",color:"#000",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",opacity:genLoading?.6:1}}>✨ Escolher modelo e criar</button>
          <div style={{marginTop:14}}><GeneratedPanel theme={null}/></div>
        </div>
      </div>
    );
  };

  // ── CONTENT VIEW ──────────────────────────────────────────────────────
  const ContentView = ()=>{
    const themeObj = allThemes.find(t=>t.id===activeTheme)||{label:activeTheme,icon:"🔖",color:"#C8A96E"};
    const articles = newsMap[activeTheme]||[];
    return (
      <div style={S.page}>
        <div style={S.header}>
          <button onClick={()=>{setView("client");setGenerated(null);}} style={S.backBtn}>← Temas</button>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>refreshTheme(activeTheme)} style={S.iconBtn}>🔄</button>
            {["simples","carrossel"].map(t=>(
              <button key={t} onClick={()=>setArtType(t)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${artType===t?themeObj.color:themeObj.color+"33"}`,background:artType===t?themeObj.color+"22":"transparent",color:artType===t?themeObj.color:themeObj.color+"66",fontSize:11,cursor:"pointer"}}>
                {t==="simples"?"🖼️":"📚"}
              </button>
            ))}
          </div>
        </div>
        <ClientTabs/>
        <div style={{padding:"8px 16px 12px"}}>
          <div style={{fontSize:24,marginBottom:4}}>{themeObj.icon}</div>
          <div style={{fontSize:17,fontWeight:700,color:themeObj.color,fontFamily:"'Syne',sans-serif"}}>{themeObj.label}</div>
          <div style={{fontSize:11,color:"#444"}}>{activeClient?.name} · {articles.length} artigos · mais recentes primeiro</div>
        </div>
        {loadingTheme[activeTheme]&&(
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"30px",justifyContent:"center"}}>
            <div style={S.spinner}/><span style={{color:"#555",fontSize:13}}>Buscando artigos...</span>
          </div>
        )}
        {!loadingTheme[activeTheme]&&articles.length===0&&(
          <div style={{textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:40,marginBottom:12}}>📭</div>
            <div style={{color:"#555",marginBottom:16,fontSize:13}}>Sem artigos no momento.</div>
            <button style={S.btnPrimary} onClick={()=>refreshTheme(activeTheme)}>Tentar novamente</button>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:10,padding:"0 16px"}}>
          {articles.map(a=><ArticleCard key={a.id} article={a} themeObj={themeObj}/>)}
        </div>
        <div style={{padding:"12px 16px 0"}}><GeneratedPanel theme={activeTheme}/></div>
        <div style={{height:24}}/>
      </div>
    );
  };

  // ── ALL CONTENT VIEW ──────────────────────────────────────────────────
  const AllContentView = ()=>{
    if(!activeClient) return null;
    const clientThemes = allThemes.filter(t=>activeClient.themes.includes(t.id));
    const total = clientThemes.reduce((a,t)=>(newsMap[t.id]?.length||0)+a,0);
    return (
      <div style={S.page}>
        <div style={S.header}>
          <div>
            <div style={{fontSize:16,fontWeight:700,fontFamily:"'Syne',sans-serif"}}>📰 Todos os Conteúdos</div>
            <div style={{fontSize:11,color:"#555"}}>{activeClient.name} · {total} artigos</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {["simples","carrossel"].map(t=>(
              <button key={t} onClick={()=>setArtType(t)} style={{padding:"4px 10px",borderRadius:20,border:`1px solid ${artType===t?"#C8A96E":"#222"}`,background:artType===t?"#C8A96E22":"transparent",color:artType===t?"#C8A96E":"#444",fontSize:10,cursor:"pointer"}}>
                {t==="simples"?"🖼️":"📚"}
              </button>
            ))}
          </div>
        </div>
        <ClientTabs/>
        {clientThemes.length===0?(
          <div style={{textAlign:"center",padding:"60px 20px"}}>
            <div style={{fontSize:40,marginBottom:12}}>📭</div>
            <div style={{color:"#555",fontSize:13,marginBottom:16}}>Nenhum tema configurado.</div>
            <button style={S.btnPrimary} onClick={()=>{setEditingClient(activeClient);setView("edit-client");}}>Configurar Cliente</button>
          </div>
        ):(
          <div style={{paddingBottom:16}}>
            {clientThemes.map(t=>{
              const articles = newsMap[t.id]||[];
              const loading = loadingTheme[t.id];
              return (
                <div key={t.id} style={{marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px 8px",borderBottom:"1px solid #0f0f0f",cursor:"pointer"}}
                    onClick={()=>{setActiveTheme(t.id);setView("content");}}>
                    <span style={{fontSize:18}}>{t.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:t.color,fontFamily:"'Syne',sans-serif"}}>{t.label}</div>
                      <div style={{fontSize:10,color:"#444"}}>{loading?"buscando...":articles.length+" artigos"}</div>
                    </div>
                    <span style={{fontSize:11,color:"#333"}}>Ver todos →</span>
                  </div>
                  {loading&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 16px"}}><div style={S.spinner}/><span style={{color:"#555",fontSize:12}}>Carregando...</span></div>}
                  {!loading&&(
                    <div style={{display:"flex",flexDirection:"column",gap:8,padding:"8px 16px"}}>
                      {articles.slice(0,3).map(a=><ArticleCard key={a.id} article={a} themeObj={t}/>)}
                      {articles.length>3&&(
                        <button style={{background:"none",border:"1px solid #1a1a1a",borderRadius:10,padding:"10px",color:"#444",fontSize:12,cursor:"pointer"}}
                          onClick={()=>{setActiveTheme(t.id);setView("content");}}>
                          + {articles.length-3} artigos em {t.label}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div style={{padding:"0 16px 0"}}><GeneratedPanel theme={activeTheme}/></div>
      </div>
    );
  };

  // ── SETTINGS VIEW ────────────────────────────────────────────────────
  const SettingsView = ()=>(
    <div style={S.page}>
      <div style={S.header}>
        <button onClick={()=>setView("home")} style={S.backBtn}>← Voltar</button>
        <div style={{color:"#C8A96E",fontSize:13}}>Configurações</div>
      </div>
      <div style={{padding:"0 16px"}}>
        <div style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>🔑 API Status</div>
          <div style={{color:apiOk?"#22c55e":"#f97316",fontSize:14}}>{apiOk===null?"Verificando...":apiOk?"✅ Groq conectado (Llama 3.3 70B)":"❌ Configure GROQ_API_KEY no Netlify"}</div>
        </div>
        <div style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>👥 Clientes</div>
          <div style={{color:"#555",fontSize:14}}>{clients.length} cliente(s) cadastrado(s)</div>
        </div>
        <div style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>📦 Versão</div>
          <div style={{color:"#555",fontSize:14}}>Agente Social Media M2.0 v1.0</div>
        </div>
        <button style={{...S.btnCancel,marginTop:8,width:"100%"}}
          onClick={()=>{lsSet("clients",[]);setClients([]);setActiveClientId(null);notify("🗑️ Dados limpos.");}}>
          🗑️ Limpar Todos os Dados
        </button>
      </div>
    </div>
  );

  return (
    <div style={S.root}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box} input:focus{outline:none;border-color:#C8A96E!important} input[type=color]{-webkit-appearance:none} ::-webkit-scrollbar{height:3px;background:#111} ::-webkit-scrollbar-thumb{background:#222}`}</style>
      {notification&&(
        <div style={{position:"fixed",top:12,left:"50%",transform:"translateX(-50%)",zIndex:999,padding:"10px 20px",borderRadius:20,background:notification.type==="error"?"#1a0808":"#111",border:`1px solid ${notification.type==="error"?"#ef444466":"#C8A96E55"}`,color:notification.type==="error"?"#ef4444":"#C8A96E",fontSize:13,whiteSpace:"nowrap",boxShadow:"0 4px 20px #00000088"}}>
          {notification.msg}
        </div>
      )}
      {view==="home"&&HomeView()}
      {view==="client"&&ClientView()}
      {view==="content"&&ContentView()}
      {view==="allcontent"&&AllContentView()}
      {view==="free"&&FreeView()}
      {view==="settings"&&SettingsView()}
      {(view==="add-client"||view==="edit-client")&&<ClientForm initial={editingClient} allThemes={allThemes} onAddTheme={addTheme} notify={notify} onSave={saveClient} onCancel={()=>{setView(editingClient?"client":"home");setEditingClient(null);}}/>}
      {showTplPicker&&pendingArticle&&<TplPicker article={pendingArticle} artType={artType} setArtType={setArtType} client={activeClient} onConfirm={doGenerate} onCanva={doCanva} onCancel={()=>setShowTplPicker(false)}/>}
      {promptModal&&<PromptModal text={promptModal} onClose={()=>setPromptModal(null)} notify={notify}/>}
      {["home","client","content","allcontent","settings"].includes(view)&&(
        <nav style={S.nav}>
          <button style={{...S.navBtn,color:view==="home"?"#C8A96E":"#444"}} onClick={()=>setView("home")}>
            <span style={{fontSize:20}}>🏠</span><span style={{fontSize:9,letterSpacing:1}}>INÍCIO</span>
          </button>
          <button style={{...S.navBtn,color:view==="client"?"#C8A96E":"#444"}} onClick={()=>{setView("client");setGenerated(null);}}>
            <span style={{fontSize:20}}>🏢</span><span style={{fontSize:9,letterSpacing:1}}>EMPRESA</span>
          </button>
          <button style={{...S.navBtn,color:view==="allcontent"?"#C8A96E":"#444"}} onClick={()=>{setView("allcontent");setGenerated(null);}}>
            <span style={{fontSize:20}}>📰</span><span style={{fontSize:9,letterSpacing:1}}>CONTEÚDOS</span>
          </button>
          <button style={{...S.navBtn,color:view==="settings"?"#C8A96E":"#444"}} onClick={()=>setView("settings")}>
            <span style={{fontSize:20}}>⚙️</span><span style={{fontSize:9,letterSpacing:1}}>CONFIG</span>
          </button>
        </nav>
      )}
    </div>
  );
}

  // ── TEMPLATE PICKER ───────────────────────────────────────────────────
function TplPicker({article,onConfirm,onCanva,onCancel,artType,setArtType,client}){
    const [localTpl,setLocalTpl] = useState(null);
    const feeds = client?.templates?.feeds||[];
    const stories = client?.templates?.stories||[];
    return (
      <div style={S.overlay}>
        <div style={{...S.formCard,maxWidth:400}}>
          <div style={S.formTitle}>🎨 Gerar Arte</div>
          <div style={{fontSize:13,color:"#666",marginBottom:16,lineHeight:1.5}}>"{article.title}"</div>
          <div style={S.label}>TIPO DE ARTE</div>
          <div style={{display:"flex",gap:10,marginBottom:20}}>
            {["simples","carrossel"].map(t=>(
              <button key={t} onClick={()=>setArtType(t)} style={{flex:1,padding:"12px",borderRadius:12,border:`2px solid ${artType===t?"#C8A96E":"#1e1e1e"}`,background:artType===t?"#C8A96E11":"#0d0d0d",color:artType===t?"#C8A96E":"#555",cursor:"pointer",fontWeight:artType===t?700:400,fontSize:13}}>
                {t==="simples"?"🖼️ Arte Simples":"📚 Carrossel"}
              </button>
            ))}
          </div>
          {(feeds.length>0||stories.length>0)&&(
            <>
              <div style={S.label}>MODELO DO CLIENTE</div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20,maxHeight:280,overflowY:"auto"}}>
                {feeds.map(f=>(
                  <button key={f.id} onClick={()=>setLocalTpl({...f,type:"feed"})} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:`1px solid ${localTpl?.id===f.id?"#C8A96E":"#1e1e1e"}`,background:localTpl?.id===f.id?"#C8A96E11":"#0d0d0d",cursor:"pointer",textAlign:"left"}}>
                    <span>🖼️</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,color:localTpl?.id===f.id?"#C8A96E":"#ccc",fontWeight:600}}>{f.label}</div>
                      <div style={{fontSize:10,color:"#444"}}>Feed{f.url?" · "+f.url.substring(0,28)+"...":" · sem link"}</div>
                    </div>
                    {localTpl?.id===f.id&&<span style={{color:"#C8A96E"}}>✓</span>}
                  </button>
                ))}
                {stories.map(s=>(
                  <button key={s.id} onClick={()=>setLocalTpl({...s,type:"stories"})} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:`1px solid ${localTpl?.id===s.id?"#a855f7":"#1e1e1e"}`,background:localTpl?.id===s.id?"#a855f711":"#0d0d0d",cursor:"pointer",textAlign:"left"}}>
                    <span>📱</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,color:localTpl?.id===s.id?"#a855f7":"#ccc",fontWeight:600}}>{s.label}</div>
                      <div style={{fontSize:10,color:"#444"}}>Stories{s.url?" · "+s.url.substring(0,28)+"...":" · sem link"}</div>
                    </div>
                    {localTpl?.id===s.id&&<span style={{color:"#a855f7"}}>✓</span>}
                  </button>
                ))}
                <button onClick={()=>setLocalTpl(null)} style={{padding:"8px",borderRadius:10,border:`1px solid ${!localTpl?"#555":"#1e1e1e"}`,background:"transparent",color:!localTpl?"#888":"#444",cursor:"pointer",fontSize:12}}>
                  Sem modelo — só gerar texto
                </button>
              </div>
            </>
          )}

          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button style={{...S.btnPrimary,opacity:localTpl?.url?1:0.35}} disabled={!localTpl?.url} onClick={()=>onCanva(article,localTpl)}>🎨 Criar arte no Canva</button>
            <button style={S.btnSec} onClick={()=>{onConfirm(article,localTpl);}}>✨ Só texto</button>
            <button style={S.btnCancel} onClick={onCancel}>Cancelar</button>
          </div>
        </div>
      </div>
    );
}


  // ── CLIENT FORM ───────────────────────────────────────────────────────
function ClientForm({initial,onSave,onCancel,allThemes,onAddTheme,notify}){
    const [customTheme,setCustomTheme] = useState("");
    const defTpl = {feeds:[{id:"f"+Date.now(),label:"Feed 1",url:""}],stories:[{id:"s"+Date.now(),label:"Stories 1",url:""}],modelo:""};
    const normTpl = (t)=>({
      feeds: Array.isArray(t?.feeds)?t.feeds:[{id:"f1",label:"Feed 1",url:t?.feed||""}],
      stories: Array.isArray(t?.stories)?t.stories:[{id:"s1",label:"Stories 1",url:typeof t?.stories==="string"?t.stories:""}],
      modelo:t?.modelo||"",
    });
    const [form,setForm] = useState(initial?{...initial,brandColors:initial.brandColors||["","",""],templates:normTpl(initial.templates)}:{name:"",niche:"",themes:[],brandColors:["","",""],templates:defTpl,color:CLIENT_COLORS[0],signature:"",artRules:""});
    const set=(k,v)=>setForm(p=>({...p,[k]:v}));
    const setTpl=(k,v)=>setForm(p=>({...p,templates:{...p.templates,[k]:v}}));
    const toggle=(id)=>set("themes",form.themes.includes(id)?form.themes.filter(t=>t!==id):[...form.themes,id]);
    const addCustom=()=>{
      const id=customTheme.toLowerCase().replace(/\s+/g,"-");
      if(id&&!allThemes.find(t=>t.id===id)){onAddTheme({id,label:customTheme,icon:"🔖",color:"#888"});toggle(id);setCustomTheme("");}
    };
    const addTplItem=(type)=>{
      if((form.templates[type]||[]).length>=15)return;
      const n=(form.templates[type]||[]).length+1;
      setTpl(type,[...(form.templates[type]||[]),{id:type[0]+Date.now(),label:`${type==="feeds"?"Feed":"Stories"} ${n}`,url:""}]);
    };
    const removeTplItem=(type,id)=>setTpl(type,(form.templates[type]||[]).filter(x=>x.id!==id));
    const updTplItem=(type,id,field,val)=>setTpl(type,(form.templates[type]||[]).map(x=>x.id===id?{...x,[field]:val}:x));
    const setBrandColor=(i,v)=>{const c=[...form.brandColors];c[i]=v;set("brandColors",c);};

    const TplList=({type,icon,accent})=>(
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontSize:10,color:"#666",letterSpacing:1.5}}>{icon} {type==="feeds"?"FEED":"STORIES"} ({(form.templates[type]||[]).length}/15)</div>
          {(form.templates[type]||[]).length<15&&<button onClick={()=>addTplItem(type)} style={{background:"none",border:`1px solid ${accent}44`,borderRadius:20,color:accent,fontSize:11,padding:"3px 10px",cursor:"pointer"}}>+ Adicionar</button>}
        </div>
        {(form.templates[type]||[]).map((item,i)=>(
          <div key={item.id} style={{display:"flex",gap:6,marginBottom:8}}>
            <div style={{flex:1}}>
              <input style={{...S.input,marginBottom:4,fontSize:12,padding:"7px 10px"}} value={item.label} onChange={e=>updTplItem(type,item.id,"label",e.target.value)} placeholder={`Nome do modelo ${i+1}`}/>
              <input style={{...S.input,marginBottom:0,fontSize:11,padding:"7px 10px",fontFamily:"monospace"}} value={item.url} onChange={e=>updTplItem(type,item.id,"url",e.target.value)} placeholder="https://www.canva.com/design/DAxxxxxx/..."/>
              <textarea rows={2} style={{...S.input,marginTop:4,marginBottom:0,fontSize:11,padding:"7px 10px",resize:"vertical"}} value={item.notes||""} onChange={e=>updTplItem(type,item.id,"notes",e.target.value)} placeholder="Mapa/regras deste modelo (opcional): ex. título máx 20 caracteres, corpo máx 99, não editar logo e rodapé"/>
            </div>
            {(form.templates[type]||[]).length>1&&<button onClick={()=>removeTplItem(type,item.id)} style={{background:"none",border:"none",color:"#444",fontSize:15,cursor:"pointer",padding:"4px"}}>✕</button>}
          </div>
        ))}
      </div>
    );

    return (
      <div style={S.overlay}>
        <div style={S.formCard}>
          <h2 style={S.formTitle}>{initial?"✏️ Editar Cliente":"➕ Novo Cliente"}</h2>
          <label style={S.label}>Nome do Cliente</label>
          <input style={S.input} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Ex: Clínica Visão Plena"/>
          <label style={S.label}>Segmento / Nicho</label>
          <input style={S.input} value={form.niche} onChange={e=>set("niche",e.target.value)} placeholder="Ex: Saúde Ocular"/>
          <label style={S.label}>Cor de Identificação no App</label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
            {CLIENT_COLORS.map(c=><div key={c} onClick={()=>set("color",c)} style={{width:26,height:26,borderRadius:"50%",background:c,cursor:"pointer",border:form.color===c?"3px solid #fff":"2px solid transparent",boxShadow:form.color===c?`0 0 0 2px ${c}`:"none"}}/>)}
          </div>
          <div style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:12,padding:"14px 14px 8px",marginBottom:16}}>
            <div style={{fontSize:10,color:"#C8A96E",letterSpacing:2,marginBottom:12}}>🎨 CORES DA IDENTIDADE VISUAL</div>
            {["Cor Principal","Cor Secundária","Cor de Destaque"].map((label,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                <input type="color" value={form.brandColors[i]||"#000000"} onChange={e=>setBrandColor(i,e.target.value)} style={{width:40,height:36,border:"1px solid #2a2a2a",borderRadius:8,cursor:"pointer",padding:2}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:"#555",marginBottom:3}}>{label}</div>
                  <input style={{...S.input,marginBottom:0,fontSize:11,fontFamily:"monospace",padding:"6px 10px"}} value={form.brandColors[i]||""} onChange={e=>setBrandColor(i,e.target.value)} placeholder="#000000"/>
                </div>
                {form.brandColors[i]&&<div style={{width:24,height:24,borderRadius:6,background:form.brandColors[i],border:"1px solid #333",flexShrink:0}}/>}
              </div>
            ))}
          </div>
          <label style={S.label}>Temas de Interesse</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
            {allThemes.map(t=>(
              <button key={t.id} onClick={()=>toggle(t.id)} style={{...S.chip,background:form.themes.includes(t.id)?t.color+"33":"#111",border:`1px solid ${form.themes.includes(t.id)?t.color:"#2a2a2a"}`,color:form.themes.includes(t.id)?t.color:"#555"}}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <input style={{...S.input,flex:1,marginBottom:0}} value={customTheme} onChange={e=>setCustomTheme(e.target.value)} placeholder="Tema personalizado..."/>
            <button onClick={addCustom} style={S.btnSec}>+ Add</button>
          </div>
          <div style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:12,padding:"14px 14px 4px",marginBottom:16}}>
            <div style={{fontSize:10,color:"#C8A96E",letterSpacing:2,marginBottom:14}}>📐 TEMPLATES CANVA</div>
            <TplList type="feeds" icon="🖼️" accent="#C8A96E"/>
            <TplList type="stories" icon="📱" accent="#a855f7"/>
            <label style={{...S.label,marginTop:4}}>📁 Modelo / Padrão Visual</label>
            <input style={S.input} value={form.templates.modelo||""} onChange={e=>setTpl("modelo",e.target.value)} placeholder="Link de referência (Canva, Drive...)"/>
            <label style={S.label}>✍️ Assinatura no final da legenda</label>
            <input style={S.input} value={form.signature||""} onChange={e=>set("signature",e.target.value)} placeholder="Ex: 🎯 Grupo Marketing 2.0 @marketing2ponto0"/>
            <label style={S.label}>📌 Regras gerais das artes deste cliente</label>
            <textarea rows={3} style={{...S.input,resize:"vertical"}} value={form.artRules||""} onChange={e=>set("artRules",e.target.value)} placeholder="Ex: tom de voz, palavras proibidas, itens que nunca mudam (logo, telefone, endereço)..."/>
          </div>
          <div style={{display:"flex",gap:12}}>
            <button style={S.btnPrimary} onClick={()=>{if(form.name)onSave(form);else notify("Informe o nome","error");}}>Salvar</button>
            <button style={S.btnCancel} onClick={onCancel}>Cancelar</button>
          </div>
        </div>
      </div>
    );
}


export function buildCanvaPrompt({client,tpl,article,artType,generated,themeLabel}){
  const data=new Date().toLocaleDateString("pt-BR");
  const cores=(client?.brandColors||[]).filter(Boolean).join(", ");
  const L=[];
  L.push("Crie a arte no Canva a partir desta notícia, seguindo o fluxo abaixo. Execute tudo automaticamente, sem pedir confirmação.");
  L.push("");
  L.push("CLIENTE: "+(client?.name||"")+(client?.niche?" ("+client.niche+")":""));
  L.push("TIPO DE ARTE: "+(artType==="carrossel"?"Carrossel":"Arte simples"));
  L.push("MODELO: "+(tpl?.label||"")+" — "+(tpl?.url||""));
  if(cores) L.push("CORES DA MARCA (já presentes no modelo, não alterar): "+cores);
  if(themeLabel) L.push("TEMA: "+themeLabel);
  L.push("");
  L.push("NOTÍCIA");
  L.push("Título: "+article.title);
  if(article.summary) L.push("Resumo: "+article.summary);
  L.push("Fonte: "+(article.source||"")+(article.time?" · "+article.time:""));
  if(article.url&&article.url!=="#") L.push("Link: "+article.url);
  if(generated){
    L.push("");
    L.push("TEXTOS JÁ GERADOS (use como base e ajuste ao limite de cada campo):");
    if(generated.headline) L.push("Headline: "+generated.headline);
    if(generated.slides) generated.slides.forEach((sl,i)=>L.push("Slide "+(i+1)+": "+sl.titulo+" — "+sl.texto));
    if(generated.caption) L.push("Legenda: "+generated.caption);
    if(generated.hashtags) L.push("Hashtags: "+generated.hashtags);
    if(generated.cta) L.push("CTA: "+generated.cta);
  }
  L.push("");
  L.push("FLUXO OBRIGATÓRIO");
  L.push("1. Se o link for canva.link, resolva com resolve-shortlink. Leia a estrutura do design (read-design) e MAPEIE os elementos: identifique cada texto (etiqueta, título, corpo, local, assinatura), imagens e elementos fixos.");
  L.push("2. Faça copy-design do modelo. Nunca edite o original e nunca use generate-design.");
  L.push("3. Abra a cópia para edição (start-editing-transaction).");
  L.push("4. Em UMA única chamada de perform-editing-operations: update_title + todos os replace_text. Troque SOMENTE o conteúdo dos textos variáveis. Mantenha fonte, tamanho, cor, alinhamento, quebras de linha, posição e todos os elementos fixos (logo, nome da marca, assinatura, contatos, rodapé). Respeite o limite de caracteres que cada campo comporta no modelo; se precisar, encurte o texto para não estourar.");
  L.push("5. Finalize com commit-editing-transaction.");
  L.push("6. Entregue o link da arte e a legenda do Instagram pronta para copiar.");
  if(artType==="carrossel") L.push("Carrossel: capa + 3 a 5 slides de conteúdo + fechamento, reaproveitando as páginas do modelo (duplique a página do modelo quando precisar de mais slides).");
  L.push("");
  L.push("REGRAS DE TEXTO");
  L.push("- Local: apenas o nome da cidade, sem sigla do estado.");
  L.push('- update_title no formato "[Assunto] - [Cidade] - '+data+'".');
  L.push("- Preserve sempre a acentuação do português.");
  if(client?.signature) L.push("- A legenda do Instagram termina exatamente com: "+client.signature);
  if(tpl?.notes) L.push("REGRAS DESTE MODELO: "+tpl.notes);
  if(client?.artRules) L.push("REGRAS GERAIS DO CLIENTE: "+client.artRules);
  return L.join("\n");
}

function PromptModal({text,onClose,notify}){
  return (
    <div style={S.overlay}>
      <div style={{...S.formCard,maxWidth:420}}>
        <div style={S.formTitle}>📋 Pedido da arte</div>
        <div style={{fontSize:12,color:"#777",marginBottom:10,lineHeight:1.5}}>Não consegui copiar automaticamente. Copie o texto abaixo e cole no Claude.</div>
        <textarea readOnly rows={12} value={text} onFocus={e=>e.target.select()} style={{...S.input,fontSize:11,fontFamily:"monospace"}}/>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button style={S.btnPrimary} onClick={()=>{try{navigator.clipboard.writeText(text);notify("📋 Copiado!");}catch{}}}>Copiar</button>
          <a href="https://claude.ai/new" target="_blank" rel="noreferrer" style={{...S.btnSec,textDecoration:"none"}}>Abrir Claude</a>
          <button style={S.btnCancel} onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

const S = {
  root:{background:"#080808",minHeight:"100vh",maxWidth:480,margin:"0 auto",fontFamily:"'DM Sans',sans-serif",color:"#fff",paddingBottom:80},
  page:{paddingTop:8},
  header:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px 10px"},
  logo:{fontSize:22,fontWeight:800,fontFamily:"'Syne',sans-serif"},
  logoSub:{fontSize:9,color:"#C8A96E",letterSpacing:3,marginTop:2},
  backBtn:{background:"none",border:"none",color:"#C8A96E",fontSize:13,cursor:"pointer",padding:0},
  iconBtn:{background:"none",border:"none",color:"#555",fontSize:18,cursor:"pointer",padding:4},
  sectionTitle:{fontSize:9,letterSpacing:3,color:"#2a2a2a",padding:"4px 16px 10px"},
  tplLink:{flex:1,minWidth:0,display:"block",textAlign:"center",padding:"7px 10px",background:"#C8A96E11",border:"1px solid #C8A96E33",borderRadius:8,color:"#C8A96E",fontSize:11,textDecoration:"none",fontWeight:600},
  chip:{padding:"5px 10px",borderRadius:20,fontSize:11,cursor:"pointer"},
  label:{display:"block",fontSize:9,letterSpacing:2,textTransform:"uppercase",color:"#3a3a3a",marginBottom:6},
  input:{width:"100%",background:"#0d0d0d",border:"1px solid #1e1e1e",borderRadius:10,padding:"11px 13px",color:"#fff",fontSize:13,marginBottom:14,fontFamily:"'DM Sans',sans-serif"},
  btnPrimary:{background:"#C8A96E",color:"#000",border:"none",borderRadius:20,padding:"12px 22px",fontSize:13,fontWeight:700,cursor:"pointer"},
  btnSec:{background:"#1a1a1a",color:"#C8A96E",border:"1px solid #C8A96E33",borderRadius:20,padding:"11px 14px",fontSize:12,cursor:"pointer",whiteSpace:"nowrap"},
  btnCancel:{background:"#111",color:"#555",border:"1px solid #1e1e1e",borderRadius:20,padding:"9px 16px",fontSize:12,cursor:"pointer"},
  btnCopy:{background:"#1a1a1a",color:"#C8A96E",border:"1px solid #C8A96E33",borderRadius:20,padding:"9px 14px",fontSize:12,cursor:"pointer"},
  overlay:{position:"fixed",inset:0,background:"#000000dd",zIndex:100,overflowY:"auto",padding:"20px 16px"},
  formCard:{background:"#111",border:"1px solid #1e1e1e",borderRadius:20,padding:22,maxWidth:440,margin:"0 auto"},
  formTitle:{fontSize:16,fontWeight:700,fontFamily:"'Syne',sans-serif",color:"#C8A96E",marginBottom:18,marginTop:0},
  genPanel:{margin:"12px 0 0",background:"#0d0d0d",border:"1px solid #C8A96E33",borderRadius:14,padding:18},
  spinner:{width:20,height:20,border:"2px solid #1a1a1a",borderTop:"2px solid #C8A96E",borderRadius:"50%",animation:"spin 0.8s linear infinite",flexShrink:0},
  nav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#080808",borderTop:"1px solid #C8A96E1a",display:"flex",justifyContent:"space-around",padding:"10px 0 16px",zIndex:50},
  navBtn:{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3},
};
