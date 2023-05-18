
function ce(tag) {
    return document.createElement(tag);
}

function qs(val) {
    return document.querySelector(val);
}

function qsa(val) {
    return document.querySelectorAll(val);
}

function signal(message) {
    // create the alert element
    var alert = document.createElement("div");
    alert.classList.add("signal");
    alert.textContent = message;

    // add the alert element to the document
    document.body.appendChild(alert);
    alert.scrollIntoView(false);

    // set a timeout to remove the alert element after 5 seconds
    setTimeout(function () {
        alert.classList.add("signal-off");
        setTimeout(function () {
            document.body.removeChild(alert);
        }, 500);
    }, 1000);
}


document.body.addEventListener("click", (e) => {
    e = e.target;
    if (e.classList.contains("register-btn")) {
        let did = qs(".did-1");
        let password = qs(".password-1");

        if (did.value && password.value) {
            // send request to server
            fetch("/signup", {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    did: did.value,
                    password: password.value
                })
            })
                .then(async res => {
                    await res.json().then(res => {
                        if (res.error) {
                            signal(res.data);
                        } else {
                            // save the did to session
                            sessionStorage["sess_user"] = did;
                            signal("Welcome to the Crave Ordering");
                            setTimeout(() => {
                                window.location = "/";
                            }, 2000);
                        }
                    });
                })
        } else
            signal("Please fill in all input details");

    } else if (e.classList.contains("login-btn")) {
        let did = qs(".did-2");
        let password = qs(".password-2");

        if (did.value && password.value) {
            // send request to server
            fetch("/signin", {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    did: did.value,
                    password: password.value
                })
            })
                .then(async res => {
                    await res.json().then(res => {
                        if (res.error) {
                            signal(res.data);
                        } else {
                            // save the did to session
                            sessionStorage["sess_user"] = did;
                            signal("Welcome to the Crave Ordering");
                            setTimeout(() => {
                                window.location = "/";
                            }, 2000);
                        }
                    });
                })
        } else
            signal("Please fill in all input details");
    }
}, false);

if (window.location.pathname != "/login") {
    // get the session user
    const session_user = sessionStorage["sess_user"];
    if (session_user) {
        switch  (window.location.pathname) {
            case "/": {
                // first check that a user is logged in
            }
        }
    } else {
        // redirect to login
        signal("You need to authenticate to continue");
        setTimeout(() => window.location = "/login");
    }
}