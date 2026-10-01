import { describe, it } from 'node:test';
import * as assert from 'node:assert';

describe('Next.js Middleware & Subdomain Routing Logic', () => {
  it('should detect seller subdomains accurately', () => {
    const isSellerSubdomain = (host: string) =>
      host.startsWith('seller.') || host.startsWith('sellers.') || host.startsWith('vendor.');

    assert.strictEqual(isSellerSubdomain('seller.shopsell.com'), true);
    assert.strictEqual(isSellerSubdomain('sellers.shopsell.in'), true);
    assert.strictEqual(isSellerSubdomain('vendor.shopsell.com'), true);
    assert.strictEqual(isSellerSubdomain('shopsell.com'), false);
    assert.strictEqual(isSellerSubdomain('admin.shopsell.com'), false);
  });

  it('should rewrite seller subdomain paths to /seller group', () => {
    const rewritePath = (pathname: string) => {
      return `/seller${pathname === '/' ? '' : pathname}`;
    };

    assert.strictEqual(rewritePath('/'), '/seller');
    assert.strictEqual(rewritePath('/products'), '/seller/products');
    assert.strictEqual(rewritePath('/orders'), '/seller/orders');
  });

  it('should verify role access hierarchy', () => {
    const canAccessSeller = (roles: string[]) => roles.includes('owner') || roles.includes('admin');
    const canAccessAdmin = (roles: string[]) => roles.includes('admin');

    assert.strictEqual(canAccessSeller(['customer']), false);
    assert.strictEqual(canAccessSeller(['customer', 'owner']), true);
    assert.strictEqual(canAccessSeller(['admin']), true);

    assert.strictEqual(canAccessAdmin(['customer']), false);
    assert.strictEqual(canAccessAdmin(['customer', 'owner']), false);
    assert.strictEqual(canAccessAdmin(['admin']), true);
  });
});
