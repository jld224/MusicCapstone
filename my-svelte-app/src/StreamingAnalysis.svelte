<script>
  import { writable } from "svelte/store";
  import { analysisResultStore } from "./stores.js";
  
  const error = writable("");
  const loading = writable(false);
  const analysisResult = writable("");
  let streamActive = false;

  async function streamAnalysis(choice) {
    loading.set(true);
    analysisResult.set("");
    error.set("");
    streamActive = true;

    try {
      const response = await fetch("http://localhost:3001/stream_AI_Analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ music: $analysisResultStore, choice }),
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
              analysisResult.update((n) => n + data.content);
            }
          });
        }
        loading.set(false);
        streamActive = false;
      }

      processStream();
    } catch (err) {
      console.error("Streaming error:", err);
      error.set(err.message);
      loading.set(false);
      streamActive = false;
    }
  }

  function stopStreaming() {
    streamActive = false;
  }
</script>

<div class="streaming-controls">
  <button on:click={() => streamAnalysis("beginner")} disabled={$loading}>Explain for Beginners</button>
  <button on:click={() => streamAnalysis("intermediate")} disabled={$loading}>Explain for Intermediates</button>
  <button on:click={() => streamAnalysis("expert")} disabled={$loading}>Explain for Experts</button>
  {#if $loading}
    <button on:click={stopStreaming} class="stop-button">Stop Streaming</button>
  {/if}
</div>

{#if $loading}
  <p>Loading...</p> <!-- Consider replacing with a spinner or progress bar -->
{:else if $error}
  <p class="error">{$error}</p>
{:else}
  <div class="streaming-output-container">
    <h2>Streaming Analysis Result</h2>
    <pre class="ai-output">{$analysisResult}</pre>
  </div>
{/if}

<style>
  .streaming-controls button {
    padding: 10px 20px;
    margin-right: 10px;
    border-radius: 5px;
    border: none;
    background-color: #6200ea;
    color: white;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  .streaming-controls button:hover {
    background-color: #7c4dff;
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
  .streaming-output-container {
    margin-top: 20px;
  }
  .ai-output {
    font-family: 'Courier New', monospace;
    white-space: pre-wrap;
    word-wrap: break-word;
    background-color: #f5f5f5;
    border-radius: 5px;
    padding: 20px;
    border: 1px solid #ddd;
  }
  .error {
    color: #d32f2f;
    background-color: #ffcdd2;
    padding: 10px;
    border-radius: 5px;
    margin-top: 10px;
  }
</style>
