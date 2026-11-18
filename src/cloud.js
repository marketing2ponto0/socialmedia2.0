// Sincronização na nuvem (Supabase). Tudo do app (clientes, modelos, temas, histórico) fica salvo
// numa linha protegida pelo CÓDIGO DE ACESSO do Herbert: o código vai no header x-workspace-key e
// o banco só guarda o hash SHA-256 (RLS). Sem o código ninguém lê nem grava.
const URL_ = "https://yuqidbvfilomxkwaaerl.supabase.co/rest/v1/social_state";
const KEY = "sb_publishable_t3Qiwi-26sBX-0mbtdjXCA__h26yp3p";

export async function sha256(text){
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
const headers = (code, extra={}) => ({ apikey: KEY, Authorization: "Bearer "+KEY, "x-workspace-key": code, "Content-Type":"application/json", ...extra });

export async function cloudPull(code){
  const r = await fetch(`${URL_}?select=data,updated_at&limit=1`, { headers: headers(code) });
  if(!r.ok) throw new Error("Nuvem indisponível ("+r.status+")");
  const rows = await r.json();
  return rows[0] || null; // {data, updated_at} | null
}

export async function cloudPush(code, data){
  const updated_at = new Date().toISOString();
  const r = await fetch(`${URL_}?on_conflict=key_hash`, {
    method: "POST",
    headers: headers(code, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ key_hash: await sha256(code), data, updated_at }),
  });
  if(!r.ok) throw new Error("Falha ao salvar na nuvem ("+r.status+")");
  return updated_at;
}
