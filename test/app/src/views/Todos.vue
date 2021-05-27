<template>
  <div>
    <h1>Todos ({{ store.todos.length }})</h1>
    <h2>Done: {{ store.doneCount }}</h2>
    <button type="button" @click="store.add">Add</button>
    <label>List:</label>
    <input type="text" v-model="store.name" />
    <input type="text" v-model="store.info.description" />
    <ul>
      <li v-for="(todo, index) in store.todos" :key="index">
        <input
          type="checkbox"
          :checked="todo.done"
          @input="store.setTodo(index, { done: $event.target.checked })"
        />
        <input
          type="text"
          :value="todo.text"
          @input="store.setTodo(index, { text: $event.target.value })"
        />
        <button type="button" @click="store.remove(index)">-</button>
      </li>
    </ul>
  </div>
</template>
<script lang="ts">
import { defineComponent, watchEffect } from '@vue/composition-api'
import { useLoadingStore } from '../store/manual'
import useTodos from '../store/todos'
export default defineComponent({
  setup: () => {
    const store = useTodos()

    const loadingStore = useLoadingStore()

    return {
      store,
      storeSetLoading: () => {
        store.setLoading(!store.loading)
      },

      loadingStore,
    }
  },
})
</script>
<style lang="stylus" scoped></style>
