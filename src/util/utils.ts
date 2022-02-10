import { ethers } from 'ethers';

export function parseNumber(value: string) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  let num: number;

  if (value === '0x') {
    return 0;
  } else if (value.startsWith('0x')) {
    num = ethers.BigNumber.from(value).toNumber();
  } else {
    num = Number(value);
  }

  if (isNaN(num)) {
    return undefined;
  }

  return num;
}
