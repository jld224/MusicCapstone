const express = require('express');
const fs = require('fs').promises; // Use fs promises for async operations
const path = require('path');
const cors = require('cors');
const { spawn } = require('child_process'); // Correctly import spawn
const axios = require('axios');
require('dotenv').config();
const OpenAI = require('openai');
const { analysisResultStore } = './my-svelte-app/src/stores';
const iRealReader = require('ireal-reader');
const iReal2MusicXML = require('ireal-musicxml');


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

function extractChords(musicData) {
    // Check if musicData and musicData.cells exist
    if (!musicData || !musicData.cells) {
        return [];
    }
    
    // Extract chords from cells
    const chords = musicData.cells
        .filter(cell => cell.chord !== null) // Filter out cells with null chord
        .map(cell => cell.chord); // Extract chord object
    
    return chords;
}

app.post('/stream_AI_Analysis', async (req, res) => {

    function extractChords(musicData) {
        if (!musicData || !musicData.cells) return [];
    
        const chords = musicData.cells
            .filter(cell => {
                // Check for null or empty chord objects
                if (!cell.chord || Object.keys(cell.chord).length === 0) {
                    return false;
                }
                // Check for null or empty annots, comments, spacer, and bars properties
                if (!cell.annots || !cell.comments || !cell.spacer || !cell.bars) {
                    return false;
                }
                return true;
            })
            .map(cell => ({
                note: cell.chord.note || null,
                modifiers: cell.chord.modifiers || null,
                over: cell.chord.over || null
            }));
    
        return chords;
    }
    

    console.log(req.body);
    if (!req.body || !req.body.music || !req.body.choice) {
        return res.status(400).json({ error: 'No music data or choice provided.' });
    }

    const { music, choice } = req.body;
    console.log(JSON.stringify(req.body));


    const systemPrompts = {
        beginner: "Imagine you're introducing the wonders of music to someone who has just begun their musical journey. With the piece below, guide them through the magical world of melodies, rhythms, and harmonies in a way that lights up their curiosity. Start by describing the title and the composer's background, setting the stage for what makes this piece special. Dive into the melody, explaining how it moves and changes, and liken it to storytelling—where does it take the listener? Discuss the rhythm and how it forms the heartbeat of the piece, supporting the melody. Simplify the concept of key, perhaps comparing it to different moods or colors in a painting, and touch on the significance of the time signature, illustrating its role in shaping the dance of the notes. For the chords and measures, use analogies to show how they interact, creating moments of tension and release, much like the chapters of a book. Encourage the listener to notice these elements, making their listening experience richer and more informed. Remember, the goal is not to overwhelm but to unveil the beauty of music's building blocks, making them feel intrigued and empowered to explore more.",
        intermediate: "Approach the piece of music below with the insight of an amateur or advanced musician, ready to deepen your understanding and appreciation of its complexities. Begin by contextualizing the composer’s intent and historical significance, drawing connections between the time period, cultural influences, and how they might have shaped the musical choices. Dive into the structure of the piece, dissecting its form and how it adheres to or diverges from traditional compositions in its genre. Analyze the melody, exploring its development, motifs, and how it interacts with the harmonic progressions to convey emotion and narrative. Examine the harmony in detail, identifying the use of conventional and unconventional chords, modulations, and how these choices impact the overall mood and tension within the piece. Discuss the rhythm and meter, noting any rhythmic motifs, syncopations, or irregularities that add depth or drive the piece forward. Delve into the texture and instrumentation, commenting on how the composer utilizes different voices or instruments to create contrast, balance, and unity. Highlight any technical challenges or notable passages that require advanced skill or interpretation, offering advice on how to approach these sections. Finally, encourage a critical listening stance, prompting reflection on how the piece’s elements combine to create a cohesive whole and what this might convey on a deeper, emotional level. This exploration should not only enhance your technical knowledge but also enrich your overall musical experience, inviting you to engage with music more thoughtfully and passionately.",
        expert: "Engage with the music piece below through the lens of your professional expertise, delving into its intricacies with the precision and depth it demands. Begin by situating the work within its historical and theoretical context, analyzing how it reflects or diverges from the musical traditions of its time. Explore the compositional structure in detail, including its formal design, thematic development, and the innovative use of motifs. Conduct a thorough harmonic analysis, identifying key modulations, chordal textures, and the employment of advanced harmonic techniques such as chromaticism, polytonality, or others unique to the piece. Discuss the melodic architecture, examining the use of intervallic relationships, contour, and how melody interacts with harmony to create tension, resolution, and expressivity. Delve into the rhythmic complexity, noting the use of mixed meters, polyrhythms, and rhythmic motifs, and their effect on the overall dynamism and pacing of the piece. Evaluate the orchestration and texture, considering how the composer exploits the timbral qualities of instruments to enhance the musical narrative. Address interpretive challenges and performance considerations, offering insights into conveying the emotional depth, technical demands, and stylistic nuances of the piece.Reflect on the piece’s place within the composer’s oeuvre and its contribution to the repertoire, considering aspects of innovation, influence, and legacy. Conclude by critically assessing the work’s artistic significance, its emotional impact, and its relevance to contemporary music performance and scholarship. This comprehensive exploration should not only affirm your technical mastery but also deepen your connection to the piece, inspiring a nuanced interpretation that resonates with both musicians and audiences alike.",
        composer: "Delve into the life and times of the composer behind the music piece below. Explore their journey, highlighting key moments that may have influenced their musical style and output. Discuss any personal, social, or political factors that impacted their work. How do you see these influences reflected in the piece? Consider the composer’s legacy: how have they influenced other musicians, and how is their work perceived in the context of the broader musical canon? Provide insights into the challenges they faced, their most significant achievements, and any controversies or pivotal moments that define their contribution to the world of music.",
        culture: "Examine the cultural and historical context surrounding the creation of the music piece below. How does it reflect the social, political, or cultural climate of its time? Discuss its origins, including any traditional influences or innovations that it brought to its genre. Analyze how the piece was initially received by audiences and critics, and how its popularity or significance has evolved over time. Explore its role in cultural movements or events, its impact on subsequent musical developments, and its relevance in today’s cultural landscape. What elements of the piece have resonated with diverse audiences, and why does it continue to captivate or inspire people across different cultures and generations?",
        influence: "Focus on the composition itself, dissecting the elements that set it apart within its genre or the composer's body of work. What innovative techniques or themes does it introduce? Discuss any known inspirations for the piece, whether they be personal experiences of the composer, literary works, natural phenomena, or other artworks. How has this piece influenced other composers, musicians, or genres? If applicable, explore its adaptation into other forms of media (e.g., film, theater, dance) and the significance of these adaptations. Conclude by reflecting on the piece’s enduring legacy: in what ways has it shaped or challenged our understanding of music, and how does it continue to inspire creativity and innovation within the arts?",
        technique: "Explore the essential performance techniques and expressive nuances necessary to bring the music piece below to life. Highlight specific technical skills, articulations, and dynamics that performers should focus on to authentically convey the emotional and aesthetic intentions of the composer. Discuss the importance of interpretation, phrasing, and tempo choices in shaping the listener’s experience. Provide practical tips for musicians to enhance their expressivity and technical execution to connect more deeply with their audience.",
        theoretical: "Dive deep into the theoretical aspects and composition techniques used in the music piece below. Analyze the structural framework, including phrase structures, thematic development, and form. Identify and explain the use of particular scales, modes, and tonal systems that contribute to the piece’s unique character. Evaluate the compositional devices such as counterpoint, orchestration techniques, and the layering of textures. This analysis should help advanced students and professionals appreciate the architectural craftsmanship of the composition.",
        multimedia: "Explore the role of the music piece below in multimedia contexts such as film, television, or video games. Discuss how the piece enhances or influences the narrative and emotional depth of the scene it accompanies. Analyze the compositional elements that make it effective in these settings and how it interacts with visual and narrative components to create a compelling multimedia experience.",
        global:  "Examine how global music trends and cultural exchanges have influenced the composition and style of the music piece below. Discuss elements within the piece that may have roots in different cultural or musical traditions. This analysis should shed light on the interconnectedness of the global music scene and how it fosters creative diversity and innovation in musical production."
    };


    if (!systemPrompts[choice]) {
        return res.status(400).json({ error: 'Invalid choice provided.' });
    }

    const systemPrompt = systemPrompts[choice];

    try {
        // Clone the music object to avoid modifying the original one
        const musicClone = JSON.parse(JSON.stringify(music));

        // Extract chords from music data
        const chords = extractChords(musicClone);

        // Modify the cells part of the music object to include the extracted chords
        musicClone.cells.forEach((cell, index) => {
            if (cell.chord === null) {
                musicClone.cells[index].chord = chords.shift() || null;
            }
        });

        // Convert the modified music object to string
        const musicString = JSON.stringify(musicClone);

        console.log(musicString);

        const stream = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Analyze this data: ${musicString}` }
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
    const { link } = req.body;

    if (!link) {
        return res.status(400).json({ error: 'No URL provided for analysis.' });
    }

    try {
        const iRealData = iRealReader(link);
        console.log(iRealData); // Debug to see what iRealData looks like

        // Validate the structure before accessing deep properties
        if (!iRealData || !iRealData.songs || iRealData.songs.length === 0) {
            return res.status(400).json({ error: 'No songs available in the provided data.' });
        }

        const songData = iRealData.songs[0]; // Directly access the first song in the array
        res.json({ songData });
    } catch (error) {
        console.error('Error processing iReal URL:', error);
        res.status(500).json({
            error: 'Failed to process the iReal URL.',
            details: error.message
        });
    }
});


app.post('/analyzeXML', async (req, res) => {
    const { irealLink } = req.body;

    if (!irealLink) {
        return res.status(400).json({ error: 'No iReal link provided.' });
    }

    try {
        // Convert the iReal link (or data) to MusicXML
        const playlist = await iReal2MusicXML.convert(irealLink);

        // Check if conversion was successful and the playlist has songs
        if (!playlist || !playlist.songs || playlist.songs.length === 0) {
            return res.status(404).json({ error: 'No songs found in the playlist.' });
        }

        // Optionally, you can convert the first song to MusicXML format if needed
        const songData = playlist.songs[0]
        // Respond with the MusicXML data or the whole playlist
        res.json({ 
            songData
        });
    } catch (error) {
        console.error('Error converting iReal data:', error);
        res.status(500).json({ error: 'Failed to convert iReal data to MusicXML.', details: error.message });
    }
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
