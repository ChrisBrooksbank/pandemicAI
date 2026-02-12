import * as fs from 'fs';
import * as path from 'path';
import { Todo } from './todo';

const DEFAULT_FILE = path.join(
  process.env.HOME || process.env.USERPROFILE || '.',
  '.todolist.json'
);

export function load(filePath: string = DEFAULT_FILE): Todo[] {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as Todo[];
  } catch {
    return [];
  }
}

export function save(todos: Todo[], filePath: string = DEFAULT_FILE): void {
  fs.writeFileSync(filePath, JSON.stringify(todos, null, 2), 'utf-8');
}
