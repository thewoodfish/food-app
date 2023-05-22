// imports
import { createRequire } from "module";
import path from 'path';
import { fileURLToPath } from 'url';
import { api, initSamDB } from 'samaritan-js-sdk';

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

app.get(["/", "/index"], (_, res) => {
    selectAndRenderCravings(res);
});

app.get('/login', (_, res) => {
    res.render('login', { text: 'Eragon and the dragon' });
});

app.post('/signup', (req, res) => {
    signUpUser(req.body, res);
});

app.post('/signin', (req, res) => {
    signInUser(req.body, res);
});

app.post('/add-snack', (req, res) => {
    addSnackToMenu(req.body, res);
});

app.get('/kitchen', async (_, res) => {
    res.render('kitchen');
});

app.get('/contact', async (req, res) => {
    const did = req.query.did;
    await api.db.get(config, { app_did: config.did, sam_did: did, keys: ["name", "telephone", "email", "address", "country"] }, async function (data) {
        const new_data = data.output[0] ? JSON.parse(data.output[0]) : [];
        console.log(new_data);
        res.render('contact', { data: new_data });
    }, function (_) {
        res.render('contact', { data: [] });
    });
});

// select all the cravings available from users and list them
async function selectAndRenderCravings(res) {
    // first select the dids of all the users on the app
    await api.db.get(config, { app_did: config.did, sam_did: "", keys: ["auth"] }, async function (data) {
        const new_data = data.output[0] ? JSON.parse(data.output[0]) : {};
        // get the keys
        const dids = Object.keys(new_data);
        if (dids.length) {
            const promises = [];
            for (var i = 0; i < dids.length; i++) {
                const promise = new Promise((resolve, _) => {
                    api.db.get(
                        config,
                        { app_did: config.did, sam_did: dids[i], keys: ["menu"] },
                        (function (index) { // Create a closure with the current value of i
                            return function (data) {
                                const menu_data = data.output[0] ? JSON.parse(data.output[0]) : [];
                                const updated_menu_data = menu_data.map((item) => {
                                    return [...item, dids[index]]; // Append the correct dids[index] value
                                });
                                resolve(updated_menu_data);
                            };
                        })(i), // Pass the current value of i to the IIFE
                        function (_) {
                            resolve([]);
                        }
                    );
                });
                promises.push(promise);
            }

            // Wait for all promises to resolve
            Promise.all(promises)
                .then((cravings) => {
                    // cravings will be an array containing the results of all async operations
                    res.render('index', { data: cravings });
                })
                .catch((error) => {
                    console.error(error);
                    res.render('index', { data: [] });
                });

        } else
            res.render('index', { data: [] });
    }, function (_) {
        res.render('index', { data: [] });
    });
}

// add snack to menu
// people can list orders they can make/deliver on the app
async function addSnackToMenu(req, res) {
    // select session user
    await api.db.get(config, { app_did: config.did, sam_did: "", keys: ["session_user"] }, async function (data) {
        let session_did = data.output[0];
        if (session_did) {
            // first try to get the existing menu uploaded by user
            await api.db.get(config, { app_did: config.did, sam_did: session_did, keys: ["menu"] }, async function (data) {
                // its an array we're storing here
                const new_data = data.output[0] ? JSON.parse(data.output[0]) : [];
                let entry = [
                    ...new_data,
                    [req.name, req.info, req.price]
                ];

                // save the modified data
                await api.db.insert(config, { app_did: config.did, sam_did: session_did, keys: ["menu"], values: [JSON.stringify(entry)] }, async function (response) {
                    res.status(200).send({ error: false, data: `Congratulations. You snack has been added to 'Crave Ordering'!` });
                }, function (_) {
                    res.status(403).send({ error: true, data: "Could not add snack to menu list" });
                });
            }, function (_) {
                res.status(500).send({ error: true, data: "Could not add snack to menu list" });
            });
        } else
            res.status(500).send({ error: true, data: "Could not add snack to menu list" });
    });
}

// signup user
async function signUpUser(req, res) {
    // first check that the DID exists on the network (without password importance)
    await api.did.auth(config, { sam_did: req.did, password: "null" }, async function (_) {
        await api.db.get(config, { app_did: config.did, sam_did: "", keys: ["auth"] }, async function (data) {
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
                await api.db.insert(config, { app_did: config.did, sam_did: "", keys: ["auth"], values: [JSON.stringify(new_data)] }, async function (response) {
                    await setSessionUser(req.did);
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
            if (userData[req.did].password == req.password) {
                // set session user
                await setSessionUser(req.did);
                res.status(200).send({ error: false, data: "Sign in successful!" });
            } else
                res.status(404).send({ error: true, data: "No user matched details provided" });
        }, function (_) {
            res.status(404).send({ error: true, data: "Could not sign you in" });
        });
    }, function (response) {
        res.status(404).send({ error: true, data: response.msg, auth: true });
    });
}

// set session user
async function setSessionUser(did) {
    await api.db.insert(config, { app_did: config.did, sam_did: "", keys: ["session_user"], values: [did] });
}

// listen on port 3000
app.listen(port, () => console.info(`listening on port ${port}`));