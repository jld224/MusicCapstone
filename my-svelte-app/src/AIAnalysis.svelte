<script>
    import { writable } from "svelte/store";
    import { analysisResultStore } from "./stores.js";

    const error = writable("");
    const loading = writable(false);
    const analysisResult = writable("");

    // This reactive statement correctly listens for changes to analysisResultStore
    $: $analysisResultStore, analyzeMusic();

    async function analyzeMusic() {
        // Make sure we're not trying to analyze empty or null values
        if (!$analysisResultStore) {
            console.log("No music data available for analysis.");
            return;
        }
        loading.set(true);
        error.set("");

        try {
            const response = await fetch("http://localhost:3001/analyze_music", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ music: $analysisResultStore }), // Directly use the store's value
            });

            if (!response.ok) {
                throw new Error(`Failed to analyze music: server responded with status ${response.status}`);
            }

            const data = await response.json();
            analysisResult.set(data.analysisResult); // Assume the server response has an analysisResult field
        } catch (err) {
            console.error("Error:", err);
            error.set(err.message);
        } finally {
            loading.set(false);
        }
    }
</script>

<!-- If you need to display the raw JSON for any reason -->
<pre>{$analysisResultStore}</pre>
<button on:click={analyzeMusic} disabled={$loading}>Analyze music</button>

{#if $loading}
    <p>Loading...</p>
{:else if $error}
    <p class="error">{$error}</p>
{:else if $analysisResult}
    <div>
        <h2>Analysis Result</h2>
        <pre>{$analysisResult}</pre>
    </div>
{/if}

<style>
    .error {
        color: red;
    }
</style>
