# Social Media 2.0 (agente-social-m20)

PWA mobile-first: busca notícias por tema, cria legenda/arte para os clientes de social media (modelos do Canva por cliente).

## Deploy no Netlify
1. Netlify → site `agentesocial-m20` → *Link repository* → GitHub `marketing2ponto0/agente-social-m20` (branch `main`).
2. Build: `npm run build` · Publish: `dist` (já está no `netlify.toml`).
3. *Site configuration → Environment variables*: `GROQ_API_KEY` (grátis em console.groq.com). Opcional: `GROQ_MODEL`, `SUPABASE_URL`, `SUPABASE_KEY`.
4. Deploy. A função `ingest-cron` roda de hora em hora (aba *Logs → Functions*).

## Verificação rápida pós-deploy
- `/api/status` → `{"hasApiKey":true}`
- `/api/topics?theme=nutricao` → notícias + contagem por fonte (`sources`)
- `/api/topics?theme=saude-ocular&q=miopia` → busca por assunto

## Base de notícias
Tabela `public.social_articles` (Supabase projeto portal2ponto0): arquivo de 7 dias alimentado a cada consulta e pelo cron.
