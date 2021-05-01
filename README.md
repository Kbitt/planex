# Planex

Super simple type-safe state-management stores for `vue@2` with `@vue/composition-api`. Optionally compatible with Vuex (for devtools).

`planex` is a light wrapper around `vue`'s `reactive`/`computed` functions, providing some handy utility you don't get directly with just `reactive` alone, such as:

- Reactive, cached getters by just using JavaScript getters/setters in your store definition.
- Create store from class definitions (recommended)
- Support for store extension via class inheritance
- Devtools support through hooking into vuex

## Define store

Store definitions are simple: any regular property is part of state, any getter is a getter, and any setter and method is an action. Each call to `defineStore` creates a hook for a single store. Once the store is retrieved, it is cached so any other use of the hook produces the same store, so its values can be reactive across different components.

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

### Use other stores

```typescript
const useStore = defineStore(
  class {
    get currentCount() {
      return useCounter().count
    }
  }
)
```

### Classes are recommended

The class syntax has some benefits. For one, if you pass an object literal to `defineStore`, TypeScript may interpret your getters as `any` unless you manually annotate their return type.

Classes also make it far easier to extend (inherit) the definitions of other stores. You can either define the classes separately:

```typescript
class MyStore {}

const useStore = defineStore(MyStore)

// elsewheere

class MyOtherStore extends MyStore {}

const useOtherStore = defineStore(MyOtherStore)
```

Or you can use the store hook's `$class` property to extend it:

```typescript
const useStore = defineStore(class {})

// elsewheere

const useOtherStore = defineStore(class extends useStore.$class {})
```

Note: classes must have a parameterless constructor. This is so `defineStore` can instantiate the class and cache the result. Otherwise the store hook would have to access the constructor arguments, which would only be used the first time the store is inialized. If you want the store to be able to access some variable configuration, use `defineStore` inside a factory function that captures the configuration:

```typescript
const useStore = (api: () => Promise<string[]>) => {
  return defineStore(
    class {
      items: string[] = []

      fetchData() {
        api().then(items => {
          this.items = items
        })
      }
    }
  )() // call the hook at the end of your wrapper
}
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
Vue.use(PlanexPlugin, { useVuex: { enabled: true } })

// optionally disable vuex integration in production, if you only use it for devtools
Vue.use(PlanexPlugin, { useVuex: { enabled: true, disableInProduction: true } })

// assign id's to your stores to label the generated vuex modules
// generic id's will automatically be generated if no ID is supplied
const useCounter = defineStore({...}, { id: 'counter' })

// or override the global vuex setting and disable for individual stores
const useCounter = defineStore({...}, { id: false })

```
