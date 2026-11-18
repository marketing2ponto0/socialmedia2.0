// Uses Groq API (free) instead of Anthropic
exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (!process.env.GROQ_API_KEY)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'GROQ_API_KEY not set' }) };

  try {
    const { system, messages, max_tokens } = JSON.parse(event.body);

    // Convert Anthropic format → OpenAI/Groq format
    const groqMessages = [];
    if (system) groqMessages.push({ role: 'system', content: system });
    groqMessages.push(...messages);

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: groqMessages,
        max_tokens: max_tokens || 1000,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: data.error?.message || ('Groq HTTP ' + res.status) }) };
    }

    // Convert Groq response → Anthropic format (so App.jsx doesn't need to change)
    const text = data.choices?.[0]?.message?.content || '';
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ content: [{ type: 'text', text }] }),
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
