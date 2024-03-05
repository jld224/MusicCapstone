<script>
    export let chordString = "";
</script>

<div class="chord-chart">
    <pre>{chordString}</pre>
</div>

<style>
    .chord-chart {
        font-family: "Courier New", Courier, monospace;
        margin-bottom: 20px;
    }

    .section {
        margin-top: 20px;
    }

    .section-name {
        font-weight: bold;
    }

    .chords {
        margin: 5px 0;
    }

    .chords span:not(:last-child) {
        margin-right: 4px; /* Add some spacing between chord symbols */
    }
</style>
