import { describe, expect, it } from 'vitest';
import { supabaseConfig } from './supabaseConfig';

describe('Saving Supabase configuration', () => {
  it('keeps the original SDK auth storage key while using a separate Worker origin', () => {
    expect(
      supabaseConfig(
        'https://saving-project.supabase.co/',
        'https://saving-app.apexstack-work.workers.dev/',
        'sb_publishable_test',
        false,
      ),
    ).toEqual({
      url: 'https://saving-project.supabase.co',
      proxy: 'https://saving-app.apexstack-work.workers.dev',
      key: 'sb_publishable_test',
      storageKey: 'sb-saving-project-auth-token',
    });
  });
  it.each([
    'https://proxy.example/health',
    'http://proxy.example',
    'https://user:password@proxy.example',
    'https://proxy.example?url=https://other.example',
  ])('rejects unsafe proxy URL %s', (proxy) => {
    expect(
      supabaseConfig(
        'https://saving-project.supabase.co',
        proxy,
        'sb_publishable_test',
        false,
      ).error,
    ).toBeTruthy();
  });
  it('rejects secret keys and reports missing Worker configuration', () => {
    expect(
      supabaseConfig(
        'https://saving-project.supabase.co',
        'https://worker.example',
        'sb_secret_test',
        false,
      ).error,
    ).toContain('publishable');
    expect(
      supabaseConfig(
        'https://saving-project.supabase.co',
        '',
        'sb_publishable_test',
        false,
      ).error,
    ).toContain('Worker URL');
  });
});
