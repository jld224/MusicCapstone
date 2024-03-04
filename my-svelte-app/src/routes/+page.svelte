<script>
  import { onMount } from "svelte";
  import { writable } from "svelte/store";

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
  <div>
    <h2>Analysis Result</h2>
    <p>Title: {$analysisResult.title}</p>
    <p>Composer: {$analysisResult.composer}</p>
    <p>Style: {$analysisResult.style}</p>
    <p>Key: {$analysisResult.key}</p>
    <p>Time Signature: {$analysisResult.time_signature}</p>
    <pre>Chord Progression: {$analysisResult.measures}</pre>
  </div>
{/if}

<style>
  .error {
    color: red;
  }
</style>
