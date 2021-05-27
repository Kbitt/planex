/// <reference types="vuex/types/vue" />
import Planex from 'planex'
import Vue from 'vue'
import VueCompositionApi from '@vue/composition-api'
import App from './App.vue'
import router from './router'

Vue.use(VueCompositionApi)

const useVuex = true

Vue.use(Planex, { useVuex, disableInProduction: true })

Vue.config.productionTip = false

const getStore = (): Promise<{ store?: any }> => {
  if (process.env.NODE_ENV !== 'production' && useVuex) {
    return import('./store').then(({ default: store }) => ({ store }))
  }

  return Promise.resolve({})
}

getStore().then(options => {
  new Vue({
    ...options,
    router,
    render: h => h(App),
  }).$mount('#app')
})
