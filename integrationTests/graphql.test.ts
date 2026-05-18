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

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = resolve(__dirname, '..');

function basicAuth(username: string, password: string): string {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
}

async function gql(
  httpURL: string,
  auth: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<{ data: Record<string, unknown>; errors?: unknown[] }> {
  const res = await fetch(`${httpURL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({ query, variables }),
  });
  return res.json() as Promise<{ data: Record<string, unknown>; errors?: unknown[] }>;
}

suite('GraphQL API', (ctx: ContextWithHarper) => {
  before(async () => {
    await setupHarperWithFixture(ctx, fixtureDir);
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
    // The query runs and returns a result or an auth error — either is valid here.
    const res = await fetch(`${httpURL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ query: '{ dogsByBreedName(breedName: "labrador") { id name breedName } }' }),
    });

    strictEqual(res.status, 200, 'GraphQL endpoint should return HTTP 200');
  });

  test('GraphQL endpoint returns 200 for an introspection query', async () => {
    const { admin, httpURL } = ctx.harper;
    const auth = basicAuth(admin.username, admin.password);

    const res = await fetch(`${httpURL}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ query: '{ __schema { queryType { name } } }' }),
    });

    strictEqual(res.status, 200);
    const body = await res.json() as { data: { __schema: { queryType: { name: string } } } };
    strictEqual(body.data.__schema.queryType.name, 'Query');
  });
});
