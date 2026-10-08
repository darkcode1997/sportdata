// All binary columns from the legacy schema, paired with their current keys.
module.exports = [
  ['Banner', 'imageData', 'imageStorageKey', 'imageMimeType'],
  ['Sport', 'logoData', 'logoStorageKey', 'logoMimeType'],
  ['Sport', 'backgroundData', 'backgroundStorageKey', 'backgroundMimeType'],
  ['Event', 'bannerData', 'bannerStorageKey', 'bannerMimeType'],
  ['Event', 'logoData', 'logoStorageKey', 'logoMimeType'],
  ['Event', 'ticketBackgroundData', 'ticketBackgroundStorageKey', 'ticketBackgroundMimeType'],
  ['AthleteMedia', 'data', 'storageKey', 'mimeType'],
  ['ParticipantMediaUpload', 'data', 'storageKey', 'mimeType'],
  ['BackupUploadChunk', 'data', 'storageKey', null],
];
