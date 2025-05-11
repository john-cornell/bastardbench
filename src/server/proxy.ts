import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import http from 'http';
import https from 'https';

const app = express();
app.use(cors());
app.use(express.json());

// Circuit breaker configuration
interface CircuitBreakerState {
  failures: number;
  connectionFailures: number;  // Track connection failures separately
  lastFailureTime: number;
  isOpen: boolean;
  lastSuccessTime: number;
}

const CIRCUIT_BREAKER = {
  failureThreshold: 5,
  connectionFailureThreshold: 3,  // Separate threshold for connection failures
  resetTimeout: 30000, // 30 seconds
  halfOpenTimeout: 10000, // 10 seconds
  states: new Map<string, CircuitBreakerState>()
};

// Request queue configuration
interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timestamp: number;
}

const REQUEST_QUEUE = {
  maxConcurrent: 1, // Changed to 1 for strict sequential processing
  maxQueueSize: 50, // Reduced queue size
  queue: new Map<string, QueuedRequest[]>(),
  activeRequests: new Map<string, number>(),
  processingQueue: new Map<string, boolean>(), // Track if queue is being processed
  rateLimit: {
    requestsPerMinute: 30,
    lastRequestTime: new Map<string, number>()
  }
};

// Configure connection pools
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000
});

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

// Add timeout configuration
const TIMEOUT_CONFIG = {
  default: 120000, // 2 minutes for normal requests
  cryptic: 120000, // 2 minutes for cryptic tests
  maxRetries: 3,
  retryDelay: 1000 // 1 second base delay
};

// Helper to determine if a request is a cryptic test
function isCrypticTest(prompt: string): boolean {
  return prompt.includes('cryptic crossword') || 
         prompt.includes('IMPORTANT: ANSWER ONLY in the valid JSON format');
}

// Circuit breaker functions
function getCircuitBreakerState(model: string): CircuitBreakerState {
  if (!CIRCUIT_BREAKER.states.has(model)) {
    CIRCUIT_BREAKER.states.set(model, {
      failures: 0,
      connectionFailures: 0,
      lastFailureTime: 0,
      isOpen: false,
      lastSuccessTime: Date.now()
    });
  }
  return CIRCUIT_BREAKER.states.get(model)!;
}

function canMakeRequest(model: string): boolean {
  const state = getCircuitBreakerState(model);
  const now = Date.now();

  if (state.isOpen) {
    // Check if we should try a half-open state
    if (now - state.lastFailureTime > CIRCUIT_BREAKER.halfOpenTimeout) {
      console.log(`[${new Date().toISOString()}] Circuit breaker for ${model} entering half-open state`);
      state.isOpen = false;
      return true;
    }
    return false;
  }

  return true;
}

function recordSuccess(model: string) {
  const state = getCircuitBreakerState(model);
  state.failures = 0;
  state.lastSuccessTime = Date.now();
  state.isOpen = false;
}

function recordFailure(model: string, isConnectionError: boolean) {
  const state = getCircuitBreakerState(model);
  state.failures++;
  state.lastFailureTime = Date.now();

  if (state.failures >= CIRCUIT_BREAKER.failureThreshold) {
    console.log(`[${new Date().toISOString()}] Circuit breaker for ${model} opened after ${state.failures} failures`);
    state.isOpen = true;
  }
}

// Request queue functions
async function enqueueRequest(model: string, requestFn: () => Promise<any>): Promise<any> {
  if (!REQUEST_QUEUE.queue.has(model)) {
    REQUEST_QUEUE.queue.set(model, []);
  }

  const queue = REQUEST_QUEUE.queue.get(model)!;
  const activeCount = REQUEST_QUEUE.activeRequests.get(model) || 0;

  // Check rate limit
  const lastRequestTime = REQUEST_QUEUE.rateLimit.lastRequestTime.get(model) || 0;
  const timeSinceLastRequest = Date.now() - lastRequestTime;
  const minTimeBetweenRequests = (60 * 1000) / REQUEST_QUEUE.rateLimit.requestsPerMinute;

  if (timeSinceLastRequest < minTimeBetweenRequests) {
    const waitTime = minTimeBetweenRequests - timeSinceLastRequest;
    console.log(`[${new Date().toISOString()}] Rate limiting request for ${model}, waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  if (activeCount >= REQUEST_QUEUE.maxConcurrent) {
    if (queue.length >= REQUEST_QUEUE.maxQueueSize) {
      throw new Error(`Request queue for ${model} is full`);
    }

    return new Promise((resolve, reject) => {
      queue.push({
        resolve,
        reject,
        timestamp: Date.now()
      });
    });
  }

  REQUEST_QUEUE.activeRequests.set(model, activeCount + 1);
  REQUEST_QUEUE.rateLimit.lastRequestTime.set(model, Date.now());

  try {
    const result = await requestFn();
    return result;
  } finally {
    const newActiveCount = (REQUEST_QUEUE.activeRequests.get(model) || 1) - 1;
    REQUEST_QUEUE.activeRequests.set(model, newActiveCount);

    // Process next request in queue if any
    if (queue.length > 0 && !REQUEST_QUEUE.processingQueue.get(model)) {
      REQUEST_QUEUE.processingQueue.set(model, true);
      try {
        const nextRequest = queue.shift()!;
        if (Date.now() - nextRequest.timestamp > 30000) {
          nextRequest.reject(new Error('Request timed out in queue'));
        } else {
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
          enqueueRequest(model, requestFn).then(nextRequest.resolve).catch(nextRequest.reject);
        }
      } finally {
        REQUEST_QUEUE.processingQueue.set(model, false);
      }
    }
  }
}

// OpenAI proxy
app.post('/api/openai', (async (req: Request, res: Response) => {
  try {
    const { apiKey, prompt, model } = req.body;
    
    // Add detailed logging for debugging
    console.log('OpenAI Proxy Request Details:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey?.substring(0, 7) + '...',
      hasPrompt: !!prompt,
      promptLength: prompt?.length || 0,
      model: model || 'gpt-4'
    });

    if (!apiKey) {
      console.error('OpenAI Proxy Error: No API key provided');
      return res.status(400).json({ error: 'API key is required' });
    }
    if (!prompt) {
      console.error('OpenAI Proxy Error: No prompt provided');
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Making OpenAI API request...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    console.log('OpenAI API Response Status:', response.status);
    console.log('OpenAI API Response Headers:', Object.fromEntries([...response.headers.entries()]));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });

      try {
        const errorData = JSON.parse(errorText);
        // Return the error directly to the client with the same status code
        return res.status(response.status).json({ 
          error: errorData.error?.message || 'OpenAI API error',
          details: errorData
        });
      } catch (parseError) {
        // If we can't parse the error as JSON, return the raw text
        return res.status(response.status).json({ 
          error: `OpenAI API error (${response.status}): ${errorText}`
        });
      }
    }

    const data = await response.json() as OpenAIResponse;
    res.json({ response: data.choices[0].message.content });
  } catch (error) {
    console.error('OpenAI Proxy Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
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
        'Authorization': `Bearer ${apiKey}`,
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
  const MAX_RETRIES = TIMEOUT_CONFIG.maxRetries;
  let retryCount = 0;
  const { model } = req.body;
  let hasResponded = false;

  const sendResponse = (status: number, data: any) => {
    if (!hasResponded) {
      hasResponded = true;
      res.status(status).json(data);
    }
  };

  while (retryCount < MAX_RETRIES) {
    try {
      const { apiKey, prompt, apiPath } = req.body;
      
      // Check circuit breaker
      if (!canMakeRequest(model)) {
        console.log(`[${new Date().toISOString()}] Circuit breaker is open for ${model}, rejecting request`);
        return sendResponse(503, { 
          error: 'Service temporarily unavailable due to high error rate',
          retryAfter: Math.ceil((CIRCUIT_BREAKER.resetTimeout - (Date.now() - getCircuitBreakerState(model).lastFailureTime)) / 1000)
        });
      }

      // Enqueue the request
      const result = await enqueueRequest(model, async () => {
        console.log('Google Proxy Request:', {
          model,
          apiPath,
          promptLength: prompt.length,
          apiKeyLength: apiKey ? apiKey.length : 0,
          attempt: retryCount + 1,
          queueLength: REQUEST_QUEUE.queue.get(model)?.length || 0,
          activeRequests: REQUEST_QUEUE.activeRequests.get(model) || 0,
          isCrypticTest: isCrypticTest(prompt)
        });

        if (!apiPath) {
          console.log('No API path provided for model:', model);
          throw new Error(`No API path provided for model ${model}. Discovery process should provide this.`);
        }
        
        const effectiveApiPath = apiPath;
        console.log(`Using API path from model discovery: ${effectiveApiPath}`);
        
        const googleApiUrl = `https://generativelanguage.googleapis.com/${effectiveApiPath}`;
        console.log('Google API URL:', googleApiUrl);

        const requestBody = {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        };
        
        console.log('Google API Request Body:', JSON.stringify(requestBody));

        const startTime = Date.now();
        console.log(`[${new Date().toISOString()}] Starting Google API request for model ${model}`);
        
        // Determine timeout based on request type
        const timeout = isCrypticTest(prompt) ? TIMEOUT_CONFIG.cryptic : TIMEOUT_CONFIG.default;
        console.log(`Using timeout of ${timeout}ms for request`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`[${new Date().toISOString()}] Request timeout after ${timeout}ms for model ${model}`);
          controller.abort();
        }, timeout);

        try {
          const response = await fetch(googleApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
              'Connection': 'close',
              'Keep-Alive': 'timeout=30, max=1'
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
            agent: googleApiUrl.startsWith('https') ? httpsAgent : httpAgent
          });

          const endTime = Date.now();
          console.log(`[${new Date().toISOString()}] Request completed in ${endTime - startTime}ms for model ${model}`);
          clearTimeout(timeoutId);

          // Update circuit breaker based on response
          if (response.ok) {
            recordSuccess(model);
          } else {
            recordFailure(model, response.status === 0 ? true : false);
          }

          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      });

      // Process the result
      if (!result.ok) {
        const errorText = await result.text();
        console.error('Google API Error Response:', {
          status: result.status,
          statusText: result.statusText,
          error: errorText
        });

        if (result.status === 0 && retryCount < MAX_RETRIES - 1) {
          const delay = TIMEOUT_CONFIG.retryDelay * Math.pow(2, retryCount);
          console.log(`Socket hang up error, retrying (${retryCount + 1}/${MAX_RETRIES}) after ${delay}ms...`);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Set proper failureType for different error types
        const failureType = result.status === 0 ? 'connection' : 'api';
        return sendResponse(result.status, { 
          error: `Google API error: ${result.status} ${result.statusText} - ${errorText}`,
          failureType
        });
      }

      const data = await result.json() as GoogleResponse;
      return sendResponse(200, { response: data.candidates[0].content.parts[0].text });

    } catch (error) {
      console.error('Google Proxy Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Record failure in circuit breaker
      recordFailure(model, error instanceof Error && 
        (errorMessage.includes('network') || 
         errorMessage.includes('socket') || 
         errorMessage.includes('timeout') ||
         errorMessage.includes('aborted') ||
         errorMessage.includes('connection')) ? true : false);
      
      // Only send response if we haven't already
      if (!hasResponded) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isConnectionError = error instanceof Error && 
          (errorMessage.toLowerCase().includes('network') || 
           errorMessage.toLowerCase().includes('socket') || 
           errorMessage.toLowerCase().includes('timeout') ||
           errorMessage.toLowerCase().includes('aborted') ||
           errorMessage.toLowerCase().includes('connection') ||
           errorMessage.toLowerCase().includes('failed to fetch'));

        if (error instanceof Error && error.message === 'Request timed out in queue') {
          return sendResponse(504, { 
            error: 'Request timed out while waiting in queue',
            failureType: 'connection'
          });
        } else if (error instanceof Error && error.name === 'AbortError') {
          return sendResponse(504, { 
            error: 'Request timed out while processing',
            failureType: 'connection'
          });
        } else {
          return sendResponse(500, { 
            error: errorMessage,
            failureType: isConnectionError ? 'connection' : 'api'
          });
        }
      }
      break;
    }
  }
}) as RequestHandler);

// Add Anthropic model discovery endpoint
app.post('/api/anthropic-models', (async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    console.log('Proxy: Fetching Anthropic models');
    
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01',
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json() as { error?: { message?: string } };
      throw new Error(errorData.error?.message || 'Anthropic API error');
    }
    
    const data = await response.json() as { models?: any[] };
    console.log(`Proxy: Successfully fetched ${data.models?.length || 0} Anthropic models`);
    res.json(data);
  } catch (error) {
    console.error('Anthropic models API error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Anthropic API error' });
  }
}) as RequestHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
}); 