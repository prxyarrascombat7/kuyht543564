(async () => {
    const { Worker } = await import("worker_threads");
    const { WebSocketServer } = await import("ws");
    const { pack, unpack } = await import("msgpackr");
    const http = await import("http");
    const fs = await import("fs");
    const path = await import("path");

    const fallbackProxies = ["http://IPv4D_UFpA5jVjoS-ttl-0:fNAjeOCK7MW55cL@datacenter-ww.lightningproxies.net:1338"];
    const useProxyList = false;
    const proxyPoolPath = path.join(process.cwd(), "proxies.txt");

    function toProxyUrl(line) {
        const parts = line.trim().split(":");
        if (parts.length < 2) return null;
        const [host, port, username, password] = parts;
        if (!host || !port) return null;
        if (username && password) {
            return `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
        }
        return `http://${host}:${port}`;
    }

    let proxyPool = [];
    if (useProxyList) {
        try {
            const rawPool = fs.readFileSync(proxyPoolPath, "utf8");
            proxyPool = rawPool
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => line && !line.startsWith("#"))
                .map(toProxyUrl)
                .filter(Boolean);
        } catch (err) {
            console.warn("Failed to load proxies.txt, continuing with fallback proxies only.");
        }
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    const PROXIES = shuffle([...(useProxyList ? proxyPool : []), ...fallbackProxies]);
    const prod = false;

    const server = http.createServer((req, res) => {
        res.writeHead(426, {"Content-Type": "text/plain"});
        res.end("lll elk ez big fat noob");
    });

    function randint(a, b) {
        return Math.floor(Math.random() * (b - a + 1)) + a;
    }

    const wss = new WebSocketServer({ server });

    wss.on("connection", (ws, req) => {
        const addr = req.socket.remoteAddress;
        console.log(addr, "connected");

        let workers = [];
        let challenge;
        let verified = false;

        let tank = "Auto-6";
        let tanks = [];
        let tankIdx = 0;

        let proxyIdx = randint(0, Math.max(0, PROXIES.length - 1));

        function packet(...args) {
            ws.send(pack(args));
        }

        function close() {
            ws.close();
            for (const worker of workers) {
                worker.postMessage({ type: "destroy" });
            }
        }

        function sendToWorker(worker, msg) {
            worker.postMessage(msg);
        }

        ws.on("message", (msg) => {
            try {
                const data = unpack(msg);
                const type = data.shift();

                switch (type) {
                    case "M":
                        if (challenge || data[0] != 72011) {
                            close();
                        }
                        challenge = randint(0b1000000000, 0b1111111111);
                        packet("M", challenge);
                        break;

                    case "C":
                        if (data[0] == (challenge ^ 845)) {
                            verified = true;
                            console.log(addr, "verified");
                        } else {
                            close();
                            console.log(addr, "true noob");
                        }
                        break;

                    case "Z":
                        tank = data[0];
                        if (tank instanceof Array) {
                            tanks = tank;
                            tankIdx = 0;
                            for (const worker of workers) {
                                tank = tanks[tankIdx];
                                sendToWorker(worker, { type: "tankselect", tank });
                                tankIdx++;
                                if (tankIdx >= tanks.length) {
                                    tankIdx = 0;
                                }
                            }
                        } else {
                            tanks = [];
                            for (const worker of workers) {
                                sendToWorker(worker, { type: "tankselect", tank });
                            }
                        }
                        break;

                    case "F":
                        if (verified) {
                            if (!PROXIES.length) {
                                console.error("No proxies configured. Connection request skipped.");
                                break;
                            }
                            if (workers.length >= 200) {
                                console.log("Bot limit reached, not spawning more.");
                                break;
                            }
                            if (proxyIdx >= PROXIES.length) {
                                proxyIdx = 0;
                            }
                            console.log("connecting with proxy", PROXIES[proxyIdx]);

                            const worker = new Worker("./index.js");
                            workers.push(worker);

                            worker.on("exit", (code) => {
                                workers = workers.filter(w => w !== worker);
                                console.log("Worker exited with code:", code, "Active bots:", workers.length);
                            });

                            worker.on("error", (err) => {
                                console.error("Worker error:", err.message);
                                workers = workers.filter(w => w !== worker);
                            });

                            if (tanks.length) {
                                sendToWorker(worker, { type: "tankselect", tank: tanks[tankIdx] });
                                tankIdx++;
                                if (tankIdx >= tanks.length) {
                                    tankIdx = 0;
                                }
                            } else {
                                sendToWorker(worker, { type: "tankselect", tank });
                            }

                            sendToWorker(worker, { type: "start", config: {
                                id: 0,
                                proxy: {
                                    type: "http",
                                    url: PROXIES[proxyIdx]
                                },
                                hash: "#" + data[0],
                                name: "[✧࿊] arrascombat",
                                stats: [2,2,4,9,3,9,9,4,0,0],
                                type: "follow",
                                token: "follow-8fe6ca",
                                autoFire: false,
                                autoRespawn: true,
                                keys: [],
                                keysHold: [],
                                tank: "Auto4",
                                chatSpam: "",
                                squadId: data[0],
                                reconnectAttempts: 0,
                                reconnectDelay: 1000,
                            }});

                            proxyIdx++;
                        }
                        break;

                    case "B":
                        if (verified) {
                            for (const worker of workers) {
                                sendToWorker(worker, { type: "destroy" });
                            }
                            workers = [];
                        }
                        break;

                    case "A":
                        if (verified) {
                            for (const worker of workers) {
                                sendToWorker(worker, {
                                    type: "position",
                                    x: data[0],
                                    y: data[1],
                                    mouseX: data[2],
                                    mouseY: data[3],
                                    mouseDown: data[4],
                                    rMouseDown: data[5],
                                    mouse: data[6],
                                    feeding: data[7],
                                    shift: data[8]
                                });
                            }
                        }
                        break;


                    case "R":
                        if (verified) {
                            const keyToPress = data[0] || "KeyR";
                            console.log(`Pressing key "${keyToPress}" on ${workers.length} bot(s)`);
                            for (const worker of workers) {
                                sendToWorker(worker, { 
                                    type: "press_key", 
                                    key: keyToPress 
                                });
                            }
                        }
                        break;

                    case "T":
                        if (verified) {
                            const chatText = data[0] || "";
                            console.log(`Forwarding chat spam to ${workers.length} bot(s): "${chatText}"`);
                            for (const worker of workers) {
                                sendToWorker(worker, { 
                                    type: "chat_spam", 
                                    text: chatText 
                                });
                            }
                        }
                        break;

                    default:
                        close();
                        break;
                    }
            } catch (e) {
                console.error(e);
            }
        });

        ws.on("close", () => {
            for (const worker of workers) {
                sendToWorker(worker, { type: "destroy" });
            }
            console.log(addr, "disconnected");
        });
    });

    const port = prod ? process.env.PORT : 8082;
    server.listen(port, () => {
        console.log("Server listening on port", port);
    });
})();