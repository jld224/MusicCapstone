<script>
    import { onMount } from "svelte";
    import { writable } from "svelte/store";

    const songs = writable([]);
    let selectedSongUrl = "";
    let analysisResult = writable('');
    let error = writable('');

    onMount(async () => {
        try {
            const response = await fetch('/api/songs');
            if (response.ok) {
                const data = await response.json();
                songs.set(data);
            } else {
                const errData = await response.json();
                error.set(errData.error || 'Failed to load songs.');
            }
        } catch (err) {
            console.error('Error fetching songs:', err);
            error.set('An unexpected error occurred.');
        }
    });

    const analyzeSong = async () => {
        try {
            const response = await fetch("http://localhost:3001/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ url: selectedSongUrl }),
            });

            if (!response.ok) {
                throw new Error('Failed to analyze the song.');
            }

            const result = await response.json();
            analysisResult.set(result);
        } catch (err) {
            console.error('Error analyzing song:', err);
            error.set(err.message || 'An unexpected error occurred during analysis.');
        }
    };
</script>

<select bind:value={selectedSongUrl}>
    <option value="">Select a song</option>
    {#each $songs as { title, url }}
        <option value={url}>{title}</option>
    {/each}
</select>

<button on:click={analyzeSong} disabled={!selectedSongUrl}>Analyze</button>

{#if $error}
    <p class="error">{$error}</p>
{:else if $analysisResult}
    <pre>{$analysisResult}</pre>
{/if}

<style>
    .error {
        color: red;
    }
</style>
