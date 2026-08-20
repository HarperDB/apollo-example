/**
 * Verifies the GraphQL API provided by @harperdb/apollo.
 * Tests query the Dog and Breed tables through the /graphql endpoint.
 * Mutations that require an external breed API (api-ninjas.com) are not tested here.
 */
import { suite, test, before, after } from 'node:test';
import { strictEqual, ok } from 'node:assert/strict';
import { setupHarperWithFixture, teardownHarper, type ContextWithHarper } from '@harperfast/integration-testing';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = resolve(__dirname, '..');

// harper's `exports` map only exposes ".", so the harness's default
// require.resolve('harper/dist/bin/harper.js') throws ERR_PACKAGE_PATH_NOT_EXPORTED.
// Resolve the CLI from the exported main entry and pass it explicitly.
const require = createRequire(import.meta.url);
const harperBinPath = resolve(dirname(require.resolve('harper')), 'bin/harper.js');
// The path above encodes harper's current internal layout (main entry at dist/index.js, CLI
// alongside it at dist/bin/harper.js). If harper ever moves either one, fail here with a
// message that says so, rather than letting the harness die at startup on a missing binary.
if (!existsSync(harperBinPath)) {
  throw new Error(
    `harper CLI not found at ${harperBinPath}. This path is derived from ` +
      `require.resolve('harper') + 'bin/harper.js'; harper's package layout has probably changed.`,
  );
}

function basicAuth(username: string, password: string): string {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
}

async function gql(
  httpURL: string,
  auth: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<{ status: number; data: Record<string, unknown>; errors?: unknown[] }> {
  const res = await fetch(`${httpURL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({ query, variables }),
  });
  // Surface the HTTP status alongside the payload so tests that only care about the
  // transport can use this helper too, instead of hand-rolling the fetch.
  const body = await res.json() as { data: Record<string, unknown>; errors?: unknown[] };
  return { status: res.status, ...body };
}

suite('GraphQL API', (ctx: ContextWithHarper) => {
  before(async () => {
    await setupHarperWithFixture(ctx, fixtureDir, { harperBinPath });
  });

  after(async () => {
    await teardownHarper(ctx);
  });

  test('dogs query returns an array', async () => {
    const { admin, httpURL } = ctx.harper;
    const auth = basicAuth(admin.username, admin.password);

    const result = await gql(httpURL, auth, '{ dogs { id name breedName } }');

    ok(!result.errors, `expected no errors, got: ${JSON.stringify(result.errors)}`);
    ok(Array.isArray(result.data.dogs), 'dogs query should return an array');
  });

  test('breeds query returns an array', async () => {
    const { admin, httpURL } = ctx.harper;
    const auth = basicAuth(admin.username, admin.password);

    const result = await gql(httpURL, auth, '{ breeds { name } }');

    ok(!result.errors, `expected no errors, got: ${JSON.stringify(result.errors)}`);
    ok(Array.isArray(result.data.breeds), 'breeds query should return an array');
  });

  test('dog query for non-existent id returns null', async () => {
    const { admin, httpURL } = ctx.harper;
    const auth = basicAuth(admin.username, admin.password);

    const result = await gql(httpURL, auth, '{ dog(id: 999999) { id name } }');

    ok(!result.errors, `expected no errors, got: ${JSON.stringify(result.errors)}`);
    strictEqual(result.data.dog, null, 'non-existent dog should return null');
  });

  test('dogsByBreedName query responds (auth delegation required)', async () => {
    const { admin, httpURL } = ctx.harper;
    const auth = basicAuth(admin.username, admin.password);

    // This resolver uses context.authorize = true which delegates auth to Harper.
    // The query runs and returns a result or an auth error — either is valid here, so this
    // asserts only the transport.
    const result = await gql(httpURL, auth, '{ dogsByBreedName(breedName: "labrador") { id name breedName } }');

    strictEqual(result.status, 200, 'GraphQL endpoint should return HTTP 200');
  });

  test('GraphQL endpoint returns 200 for an introspection query', async () => {
    const { admin, httpURL } = ctx.harper;
    const auth = basicAuth(admin.username, admin.password);

    const result = await gql(httpURL, auth, '{ __schema { queryType { name } } }');

    strictEqual(result.status, 200);
    ok(!result.errors, `introspection errored: ${JSON.stringify(result.errors)}`);
    const schema = result.data.__schema as { queryType: { name: string } };
    strictEqual(schema.queryType.name, 'Query');
  });

  // Exercises a real Harper DB write -> read -> read-back-through-GraphQL -> delete cycle
  // against the Dog table (a plain @export-ed table). Uses the REST interface to write so
  // the test does not depend on the external Breed source API (api-ninjas.com), which is
  // unreachable in CI (placeholder API key); see the note in resolvers.js / README.
  test('Dog REST write is readable via GraphQL and deletable', async () => {
    const { admin, httpURL } = ctx.harper;
    const auth = basicAuth(admin.username, admin.password);

    const put = await fetch(`${httpURL}/Dog/4242`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ id: 4242, name: 'Rex', breedName: 'labrador' }),
    });
    ok(put.status >= 200 && put.status < 300, `Dog PUT failed: ${put.status}`);

    // Read it back through the GraphQL resolver (exercises Dog.get against Harper).
    const got = await gql(httpURL, auth, '{ dog(id: 4242) { id name breedName } }');
    ok(!got.errors, `dog query errored: ${JSON.stringify(got.errors)}`);
    const gotDog = got.data.dog as { id: number; name: string; breedName: string } | null;
    ok(gotDog, 'expected the dog we just wrote to be readable');
    strictEqual(gotDog!.name, 'Rex');
    strictEqual(gotDog!.breedName, 'labrador');

    // Delete through the GraphQL mutation (exercises Dog.delete against Harper) and
    // confirm the record is gone. The deleteDog resolver returns Dog.delete()'s result
    // (no record body), so we assert the effect via a follow-up query rather than the
    // mutation's selection set.
    const del = await gql(httpURL, auth, 'mutation { deleteDog(id: 4242) { id } }');
    ok(!del.errors, `deleteDog mutation errored: ${JSON.stringify(del.errors)}`);

    const gone = await gql(httpURL, auth, '{ dog(id: 4242) { id } }');
    strictEqual(gone.data.dog, null, 'dog should be gone after deleteDog');
  });

  // Verifies Harper's conditional-request handling (ETag + 304 Not Modified) on a stored
  // record. This is the same caching contract the Breed cache relies on; we assert it on
  // the Dog table because the Breed source requires an unreachable external API in CI.
  test('stored record serves an ETag and honors a 304 conditional GET', async () => {
    const { admin, httpURL } = ctx.harper;
    const auth = basicAuth(admin.username, admin.password);

    await fetch(`${httpURL}/Dog/5151`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ id: 5151, name: 'Fido', breedName: 'poodle' }),
    });

    const first = await fetch(`${httpURL}/Dog/5151`, {
      headers: { Authorization: auth, Accept: 'application/json' },
    });
    strictEqual(first.status, 200, 'first GET should be 200');
    const etag = first.headers.get('etag');
    ok(etag, 'stored record should carry an ETag');
    await first.text();

    const conditional = await fetch(`${httpURL}/Dog/5151`, {
      headers: { Authorization: auth, Accept: 'application/json', 'If-None-Match': etag! },
    });
    strictEqual(conditional.status, 304, 'conditional GET with matching ETag should be 304 Not Modified');
  });
});
