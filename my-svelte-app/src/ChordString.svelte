<script>
  import { writable } from "svelte/store";
  import { analysisResultStore } from "./stores.js";

  const chordData = writable([]);
  const error = writable("");
  const loading = writable(false);

  const state = {
    timeSignature: "44",
    lastMeasure: [],
    lastTwoMeasures: [],
    segnoLocation: null,
    codaLocation: null,
    startRepeatLocation: null,
    endRepeatLocation: null,
    measures: [],
    endings: [],
  };

  // Helper function to ensure the state is properly initialized
  function ensureStateInitialization(state) {
    if (typeof state !== "object" || Array.isArray(state) || !state) {
      console.error("Invalid state object passed", state);
      return null;
    }
    state.measures = state.measures || [];
    return state;
  }

  const regexes = [
    { token: "XyQ", description: "Empty space" },
    { token: /\*\w/, description: "Section marker" },
    {
      token: /<(.*?)>/,
      description: "Comments inside carets",
      operation: checkForRepeats,
    },
    {
      token: /T(\d+)/,
      description: "Time signature",
      operation: setTimeSignature,
    },
    {
      token: "x",
      description: "Repeat previous measure in current measure",
      operation: repeatLastMeasure,
    },
    {
      token: "Kcl",
      description: "Repeat previous measure and create new measure",
      operation: repeatLastMeasureAndAddNew,
    },
    {
      token: "r|XyQ",
      description: "Repeat previous two measures",
      operation: repeatLastTwoMeasures,
    },
    { token: /Y+/, description: "Vertical spacers" },
    { token: "n", description: "No Chord (N.C)", operation: pushNull },
    { token: "p", description: "Pause slash" },
    { token: "U", description: "Ending measure for player" },
    { token: "S", description: "Segno", operation: setSegnoLocation },
    { token: "Q", description: "Coda", operation: setCodaLocation },
    {
      token: "{",
      description: "Start repeat marker",
      operation: setStartRepeatLocation,
    },
    {
      token: "}",
      description: "End repeat marker",
      operation: repeatEverythingToEndRepeatLocation,
    },
    { token: "LZ\\|", description: "Bar line", operation: createNewMeasure },
    { token: "\\|", description: "Bar line", operation: createNewMeasure },
    { token: "LZ", description: "Bar line", operation: createNewMeasure },
    {
      token: "[",
      description: "Double bar start",
      operation: createNewMeasure,
    },
    {
      token: "]",
      description: "Double bar end",
      operation: repeatRemainingEndings,
    },
    {
      token: /N(\d)/,
      description: "Numbered endings",
      operation: setEndRepeatLocation,
    },
    {
      token: "Z",
      description: "Final bar line",
      operation: repeatRemainingEndings,
    },
    {
      token: /[A-GW]{1}[\+\-\^\dhob#suadlt]*(\/[A-G][#b]?)?/,
      description: "Chord",
      operation: pushChordInMeasures,
    },
    {
      token: /[A-G][b#]?[\d\-\^]+/, // Example regex for chord names like Eb7, D-6
      operation: pushChordInMeasures,
    },
  ];

  function tokenize(rawString, state) {
    console.log("Starting tokenization");
    state = ensureStateInitialization(state);
    if (!state) {
      console.error("State initialization failed.");
      return;
    }

    regexes.forEach(({ pattern, operation }) => {
      if (pattern === undefined || typeof operation !== "function") {
        console.error(
          `Error in regex configuration: Pattern is ${pattern}, Operation is ${operation}`
        );
        return;
      }

      const regex = new RegExp(pattern, "g");
      let match;
      while ((match = regex.exec(rawString)) !== null) {
        if (match[0].length === 0) continue; // Skip empty matches
        operation(match[0], state);
      }
    });
    console.log("Tokenization completed.");
  }

  function processChordData() {
    loading.set(true);
    error.set("");
    chordData.set([]);

    const rawMusicData = $analysisResultStore?.music?.raw;
    if (!rawMusicData) {
      error.set("No raw music data available.");
      loading.set(false);
      return;
    }

    try {
      tokenize(rawMusicData, state);
      chordData.set(
        state.measures.map((measure, index) => ({ id: index, measure }))
      );
    } catch (e) {
      console.error("Error processing chord data:", e);
      error.set("Error processing chord data. Please check the format.");
    } finally {
      loading.set(false);
    }
  }

  function setTimeSignature(token, state) {
    const match = token.match(/T(\d+)/);
    if (match) {
      state.timeSignature = match[1];
    }
  }

  function repeatLastMeasure(tokenValue, state) {
    state = ensureStateInitialization(state);
    if (!state || !state.measures || state.measures.length === 0) {
      console.error("No measures available to repeat.");
      return;
    }

    const lastMeasure = state.measures[state.measures.length - 1];
    if (!lastMeasure) {
      console.error("Last measure is undefined, cannot repeat.");
      return;
    }

    // Safely repeat the last measure
    state.measures.push([...lastMeasure]);
  }

  function setCodaLocation(tokenValue, state) {
    state = ensureStateInitialization(state);
    if (!state || !state.measures) {
      console.error("Invalid state or measures undefined in setCodaLocation");
      return;
    }

    state.codaLocation = state.measures.length;
  }

  function checkForRepeats(token, state) {
    const match = token.match(/<repeat (\d+) (\d+)>/);
    if (!match) {
        console.error("Invalid repeat token format:", token);
        return;
    }
    const numberOfMeasures = parseInt(match[1], 10);
    const timesToRepeat = parseInt(match[2], 10);

    const startIndex = state.measures.length - numberOfMeasures;
    const repeatSection = state.measures.slice(startIndex);
    for (let i = 0; i < timesToRepeat; i++) {
        state.measures.push(...repeatSection);
    }
}

  function repeatLastMeasureAndAddNew(tokenValue, state) {
    state = ensureStateInitialization(state);
    if (!state) return; // Ensuring that state is properly initialized

    // Make sure measures is initialized and not empty
    if (!state.measures || state.measures.length === 0) {
      console.error("No measures available to repeat.");
      return; // Exit the function if there are no measures to repeat
    }

    const lastMeasure = state.measures[state.measures.length - 1];
    if (!lastMeasure) {
      console.error("Last measure is undefined, cannot repeat.");
      return; // Check if the last measure actually exists
    }

    // Repeat the last measure and add a new empty measure
    state.measures.push([...lastMeasure]); // Repeat the last measure
    state.measures.push([]); // Start a new measure
  }

  function repeatLastTwoMeasures(state) {
    state = ensureStateInitialization(state);
    if (!state || !state.lastTwoMeasures || state.lastTwoMeasures.length < 2) {
      console.error("Cannot repeat the last two measures, data missing.");
      return;
    }

    // Check each measure to ensure they are defined
    if (!state.lastTwoMeasures[0] || !state.lastTwoMeasures[1]) {
      console.error("One of the last two measures is undefined.");
      return;
    }

    state.measures.push([...state.lastTwoMeasures[0]]);
    state.measures.push([...state.lastTwoMeasures[1]]);
  }

  function pushNull(state) {
    state.measures.push(["N.C."]);
  }

  function setSegnoLocation(state) {
    state.segnoLocation = state.measures.length;
  }

  function setStartRepeatLocation(tokenValue, state) {
    state = ensureStateInitialization(state);
    if (!state) return;

    state.startRepeatLocation = state.measures.length;
  }

  function createNewMeasure(tokenValue, state) {
    state = ensureStateInitialization(state);
    if (!state) return;

    state.measures.push([]);
  }

  function repeatEverythingToEndRepeatLocation(tokenValue, state) {
    state = ensureStateInitialization(state);
    if (
      !state ||
      !state.measures ||
      typeof state.startRepeatLocation !== "number"
    ) {
      console.error(
        "Invalid state or startRepeatLocation in repeatEverythingToEndRepeatLocation"
      );
      return;
    }

    const repeatSection = state.measures.slice(state.startRepeatLocation);
    if (repeatSection.length > 0) {
      state.measures.push(...repeatSection);
      state.startRepeatLocation = null;
    }
  }

  function repeatRemainingEndings(token, state) {
    const match = token.match(/x(\d+)/);
    if (match) {
      const numberOfRepeats = parseInt(match[1], 10);
      const lastSection = state.measures.slice(-state.endRepeatLocation);
      for (let i = 0; i < numberOfRepeats - 1; i++) {
        state.measures.push(...lastSection);
      }
    }
  }

  function setEndRepeatLocation(token, state) {
    const match = token.match(/N(\d)/);
    if (match && parseInt(match[1], 10) === 1) {
      state.endRepeatLocation = state.measures.length;
    }
  }

  function pushChordInMeasures(token, state) {
    if (state.measures.length === 0) {
      state.measures.push([]);
    }
    let currentMeasure = state.measures[state.measures.length - 1];
    currentMeasure.push(token); // This assumes `token` is a chord name
  }
</script>

<div class="controls">
  <button on:click={processChordData} disabled={$loading}
    >Process Chord Data</button
  >
  {#if $loading}
    <p>Loading...</p>
  {/if}
  {#if $error}
    <p class="error">{$error}</p>
  {/if}
</div>

{#if $chordData && $chordData.length > 0}
  <div class="lead-sheet">
    {#each $chordData as { id, measure }}
      <div class="measure">
        <h2>Measure {id}</h2>
        {#each measure as chord}
          <button class="chord" on:click={() => handleChordClick(chord)}>
            {chord}
          </button>
        {/each}
      </div>
    {/each}
  </div>
{/if}

<style>
  .lead-sheet {
    font-family: sans-serif;
    background: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  .measure {
    margin-bottom: 24px;
  }
  .chord {
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 4px 8px;
    margin-right: 4px;
    cursor: pointer;
  }
</style>
