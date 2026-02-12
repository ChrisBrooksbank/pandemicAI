export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

export class TodoList {
  private todos: Todo[] = [];
  private nextId: number = 1;

  constructor(initialTodos: Todo[] = []) {
    this.todos = initialTodos;
    if (initialTodos.length > 0) {
      this.nextId = Math.max(...initialTodos.map((t) => t.id)) + 1;
    }
  }

  add(title: string): Todo {
    const todo: Todo = {
      id: this.nextId++,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    this.todos.push(todo);
    return todo;
  }

  complete(id: number): Todo | undefined {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      todo.completed = true;
    }
    return todo;
  }

  uncomplete(id: number): Todo | undefined {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      todo.completed = false;
    }
    return todo;
  }

  remove(id: number): boolean {
    const index = this.todos.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.todos.splice(index, 1);
      return true;
    }
    return false;
  }

  get(id: number): Todo | undefined {
    return this.todos.find((t) => t.id === id);
  }

  list(filter?: 'all' | 'completed' | 'pending'): Todo[] {
    switch (filter) {
      case 'completed':
        return this.todos.filter((t) => t.completed);
      case 'pending':
        return this.todos.filter((t) => !t.completed);
      default:
        return [...this.todos];
    }
  }

  toJSON(): Todo[] {
    return [...this.todos];
  }
}
