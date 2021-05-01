# Planex

Super simple type-safe state-management stores for `vue@2` with `@vue/composition-api`. Optionally compatible with Vuex (for devtools)

## Define store

### Class syntax

```typescript
const useCounter = defineStore(
  class {
    // state
    count = 0

    // action
    increment() {
      this.count++
    }

    // getter
    get next() {
      return this.count + 1
    }
  }
)
```

### Object syntax

```typescript
const useCounter = defineStore({
  // state
  count: 0,

  // action
  increment() {
    this.count++
  },

  // getter
  get next() {
    return this.count + 1
  },
})
```

### Function syntax

```typescript
const useCounter = defineStore(() => ({
  // state
  count: 0,

  // action
  increment() {
    this.count++
  },

  // getter
  get next() {
    return this.count + 1
  },
}))
```

## Use your store

```html
<template>
  <button type="button" @click="store.increment">{{ store.count }}</button>
</template>
<script lang="ts">
  import { defineComponent } from '@vue/composition-api'
  import { useCounter } from './counter'

  export default defineComponent({
    setup: () => {
      const store = useCounter()

      return { store }
    },
  })
</script>
```

## Use with vuex

Use the plugin options to enable propogating state/getters to vuex store. (Plugin is not necessary otherwise).

```typescript
// setup plugin at startup
import Vue from 'vue'
import PlanexPlugin from 'planex'
import store from './store' // vuex store

// pass in store directly to plugin
Vue.use(PlanexPlugin, { useVuex: { store } })

// or we'll find the store via mixin
Vue.use(PlanexPlugin, { useVuex: true })

// assign id's to your stores to label the generated vuex modules
// generic id's will automatically be generated if no ID is supplied
const useCounter = defineStore({...}, { id: 'counter' })

// or override the global vuex setting and disable for individual stores
const useCounter = defineStore({...}, { id: false })

```
