import {BIT_INDEX_BYTE_O, BIT_INDEX_BYTE_1, BIT_INDEX_BYTE_2} from "./bitUtils.ts"

export enum Channel {
  Red,
  Green,
  Blue
}

export function channelShift(channel: Channel): number {
  // Note: Packed Uint32 A B G R 
  switch (channel) {
    case Channel.Red:
      return BIT_INDEX_BYTE_O;
    case Channel.Green:
      return BIT_INDEX_BYTE_1;
    case Channel.Blue:
      return BIT_INDEX_BYTE_2;
    default:
      // Don't mess with the Alpha
      throw new Error(`unsupported channel: ${channel}`);
  }
}