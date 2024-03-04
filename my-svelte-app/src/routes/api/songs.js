import fs from 'fs';
import path from 'path';

// Assuming your JSON file is located at a specific path relative to this file
const filePath = path.resolve('/songs.json');

export async function get() {
    try {
        // Check if file exists before reading to avoid throwing unnecessary errors
        if (!fs.existsSync(filePath)) {
            return {
                status: 404,
                body: { error: 'Songs list not found.' }
            };
        }

        // Read the JSON file
        const data = fs.readFileSync(filePath, { encoding: 'utf-8' });
        const songs = JSON.parse(data);

        // Return the songs as JSON
        return {
            status: 200,
            body: songs
        };
    } catch (error) {
        // Log the error for server-side debugging
        console.error('Failed to fetch songs:', error);

        // Return a generic error message to the client
        return {
            status: 500,
            body: { error: 'Internal server error. Please try again later.' }
        };
    }
}
