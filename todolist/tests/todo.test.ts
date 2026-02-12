import { describe, it, expect, beforeEach } from 'vitest';
import { TodoList } from '../src/todo';

describe('TodoList', () => {
  let todoList: TodoList;

  beforeEach(() => {
    todoList = new TodoList();
  });

  describe('add', () => {
    it('should add a new todo with incremented id', () => {
      const todo = todoList.add('Buy groceries');
      expect(todo.id).toBe(1);
      expect(todo.title).toBe('Buy groceries');
      expect(todo.completed).toBe(false);
      expect(todo.createdAt).toBeTruthy();
    });

    it('should increment ids for multiple todos', () => {
      const first = todoList.add('First');
      const second = todoList.add('Second');
      expect(first.id).toBe(1);
      expect(second.id).toBe(2);
    });
  });

  describe('complete', () => {
    it('should mark a todo as completed', () => {
      todoList.add('Task');
      const result = todoList.complete(1);
      expect(result?.completed).toBe(true);
    });

    it('should return undefined for non-existent id', () => {
      const result = todoList.complete(999);
      expect(result).toBeUndefined();
    });
  });

  describe('uncomplete', () => {
    it('should mark a completed todo as not completed', () => {
      todoList.add('Task');
      todoList.complete(1);
      const result = todoList.uncomplete(1);
      expect(result?.completed).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove a todo by id', () => {
      todoList.add('Task');
      const removed = todoList.remove(1);
      expect(removed).toBe(true);
      expect(todoList.list()).toHaveLength(0);
    });

    it('should return false for non-existent id', () => {
      const removed = todoList.remove(999);
      expect(removed).toBe(false);
    });
  });

  describe('get', () => {
    it('should return a todo by id', () => {
      todoList.add('Task');
      const todo = todoList.get(1);
      expect(todo?.title).toBe('Task');
    });

    it('should return undefined for non-existent id', () => {
      const todo = todoList.get(999);
      expect(todo).toBeUndefined();
    });
  });

  describe('list', () => {
    beforeEach(() => {
      todoList.add('Pending task');
      todoList.add('Completed task');
      todoList.complete(2);
    });

    it('should list all todos', () => {
      expect(todoList.list('all')).toHaveLength(2);
    });

    it('should list only pending todos', () => {
      const pending = todoList.list('pending');
      expect(pending).toHaveLength(1);
      expect(pending[0].title).toBe('Pending task');
    });

    it('should list only completed todos', () => {
      const completed = todoList.list('completed');
      expect(completed).toHaveLength(1);
      expect(completed[0].title).toBe('Completed task');
    });

    it('should default to all when no filter given', () => {
      expect(todoList.list()).toHaveLength(2);
    });
  });

  describe('constructor with initial data', () => {
    it('should restore todos from saved data', () => {
      const saved = [
        { id: 5, title: 'Saved', completed: true, createdAt: '2024-01-01T00:00:00.000Z' },
      ];
      const restored = new TodoList(saved);
      expect(restored.list()).toHaveLength(1);
      expect(restored.get(5)?.title).toBe('Saved');
    });

    it('should continue id sequence from loaded data', () => {
      const saved = [
        { id: 3, title: 'Saved', completed: false, createdAt: '2024-01-01T00:00:00.000Z' },
      ];
      const restored = new TodoList(saved);
      const newTodo = restored.add('New');
      expect(newTodo.id).toBe(4);
    });
  });

  describe('toJSON', () => {
    it('should return a copy of the todos array', () => {
      todoList.add('Task');
      const json = todoList.toJSON();
      expect(json).toHaveLength(1);
      json.push({ id: 99, title: 'Injected', completed: false, createdAt: '' });
      expect(todoList.list()).toHaveLength(1);
    });
  });
});
