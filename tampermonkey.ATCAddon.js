// ==UserScript==
    // @name         GeoFS ATC Addon
    // @namespace    http://tampermonkey.net/
    // @version      1.0
    // @description  Enhances GeoFS with an ATC chat interface
    // @author       MXHL
    // @match        *://*.geo-fs.com/pages/*
    // @grant        none
    // ==/UserScript==

    (function() {
        'use strict';

        window.ATCADDON = { chat: [], callsigns: [] };

        const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

        function toElement(string) {
            var div = document.createElement('div');
            div.innerHTML = string.trim();
            return div.firstChild;
        }

        async function updateATC() {
            multiplayer.lastRequestTime = Date.now();

            var player_packet = {
                acid: geofs.userRecord.id,
                sid: geofs.userRecord.sessionId,
                id: multiplayer.myId,
                ac: 1,
                co: [33.936952715460784, -118.38498159830658, 45.20037842951751, 141.2313037411972, -15, 0],
                ve: [0, 0, 0, 0, 0, 0],
                st: { gr: true, as: 0 },
                ti: multiplayer.getServerTime(),
                m: multiplayer.chatMessage,
                ci: multiplayer.chatMessageId
            };
            multiplayer.chatMessage && (multiplayer.chatMessage = "");

            multiplayer.lastRequest = await geofs.ajax.post(geofs.multiplayerHost + "/update", player_packet, multiplayer.updateCallback, multiplayer.errorCallback);

            window.ATCADDON.chat = [...ATCADDON.chat, ...multiplayer.lastRequest.chatMessages];

            multiplayer.lastRequest.chatMessages.forEach(e => {
                const box = document.getElementById("atc-box");
                var checkmsg = decodeURIComponent(e.msg).match(/(?<=\[)(?:1[1-3]\d\.\d{1,3})(?=\])/);
                if (e.acid == geofs.userRecord.id) {
                    box.insertAdjacentElement("afterbegin", toElement(`
                        <div class="chat-msg-self" style="color: #00FF7F; background-color: rgba(0, 255, 127, 0.1); padding: 8px; border-radius: 4px; margin: 6px 0; font-family: 'Consolas', monospace; word-wrap: break-word;">
                            <b>${decodeURIComponent(e.cs)}:</b> ${decodeURIComponent(e.msg).replace(/(?:\[1[1-3]\d\.\d{1,3}\])/g, "")}
                        </div>
                    `));
                } else if (checkmsg && checkmsg[0] == window.ATCADDON.frequency) {
                    box.insertAdjacentElement("afterbegin", toElement(`
                        <div class="chat-msg-freq" style="color: #FFA500; background-color: rgba(255, 165, 0, 0.1); padding: 8px; border-radius: 4px; margin: 6px 0; font-family: 'Consolas', monospace; word-wrap: break-word;">
                            <b>${decodeURIComponent(e.cs)}:</b> ${decodeURIComponent(e.msg).replace(/(?:\[1[1-3]\d\.\d{1,3}\])/g, "")}
                        </div>
                    `));
                } else if (e.acid != 898455) {
                    box.insertAdjacentElement("afterbegin", toElement(`
                        <div class="chat-msg-other" style="color: #D3D3D3; background-color: rgba(255, 255, 255, 0.05); padding: 8px; border-radius: 4px; margin: 6px 0; font-family: 'Consolas', monospace; word-wrap: break-word;">
                            <b>${decodeURIComponent(e.cs)}:</b> ${decodeURIComponent(e.msg).replace(/(?:\[1[1-3]\d\.\d{1,3}\])/g, "")}
                        </div>
                    `));
                }
            });
        }

        async function runUpdates() {
            while (true) {
                await updateATC();
                await sleep(1000);
            }
        }

        function initATCADDON() {
            const ATCContainer = document.createElement("div");
            const ATCBox = document.createElement("div");
            const ATCForm = document.createElement("form");
            const ATCInput = document.createElement("input");
            const ATCFreq = document.createElement("input");
            const ATCNotepad = document.createElement("textarea");

            // Container styling: moved lower to avoid overlapping GeoFS UI elements
            ATCContainer.setAttribute("id", "atc-container");
            ATCContainer.setAttribute("style", `
                position: fixed;
                top: 80px;
                left: 20px;
                z-index: 1000;
                width: 360px;
                background-color: #1C2526;
                border: 1px solid #00CED1;
                border-radius: 8px;
                padding: 10px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
                font-family: 'Consolas', 'Helvetica', monospace;
                box-sizing: border-box;
            `);

            ATCBox.setAttribute("id", "atc-box");
            ATCBox.setAttribute("style", `
                width: 100%;
                height: 400px;
                max-height: 400px;
                background-color: #2C3539;
                border: 1px solid #00CED1;
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 10px;
                overflow-y: auto;
                color: #D3D3D3;
                font-size: 14px;
                font-family: 'Consolas', monospace;
                scrollbar-width: thin;
                scrollbar-color: #00CED1 #2C3539;
                box-sizing: border-box;
            `);

            ATCForm.setAttribute("id", "atc-form");

            ATCInput.setAttribute("id", "atc-input");
            ATCInput.setAttribute("style", `
                width: 100%;
                height: 35px;
                background-color: #2C3539;
                border: 1px solid #00CED1;
                border-radius: 4px;
                padding: 8px;
                margin-bottom: 10px;
                color: #00FF7F;
                font-size: 14px;
                font-family: 'Consolas', monospace;
                outline: none;
                transition: border-color 0.3s ease, box-shadow 0.3s ease;
                box-sizing: border-box;
            `);
            ATCInput.setAttribute("placeholder", "TRANSMIT MESSAGE...");
            ATCInput.addEventListener("focus", () => {
                ATCInput.style.borderColor = "#00FF7F";
                ATCInput.style.boxShadow = "0 0 5px rgba(0, 255, 127, 0.5)";
            });
            ATCInput.addEventListener("blur", () => {
                ATCInput.style.borderColor = "#00CED1";
                ATCInput.style.boxShadow = "none";
            });

            ATCFreq.setAttribute("id", "atc-frequency");
            ATCFreq.setAttribute("style", `
                width: 120px;
                height: 35px;
                background-color: #2C3539;
                border: 1px solid #00CED1;
                border-radius: 4px;
                padding: 8px;
                margin-bottom: 10px;
                color: #00FF7F;
                font-size: 14px;
                font-family: 'Consolas', monospace;
                outline: none;
                transition: border-color 0.3s ease, box-shadow 0.3s ease;
                box-sizing: border-box;
            `);
            ATCFreq.setAttribute("placeholder", "FREQ 118-137");
            ATCFreq.setAttribute("type", "number");
            ATCFreq.setAttribute("min", "118");
            ATCFreq.setAttribute("max", "137");
            ATCFreq.setAttribute("step", "0.001");
            ATCFreq.addEventListener("focus", () => {
                ATCFreq.style.borderColor = "#00FF7F";
                ATCFreq.style.boxShadow = "0 0 5px rgba(0, 255, 127, 0.5)";
            });
            ATCFreq.addEventListener("blur", () => {
                ATCFreq.style.borderColor = "#00CED1";
                ATCFreq.style.boxShadow = "none";
            });

            ATCNotepad.setAttribute("id", "atc-notepad");
            ATCNotepad.setAttribute("style", `
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 1000;
                width: 180px;
                height: 120px;
                background-color: #2C3539;
                border: 1px solid #00CED1;
                border-radius: 6px;
                padding: 8px;
                color: #D3D3D3;
                font-size: 13px;
                font-family: 'Consolas', monospace;
                resize: none;
                outline: none;
                transition: border-color 0.3s ease, box-shadow 0.3s ease;
                box-sizing: border-box;
            `);
            ATCNotepad.setAttribute("placeholder", "CALLSIGNS\nA: ARR, D: DEP, G: GND\nE.g., N123AB A");
            ATCNotepad.addEventListener("focus", () => {
                ATCNotepad.style.borderColor = "#00FF7F";
                ATCNotepad.style.boxShadow = "0 0 5px rgba(0, 255, 127, 0.5)";
            });
            ATCNotepad.addEventListener("blur", () => {
                ATCNotepad.style.borderColor = "#00CED1";
                ATCNotepad.style.boxShadow = "none";
            });

            ATCForm.appendChild(ATCInput);
            ATCContainer.appendChild(ATCFreq);
            ATCContainer.appendChild(ATCForm);
            ATCContainer.appendChild(ATCBox);
            document.body.appendChild(ATCContainer);
            document.body.appendChild(ATCNotepad);

            ATCForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const input = document.getElementById("atc-input");
                const frequency = document.getElementById("atc-frequency");
                window.ATCADDON.frequency = frequency.value;
                if (window.ATCADDON.frequency && /(?:1[1-3]\d\.\d{1,3})/.test(window.ATCADDON.frequency)) {
                    multiplayer.setChatMessage(input.value + ` [${window.ATCADDON.frequency}]`);
                } else {
                    multiplayer.setChatMessage(input.value);
                }
                input.value = "";
            });

            runUpdates();
        }

        // Wait for the page to load and ensure geofs object is available
        window.addEventListener('load', () => {
            if (window.geofs && window.multiplayer) {
                initATCADDON();
            } else {
                console.error('GeoFS or multiplayer object not found. Ensure you are on the correct page.');
            }
        });
    })();
