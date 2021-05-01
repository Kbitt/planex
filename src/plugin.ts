import { PluginObject } from 'vue'
import { Store } from 'vuex'
import { setStore } from './store'

type Options = {
  useVuex?: {
    enabled: boolean
    store?: Store<any>
    disableInProduction?: boolean
  }
}

const Plugin: PluginObject<Options> = {
  install: (Vue, options) => {
    if (!options?.useVuex?.enabled && !options?.useVuex?.store) return
    if (
      options.useVuex.disableInProduction &&
      process.env.NODE_ENV === 'production'
    ) {
      return
    }
    if (!options.useVuex.store) {
      Vue.mixin({
        beforeCreate() {
          setStore(this.$store)
        },
      })
    } else {
      setStore(options.useVuex.store)
    }
  },
}

export default Plugin
