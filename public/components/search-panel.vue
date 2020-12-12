<template>
  <div id="search-panel" :class="{ hidden: !isShown, active }">
    <input ref="queryInput" :value="query" @input="onQueryInputChange($event)" @keyup="searchKeyUp($event)"
           @blur="onInputBlur($event)" @focus="onInputFocus($event)"/>
    <span>
            {{ focusedSearchResult && (foundParts.indexOf(focusedSearchResult) + 1) || 0 }} / {{ foundParts.length }}
        </span>
    <span>
            <button @click="focusPrevPart" style="transform: rotate(180deg)">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 7L1 3H9L5 7Z" fill="currentColor"/>
                </svg>
            </button>

            <button @click="focusNextPart">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 7L1 3H9L5 7Z" fill="currentColor"/>
                </svg>
            </button>

<!--            <button @click="onAddSearchClick">add</button>-->

            <button @click="isShown = false">
              <svg height="10" id="Layer_1" style="enable-background:new 0 0 512 512;" version="1.1"
                   viewBox="0 0 512 512" width="10" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"
                   xmlns:xlink="http://www.w3.org/1999/xlink">
                <path fill="currentColor"
                      d="M443.6,387.1L312.4,255.4l131.5-130c5.4-5.4,5.4-14.2,0-19.6l-37.4-37.6c-2.6-2.6-6.1-4-9.8-4c-3.7,0-7.2,1.5-9.8,4  L256,197.8L124.9,68.3c-2.6-2.6-6.1-4-9.8-4c-3.7,0-7.2,1.5-9.8,4L68,105.9c-5.4,5.4-5.4,14.2,0,19.6l131.5,130L68.4,387.1  c-2.6,2.6-4.1,6.1-4.1,9.8c0,3.7,1.4,7.2,4.1,9.8l37.4,37.6c2.7,2.7,6.2,4.1,9.8,4.1c3.5,0,7.1-1.3,9.8-4.1L256,313.1l130.7,131.1  c2.7,2.7,6.2,4.1,9.8,4.1c3.5,0,7.1-1.3,9.8-4.1l37.4-37.6c2.6-2.6,4.1-6.1,4.1-9.8C447.7,393.2,446.2,389.7,443.6,387.1z"/>
              </svg>
            </button>
        </span>
  </div>
</template>

<script>
module.exports = {
  name: "search-panel",
  props: ['searchQuery', 'focusedSearchResult', 'foundParts', 'focusPrevPart', 'focusNextPart'],
  data: function () {
    return {
      isShown: false,
      query: this.searchQuery,
      prevStr: '',
      active: false
    }
  },
  watch: {
    isShown(value) {
      if (value) {
        this.emitQueryChanged(this.query);
        this.active = true;
      } else {
        this.emitQueryChanged('');
      }
      this.bus.$emit('search.visibility-change', {active: value});
    }
  },
  methods: {
    searchKeyUp($event) {
      if ($event.key === 'Enter') {
        if ($event.shiftKey) {
          this.focusPrevPart();
        } else {
          this.focusNextPart();
        }
      }
    },
    onQueryInputChange($event) {
      let query = $event.target.value;
      this.query = query;
      this.emitQueryChanged(query);
    },
    emitQueryChanged(query) {
      this.bus.$emit('search.query-changed', { query });
    },
    onInputBlur($event) {
      this.active = false;
    },
    onInputFocus($event) {
      this.active = true;
    },
    onAddSearchClick() {
      this.bus.$emit('search.add', { query: this.query });
    }
  },
  mounted() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.isShown = false;
      }
      else if (e.key === 'f' && e.ctrlKey) {
        e.preventDefault();
        this.isShown = true;
        requestAnimationFrame(() => {
          this.$refs.queryInput.focus();
          this.$refs.queryInput.select();
        });
      }
      else if (e.key === 'F3' && this.isShown) {
        e.preventDefault();
        if (e.shiftKey) {
          this.focusPrevPart();
        } else {
          this.focusNextPart();
        }
      }
    });
  }
}
</script>

<style scoped>

</style>
