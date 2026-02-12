#!/usr/bin/env node

import { TodoList } from './todo';
import { load, save } from './storage';

function printUsage(): void {
  console.log(`
Usage: todo <command> [arguments]

Commands:
  add <title>        Add a new todo
  list [filter]      List todos (filter: all, pending, completed)
  done <id>          Mark a todo as completed
  undone <id>        Mark a todo as not completed
  remove <id>        Remove a todo
  help               Show this help message
`);
}

function formatTodo(todo: { id: number; title: string; completed: boolean }): string {
  const status = todo.completed ? '[x]' : '[ ]';
  return `  ${todo.id}. ${status} ${todo.title}`;
}

function main(): void {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    printUsage();
    return;
  }

  const todos = load();
  const todoList = new TodoList(todos);

  switch (command) {
    case 'add': {
      const title = args.slice(1).join(' ');
      if (!title) {
        console.error('Error: Please provide a title for the todo.');
        process.exit(1);
      }
      const todo = todoList.add(title);
      save(todoList.toJSON());
      console.log(`Added: ${formatTodo(todo)}`);
      break;
    }

    case 'list': {
      const filter = (args[1] as 'all' | 'pending' | 'completed') || 'all';
      const items = todoList.list(filter);
      if (items.length === 0) {
        console.log('No todos found.');
      } else {
        console.log(`\nTodos (${filter}):\n`);
        items.forEach((t) => console.log(formatTodo(t)));
        console.log();
      }
      break;
    }

    case 'done': {
      const id = parseInt(args[1], 10);
      if (isNaN(id)) {
        console.error('Error: Please provide a valid todo ID.');
        process.exit(1);
      }
      const todo = todoList.complete(id);
      if (todo) {
        save(todoList.toJSON());
        console.log(`Completed: ${formatTodo(todo)}`);
      } else {
        console.error(`Error: Todo with ID ${id} not found.`);
        process.exit(1);
      }
      break;
    }

    case 'undone': {
      const id = parseInt(args[1], 10);
      if (isNaN(id)) {
        console.error('Error: Please provide a valid todo ID.');
        process.exit(1);
      }
      const todo = todoList.uncomplete(id);
      if (todo) {
        save(todoList.toJSON());
        console.log(`Uncompleted: ${formatTodo(todo)}`);
      } else {
        console.error(`Error: Todo with ID ${id} not found.`);
        process.exit(1);
      }
      break;
    }

    case 'remove': {
      const id = parseInt(args[1], 10);
      if (isNaN(id)) {
        console.error('Error: Please provide a valid todo ID.');
        process.exit(1);
      }
      const removed = todoList.remove(id);
      if (removed) {
        save(todoList.toJSON());
        console.log(`Removed todo #${id}.`);
      } else {
        console.error(`Error: Todo with ID ${id} not found.`);
        process.exit(1);
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main();
