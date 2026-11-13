import { describe, it, expect } from 'vitest';
import { recordingFor } from './player-sounds';

describe('player engine sounds', () => {
  it('Huracán EVO uses the same layered engine as the Revuelto (no own recording)', () => {
    expect(recordingFor('huracan-evo')).toBeNull();
    expect(recordingFor('revuelto')).toBeNull();
  });
});
