<template>
  <div id="search-results-panel">
    <div class="tabs-container">
      <div v-for="(tab, idx) in tabs" :class="['tab', { active: idx === activeTabIdx}]" @click="tabClick(idx)">
        <span role="button" class="title">{{tab.title}}</span>
        <div role="button" class="close" @click="closeClick(idx)">
          <svg height="10" id="Layer_1"  style="enable-background:new 0 0 512 512;" version="1.1" viewBox="0 0 512 512" width="10" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <path fill="currentColor" d="M443.6,387.1L312.4,255.4l131.5-130c5.4-5.4,5.4-14.2,0-19.6l-37.4-37.6c-2.6-2.6-6.1-4-9.8-4c-3.7,0-7.2,1.5-9.8,4  L256,197.8L124.9,68.3c-2.6-2.6-6.1-4-9.8-4c-3.7,0-7.2,1.5-9.8,4L68,105.9c-5.4,5.4-5.4,14.2,0,19.6l131.5,130L68.4,387.1  c-2.6,2.6-4.1,6.1-4.1,9.8c0,3.7,1.4,7.2,4.1,9.8l37.4,37.6c2.7,2.7,6.2,4.1,9.8,4.1c3.5,0,7.1-1.3,9.8-4.1L256,313.1l130.7,131.1  c2.7,2.7,6.2,4.1,9.8,4.1c3.5,0,7.1-1.3,9.8-4.1l37.4-37.6c2.6-2.6,4.1-6.1,4.1-9.8C447.7,393.2,446.2,389.7,443.6,387.1z"/>
          </svg>
        </div>
      </div>
    </div>

    <div class="entries-container">
      <div v-for="e in activeEntries">{{e.text}}</div>
    </div>
  </div>
</template>

<script>
module.exports = {
  name: "search-results-panel",
  props: ['messages', 'entries'],
  data: function() {
    return {
      activeTabIdx: 1,
      tabs: [{title: 'test tab A' }, { title: 'test tab B' }, { title: 'test tab C' }]
    }
  },

  computed: {
    activeEntries() {
      let t = this.tabs[this.activeTabIdx].title.toLowerCase();
      return this.entries.filter(e => e.text.toLowerCase().includes(t))
    }
  },

  methods: {
    tabClick(idx){
      this.activeTabIdx = idx;
      // this.bus.$emit('search.query-changed', { query: this.tabs[idx].title });
    },
    closeClick(idx) {
      this.tabs.splice(idx, 1);
    }
  },
  mounted() {
    this.bus.$on('search.add', s => {
      this.tabs.push({ title: s.query });
    });
  }
}
</script>

<style>
  #search-results-panel {
    background: var(--background-color);
    position: fixed;
    bottom: 0;
    width: 100%;
    height: 300px;
    box-shadow: 0 -5px 20px black;
  }

  .tabs-container {
    height: 35px;
    width: 100%;
    overflow-y: auto;
    display: flex;
    justify-content: space-around;
    border-bottom: 1px solid black;
  }

  .tabs-container .tab {
    cursor: pointer;
    width: 100%;
    text-align: center;
    line-height: 35px;
    border-left: 1px solid black;
    padding: 0 7px 0 7px;
    white-space: nowrap;
  }
  .tabs-container .tab .title {
  }
  .tabs-container .tab .close {
    display: inline-block;
    user-select: none;
  }
  .tabs-container .tab .close svg {
    padding: 2px;
  }
  .tabs-container .tab .close svg:hover {
    background: black;
    border-radius: 10px;
  }

  .tabs-container .tab:hover {
    background: var(--background-highlight-color);
  }
  .tabs-container .tab.active {
     background: var(--background-highlight-color);
   }

  .entries-container {
    overflow-y: auto;
    max-height: 264px;
    font-family: monospace;
  }
</style>
