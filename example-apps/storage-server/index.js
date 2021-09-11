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
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const user = { username, hashedPassword: hashPassword(password) };

  // check if user already exists
  if (credentials.find((cred) => cred.split(':')[0] === username)) {
    return res.status(400).send('User already exists');
  }

  // add user to credentials
  credentials.push(`${username}:${password}`);

  // write credentials to file
  fs.writeFileSync(userDB, credentials.join('\n'));

  // send success response
  res.status(201).send('User created'); // 201 = created
});

// login
app.post('/login', (req, res) => {
  const sentUserName = req.body.username;
  const sentPassword = req.body.password;

  // check if user exists
  if (!credentials.includes(`${sentUserName}:${sentPassword}`)) {
    return res.status(401).send('User not found');
  }

  // generate access token
  const accessToken = crypto.randomBytes(64).toString('hex');

  // add access token to access token file
  const storedAccessTokens = JSON.parse(
    fs.readFileSync(accessTokenPath, 'utf-8'),
  );

  storedAccessTokens[accessToken] = {
    sentUserName,
    createdAt: new Date(),
    expiresIn: new Date(Date.now() + 1000 * 60 * 60 * 24),
  };

  fs.writeFileSync(accessTokenPath, JSON.stringify(storedAccessTokens));

  console.log(storedAccessTokens);

  // send success token
  res.status(200).send({ secretToken: accessToken });
});

// middleware to check if user is logged in based on token
app.use((req, res, next) => {
  let token = req.headers.authorization;

  if (!token) {
    return res.status(401).send('Unauthorized');
  }

  token = token.replace('Bearer ', '');

  const storedAccessTokens = JSON.parse(
    fs.readFileSync(accessTokenPath, 'utf-8'),
  );

  if (!storedAccessTokens[token]) {
    return res.status(401).send('Unauthorized');
  }

  if (storedAccessTokens[token].expiresIn < new Date()) {
    delete storedAccessTokens[token];
    fs.writeFileSync(accessTokenPath, JSON.stringify(storedAccessTokens));
    return res.status(401).send('Unauthorized');
  }

  // req.username = storedAccessTokens[token].sentUserName;

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
