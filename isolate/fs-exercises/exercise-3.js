// require dependencies
const fs = require('fs');
const assert = require('assert');

// declare constants
const START = Date.now();
const FILE_PATH = __dirname + '/file.txt';

// declare logging function
const log = (logId, value) => console.log(
  `\nlog ${logId}, ${Date.now() - START} ms: ${typeof value}\n`,
  value,
);


// --- main script ---

const newFileContents = '*[]*';
log(1, newFileContents);

const writeFileCallback = (err) => {
  if (err) {
    console.error(err);
  } else {
    const readFileCallback = (err, fileContent) => {
      if (err) {
        console.error(err);
      } else {
        assert.strictEqual(fileContent, newFileContents);
        log(4, 'pass!');
      };
    };

    fs._(_, _, _);
    log(3, 'reading file ...');
  };
};

fs._(_, _, _);
log(2, 'writing file ...');



