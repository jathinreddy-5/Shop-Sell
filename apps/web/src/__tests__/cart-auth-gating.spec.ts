import { describe, it } from 'node:test';
import * as assert from 'node:assert';

interface CartItem {
  id: string;
  name: string;
  slug: string;
  store: string;
  price: number;
  qty: number;
  image: string;
}

// Logic mirror of CartContext auth gating
class CartAuthGuardSimulator {
  private user: { sub: string; email: string } | null = null;
  public items: CartItem[] = [];
  public isLoginPromptOpen = false;
  public promptProductName: string | null = null;

  constructor(user: { sub: string; email: string } | null = null) {
    this.user = user;
  }

  public setUser(user: { sub: string; email: string } | null) {
    this.user = user;
    if (!user) {
      this.items = [];
    }
  }

  public addToCart(item: CartItem): boolean {
    if (!this.user) {
      this.promptProductName = item.name;
      this.isLoginPromptOpen = true;
      return false;
    }

    const existingIndex = this.items.findIndex(
      (i) => i.id === item.id || (i.slug && item.slug && i.slug === item.slug)
    );

    if (existingIndex > -1) {
      this.items[existingIndex].qty += item.qty || 1;
    } else {
      this.items.push({ ...item, qty: item.qty || 1 });
    }

    return true;
  }

  public get cartCount(): number {
    return this.items.reduce((sum, item) => sum + item.qty, 0);
  }

  public getLoginRedirectUrl(currentPath: string): string {
    return `/login?redirect=${encodeURIComponent(currentPath)}`;
  }
}

describe('Cart Authentication Gating Specification', () => {
  it('should block adding product to cart when unauthenticated and trigger login prompt', () => {
    const simulator = new CartAuthGuardSimulator(null);
    const sampleItem: CartItem = {
      id: 'prod-infinix-hot-70',
      name: 'Infinix Hot 70 Pro 5G',
      slug: 'infinix-hot-70-pro-5g',
      store: 'TechTron India',
      price: 18999,
      qty: 1,
      image: 'https://images.unsplash.com/sample.jpg',
    };

    const added = simulator.addToCart(sampleItem);

    assert.strictEqual(added, false, 'Expected addToCart to return false when unauthenticated');
    assert.strictEqual(simulator.isLoginPromptOpen, true, 'Expected login prompt modal to open');
    assert.strictEqual(simulator.promptProductName, 'Infinix Hot 70 Pro 5G', 'Expected product name to be captured');
    assert.strictEqual(simulator.cartCount, 0, 'Cart count should remain 0');
    assert.strictEqual(simulator.items.length, 0, 'No items should be added to cart');
  });

  it('should construct correct login redirect URL preserving product return path', () => {
    const simulator = new CartAuthGuardSimulator(null);
    const redirectUrl = simulator.getLoginRedirectUrl('/product/infinix-hot-70-pro-5g');
    assert.strictEqual(
      redirectUrl,
      '/login?redirect=%2Fproduct%2Finfinix-hot-70-pro-5g',
      'Expected redirect URL to safely encode product page'
    );
  });

  it('should successfully add product to cart and increment count when authenticated', () => {
    const simulator = new CartAuthGuardSimulator({
      sub: 'usr-buyer-42',
      email: 'buyer@example.com',
    });

    const sampleItem: CartItem = {
      id: 'prod-infinix-hot-70',
      name: 'Infinix Hot 70 Pro 5G',
      slug: 'infinix-hot-70-pro-5g',
      store: 'TechTron India',
      price: 18999,
      qty: 1,
      image: 'https://images.unsplash.com/sample.jpg',
    };

    const added = simulator.addToCart(sampleItem);

    assert.strictEqual(added, true, 'Expected addToCart to return true when authenticated');
    assert.strictEqual(simulator.isLoginPromptOpen, false, 'Login prompt should not open');
    assert.strictEqual(simulator.cartCount, 1, 'Cart count should increment to 1');
    assert.strictEqual(simulator.items.length, 1, 'Cart should contain 1 item');

    // Adding same item should increment quantity
    simulator.addToCart(sampleItem);
    assert.strictEqual(simulator.cartCount, 2, 'Cart count should increment to 2');
    assert.strictEqual(simulator.items.length, 1, 'Cart should still have 1 distinct item');
  });
});
