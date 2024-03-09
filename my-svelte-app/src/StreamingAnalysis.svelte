<script>
  import { writable } from "svelte/store";
  import { analysisResultStore } from "./stores.js";

  const error = writable("");
  const loading = writable(false);
  const analysisResult = writable("");

  // Modify streamAnalysis to accept a choice parameter
  async function streamAnalysis(choice) {
    loading.set(true);
    analysisResult.set(""); // Clear previous analysis results
    error.set("");

    try {
      // Include the choice in the request body
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
      // Recursive function to process streamed text
      async function processStream() {
        const { done, value } = await reader.read();
        if (done) {
          console.log("Stream completed");
          loading.set(false);
          return;
        }

        // Decode the stream chunk to a string
        const chunk = decoder.decode(value, { stream: true });
        chunk.split("\n").forEach((line) => {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.substring(5)); // Extract JSON data
            analysisResult.update((n) => n + data.content);
          }
        });

        // Read the next chunk
        processStream();
      }

      processStream();
    } catch (err) {
      console.error("Streaming error:", err);
      error.set(err.message);
      loading.set(false);
    }
  }
</script>

<!-- Buttons for selecting the expertise level -->
<button on:click={() => streamAnalysis("beginner")} disabled={$loading}
  >Explain for Beginners</button
>
<button on:click={() => streamAnalysis("intermediate")} disabled={$loading}
  >Explain for Intermediates</button
>
<button on:click={() => streamAnalysis("expert")} disabled={$loading}
  >Explain for Experts</button
>

<!-- The rest of your component remains the same... -->
{#if $loading}
  <p>Loading...</p>
{:else if $error}
  <p class="error">{$error}</p>
{:else}
  <div class="analysis-result">
    <h2>Streaming Analysis Result</h2>
    <pre class="ai-output">{$analysisResult}</pre>
  </div>
{/if}
