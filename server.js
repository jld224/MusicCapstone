const express = require('express');
const fs = require('fs').promises; // Use fs promises for async operations
const path = require('path');
const cors = require('cors');
const { spawn } = require('child_process'); // Correctly import spawn
const axios = require('axios');
require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], // Ensure this environment variable is set
  });

// const openaiApiKey = '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';
// const configuration = new Configuration({
//   apiKey: openaiApiKey,
// });
// const openaiClient = new OpenAIApi(configuration);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/analyze_music', async (req, res) => {
    console.log(req.body); // Log the request body for debugging
    
    // Directly use req.body assuming it's the raw data intended for analysis
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'No music data provided.' });
    }

    try {
        // Assuming req.body is the structured data needed for analysis
        // Convert it to a string representation if it involves complex objects
        const musicDataString = JSON.stringify(req.body);

        const chatCompletion = await openai.ChatCompletion.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: "You're a helpful assistant trained in music analysis. Provide insights based on the given data."
                },
                {
                    role: 'user',
                    content: `Analyze this data: ${musicDataString}`
                }
            ],
        });

        // Assuming the API returns a response in the expected format
        const analysisResult = chatCompletion.data.choices[0].message.content;
        
        // Send analysis result back to the frontend
        res.json({ analysisResult });
    } catch (error) {
        console.error('Error analyzing music:', error);
        // Handle specific OpenAI errors more gracefully if needed
        res.status(500).json({ error: 'Failed to analyze music using OpenAI API.' });
    }
});


// Serve song list from JSON file
app.get('/songs', async (req, res) => {
    const filePath = path.join(__dirname, 'songs.json'); // Path to the JSON file

    try {
        const jsonData = await fs.readFile(filePath, 'utf8');
        const songs = JSON.parse(jsonData);
        res.json(songs); // Serve the parsed JSON data
    } catch (error) {
        console.error('Failed to fetch songs:', error);
        res.status(500).json({ error: 'Internal server error. Could not load the song list.' });
    }
});

// Improved error handling for song analysis
app.post('/analyze', (req, res) => {
    const { link } = req.body; // Directly use the link received in the request body
    
    // Check if the link is provided
    if (!link) {
        return res.status(400).json({ error: 'No song link provided for analysis.' });
    }
    
    // Assume the path to the Python script is correct and it's named 'music_analysis.py' located in 'python' directory.
    // Adjust the path as necessary to match your actual file structure.
    const pythonProcess = spawn('python3', ['python/music_analysis.py', link]);
    
    let result = '';
    pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
        result = result.trim(); // Trim the result to remove leading/trailing whitespace

        const firstCurlyIndex = result.indexOf('{');
        const jsonString = result.substring(firstCurlyIndex);
    
        if (code !== 0) {
            console.log(`Python script exited with code ${code}`);
            return res.status(500).json({ error: 'Failed to analyze the song. Please check the server logs for more details.' });
        }
    
        try {
            const parsedResult = JSON.parse(jsonString);
            console.log(parsedResult)
            res.json(parsedResult);
        } catch (error) {
            console.error('Failed to parse Python script output:', error);
            res.status(500).json({ error: 'Failed to parse analysis result. Please ensure the output is valid JSON.' });
        }
    });
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
