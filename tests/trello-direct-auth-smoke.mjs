import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const auth = read("src/app/api/connectors/trello/auth/route.ts");
const callback = read("src/app/api/connectors/trello/callback/route.ts");
const trello = read("src/lib/connectors/trello.ts");
const truth = read("src/lib/connectors/truth.ts");

assert.match(auth, /requestTrelloRequestToken/);
assert.match(auth, /createTrelloHandoff/);
assert.match(auth, /TRELLO_OAUTH_COOKIE/);
assert.match(auth, /requireWorkspaceAdmin/);
assert.match(callback, /exchangeTrelloAccessToken/);
assert.match(callback, /toStoredTrelloCredential/);
assert.match(callback, /os_connector_credentials/);
assert.match(callback, /clearLegacyNangoConnection/);
assert.match(trello, /expiration=never/);
assert.match(truth, /connectorKey === TRELLO_CONNECTOR_KEY/);
assert.match(truth, /source: trelloRow \? "native"/);
console.log("Trello direct auth smoke contracts passed.");
