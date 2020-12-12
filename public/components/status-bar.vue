<template>
  <div id="status-bar" :class="{hidden: !active}">
    <span v-if="displayed > 0">displayed: {{ displayed }}<br/></span>
    <span v-if="hidden > 0">hidden: {{ hidden }}<br/></span>
    <span v-if="selected > 0">selected: {{ selected }}<br/></span>
    <span v-if="filtered > 0">filtered: {{ filtered }}<br/></span>
  </div>
</template>

<script>
module.exports = {
  name: "status-bar",
  props: ['entries', 'messages'],
  data: function() {
    return { active: true };
  },
  computed: {
    selected() {
      return this.entries.filter(e => e.isSelected).length;
    },
    hidden() {
      return this.entries.filter(e => e.isHidden).length;
    },
    displayed() {
      return this.entries.length;
    },
    filtered() {
      return this.messages.length - this.entries.length;
    },
  },
  mounted() {
    this.bus.$on('search.visibility-change', ({active}) => {
      this.active = !active;
    });
  }
}
</script>

<style scoped>

</style>
