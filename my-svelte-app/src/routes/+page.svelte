<script>
  import { onMount } from "svelte";
  import { writable } from "svelte/store";
  import ChordChart from '../ChordChart.svelte'; // Import the ChordChart component


  const songs = writable([]);
  let selectedSong = "";
  const analysisResult = writable(null);
  const error = writable("");
  const loading = writable(false);
  const fetchStatus = writable(""); // Add this line

  onMount(async () => {
    loading.set(true);
    fetchStatus.set("Fetching songs...");
    try {
      const response = await fetch("http://localhost:3001/songs");
      if (response.ok) {
        let data = await response.json();
        // Ensure the response is an array; otherwise, fallback to an empty array
        data = Array.isArray(data) ? data : [];
        songs.set(data);
        fetchStatus.set("");
        console.log(songs);
        console.log(data);
      } else {
        throw new Error(
          `Failed to fetch songs: server responded with status ${response.status}`,
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

  // Function to handle the change event on the select element
  function handleSongSelection(event) {
    selectedSong = event.target.value;
    console.log(selectedSong); // For debugging
  }

  async function analyzeMusic() {
    if (!selectedSong) {
      error.set("Please select a song for analysis.");
      return;
    }
    loading.set(true);
    error.set("");
    fetchStatus.set("Analyzing song..."); // Inform user analysis has started
    try {
      const response = await fetch("http://localhost:3001/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: selectedSong }), // Ensure this matches the server's expected format
      });
      if (!response.ok) {
        throw new Error(
          `Failed to analyze the song: server responded with status ${response.status}`,
        );
      }
      const data = await response.json();
      analysisResult.set(data);
      fetchStatus.set(""); // Clear status on success
    } catch (err) {
      console.error("Error:", err);
      error.set(err.message);
      fetchStatus.set(""); // Ensure status is cleared on error
    } finally {
      loading.set(false);
    }
  }
</script>

<select on:change={handleSongSelection}>
  <option value="">-- Select a song --</option>
  {#each $songs as { title, link }}
    <option value={link}>{title}</option>
  {/each}
</select>
<button on:click={analyzeMusic} disabled={$loading || !selectedSong}
  >Analyze</button
>

{#if $fetchStatus}
  <p>{$fetchStatus}</p>
{/if}

{#if $loading}
  <p>Loading...</p>
{:else if $error}
  <p class="error">{$error}</p>
{:else if $analysisResult}
  <div class="analysis-result">
    <h2>Analysis Result for "{$analysisResult.title}"</h2>
    <p><strong>Composer:</strong> {$analysisResult.composer}</p>
    <p><strong>Style:</strong> {$analysisResult.style}</p>
    <p><strong>Key:</strong> {$analysisResult.key}</p>
    <p><strong>Time Signature:</strong> {$analysisResult.time_signature}</p>
    <h3>Chord Progression</h3>
    <pre>{$analysisResult.measures.join('\n')}</pre>
    <p><strong>Chord String:</strong> {$analysisResult.chord_string}</p>
    <div>
      <ChordChart chordString={$analysisResult.chord_string} />
    </div>
  </div>
{/if}

<style>
  .error {
    color: red;
  }
  
  .analysis-result {
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    margin-top: 20px;
  }
  
  .analysis-result h2 {
    color: #333;
  }
  
  .analysis-result p, .analysis-result pre {
    color: #666;
  }
  
  .analysis-result pre {
    background-color: #eee;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    overflow-x: auto;
  }
  
  .analysis-result h3 {
    margin-top: 20px;
    color: #333;
  }
</style>