// A backup file's own contents. Declared here so the checks that prove a backup can name the pieces
// they call; nothing behind any of it yet.
import type { ClassroomData } from './classroom-data';

const notBuiltYet = () => new Error('making a backup file is not built yet');

export function backupFileName(_madeAt: Date): string {
  throw notBuiltYet();
}

export function makeBackup(_data: ClassroomData, _password: string, _madeAt: Date): string {
  throw notBuiltYet();
}

export function openBackup(_file: string, _password: string): ClassroomData | null {
  throw notBuiltYet();
}
