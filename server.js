const express = require('express');
const fs = require('fs').promises; // Use fs promises for async operations
const path = require('path');
const cors = require('cors');
const { exec, spawn } = require('child_process'); // Correctly import exec

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

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
    
    // Ensure the path to the Python script is correct. It might need to be adjusted based on your actual file structure.
    const pythonProcess = spawn('python3', ['python/music_analysis.py', link]);
    
    let result = '';
    pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.log(`Python script exited with code ${code}`);
            return res.status(500).json({ error: 'Failed to analyze the song.' });
        }
        try {
            const parsedResult = JSON.parse(result);
            res.json(parsedResult);
        } catch (error) {
            console.error('Failed to parse Python script output:', error);
            res.status(500).json({ error: 'Failed to parse analysis result. Please ensure the output is valid JSON.' });
        }
    });
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
