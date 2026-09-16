import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const auth = read("src/app/api/connectors/trello/auth/route.ts");
const callback = read("src/app/api/connectors/trello/callback/route.ts");
const trello = read("src/lib/connectors/trello.ts");
const truth = read("src/lib/connectors/truth.ts");

assert.match(auth, /createTrelloOAuthHandoff/);
assert.match(auth, /createTrelloPkceVerifier/);
assert.match(auth, /createProviderOAuthState\("trello"/);
assert.match(auth, /TRELLO_OAUTH_COOKIE/);
assert.match(auth, /requireWorkspaceAdmin/);
assert.match(callback, /exchangeTrelloAuthorizationCode/);
assert.match(callback, /parseProviderOAuthState\("trello"/);
assert.match(callback, /toStoredTrelloCredential/);
assert.match(callback, /os_connector_credentials/);
assert.match(callback, /clearLegacyNangoConnection/);
assert.match(trello, /auth\.atlassian\.com\/authorize/);
assert.match(trello, /code_challenge_method: "S256"/);
assert.match(trello, /offline_access/);
assert.doesNotMatch(trello, /TRELLO_API_KEY|TRELLO_API_SECRET|expiration=never/);
assert.match(truth, /connectorKey === TRELLO_CONNECTOR_KEY/);
assert.match(truth, /source: trelloRow \? "native"/);
console.log("Trello direct auth smoke contracts passed.");
