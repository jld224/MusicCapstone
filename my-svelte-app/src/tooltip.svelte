<script>
    export let content;
    export let x;
    export let y;
  </script>
  
  <div class="tooltip" style="position: fixed; top: {y}px; left: {x}px;">
    {content}
  </div>
  
  <style>
    .tooltip {
      position: fixed;
      background-color: black;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      pointer-events: none;
      z-index: 1000;
      transform: translate(-50%, -100%);
    }
  </style>
  