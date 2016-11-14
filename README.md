# Getting started

1. Install dependencies:

        npm install

2. Start the server:

        npm start

# Stress testing

Stress testing is done with [Artillery](https://artillery.io/).

You can stress test websocket connection with:

    npm run stress-ws -- -d 10 -r 50

And to test http long-polling, you can run this:

    npm run stress-http -- -d 10 -r 50

These commands creates 50 virtual users every second for 10 seconds and each user
sends a message to the server. The default payload is:

    {
        "author": "username",
        "content": "message content",
        "messageType": "msg"
    }

By default this script outputs its results to `artillery_test_results.json`.

Other available options are:

    -d, --duration <seconds>     Set duration (in seconds)
    -r, --rate <number>          Set arrival rate (per second)
    -p, --payload <string>       Set payload (POST request body)
    -t, --content-type <string>  Set content-type
    -o, --output <string>        Set output filename
    -k, --insecure               Turn off TLS certificate verification
    -q, --quiet                  Turn on quiet mode

Artillery docs are available here: <https://artillery.io/docs/>.
