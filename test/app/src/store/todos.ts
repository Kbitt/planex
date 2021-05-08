import { defineStore } from 'planex'

export type Todo = {
  done: boolean
  text: string
}

class TodoStore {
  name = ''
  todos: Todo[] = []

  private _loading = false
  get loading() {
    return this._loading
  }

  setLoading(value: boolean) {
    this._loading = value
  }
  add() {
    this.todos.unshift({ done: false, text: '' })
  }
  setTodo(index: number, todo: Partial<Todo>) {
    const updated = Object.assign({}, this.todos[index], todo)
    this.todos.splice(index, 1, updated)
  }
  remove(index: number) {
    this.todos.splice(index, 1)
  }
  removeDone() {
    this.todos
      .map(({ done }, index) => ({ done, index }))
      .filter(({ done }) => done)
      .forEach(({ index }) => this.remove(index))
  }
  get done() {
    return this.todos.filter(({ done }) => done)
  }
  get doneCount() {
    return this.done.length
  }
}

const useTodos = defineStore(TodoStore, { id: 'todos' })

export default useTodos
