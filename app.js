// imports
import { createRequire } from "module";
import path from 'path';
import { fileURLToPath } from 'url';
import {api, initSamDB } from 'samaritan-js-sdk';

// imports
const require = createRequire(import.meta.url);
const bodyParser = require('body-parser');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const express = require('express');
const app = express();
const port = 4000;

// connect to the database
const wsEndpoint = 'ws://127.0.0.1:8888';
initSamDB(wsEndpoint);

// app config
const config = {
    did: "did:sam:apps:DSMMwo95mJF6WihXLNLKneFeJ8b76ui4FWtZbmj4zRpjW",
    keys: "figure motor public moon grain stone fluid snack stand grant sound glow"
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// static files
app.use(express.static('public'));
app.use('/css', express.static(__dirname + 'public/css'));
app.use('/js', express.static(__dirname + 'public/js'));
app.use('/img', express.static(__dirname + 'public/img'));

// set views
app.set('views', './views');
app.set('view engine', 'ejs');

app.get(["/", "/index"], (req, res) => {
    res.render('index', { text: 'This is sparta' });
});

app.get('/login', (req, res) => {
    res.render('login', { text: 'Eragon and the dragon' });
});

app.post('/signup', (req, res) => {
    signUpUser(req.body, res);
});

app.post('/signin', (req, res) => {
    signInUser(req.body, res);
});

// signup user
async function signUpUser(req, res) {
    // first check that the DID exists on the network (without password importance)
    await api.did.auth(config, { sam_did: req.did, password: "null" }, async function (_) {
        await api.db.get(config, { app_did: config.did, sam_did: "", keys: ["auth"] }, async function (data) {
            console.log(data);
            const new_data = data.output[0] ? JSON.parse(data.output[0]) : {};
            const entry = {
                password: req.password
            };

            // make sure the did has not been registered
            if (new_data[req.did]) {
                res.status(403).send({ error: true, data: "DID exists already" });
            } else {
                new_data[req.did] = entry;
                // save the modified data
                await api.db.insert(config, { app_did: config.did, sam_did: "", keys: ["auth"], values: [JSON.stringify(new_data)] }, function (response) {
                    res.status(200).send({ error: false, data: "Sign up successful" });
                }, function (_) {
                    res.status(403).send({ error: true, data: "Could not sign you up" });
                });
            }
        }, function (_) {
            res.status(404).send({ error: true, data: "Could not sign you up" });
        });
    }, function (response) {
        res.status(404).send({ error: true, data: response.msg, auth: true });
    });
}

async function signInUser(req, res) {
    // first check that the DID exists on the network (without password importance)
    await api.did.auth(config, { sam_did: req.did, password: "null" }, async function (_) {
        await api.db.get(config, { app_did: config.did, sam_did: "", keys: ["auth"] }, async function (data) {
            // check for the password
            let userData = data.output[0] ? JSON.parse(data.output[0]) : {};
            if (userData[req.did].password == req.password)
                res.status(200).send({ error: false, data: "Sign in successful!" });
            else
                res.status(404).send({ error: true, data: "No user matched details provided" });
        }, function (_) {
            res.status(404).send({ error: true, data: "Could not sign you in" });
        });
    }, function (response) {
        res.status(404).send({ error: true, data: response.msg, auth: true });
    });
}

// listen on port 3000
app.listen(port, () => console.info(`listening on port ${port}`));