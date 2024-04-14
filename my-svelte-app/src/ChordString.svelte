<script>
  import { writable } from "svelte/store";
  import { analysisResultStore } from "./stores.js";

  const chordData = writable([]);
  const error = writable("");
  const loading = writable(false);

  // Initialize state object
  const state = {
    timeSignature: "44", // Default time signature
    lastMeasure: [],
    lastTwoMeasures: [],
    segnoLocation: null,
    codaLocation: null,
    startRepeatLocation: null,
    endRepeatLocation: null,
    measures: [],
    endings: [],
  };

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

    if (state.measures.length < numberOfMeasures) {
      console.error("Not enough measures for repeat:", token);
      return;
    }

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
    currentMeasure.push(token);  // This assumes `token` is a chord name
}

  const rules = [
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
        token: /[A-G][b#]?[\d\-\^]+/,  // Example regex for chord names like Eb7, D-6
        operation: pushChordInMeasures,
    },
  ];

  // Operations mapping
  const operations = {
    checkForRepeats,
    setTimeSignature,
    repeatLastMeasure,
    repeatLastMeasureAndAddNew,
    repeatLastTwoMeasures,
    pushNull,
    setSegnoLocation,
    setCodaLocation,
    setStartRepeatLocation,
    repeatEverythingToEndRepeatLocation,
    createNewMeasure,
    repeatRemainingEndings,
    setEndRepeatLocation,
    pushChordInMeasures,
  };

  // Tokenize and parse functions

  // Ensure that state is always an object and correctly initialized
  function ensureStateInitialization(state) {
    if (typeof state !== "object" || Array.isArray(state) || !state) {
      console.error("Invalid state object passed", state);
      return null;
    }

    if (!state.measures) {
      console.error("Initializing 'measures' as it was undefined");
      state.measures = [];
    }

    return state;
  }

  function tokenize(rawString, state) {
    let currentPosition = 0;
    state = ensureStateInitialization(state);
    if (!state) return;

    while (currentPosition < rawString.length) {
        let foundToken = false;
        let tokenLength = 0;

        for (const rule of rules) {
            const regex = rule.token instanceof RegExp ? rule.token : new RegExp(escapeRegExp(rule.token), 'g');
            regex.lastIndex = currentPosition;
            const match = regex.exec(rawString);

            if (match && match.index === currentPosition) {
                const tokenValue = match[0];
                tokenLength = tokenValue.length;

                if (rule.operation) {
                    rule.operation(tokenValue, state);
                }

                currentPosition += tokenLength;
                foundToken = true;
                break;
            }
        }

        if (!foundToken || tokenLength === 0) {
            currentPosition++;
        }
    }
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
        state.measures.map((measure, index) => ({
          id: index,
          measure,
        }))
      );
      console.log("Processing completed successfully.");
    } catch (e) {
      console.error("Error processing chord data:", e);
      error.set("Error processing chord data. Please check the format.");
    } finally {
      loading.set(false);
    }
  }

  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function fetchData() {
    // Assume this fetches data and should always result in an array
    chordData.set($analysisResultStore?.music || []); // Ensure always setting an array
  }

  // Call fetchData or other logic to populate chordData
  fetchData();

  $: if ($chordData) {
    console.log("chordData is set and iterable:", $chordData);
  } else {
    console.log(
      "chordData is not set or not iterable, setting to empty array."
    );
    chordData.set([]);
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

{#if $chordData && Array.isArray($chordData)}
  <div>
    {#each $chordData as item (item.id)}
      <p>{item.name}</p>
    {/each}
  </div>
{:else}
  <p>No chord data available or the data is not iterable.</p>
{/if}

{#if $chordData && $chordData.length > 0}
  <div class="lead-sheet">
    {#each $chordData as { section, measures }}
      <div class="section">
        <h2>Section {section}</h2>
        {#each measures as { measureNumber, chords }}
          <div class="measure">
            <span>Measure {measureNumber}:</span>
            {#each chords as chordName}
              <button
                class="chord"
                on:click={() => handleChordClick(chordName)}
              >
                {chordName}
              </button>
            {/each}
          </div>
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
  .section {
    margin-bottom: 24px;
  }
  .section h2 {
    font-size: 1.5em;
    color: #333;
    margin-bottom: 8px;
  }
  .chord {
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 4px 8px;
    margin-right: 4px;
    cursor: pointer;
  }
  .measure {
    margin-bottom: 8px;
  }
</style>
