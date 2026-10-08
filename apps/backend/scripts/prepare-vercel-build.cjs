const { readFileSync, rmSync } = require('fs');
const { resolve } = require('path');

const backend = resolve(__dirname, '..');
const source = readFileSync(resolve(backend, 'src/participants/participants.service.ts'), 'utf8');
const obsoleteCall = /\bthis\s*\.\s*ticketEmail\s*\./;
if (obsoleteCall.test(source)) {
  throw new Error('ParticipantsService still calls the removed ticketEmail service. '
    + 'Use ticketEmailQueue.enqueueTicket/enqueueSubmission inside the registration transaction. '
    + 'Check that this deployment uses the latest fixed commit.');
}

// Discard TypeScript incremental state restored from a previous deployment.
// Only generated output inside this backend workspace is removed.
rmSync(resolve(backend, 'dist'), { recursive: true, force: true });
for (const name of ['tsconfig.tsbuildinfo', 'tsconfig.build.tsbuildinfo']) {
  rmSync(resolve(backend, name), { force: true });
}
const commit = process.env.VERCEL_GIT_COMMIT_SHA;
console.log(`Clean backend build; source commit: ${/^[a-f0-9]{7,40}$/i.test(commit || '') ? commit : 'local'}`);
