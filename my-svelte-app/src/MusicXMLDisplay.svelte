<script>
  import { onMount, tick } from "svelte";
  import { writable } from "svelte/store";
  import Tooltip from "./tooltip.svelte";

  export let musicXml;
  let osmdContainer;
  let OpenSheetMusicDisplay;

  let tooltipVisible = writable(false);
  let tooltipContent = writable("");
  let tooltipX = writable(0);
  let tooltipY = writable(0);

  onMount(async () => {
    if (typeof window !== "undefined") {
      const OSMDPackage = await import("opensheetmusicdisplay");
      OpenSheetMusicDisplay =
        OSMDPackage.default?.OpenSheetMusicDisplay ||
        OSMDPackage.OpenSheetMusicDisplay;

      if (OpenSheetMusicDisplay && musicXml) {
        const osmd = new OpenSheetMusicDisplay(osmdContainer, {
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
    const chords = osmdContainer.querySelectorAll(".vf-text text");
    chords.forEach((chord) => {
      chord.addEventListener("mouseenter", (event) => {
        tooltipVisible.set(true);
        tooltipContent.set(`Chord: ${chord.textContent.trim()}`);
        let rect = chord.getBoundingClientRect();
        tooltipX.set(rect.left + window.scrollX);
        tooltipY.set(rect.top + window.scrollY);
      });

      chord.addEventListener("mouseleave", () => {
        tooltipVisible.set(false);
      });
    });
  }
</script>

<div bind:this={osmdContainer} class="osmd-container"></div>

{#if $tooltipVisible}
  <Tooltip content={$tooltipContent} x={$tooltipX} y={$tooltipY} />
{/if}

<style>
  .osmd-container {
    width: 100%;
    height: auto;
  }
</style>
