// Where a teacher's teaching is kept between one morning and the next: a file on their phone.
//
// Until now it lived in a variable (`let store` in lib/classroom-data.ts), which is why a register
// saved at nine was gone by ten and why nothing could have made a classroom worth keeping. It is
// kept here instead, as the text of one file in the app's own documents folder — the phone's, and
// nowhere else, beside the records (lib/accounts-file.ts), the walkthrough's memory
// (lib/onboarding.ts) and the look a teacher chose (lib/appearance.ts).
//
// Nothing is uploaded and nothing is asked of a network: no attendance or student data is sent
// anywhere outside the device, which is an approved decision. A backup, when a teacher asks for
// one, is a second file on the same phone (lib/backup.ts).
import { textOnThisPhone, type KeptText } from './accounts-file';
import { classroomDataIfWhole, nothingKeptYet, type ClassroomData, type ClassroomStore } from './classroom-data';

/** What the file is called in the app's own documents folder. */
export const classroomFileName = 'classme-classrooms.json';

/**
 * The teaching this file keeps: read back off it whenever it is asked for, so the app always
 * answers from what the phone actually keeps, and written back whole whenever anything changes.
 *
 * Text that is not what this app writes — a file somebody edited, a file from a version that kept
 * something else — reads as a phone that has been told nothing yet, which is what every screen
 * already knows how to say. It is read through `classroomDataIfWhole` for the reason a backup file
 * is: a file that opened is not yet a file worth believing.
 */
export function classroomDataKeptIn(file: KeptText): ClassroomStore {
  return {
    async read() {
      const text = await file.read();
      if (!text) return nothingKeptYet();
      let read: unknown;
      try {
        read = JSON.parse(text);
      } catch {
        return nothingKeptYet();
      }
      return classroomDataIfWhole(read) ?? nothingKeptYet();
    },
    async write(data: ClassroomData) {
      await file.write(JSON.stringify(data));
    },
  };
}

/** The teaching this phone keeps, in the app's own documents folder. */
export function classroomDataOnThisPhone(): ClassroomStore {
  return classroomDataKeptIn(textOnThisPhone(classroomFileName));
}
