'use strict';

// require dependencies
const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const fs = require('fs');
const crypto = require('crypto');

const { readData, writeData, deleteData } = require('./data-access');

// create
const app = express();

const userDB = `${__dirname}/data/credentials.txt`;

// in the format of ['name:password', 'name:password']
const credentials = fs.readFileSync(userDB, 'utf-8').split('\n');

const accessTokenPath = `${__dirname}/data/access-tokens.json`;

// use parsing and logging middleware
app.use(bodyParser.json());
app.use(morgan('dev'));

// register new users
const users = [];
app.post('/register', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    res.status(400).send('Missing username or password');
    return;
  }

  const hashedPassword = hashPassword(password);

  users.push({ username: username, hash: hashedPassword });

  res.send(`User ${username} was successfully added to the system`);
});

const sessions = [];
// login
app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    res.status(400).send('Missing username or password');
    return;
  }

  // are the username and password valid?
  const user = users.find((u) => u.username === username);
  if (!user) {
    res.status(401).send('Invalid username or password');
    return;
  }

  if (user.hash !== hashPassword(password)) {
    res.status(401).send('Invalid username or password');
    return;
  }

  // create a new session for the user
  // generate a new session id
  const token = crypto.randomBytes(32).toString('hex');
  sessions.push({ token: token, username: username });

  res.json({
    message: `Session created for user ${username}`,
    token: token,
  });
});

// middleware to check if user is logged in based on token
app.use('/data/:ownerName', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).send('You are not logged in!');
    return;
  }

  const tokenParts = authHeader.split(' ');

  if (tokenParts[0].toLowerCase() !== 'bearer' || tokenParts.length !== 2) {
    res.status(401).send('You are not logged in!');
    return;
  }

  const token = authHeader[1];
  const theSession = sessions.find((s) => s.token === token);

  if (!theSession) {
    res.status(401).send('You are not logged in!');
    return;
  }

  const owner = req.params.ownerName;

  if (owner !== theSession.username) {
    res.status(401).send('You can only access your own data!');
    return;
  }

  next();
});

// define routes
app.get('/data/:ownerName', async (req, res) => {
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
  const dataToWrite = req.body;

  await writeData(req.params.ownerName, dataToWrite);

  res.json({
    message: 'Data written successfully.',
  });
});

app.delete('/data/:ownerName', async (req, res) => {
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

  console.info('server started on port 3000\n http://localhost:3000');
});

function hashPassword(input) {
  return crypto.createHash('sha3-256').update(input).digest('hex');
}
