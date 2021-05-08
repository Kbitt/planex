<template>
  <div>
    <h1>Todos ({{ store.todos.length }})</h1>
    <h2>Done: {{ store.doneCount }}</h2>
    <h3>
      Local Loading: {{ loadingStore.loading }}
      <button
        type="button"
        @click="loadingStore.setLoading(!loadingStore.loading)"
      >
        {{ loadingStore.loading ? 'turn off' : 'TURN ON' }}
      </button>
    </h3>
    <h3>
      Store Loading: {{ store.loading }}
      <button type="button" @click="storeSetLoading">
        {{ store.loading ? 'turn off' : 'TURN ON' }}
      </button>
    </h3>
    <button type="button" @click="store.add">Add</button>
    <label>List:</label>
    <input type="text" v-model="store.name" />
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

    watchEffect(() => {
      const loading = store.loading

      console.log('store.loading = ' + loading)
    })

    const loadingStore = useLoadingStore()

    return {
      store,
      storeSetLoading: () => {
        console.log(store)
        store.setLoading(!store.loading)
      },

      loadingStore,
    }
  },
})
</script>
<style lang="stylus" scoped></style>
