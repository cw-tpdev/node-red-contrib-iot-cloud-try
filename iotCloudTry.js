module.exports = function (RED) {

    var request = require("request");

    function IctConfig(n) {
        RED.nodes.createNode(this, n);
    }
    RED.nodes.registerType("ict-config", IctConfig, {
        credentials: {
            apiKey: { type: "password" },
            hostKey: { type: "password" },
        }
    });

    function IotCloudTry(config) {
        RED.nodes.createNode(this, config);

        var node = this;
        node.status({});

        var ictConf = RED.nodes.getNode(config.ictConf);
        var credentials = ictConf ? ictConf.credentials : {};
        if (!credentials.apiKey) {
            node.error("Please check the setting. [api key]");
            return;
        }
        if (!credentials.hostKey) {
            node.error("Please check the setting. [host key]");
            return;
        }

        node.on('input', function (msg) {

            var url = 'https://api.iot-cloud-try.com:10443/v1/';

            var headers = {
                'Content-Type': 'application/json',
                'X-Api-Key': credentials.apiKey.trim()
            };

            var sendData = {
                host: credentials.hostKey.trim(),
                key: config.itemKey.trim(),
                value: String(msg.payload)
            };

            var options = {
                url: url,
                method: 'POST',
                headers: headers,
                json: true,
                body: sendData
            };

            process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

            node.status({ fill: "blue", shape: "dot", text: "common.sending" });
            request(options, function (error, response, body) {
                if (error) {
                    node.status({ fill: "red", shape: "dot", text: "common.sendErr" });
                    node.error(error);
                } else

                    if ((response.statusCode == 200) && (body.response.info.indexOf('processed: 0;') <= -1)) {
                        node.status({ fill: "green", shape: "dot", text: "common.sentData" });
                    } else {
                        sleep(3, function () {
                            node.status({ fill: "red", shape: "dot", text: "common.sendErr" });
                            
                            var errMsg = "";
                            if (response.statusCode == 429) {
                                //node.error("Too Many Requests.");
                            } else {
                                if (response.body.error) {
                                    errMsg = " [" + response.body.error + "]";
                                }
                                node.error("Please check the setting." + errMsg);
                            }
                        });
                    }
            });

        });

        node.on('close', function (done) {
            done();
        });
    }
    RED.nodes.registerType("IoT-Cloud-Try", IotCloudTry);

    function sleep(waitSec, callbackFunc) {
        var spanedSec = 0;
        var id = setInterval(function () {
            spanedSec++;
            if (spanedSec >= waitSec) {
                clearInterval(id);
                if (callbackFunc) callbackFunc();
            }
        }, 1000);
    }
}