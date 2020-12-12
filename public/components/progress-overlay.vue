<template>
  <div v-if="shown">
    <div id="overlay"></div>
    <div class="progress">
      <div class="progress_indicator" :style="{width: progress + '%'}"></div>
    </div>
  </div>
</template>

<script>
module.exports = {
  name: "progress-overlay",
  computed: {
    shown: function() {
      return this.progress < 100
    }
  },
  data: function() {
    return {
      progress: 100
    }
  },
  mounted() {
    this.bus.$on('logs.download.progress', ev => {
      this.progress = (ev.loaded / ev.total) * 100;
    });
  }
}
</script>

<style scoped>
  .progress {
    opacity: 1 !important;
    width: 80%;
    position: absolute;
    margin: auto;
    height: 1.5%;
    background: white;
    top: 49%;
    left: 10%;
  }
  .progress_indicator {
    transition: width;
    transition-duration: 150ms;
    transition-delay: 50ms;
    background: black;
    height: 100%;
  }
</style>
