'use strict';

// require dependencies
const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const fs = require('fs');

const { readData, writeData, deleteData } = require('./data-access');

// create
const app = express();

const userDB = `${__dirname}/data/credentials.txt`;

// in the format of ['name:password', 'name:password']
const credentials = fs.readFileSync(userDB, 'utf-8').split('\n');

// use parsing and logging middleware
app.use(bodyParser.json());
app.use(morgan('dev'));

// register new users
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const user = { username, password };

  // check if user already exists
  if (credentials.includes(`${username}:${password}`)) {
    res.status(400).send('User already exists');
  }

  // add user to credentials
  credentials.push(`${username}:${password}`);
});
// login

// middleware to check if user is logged in based on token

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

  console.info('server started on port 3000');
});
