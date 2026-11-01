import { randomInt } from 'node:crypto';
// Easy 6-digit password for people who cannot fill one in. Avoids 000000, 123456, 654321 style patterns.
export function makePassword() {
  for (;;) {
    let p = '';
    for (let i = 0; i < 6; i++) p += randomInt(0, 10);
    if (/^(\d)\1+$/.test(p) || '01234567890'.includes(p) || '09876543210'.includes(p)) continue;
    return p;
  }
}
