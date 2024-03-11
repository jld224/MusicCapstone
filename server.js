const express = require('express');
const fs = require('fs').promises; // Use fs promises for async operations
const path = require('path');
const cors = require('cors');
const { spawn } = require('child_process'); // Correctly import spawn
const axios = require('axios');
require('dotenv').config();
const OpenAI = require('openai');
const { analysisResultStore } = './my-svelte-app/src/stores';


const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], // Ensure this environment variable is set
});

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/standard_AI_Analysis', async (req, res) => {
    //console.log(req.body); // Log the request body for debugging

    // Directly use req.body assuming it's the raw data intended for analysis
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'No music data provided.' });
    }

    try {
        // Assuming req.body is the structured data needed for analysis
        // Convert it to a string representation if it involves complex objects
        const musicDataString = JSON.stringify(req.body);

        const chatCompletion = await openai.chat.completions.create({
            model: 'gpt-4',
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
        const analysisResult = chatCompletion.choices[0]?.message?.content;

        // Send analysis result back to the frontend
        res.json({ analysisResult });

        // // Define a path and filename for your output file
        // const filePath = './analysisResult.json';

        // // Use fs.promises.writeFile to write the JSON string to a file
        // await fs.writeFile(filePath, JSON.stringify(analysisResult, null, 2), 'utf8');

        // // Respond to the client that the file has been saved
        // res.json({ message: 'Analysis result saved to file', filePath });

    } catch (error) {
        console.error('Error analyzing music:', error);
        // Handle specific OpenAI errors more gracefully if needed
        res.status(500).json({ error: 'Failed to analyze music using OpenAI API.' });
    }
});

app.post('/stream_AI_Analysis', async (req, res) => {
    console.log(req.body);
    if (!req.body || !req.body.music || !req.body.choice) {
        return res.status(400).json({ error: 'No music data or choice provided.' });
    }

    const { music, choice } = req.body;

    const systemPrompts = {
        beginner: "Provide a comprehensive explanation of the music below, like you were describing it to a beginning musician. Go in-depth into as many aspects as you can.",
        intermediate: "Provide a comprehensive explanation of the music below, like you were describing it to an amateur/advanced musician. Go in-depth into as many aspects as you can.",
        expert: "Provide a comprehensive explanation of the music below, like you were describing it to a professional musician. Go in-depth into as many aspects as you can.",
    };

    if (!systemPrompts[choice]) {
        return res.status(400).json({ error: 'Invalid choice provided.' });
    }

    const systemPrompt = systemPrompts[choice];

    try {
        const music = JSON.stringify(req.body);

        const stream = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Analyze this data: ${music}` }
            ],
            stream: true,
        });

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }

        res.end();
    } catch (error) {
        console.error('Streaming error:', error);
        res.status(500).send('Failed to stream analysis from OpenAI.');
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
            //console.log(parsedResult)
            res.json(parsedResult);
        } catch (error) {
            console.error('Failed to parse Python script output:', error);
            res.status(500).json({ error: 'Failed to parse analysis result. Please ensure the output is valid JSON.' });
        }
    });
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
