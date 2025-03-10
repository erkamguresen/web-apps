'use strict';

// require dependencies
const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const crypto = require('crypto');
const fs = require('fs'); //filesystem
const util = require('util');
// const auth = require('basic-auth')
const cors = require('cors');

// create
const app = express();

const asyncReadFile = util.promisify(fs.readFile);
const asyncAppendFile = util.promisify(fs.appendFile);
const asyncWriteFile = util.promisify(fs.writeFile);

const PORT = 3000;
const accessTokenPath = `${__dirname}/data/access-tokens.json`;

// ['name:password', 'name:password']
const credentials = fs
  .readFileSync(`${__dirname}/data/credentials.txt`, 'utf8')
  .split('\n');

let user;

//register new users
const users = [];

const auth = require('basic-auth');

const { readData, writeData, deleteData } = require('./data-access');

// use parsing and logging middleware
app.use(bodyParser.json());
app.use(morgan('dev'));

// //to use middleware for auth
// app.use((req, res, next) => {
//   console.log(`1:${req.method},  ${req.url}`);
//   console.log(`2:${req.params.ownerName}`);
//   console.log(req);

//   next();
// });

app.post('/register', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    return res.status(400).send('Missing username or password');
  }

  const hashedPassword = hashPassword(password);

  users.push({ username, hashedPassword });
});

// read username and password from request body
app.post('/login', async function (req, res, next) {
  // { username: <...>, password: <...> }
  const sentUsername = req.body.username;
  const sentPassword = req.body.password;

  //input validation
  if (!sentUsername || !sentPassword) {
    return res.status(401).send('Missing username or password');
  }

  // check credentials
  const credential = credentials.find((credential) => {
    const [storedUsername, storedHashPassword] = credential.split(':');

    const result =
      sentUsername === storedUsername &&
      hashPassword(sentPassword) === storedHashPassword;

    return result;
  });

  if (!credential) {
    return res.status(401).send('Invalid username or password');
  }

  const storedAccessTokens = JSON.parse(
    await asyncReadFile(accessTokenPath, 'utf8'),
  );

  if (!storedAccessTokens[sentUsername]) {
    storedAccessTokens[sentUsername] = {};
  }

  const randomString = crypto.randomBytes(64).toString('hex');

  storedAccessTokens[sentUsername][randomString] = {
    createdAt: new Date(),
  };

  asyncWriteFile(accessTokenPath, JSON.stringify(storedAccessTokens, null, 2));

  res.json({
    accessToken: randomString,
  });
});

// //to use middleware for auth with basic-auth
// app.use((req, res, next) => {
//   user = auth(req);

//   // Check credentials
//   // The "check" function will typically be against your user store
//   if (
//     !user ||
//     !credentials.some(
//       (credential) =>
//         credential.username === user.name && credential.password === user.pass,
//     )
//   ) {
//     // basic auth
//     res.statusCode = 401;
//     res.setHeader('WWW-Authenticate', 'Basic realm="example"');
//     res.end('Access denied');
//   } else {
//     // res.end('Access granted');
//     next();
//   }
// });

app.use(async function tokenChecker(req, res, next) {
  const headerValue = req.header('authorization');
  const token = headerValue.split(' ')[1];

  const storedAccessTokens = JSON.parse(
    await asyncReadFile(accessTokenPath, 'utf8'),
  );

  const userNames = Object.keys(storedAccessTokens);

  const userName = userNames.find((user) => {
    return storedAccessTokens[user][token];
  });

  if (!userName) {
    return res.status(401).send('Invalid token');
  }

  user = { name: userName };

  next();
});

//to use middleware for authentication
app.use('/data/:ownerName', (req, res, next) => {
  if (user.name !== req.params.ownerName) {
    res.status(403).json({
      message: "You don't have permission to view this data.",
    });
    return;
  }

  next();
});

// define routes
app.get('/data/:ownerName', async (req, res) => {
  // user = auth(req);

  if (user.name !== req.params.ownerName) {
    res.status(403).json({
      message: "You don't have permission to view this data.",
    });
    return;
  }

  const result = await readData(req.params.ownerName);

  if (!result.exists) {
    res.status(404).json({
      message:
        "The data you're looking for does not exist. Please create it first.",
    });
    return;
  }

  res.json({
    name: req.params.ownerName,
    data: result.data,
  });
});

app.post('/data/:ownerName', async (req, res) => {
  if (user.name !== req.params.ownerName) {
    res.status(403).json({
      message: "You don't have permission to view this data.",
    });
    return;
  }

  const dataToWrite = req.body;

  await writeData(req.params.ownerName, dataToWrite);

  res.json({
    message: 'Data written successfully.',
  });
});

app.delete('/data/:ownerName', async (req, res) => {
  if (user.name !== req.params.ownerName) {
    res.status(403).json({
      message: "You don't have permission to view this data.",
    });
    return;
  }

  await deleteData(req.params.ownerName);

  res.json({
    message: 'Data deleted successfully',
  });
});

// 404 middleware
app.use(function (req, res) {
  res.status(404).json({
    message: "the route you're looking for does not exist",
  });
});

// start the server
app.listen(3000, (err) => {
  if (err) {
    console.error(err, 'failed to start server');
    return;
  }

  console.info('server started on port 3000: http://localhost:3000/');
});

function hashPassword(input) {
  return crypto.createHash('SHA3-256').update(input).digest('hex');
  // return crypto.createHash('sha1').update(input).digest('hex');
}
