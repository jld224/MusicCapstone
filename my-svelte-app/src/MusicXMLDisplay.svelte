<script>
  import { onMount } from "svelte";
  import { writable } from "svelte/store";
  import Tooltip from "./tooltip.svelte";

  export let musicXml;
  let osmdContainer;
  let OpenSheetMusicDisplay;
  let osmd;

  const tooltipVisible = writable(false);
  const tooltipContent = writable("");
  const tooltipPosition = writable({ x: 0, y: 0 });

  onMount(async () => {
    if (typeof window !== "undefined") {
      const OSMDPackage = await import("opensheetmusicdisplay");
      OpenSheetMusicDisplay = OSMDPackage.OpenSheetMusicDisplay;

      if (OpenSheetMusicDisplay && musicXml) {
        osmd = new OpenSheetMusicDisplay(osmdContainer, {
          autoResize: true,
          drawTitle: true,
        });
        await osmd.load(musicXml);
        await osmd.render();
        setupChordInteractions();
      }
    }
  });

  function setupChordInteractions() {
  // Assuming `osmdContainer` is a predefined variable that references the container of the SVG elements.
  // Select all text elements within SVGs with class `vf-text`
  const chords = osmdContainer.querySelectorAll(".vf-text text");

  // Add event listeners to each chord
  chords.forEach((chord) => {
    chord.addEventListener("mouseenter", (event) => {
      // Set the tooltip to be visible
      tooltipVisible.set(true);
      // Set the content of the tooltip to the text content of the chord, trimmed of whitespace
      tooltipContent.set(`Chord: ${chord.textContent.trim()}`);
      // Calculate the position for the tooltip based on the chord's bounding rectangle
      let rect = chord.getBoundingClientRect();
      // Set the position for the tooltip, adjusted for the current scroll position
      tooltipPosition.set({ x: rect.left + window.scrollX, y: rect.top + window.scrollY });
    });

    // Add an event listener for when the mouse leaves the chord, to hide the tooltip
    chord.addEventListener("mouseleave", () => {
      tooltipVisible.set(false);
    });
  });
}
</script>

<div bind:this={osmdContainer} class="osmd-container"></div>

{#if $tooltipVisible}
  <Tooltip content={$tooltipContent} {...$tooltipPosition} />
{/if}

<style>
  .osmd-container {
    width: 100%;
    height: auto;
  }
</style>
