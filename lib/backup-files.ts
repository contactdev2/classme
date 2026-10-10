// Where a backup file is kept. Declared here so the checks that prove a backup can name the pieces
// they call; nothing behind any of it yet.
export type BackupFiles = {
  where(): string;
  save(name: string, contents: string): Promise<string>;
  read(name: string): Promise<string>;
  saved(): Promise<string[]>;
};

const notBuiltYet = () => new Error('keeping a backup file is not built yet');

export function backupFilesIn(_files: Record<string, string> = {}): BackupFiles {
  throw notBuiltYet();
}

export function keepBackupFilesIn(_files: BackupFiles): void {
  throw notBuiltYet();
}

export function backupFiles(): BackupFiles {
  throw notBuiltYet();
}
