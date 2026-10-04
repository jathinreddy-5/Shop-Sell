import { Client } from 'pg';
import * as assert from 'assert';

export async function runHarnessSelfCheck(port = 54322) {
  const host = '127.0.0.1';

  // Local-only host guard
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error('SECURITY VIOLATION: Non-local host detected: ' + host);
  }

  const client = new Client({ host, port, user: 'postgres', database: 'postgres' });
  await client.connect();

  try {
    // 1. Print SELECT version()
    const verRes = await client.query('SELECT version();');
    console.log('1. PostgreSQL Version:', verRes.rows[0].version);

    // 2. Assert role authenticated has rolbypassrls = false
    const roleRes = await client.query("SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'authenticated';");
    assert.strictEqual(roleRes.rows.length, 1, 'Role authenticated must exist in pg_roles');
    assert.strictEqual(roleRes.rows[0].rolbypassrls, false, 'Role authenticated must NOT bypass RLS (rolbypassrls must be false)');
    console.log('2. Role authenticated verified: rolbypassrls =', roleRes.rows[0].rolbypassrls);

    // 3. Assert auth.uid() returns the sub under SET LOCAL ROLE authenticated + SET LOCAL "request.jwt.claims"
    const testSub = '12345678-1234-1234-1234-123456789abc';
    await client.query('BEGIN;');
    await client.query('SET LOCAL ROLE authenticated;');
    await client.query(`SET LOCAL "request.jwt.claims" = '${JSON.stringify({ sub: testSub, role: 'authenticated' })}';`);

    const uidRes = await client.query('SELECT auth.uid() as uid, auth.role() as role;');
    assert.strictEqual(uidRes.rows[0].uid, testSub, 'auth.uid() must return the sub claim from request.jwt.claims');
    assert.strictEqual(uidRes.rows[0].role, 'authenticated', 'auth.role() must return authenticated');
    await client.query('ROLLBACK;');
    console.log('3. auth.uid() simulation verified: returns sub =', uidRes.rows[0].uid);

    // 4. Assert auth.users exists
    const usersRes = await client.query("SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') as exists;");
    assert.strictEqual(usersRes.rows[0].exists, true, 'auth.users table must exist');
    console.log('4. auth.users table verified: exists =', usersRes.rows[0].exists);

    console.log('--- ALL HARNESS SELF-CHECKS PASSED ---');
    return true;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runHarnessSelfCheck().catch(err => {
    console.error('Harness Self-Check Failed:', err);
    process.exit(1);
  });
}
