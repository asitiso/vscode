import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const recordSource = readFileSync(
  fileURLToPath(new URL('./RecordScreen.tsx', import.meta.url)),
  'utf8',
);

describe('RecordScreen personal record UX', () => {
  it('does not offer a manual personal-best feeling choice', () => {
    expect(recordSource).not.toContain("label: '기록을 경신함'");
  });

  it('shows the current best and automatic new-record guidance beside entered values', () => {
    expect(recordSource).toContain('현재 최고');
    expect(recordSource).toContain('신기록 가능!');
  });
});
