require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')();
const OpenAI = require('openai');

const app = express();


// Middleware to parse JSON and log requests
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(pino);


// Initialize OpenAI client with the API key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Endpoint to retrieve the speech token
app.get('/api/get-speech-token', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const speechKey = process.env.SPEECH_KEY;
    const speechRegion = process.env.SPEECH_REGION;

    // Validate that required environment variables are set
    if (!speechKey || !speechRegion) {
        res.status(400).send('Missing speech key or region in .env file.');
    } else {
        try {
            // Request a token from the Azure service
            const tokenResponse = await axios.post(`https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, null, {
                headers: {
                    'Ocp-Apim-Subscription-Key': speechKey,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            res.send({ token: tokenResponse.data, region: speechRegion });
        } catch (err) {
            res.status(401).send('Error authorizing your speech key.');
        }
    }
});

// Endpoint to get insights from OpenAI
app.post('/api/get-llm-insights', async (req, res) => {
    try {
        const { transcription } = req.body; // Retrieve transcription from the request body
        const response = await openai.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: `Analyze the given transcription and provide:
1. A short summary of at most 5 words about any harmful/critical/unsafe behavior detected. If no harmful/critical/unsafe behavior is detected, return an empty response.
2. Detailed reasoning and evidence from the transcription for why you identified this behavior. If no harmful/critical/unsafe behavior is detected, return an empty responsea.

Transcription to analyze:
"${transcription}"`
                }
            ],
            model: "gpt-4o",
        });

        const insight = response.choices[0]?.message?.content.trim();
        if (insight) {
            const [shortInsight, ...detailedInsight] = insight.split("\n");
            res.status(200).json({
                shortInsight: shortInsight.trim(),
                detailedInsight: detailedInsight.join("\n").trim(),
            });
        } else {
            res.status(204).send(); // No content if no insight is generated
        }
    } catch (error) {
        console.error('Error fetching insights:', error);
        res.status(500).send('Error fetching insights from OpenAI.');
    }
});

// Endpoint to get a summary from OpenAI
app.post('/api/get-llm-summary', async (req, res) => {
    try {
        const { transcription } = req.body; // Retrieve transcription from the request body
        const response = await openai.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: `Analyze the given transcription and provide:
1. A short summary of at most 5 words about the current interaction. If you don't have anything to add or say, return an empty response.
2. Detailed reasoning and evidence from the transcription for why you identified this short summary. If you don't have anything to add or say, return an empty response.

Transcription to analyze:
"${transcription}"`
                }
            ],
            model: "gpt-4o",
        });

        const summary = response.choices[0]?.message?.content.trim();
        if (summary) {
            const [shortSummary, ...detailedSummary] = summary.split("\n");
            res.status(200).json({
                shortSummary: shortSummary.trim(),
                detailedSummary: detailedSummary.join("\n").trim(),
            });
        } else {
            res.status(204).send(); // No content if no summary is generated
        }
    } catch (error) {
        console.error('Error fetching insights:', error);
        res.status(500).send('Error fetching insights from OpenAI.');
    }
});

// Start the Express server on port 3001
app.listen(3001, () => console.log('Express server is running on localhost:3001'));