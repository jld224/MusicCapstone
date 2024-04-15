<script>
  import { writable } from "svelte/store";
  import { onMount } from "svelte";
  import CodeAnalysis from "../AIAnalysis.svelte";
  import ChordString from "../ChordString.svelte";
  import StreamAnalysis from "../StreamingAnalysis.svelte";
  import { analysisResultStore } from "../stores.js";
  import MusicXMLDisplay from "../MusicXMLDisplay.svelte";

  const songs = writable([]);
  let selectedSong = "";
  const analysisResult = writable(null);
  const error = writable("");
  const loading = writable(false);
  const fetchStatus = writable("");
  let searchQuery = "";
  let formattedChordProgression = "";
  let formattedMeasures = "";

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
      const response = await fetch("http://localhost:3001/analyzeXML", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ irealLink: selectedSong }),
      });
      if (!response.ok) {
        throw new Error(
          `Failed to analyze the song: server responded with status ${response.status}`
        );
      }
      const { songData } = await response.json();
      analysisResult.set(songData);
      analysisResultStore.set(songData);
      fetchStatus.set("");
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
    {#each filteredSongs as song}
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
    <p><strong>bpm:</strong> {$analysisResult.bpm}</p>
    <p><strong>MusicXML:</strong></p>
    <pre>{JSON.stringify($analysisResult.musicXml, null, 2)}</pre>

    {#if $analysisResult.musicXml}
      <MusicXMLDisplay musicXml={$analysisResult.musicXml} />
    {/if}
  </div>
{/if}

<div class="stream-analysis-container">
  <StreamAnalysis />
</div>

{#if $fetchStatus}
  <p class="status-message"></p>
{/if}

<style>
  .osmd-container {
    width: 100%; /* Adjust the width as needed */
    height: auto; /* Adjust the height as needed */
  }
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
