exports.handler = async (event) => {
  const headers = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'};
  if (event.httpMethod==='OPTIONS') return {statusCode:200,headers,body:''};
  if (!process.env.ANTHROPIC_API_KEY) return {statusCode:500,headers,body:JSON.stringify({error:'ANTHROPIC_API_KEY not set'})};
  try {
    const body = JSON.parse(event.body);
    const res = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify(body),
    });
    const data = await res.json();
    return {statusCode:res.status,headers,body:JSON.stringify(data)};
  } catch(e) { return {statusCode:500,headers,body:JSON.stringify({error:e.message})}; }
};
