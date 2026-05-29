// Parity-critical deterministic translation of the legacy Daily Dispatch
// XoroShiro128+ utility. Do not replace this with Math.random(); source
// chapter seeds must reproduce stable generated layouts.
export class DailyDispatchDeterministicRng {
  constructor(
    private s01: number,
    private s00: number,
    private s11: number,
    private s10: number,
  ) {}

  unsafeNext(): number {
    const out = (this.s00 + this.s10) | 0;
    const a0 = this.s10 ^ this.s00;
    const a1 = this.s11 ^ this.s01;
    const s00 = this.s00;
    const s01 = this.s01;

    this.s00 = (s00 << 24) ^ (s01 >>> 8) ^ a0 ^ (a0 << 16);
    this.s01 = (s01 << 24) ^ (s00 >>> 8) ^ a1 ^ ((a1 << 16) | (a0 >>> 16));
    this.s10 = (a1 << 5) ^ (a0 >>> 27);
    this.s11 = (a0 << 5) ^ (a1 >>> 27);

    return out;
  }

  unsafeJump(): void {
    let ns01 = 0;
    let ns00 = 0;
    let ns11 = 0;
    let ns10 = 0;
    const jump = [0xd8f554a5, 0xdf900294, 0x4b3201fc, 0x170865df];

    for (let i = 0; i !== 4; i++) {
      for (let mask = 1; mask; mask <<= 1) {
        if (jump[i] & mask) {
          ns01 ^= this.s01;
          ns00 ^= this.s00;
          ns11 ^= this.s11;
          ns10 ^= this.s10;
        }
        this.unsafeNext();
      }
    }

    this.s01 = ns01;
    this.s00 = ns00;
    this.s11 = ns11;
    this.s10 = ns10;
  }

  static fromSeed(seed: number): DailyDispatchDeterministicRng {
    return new DailyDispatchDeterministicRng(-1, ~seed, seed | 0, 0);
  }

  unsafeUniformIntDistributionInternal(rangeSize: number): number {
    const maxAllowed =
      rangeSize > 2 ? Math.trunc(0x100000000 / rangeSize) * rangeSize : 0x100000000;
    let deltaValue = this.unsafeNext() + 0x80000000;

    while (deltaValue >= maxAllowed) {
      deltaValue = this.unsafeNext() + 0x80000000;
    }

    return deltaValue % rangeSize;
  }
}
