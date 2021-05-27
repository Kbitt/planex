import Vue from 'vue'
import VueCompositionApi from '@vue/composition-api'

let init = false

if (!init) {
  init = true
  Vue.use(VueCompositionApi)
}
