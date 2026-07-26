exports.handler = async () => ({statusCode:200,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify({hasApiKey:!!process.env.ANTHROPIC_API_KEY})});
