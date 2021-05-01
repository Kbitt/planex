import Vue from 'vue'
import App from './App.vue'
import VueCompositionApi from '@vue/composition-api'
import Planex from 'planex'
import router from './router'
import store from './store'

Vue.use(VueCompositionApi)
Vue.use(Planex, { useVuex: { store } })

Vue.config.productionTip = false

const args = { router, store }

new Vue({
  ...args,
  render: h => h(App),
}).$mount('#app')
