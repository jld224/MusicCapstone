// src/routes/api/analyze.js
import { exec } from 'child_process';
import path from 'path';

export async function post(request) {
    const { songData } = request.body; // Adjust according to what you're sending

    return new Promise((resolve, reject) => {
        const scriptPath = path.resolve('/python/music_analysis.py'); // Ensure the path is correct
        const command = `python ${scriptPath} '${songData}'`; // Adjust the command as needed

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return resolve({ status: 500, body: { error: 'Error analyzing the song.' } });
            }

            try {
                const result = JSON.parse(stdout);
                resolve({ status: 200, body: result });
            } catch (err) {
                console.error('Failed to parse analysis result:', err);
                resolve({ status: 500, body: { error: 'Failed to parse analysis result.' } });
            }
        });
    });
}
