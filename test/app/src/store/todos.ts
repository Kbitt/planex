import { defineStore } from 'planex'

export type Todo = {
  done: boolean
  text: string
}

class TodoStore {
  name = ''
  todos: Todo[] = []
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
}

const useTodos = defineStore(TodoStore, { id: 'todos' })

export default useTodos
