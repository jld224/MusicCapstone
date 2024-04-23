<script>
  import { writable } from "svelte/store";
  import { onMount } from "svelte";
  import ChordString from "../ChordString.svelte";
  import StreamAnalysis from "../StreamingAnalysis.svelte";
  import MusicXMLDisplay from "../MusicXMLDisplay.svelte";
  import { analysisResultStore } from "../stores.js";

  const songs = writable([]);
  let selectedSong = "";
  let customLink = "";
  let useCustomLink = false; // Flag to toggle input method
  const analysisResult = writable(null);
  const error = writable("");
  const loading = writable(false);
  const fetchStatus = writable("");
  let searchQuery = "";

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
    let songLink = useCustomLink ? customLink : selectedSong;
    if (!songLink) {
      error.set("Please provide a song link for analysis.");
      return;
    }
    loading.set(true);
    error.set("");
    fetchStatus.set("Analyzing song...");
    try {
      const response = await fetch("http://localhost:3001/analyzeXML", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ irealLink: songLink }),
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

  $: if ($analysisResult) {
    // This is where you could do something when $analysisResult changes, like logging
    console.log("Analysis result updated:", $analysisResult);
  }
</script>

<div class="container">
  <!-- Header with a subtle shadow for depth -->
  <header>
    <h1>Analyze Music</h1>
  </header>

  <!-- Search Section with a clear separation and focus effect -->
  <section class="search-section">
    <div class="toggle-custom-link">
      <label>
        <input type="checkbox" bind:checked={useCustomLink} />
        Use custom iReal Pro link
      </label>
    </div>
    <div class="input-group">
      {#if useCustomLink}
        <input
          type="text"
          bind:value={customLink}
          placeholder="Enter iReal Pro link..."
        />
      {:else}
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search by title..."
        />
        <select bind:value={selectedSong}>
          <option value="">Select a song</option>
          {#each filteredSongs as song}
            <option value={song.link}>{song.title}</option>
          {/each}
        </select>
      {/if}
      <button
        on:click={analyzeMusic}
        disabled={$loading ||
          (useCustomLink ? customLink === "" : selectedSong === "")}
        >Analyze</button
      >
    </div>
  </section>

  <!-- Main content area -->
  <main class="content-area">
    <div class="half-width left-side">
      <StreamAnalysis />
      <!-- Other contents for the left side can go here -->
    </div>
    <div class="half-width right-side">
      {#if $analysisResult}
        <div class="analysis-result">
          <h2>{$analysisResult.title}</h2>
          <p><strong>Composer:</strong> {$analysisResult.composer}</p>
          <p><strong>Style:</strong> {$analysisResult.style}</p>
        </div>
        {#if $analysisResult.musicXml}
          <MusicXMLDisplay musicXml={$analysisResult.musicXml} />
        {/if}
      {/if}
    </div>
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: "Arial", sans-serif;
  }

  header {
    text-align: center;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  h1 {
    color: #333;
    margin: 0;
  }

  .container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .search-section {
    background: #f8f8f8;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }

  .toggle-custom-link {
    display: flex;
    align-items: center;
  }

  .input-group {
    display: flex;
    gap: 10px;
    width: 100%;
    flex-wrap: wrap;
    justify-content: center;
  }

  input,
  select,
  button {
    padding: 10px 15px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }

  input:focus,
  select:focus {
    border-color: #6200ea;
    outline: none;
  }

  button {
    background-color: #6200ea;
    color: white;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  button:hover {
    background-color: #3700b3;
  }

  button:disabled {
    background-color: #a0a0a0;
  }

  .content-area {
    display: flex;
    flex-wrap: nowrap; /* Do not wrap */
    margin-top: 20px;
  }

  .half-width {
    flex-basis: 50%; /* Each side takes up half the width */
    flex-grow: 1;
    overflow-y: auto; /* Allows vertical scrolling if content overflows */
    padding: 1rem; /* Adjust padding as needed */
  }

  .left-side {
    /* Styles specific to the left side */
    /* ... */
  }

  .right-side {
    /* Styles specific to the right side */
    /* ... */
  }

  /* Adjust for mobile responsiveness */
  @media (max-width: 767px) {
    .content-area {
      flex-direction: column;
    }
    .half-width {
      flex-basis: auto; /* Take the full width */
      margin-bottom: 1rem; /* Space between stacked elements */
    }
  }
</style>
