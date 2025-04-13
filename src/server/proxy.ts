import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

// Type definitions for API responses
interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
}

interface AnthropicResponse {
  content: Array<{ text: string }>;
}

interface AzureResponse {
  choices: Array<{ message: { content: string } }>;
}

interface BedrockResponse {
  content: Array<{ text: string }>;
}

interface OllamaResponse {
  response: string;
}

interface GoogleResponse {
  candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
}

// OpenAI proxy
app.post('/api/openai', (async (req: Request, res: Response) => {
  try {
    const { apiKey, prompt } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json() as { error?: { message?: string } };
      throw new Error(errorData.error?.message || 'OpenAI API error');
    }
    const data = await response.json() as OpenAIResponse;
    res.json({ response: data.choices[0].message.content });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'OpenAI API error' });
  }
}) as RequestHandler);

// Anthropic proxy
app.post('/api/anthropic', (async (req: Request, res: Response) => {
  try {
    const { apiKey, prompt } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      const errorData = await response.json() as { error?: { message?: string } };
      throw new Error(errorData.error?.message || 'Anthropic API error');
    }
    const data = await response.json() as AnthropicResponse;
    res.json({ response: data.content[0].text });
  } catch (error) {
    console.error('Anthropic API error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Anthropic API error' });
  }
}) as RequestHandler);

// Azure proxy
app.post('/api/azure', (async (req: Request, res: Response) => {
  try {
    const { apiKey, endpoint, prompt } = req.body;
    if (!apiKey || !endpoint) {
      return res.status(400).json({ error: 'API key and endpoint are required' });
    }
    const response = await fetch(`${endpoint}/openai/deployments/gpt-4/chat/completions?api-version=2024-02-15-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json() as { error?: { message?: string } };
      throw new Error(errorData.error?.message || 'Azure API error');
    }
    const data = await response.json() as AzureResponse;
    res.json({ response: data.choices[0].message.content });
  } catch (error) {
    console.error('Azure API error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Azure API error' });
  }
}) as RequestHandler);

// Bedrock proxy
app.post('/api/bedrock', (async (req: Request, res: Response) => {
  try {
    const { accessKey, secretKey, region, prompt } = req.body;
    if (!accessKey || !secretKey || !region) {
      return res.status(400).json({ error: 'Access key, secret key, and region are required' });
    }
    const response = await fetch(`https://bedrock-runtime.${region}.amazonaws.com/model/anthropic.claude-3-opus-20240229-v1:0/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `AWS4-HMAC-SHA256 Credential=${accessKey}/${new Date().toISOString().split('T')[0]}/${region}/bedrock/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=...`, // You'll need to implement proper AWS signature
      },
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      const errorData = await response.json() as { error?: { message?: string } };
      throw new Error(errorData.error?.message || 'Bedrock API error');
    }
    const data = await response.json() as BedrockResponse;
    res.json({ response: data.content[0].text });
  } catch (error) {
    console.error('Bedrock API error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Bedrock API error' });
  }
}) as RequestHandler);

// Ollama proxy
app.post('/api/ollama', (async (req: Request, res: Response) => {
  try {
    const { endpoint, prompt } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }
    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama2',
        prompt,
        max_tokens: 1000,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json() as { error?: { message?: string } };
      throw new Error(errorData.error?.message || 'Ollama API error');
    }
    const data = await response.json() as OllamaResponse;
    res.json({ response: data.response });
  } catch (error) {
    console.error('Ollama API error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Ollama API error' });
  }
}) as RequestHandler);

// Google proxy endpoint
app.post('/api/google', (async (req: Request, res: Response) => {
  try {
    const { apiKey, prompt, model, apiPath } = req.body;
    console.log('Google Proxy Request:', {
      model,
      apiPath,
      promptLength: prompt.length
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/${apiPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    console.log('Google API Response Status:', response.status);
    const rawResponseText = await response.text();
    console.log('Google API Raw Response:', rawResponseText);

    if (!response.ok) {
      console.error('Google API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: rawResponseText
      });
      throw new Error(`Google API error: ${response.status} ${response.statusText}`);
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(rawResponseText);
    } catch (e) {
      console.error('Error parsing Google API response:', e);
      console.error('Raw response that failed to parse:', rawResponseText);
      throw new Error('Invalid JSON response from Google API');
    }

    // Extract the response text from the Google API response
    const modelResponseText = parsedResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!modelResponseText) {
      console.error('Invalid Google API response structure:', parsedResponse);
      throw new Error('Invalid response format from Google API');
    }

    // Try to parse the response as JSON first
    try {
      const jsonResponse = JSON.parse(modelResponseText);
      return res.json({ response: jsonResponse });
    } catch (e) {
      // If not JSON, try to extract JSON from markdown code blocks
      const jsonMatch = modelResponseText.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const jsonFromMarkdown = JSON.parse(jsonMatch[1].trim());
          return res.json({ response: jsonFromMarkdown });
        } catch (e) {
          console.error('Error parsing JSON from markdown:', e);
          console.error('Markdown content:', jsonMatch[1]);
        }
      }
      // If all else fails, return the raw text
      return res.json({ response: modelResponseText });
    }
  } catch (error) {
    console.error('Google Proxy Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
}) as RequestHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
}); 