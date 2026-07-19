import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Increase body limit to handle multiple base64 image uploads for OCR/Vision
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let aiClient = null;
function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required on the server.");
    }
    aiClient = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Secure proxy endpoint for Gemini AI analysis
app.post('/api/analyze', async (req, res) => {
  try {
    const { textPrompt, medImages, rxImages, rxImage } = req.body;
    
    if (!textPrompt) {
      return res.status(400).json({ error: 'Missing textPrompt in request body' });
    }

    const ai = getAIClient();
    const contents = [];

    // Append medicine images to model contents
    if (medImages && Array.isArray(medImages)) {
      medImages.forEach((img) => {
        if (img && img.base64 && img.mime) {
          contents.push({
            inlineData: {
              mimeType: img.mime,
              data: img.base64
            }
          });
        }
      });
    }

    // Append prescription / report images to model contents
    if (rxImages && Array.isArray(rxImages)) {
      rxImages.forEach((img) => {
        if (img && img.base64 && img.mime) {
          contents.push({
            inlineData: {
              mimeType: img.mime,
              data: img.base64
            }
          });
        }
      });
    } else if (rxImage && rxImage.base64 && rxImage.mime) {
      contents.push({
        inlineData: {
          mimeType: rxImage.mime,
          data: rxImage.base64
        }
      });
    }

    // Append the primary clinical analysis text prompt
    contents.push(textPrompt);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    res.json({ text, modelName: 'gemini-2.5-flash (AI Studio)' });
  } catch (error) {
    console.error('[Server API Error]', error);
    res.status(500).json({ error: error.message || 'AI safety analysis failed.' });
  }
});

// Secure proxy endpoint for medical document explanations
app.post('/api/explain', async (req, res) => {
  try {
    const { textPrompt, image } = req.body;
    
    if (!textPrompt) {
      return res.status(400).json({ error: 'Missing textPrompt in request body' });
    }

    const ai = getAIClient();
    const contents = [];

    // Append medical report image if available
    if (image && image.base64 && image.mime) {
      contents.push({
        inlineData: {
          mimeType: image.mime,
          data: image.base64
        }
      });
    }

    // Append the explanation query prompt
    contents.push(textPrompt);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
    });

    const text = response.text;
    res.json({ text, modelName: 'gemini-2.5-flash (AI Studio)' });
  } catch (error) {
    console.error('[Explain API Error]', error);
    res.status(500).json({ error: error.message || 'Medical report explanation failed.' });
  }
});

// Secure proxy endpoint for Gnani AI TTS
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Pranav', model = 'vachana-voice-v3' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing text in request body' });
    }

    const gnaniApiKey = "vach_1ytE2CY5X2F6Q1hh4wnlNP1Px7Fa4OigxY9tyIGy013mgRfDbqBv6REdSHBlEH12Ii1ZfjjqySvncLkWvdXHSeU76L5DK1I6_1b8864f26ba0bf53e8c680613b1ffbc6";

    const response = await fetch("https://api.vachana.ai/api/v1/tts/inference", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key-ID": gnaniApiKey
      },
      body: JSON.stringify({
        text,
        voice,
        model,
        audio_config: {
          sample_rate: 44100,
          num_channels: 1,
          sample_width: 2,
          encoding: "linear_pcm",
          container: "wav"
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Gnani API Error Response]:', errText);
      return res.status(response.status).json({ error: errText });
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/wav');
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('[TTS Proxy Error]', error);
    res.status(500).json({ error: error.message || 'TTS generation failed.' });
  }
});

// Serve static assets from the current directory
app.use(express.static('.'));

// SPA Routing fallback
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  next();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MediCheck AI server running at http://0.0.0.0:${PORT}`);
});
