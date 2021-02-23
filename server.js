const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const jwt = require("express-jwt");
const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require("jwks-rsa");
const cors = require("cors");
const bodyParser = require("body-parser");
var request = require("request");
const { join } = require("path");
const authConfig = require("./auth_config.json");
const app = express();

if (!authConfig.domain || !authConfig.audience) {
  throw "Please make sure that auth_config.json is in place and populated";
}
// Serve static assets from the /public folder
app.use(express.static(join(__dirname, "public")));

console.log("Server Initialized");

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${authConfig.domain}/.well-known/jwks.json`
  }),
  audience: authConfig.audience,
  issuer: `https://${authConfig.domain}/`,
  algorithms: ["RS256"]
});

const checkScopes = jwtAuthz(['read:messages']);

app.get("/api/private", checkJwt, checkScopes, (req, res) => {
  res.send({
    msg: "Your access token was successfully validated!"
  });
});

app.get("/api/pizza", checkJwt, (req, res) => {
  var getOptions = {
    method: "GET",
    url: `https://${authConfig.domain}/api/v2/users/` + req.user.sub,
    headers: { authorization: `Bearer ${authConfig.staticAt}` }
  }

  request(getOptions, function (error, response, body) {
    var jsonData = JSON.parse(body);

    if (JSON.parse(jsonData.email_verified)) {
      var orderMetadata = JSON.stringify(jsonData.user_metadata);

      if (typeof orderMetadata === "undefined") {
        orderMetadata = + '{ Pizza(' + Date.now() + ') }';
      } else {
        orderMetadata = orderMetadata.slice(0,orderMetadata.length - 3) + 'Pizza(' + Date.now() + ') }';
      }

      var patchOptions = {
      method: "PATCH",
      url: `https://${authConfig.domain}/api/v2/users/` + req.user.sub,
      headers: {
        authorization: `Bearer ${authConfig.staticAt}`,
        "content-type": "application/json"
      },
      body: { user_metadata: { orders : orderMetadata } },
      json: true
      };

      request(patchOptions, function (error, response, body) {;
        console.log(body);
      });

      res.send({
      msg: "Your Pizza was successfully Ordered!"
      });
    } else {
      res.send({
      msg: "You should verify your email first!"
      });
    }
  })
});

// Endpoint to serve the configuration file
app.get("/auth_config.json", (req, res) => {
  res.sendFile(join(__dirname, "auth_config.json"));
});

app.get("/app.js", (req, res) => {
  res.writeHead(200, {'Content-Type':'text/javascript; charset=utf-8'});
  res.sendFile(join(__dirname, "public/js/app.js"));
  res.end();
});

// Serve the index page for all other requests
app.get("/*", (_, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

app.use(function(err, req, res, next) {
  if (err.name === "UnauthorizedError") {
    return res.status(401).send({ msg: "Invalid token" });
  }

  next(err, req, res);
});

// Listen on port 3000
app.listen(3000, () => console.log("Application running on port 3000"));

process.on("SIGINT", function() {
  process.exit();
});

module.exports = app;
