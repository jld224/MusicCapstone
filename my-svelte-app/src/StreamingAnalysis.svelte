<script>
  import { writable } from "svelte/store";
  import { onMount } from "svelte";
  import { analysisResultStore } from "./stores.js";
  import { fade } from "svelte/transition";

  const error = writable("");
  const loading = writable(false);
  const analysisResult = writable("");
  const currentChoice = writable("");
  let streamActive = false;

  async function streamAnalysis(choice) {
    currentChoice.set(choice);
    loading.set(true);
    analysisResult.set("");
    error.set("");
    streamActive = true;

    // Destructure to exclude the musicXml field and keep the rest of the analysisResultStore
    const { musicXml, ...simplifiedData } = $analysisResultStore;

    try {
      const response = await fetch("http://localhost:3001/stream_AI_Analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ music: simplifiedData, choice }),
      });

      if (!response.ok) {
        throw new Error(`Stream failed to start. Status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      async function processStream() {
        while (streamActive) {
          const { done, value } = await reader.read();
          if (done || !streamActive) {
            console.log("Stream completed or stopped by user");
            break;
          }
          const chunk = decoder.decode(value, { stream: true });
          chunk.split("\n").forEach((line) => {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.substring(5));
              analysisResult.update((n) => `${n}${data.content}`);
            }
          });
        }
        loading.set(false);
        streamActive = false;
        currentChoice.set(""); // Clear the choice after loading
      }

      processStream();
    } catch (err) {
      console.error("Streaming error:", err);
      error.set(err.message);
      loading.set(false);
      streamActive = false;
      currentChoice.set(""); // Clear the choice on error
    }
  }

  function stopStreaming() {
    streamActive = false;
  }
</script>


<div class="streaming-controls">
  <button on:click={() => streamAnalysis("beginner")} disabled={$loading}
    >Explain for Beginners</button
  >
  <button on:click={() => streamAnalysis("intermediate")} disabled={$loading}
    >Explain for Intermediates</button
  >
  <button on:click={() => streamAnalysis("expert")} disabled={$loading}
    >Explain for Experts</button
  >
  <button on:click={() => streamAnalysis("composer")} disabled={$loading}
    >Learn about the Composer</button
  >
  <button on:click={() => streamAnalysis("culture")} disabled={$loading}
    >The Culture Behind the Song</button
  >
  <button on:click={() => streamAnalysis("influence")} disabled={$loading}
    >The Song's Influence</button
  >
  <button on:click={() => streamAnalysis("technique")} disabled={$loading}
    >Techniqes for playing</button
  >
  <button on:click={() => streamAnalysis("theoretical")} disabled={$loading}
    >Theoretical Analysis</button
  >
  <button on:click={() => streamAnalysis("multimedia")} disabled={$loading}
    >Multimedia Uses</button
  >
  <button on:click={() => streamAnalysis("global")} disabled={$loading}
    >The Song's Global Influence</button
  >
  {#if $loading}
    <button on:click={stopStreaming} class="stop-button">Stop Streaming</button>
  {/if}
</div>

{#if $loading}
  <div class="loading-info">
    <p>Loading analysis for: <strong>{$currentChoice}</strong></p>
    <div class="loading"></div>
  </div>
{:else if $error}
  <p class="error">{$error}</p>
{:else}
  <div class="streaming-output-container" transition:fade>
    <h2>Streaming Analysis Result</h2>
    <div class="ai-output">{$analysisResult}</div>
  </div>
{/if}

<style>
  .streaming-controls button {
    font-family: 'Arial Narrow Bold', sans-serif;
    padding: 10px 20px;
    margin-right: 10px;
    border-radius: 5px;
    border: none;
    background-color: #6200ea;
    color: white;
    cursor: pointer;
    transition:
      background-color 0.2s,
      transform 0.2s;
  }
  .streaming-controls button:hover {
    background-color: #7c4dff;
    transform: scale(1.05);
  }
  .streaming-controls button:disabled {
    background-color: #bbb;
    cursor: default;
  }
  .stop-button {
    background-color: #ff1744;
  }
  .stop-button:hover {
    background-color: #f01440;
  }
  .loading-info p {
    font-size: 16px;
    margin-bottom: 10px;
  }
  .loading {
    animation: spin 1s linear infinite;
    border: 6px solid #f3f3f3;
    border-radius: 50%;
    border-top: 6px solid #3498db;
    width: 40px;
    height: 40px;
  }
  .streaming-output-container {
    margin-top: 20px;
    background-color: #f5f5f5;
    padding: 20px;
    border-radius: 5px;
    border: 1px solid #ddd;
  }

  .ai-output {
    font-family: "Open Sans", sans-serif;
    white-space: pre-wrap; /* Maintains formatting and spaces */
    text-align: justify; /* Justifies the text for better paragraph alignment */
    line-height: 1.6; /* Improves readability by increasing line spacing */
    word-wrap: break-word; /* Ensures long words do not overflow */
    margin-top: 10px;
    padding: 10px;
    background-color: #fff;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Adds subtle shadow for depth */
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
