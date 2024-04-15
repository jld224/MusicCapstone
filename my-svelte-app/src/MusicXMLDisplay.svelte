<script>
    import { onMount } from 'svelte';
  
    export let musicXml;
    let osmdContainer;
    let OpenSheetMusicDisplay;
  
    onMount(async () => {
      if (typeof window !== "undefined") {
        // Dynamic import to ensure it's loaded in the client-side context
        const OSMDPackage = await import('opensheetmusicdisplay');
        OpenSheetMusicDisplay = OSMDPackage.default?.OpenSheetMusicDisplay || OSMDPackage.OpenSheetMusicDisplay;
  
        if (OpenSheetMusicDisplay && musicXml) {
          const osmd = new OpenSheetMusicDisplay(osmdContainer, {
            autoResize: true,
            drawTitle: true,
          });
          osmd.load(musicXml)
             .then(() => osmd.render())
             .catch(error => console.error('Error rendering sheet music:', error));
        }
      }
    });
  </script>
  
  <div bind:this={osmdContainer} class="osmd-container"></div>
  
  <style>
    .osmd-container {
      width: 100%;
      height: auto;
    }
  </style>
  