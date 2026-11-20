const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const studentAssetDir = path.join(
  projectRoot,
  'course_materials',
  'introductory-clinical-pharmacology-pn106'
);
const facultyAssetDir = path.join(
  projectRoot,
  'faculty_course_materials',
  'introductory-clinical-pharmacology-pn106'
);

function chapterFileNames(prefix, extension) {
  return Array.from(
    { length: 54 },
    (_, index) => `${prefix}${String(index + 1).padStart(2, '0')}.${extension}`
  );
}

function matchingAssetNames(directory, prefix, extension) {
  return fs.readdirSync(directory)
    .filter((name) => name.startsWith(prefix) && name.endsWith(`.${extension}`))
    .sort();
}

function assertAssetSet({ directory, prefix, extension, signature }) {
  assert.ok(fs.statSync(directory).isDirectory(), `${directory} must be a directory`);

  const expectedNames = chapterFileNames(prefix, extension);
  const actualNames = matchingAssetNames(directory, prefix, extension);
  assert.equal(actualNames.length, 54, `expected 54 ${extension.toUpperCase()} chapter assets`);
  assert.equal(new Set(actualNames).size, 54, 'chapter asset names must be unique');
  assert.deepEqual(actualNames, expectedNames, 'chapter assets must cover Chapters 01 through 54 exactly once');

  for (const name of actualNames) {
    const filePath = path.join(directory, name);
    const stats = fs.statSync(filePath);
    assert.ok(stats.isFile(), `${name} must be a file`);
    assert.ok(stats.size > signature.length, `${name} must not be empty`);
    const descriptor = fs.openSync(filePath, 'r');
    try {
      const header = Buffer.alloc(signature.length);
      const bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
      assert.equal(bytesRead, signature.length, `${name} must include a complete file signature`);
      assert.deepEqual(header, signature, `${name} has an invalid ${extension.toUpperCase()} signature`);
    } finally {
      fs.closeSync(descriptor);
    }
  }
}

test('PN106 includes all 54 licensed Lippincott student case-study PDFs', () => {
  assertAssetSet({
    directory: studentAssetDir,
    prefix: 'PN106-Lippincott-Case-Study-Chapter-',
    extension: 'pdf',
    signature: Buffer.from('%PDF-')
  });
});

test('PN106 keeps all 54 licensed Lippincott answer DOCX files in the faculty-only asset store', () => {
  assertAssetSet({
    directory: facultyAssetDir,
    prefix: 'PN106-Lippincott-Answer-Chapter-',
    extension: 'docx',
    signature: Buffer.from([0x50, 0x4b, 0x03, 0x04])
  });
});
