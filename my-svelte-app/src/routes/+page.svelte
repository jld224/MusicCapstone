<script>
  import { onMount, tick } from "svelte";
  import { writable } from "svelte/store";
  import ChordChart from "../ChordChart.svelte";
  import CodeAnalysis from "../AIAnalysis.svelte";
  import ChordString from "../ChordString.svelte";
  import StreamAnalysis from "../StreamingAnalysis.svelte";
  import { analysisResultStore } from "../stores.js";

  const songs = writable([]);
  let selectedSong = ""; // Initialize as empty string or appropriate initial value
  const analysisResult = writable(null);
  const error = writable("");
  const loading = writable(false);
  const fetchStatus = writable("");
  let searchQuery = "";
  let formattedMeasures = "";
  let formattedChordProgression = '';
  

  onMount(async () => {
    loading.set(true);
    fetchStatus.set("Fetching songs...");
    try {
      const response = await fetch("http://localhost:3001/songs");
      if (response.ok) {
        const data = await response.json();
        songs.set(data);
        fetchStatus.set("");
      } else {
        throw new Error(
          `Failed to fetch songs: server responded with status ${response.status}`
        );
      }
    } catch (err) {
      console.error("Error loading songs:", err);
      error.set(err.message);
      fetchStatus.set("");
    } finally {
      loading.set(false);
    }
  });

  async function analyzeMusic() {
    if (!selectedSong) {
      error.set("Please select a song for analysis.");
      return;
    }
    loading.set(true);
    error.set("");
    fetchStatus.set("Analyzing song...");
    try {
      const response = await fetch("http://localhost:3001/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: selectedSong }),
      });
      if (!response.ok) {
        throw new Error(
          `Failed to analyze the song: server responded with status ${response.status}`
        );
      }
      const data = await response.json();
      analysisResult.set(data.songData); // Assuming the backend returns an object with a songData property
      analysisResultStore.set(data.songData);
    } catch (err) {
      console.error("Error:", err);
      error.set(err.message);
    } finally {
      loading.set(false);
    }
  }

  $: filteredSongs = $songs.filter((song) =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function to create evenly spaced chords per measure based on time signature
  function evenlySpacedChords(measure, timeSignature) {
    const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
    const spacePerBeat = 10; // Adjust the space per beat as needed
    return measure.map(chord => {
      // Determine the space needed for this chord
      const chordLength = chord.length;
      const spacesToAdd = (spacePerBeat - chordLength) > 0 ? (spacePerBeat - chordLength) : 0;
      return chord + ' '.repeat(spacesToAdd);
    }).join('');
  }

  // Determine the max chord length in each measure to ensure uniform spacing
  function getMaxChordLengthPerMeasure(measures) {
    let maxLengths = new Array(measures[0].length).fill(0);
    for (let measure of measures) {
      measure.forEach((chord, index) => {
        if (chord.length > maxLengths[index]) {
          maxLengths[index] = chord.length;
        }
      });
    }
    return maxLengths.map(length => length + 2); // Add 2 for padding
  }

  // Function to format measures for display
  function formatChordProgression(measures, maxChordLengths) {
    const measuresPerLine = 4;
    let formattedProgression = '';
    let line = '';
    let measureCounter = 0;

    for (let measure of measures) {
      let formattedMeasure = measure.map((chord, index) => {
        // Pad each chord string to the max length for that column
        return chord.padEnd(maxChordLengths[index], ' ');
      }).join(' ');

      line += '| ' + formattedMeasure;
      measureCounter++;

      // Check for line break
      if (measureCounter % measuresPerLine === 0 || measureCounter === measures.length) {
        formattedProgression += line + ' |\n';
        line = ''; // Reset for the next line
      }
    }

    return formattedProgression.trim();
  }

  // Calculate the max chord lengths and format the chord progression
  let maxChordLengths;
  $: if ($analysisResult && $analysisResult.music && $analysisResult.music.measures) {
    maxChordLengths = getMaxChordLengthPerMeasure($analysisResult.music.measures);
    formattedChordProgression = formatChordProgression($analysisResult.music.measures, maxChordLengths);
  } else {
    formattedChordProgression = '';
  }
</script>

<div class="search-section">
  <input
    type="text"
    bind:value={searchQuery}
    placeholder="Search by title..."
    class="search-input"
    aria-label="Search songs by title"
  />
  <select bind:value={selectedSong} class="song-select">
    <option value="">-- Select a song --</option>
    {#each $songs as song}
      <option value={song.link}>{song.title}</option>
    {/each}
  </select>
  <button
    on:click={analyzeMusic}
    disabled={$loading || selectedSong === ""}
    class="analyze-button"
  >
    Analyze
  </button>
</div>

{#if $fetchStatus}
  <p class="status-message">{$fetchStatus}</p>
{/if}

{#if $loading}
  <div class="loading-state">Loading...</div>
{:else if $error}
  <p class="error">{$error}</p>
  {:else if $analysisResult}
  <div class="analysis-result">
    <h2>Analysis Result for "{$analysisResult.title}"</h2>
    <p><strong>Composer:</strong> {$analysisResult.composer}</p>
    <p><strong>Style:</strong> {$analysisResult.style}</p>
    <p><strong>Key:</strong> {$analysisResult.key}</p>
    <p><strong>Time Signature:</strong> {$analysisResult.music.timeSignature}</p>
    <h3>Chord Progression</h3>
    <div class="chord-progression">
      {#if formattedChordProgression}
        <pre>{formattedChordProgression}</pre>
      {:else}
        <p>No chord progression available.</p>
      {/if}
    </div>
    <p><strong>Chord String:</strong> {$analysisResult.music.raw}</p>
    <div>
      <ChordString />
    </div>
    <!-- ...other components like ChordString, etc... -->
  </div>
{/if}

<div class="stream-analysis-container">
  <StreamAnalysis />
</div>

{#if $fetchStatus}
  <p class="status-message">{$fetchStatus}</p>
{/if}

<style>
  :global(body) {
    font-family: "Open Sans", sans-serif;
    margin: 0;
    padding: 0;
    background: #fafafa;
  }

  .search-section {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin-top: 20px;
  }

  .search-input,
  .song-select {
    border: 1px solid #ccc;
    border-radius: 20px;
    padding: 10px 15px;
    font-size: 16px;
    transition: border-color 0.3s;
  }

  .search-input:focus,
  .song-select:focus {
    outline: none;
    border-color: #6200ea;
  }

  .analyze-button {
    background-color: #6200ea;
    color: white;
    border: none;
    border-radius: 20px;
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  .analyze-button:hover {
    background-color: #3700b3;
  }

  .analyze-button:disabled {
    background-color: #a0a0a0;
  }

  .status-message,
  .loading-state {
    text-align: center;
    margin-top: 20px;
  }

  .error {
    color: #b00020;
    background-color: #ffebee;
    padding: 10px;
    border-radius: 5px;
    text-align: center;
    margin-top: 20px;
  }

  .analysis-result {
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    padding: 30px;
    margin: 30px auto;
    max-width: 800px;
  }

  .analysis-result h2,
  .analysis-result p,
  .analysis-result pre {
    color: #333;
  }

  .analysis-result h3 {
    border-bottom: 2px solid #f0f0f0;
    padding-bottom: 10px;
    margin-bottom: 20px;
  }

  .analysis-result pre {
    background-color: #f9f9f9;
    border-radius: 5px;
    padding: 15px;
    overflow-x: auto;
  }

  .stream-analysis-container {
    margin-top: 30px;
  }
</style>
