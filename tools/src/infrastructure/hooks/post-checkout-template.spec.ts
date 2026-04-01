import { describe, expect, it } from 'vitest';
import { postCheckoutHookScript, TFF_HOOK_MARKER } from './post-checkout-template.js';

describe('postCheckoutHookScript', () => {
  it('starts with shebang', () => {
    expect(postCheckoutHookScript).toMatch(/^#!\/bin\/sh/);
  });

  it('contains tff marker comment', () => {
    expect(postCheckoutHookScript).toContain(TFF_HOOK_MARKER);
  });

  it('exits 0 for non-branch checkouts', () => {
    expect(postCheckoutHookScript).toContain('[ "$3" = "1" ] || exit 0');
  });

  it('skips detached HEAD', () => {
    expect(postCheckoutHookScript).toContain('[ -z "$BRANCH" ] && exit 0');
  });

  it('logs to .tff/hook.log', () => {
    expect(postCheckoutHookScript).toContain('.tff/hook.log');
  });

  it('chains pre-existing hook without exec', () => {
    expect(postCheckoutHookScript).toContain('post-checkout.pre-tff');
    expect(postCheckoutHookScript).not.toMatch(/exec "\$\(dirname/);
  });

  it('always ends with exit 0', () => {
    expect(postCheckoutHookScript.trimEnd()).toMatch(/exit 0$/);
  });

  it('resolves tff-tools via git rev-parse', () => {
    expect(postCheckoutHookScript).toContain('git rev-parse --show-toplevel');
  });
});
