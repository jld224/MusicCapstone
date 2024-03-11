<script>
  import { writable } from "svelte/store";
  import { analysisResultStore } from "./stores.js";

  const chordData = writable([]);
  const error = writable("");
  const loading = writable(false);

  let isChordDataActive = false; // to control the activation of chord data processing

  // Function to be triggered by the button click
  async function processChordData() {
    loading.set(true);
    error.set("");
    chordData.set([]);
    isChordDataActive = true;

    // Wait for the store to have chord data
    if ($analysisResultStore?.chord_string && isChordDataActive) {
      try {
        chordData.set(parseChordString($analysisResultStore.chord_string));
      } catch (e) {
        console.error("Error parsing chord string:", e);
        error.set(
          "Error parsing chord data. Please check the chord string format."
        );
      }
    }

    loading.set(false);
  }

  // This function needs to handle all aspects of the chord string,
  // including the sections and special instructions
  function parseChordString(chordString) {
  // Split the string by section headers and filter out empty strings
  const sectionHeaders = chordString.match(/\[\*\w|{\*\w|\*\w/g);
  const sectionContents = chordString.split(/\[\*\w|{\*\w|\*\w/).filter(Boolean);

  if (sectionHeaders && sectionHeaders.length !== sectionContents.length) {
    console.error("Mismatch between section headers and contents");
    return []; // return an empty array or handle the error as you see fit
  }

  let parsedSections = [];
  let timeSignature = "";

  // Loop through each section header and match it with its content
  sectionHeaders.forEach((header, index) => {
    const sectionType = header.replace(/[\[\{]/, ''); // Remove brackets for section type
    const chordsString = sectionContents[index];
    const chordsArray = chordsString.split('|').filter(chord => chord.trim() !== "").map(chord => {
      const instructionRegex = /^(l|r|s|x|<.*>)/;
      const instruction = chord.match(instructionRegex);
      const name = chord.replace(instructionRegex, '').trim();

      return {
        name,
        instruction: instruction ? instruction[0] : null
      };
    });

    // Look for the time signature if it's there
    if (index === 0 && chordsArray[0].name.startsWith('T')) {
      timeSignature = chordsArray.shift().name; // Remove and store the time signature
    }

    parsedSections.push({
      type: sectionType,
      timeSignature: index === 0 ? timeSignature : null, // Only the first section will have the time signature
      chords: chordsArray,
      id: `section-${index}`
    });
  });

  return parsedSections;
}

  // Helper function to determine the CSS class for a chord
  function chordClass(chord) {
    return `chord ${chord.isLong ? "long" : ""} ${chord.isShort ? "short" : ""} ${chord.isRest ? "rest" : ""}`;
  }

  // Helper function to create a title attribute for a chord
  function chordTitle(chord) {
    if (chord.isLong) return "Long";
    if (chord.isShort) return "Short";
    if (chord.isRest) return "Rest";
    return "";
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

{#if !$loading && !$error}
  <div class="lead-sheet">
    {#each $chordData as section (section.id)}
      <div class="section">
        <h2>Section {section.name}</h2>
        {#if section.timeSignature}
          <div class="time-signature">Time: {section.timeSignature}</div>
        {/if}
        {#if section.repeatIndicator}
          <div class="repeat-indicator">Repeat: {section.repeatIndicator}</div>
        {/if}
        <div class="chords">
          {#each section.chords as chord}
            <span class="chord" title={chord.instruction}>
              {chord.name}
            </span>
          {/each}
        </div>
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
    display: inline-block;
    margin: 4px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1em;
  }
  .chord.long {
    background-color: #ffdddd;
  }
  .chord.short {
    background-color: #ddffdd;
  }
  .chord.rest {
    background-color: #ddddff;
  }
  .time-signature {
    font-style: italic;
    color: #666;
  }
</style>
