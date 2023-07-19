/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 *
 * This is a re-implementation of: https://github.com/p2sr/mdp
 */

import * as ed from 'https://deno.land/x/ed25519@2.0.0/mod.ts';
import { DemoMessages, SourceDemo, SourceDemoBuffer, SourceDemoParser } from 'npm:@nekz/sdp';

// deno-fmt-ignore
const crcTable = new Uint32Array([
  0x00000000, 0x77073096, 0xEE0E612C, 0x990951BA,
	0x076DC419, 0x706AF48F, 0xE963A535, 0x9E6495A3,
	0x0EDB8832, 0x79DCB8A4, 0xE0D5E91E, 0x97D2D988,
	0x09B64C2B, 0x7EB17CBD, 0xE7B82D07, 0x90BF1D91,
	0x1DB71064, 0x6AB020F2, 0xF3B97148, 0x84BE41DE,
	0x1ADAD47D, 0x6DDDE4EB, 0xF4D4B551, 0x83D385C7,
	0x136C9856, 0x646BA8C0, 0xFD62F97A, 0x8A65C9EC,
	0x14015C4F, 0x63066CD9, 0xFA0F3D63, 0x8D080DF5,
	0x3B6E20C8, 0x4C69105E, 0xD56041E4, 0xA2677172,
	0x3C03E4D1, 0x4B04D447, 0xD20D85FD, 0xA50AB56B,
	0x35B5A8FA, 0x42B2986C, 0xDBBBC9D6, 0xACBCF940,
	0x32D86CE3, 0x45DF5C75, 0xDCD60DCF, 0xABD13D59,
	0x26D930AC, 0x51DE003A, 0xC8D75180, 0xBFD06116,
	0x21B4F4B5, 0x56B3C423, 0xCFBA9599, 0xB8BDA50F,
	0x2802B89E, 0x5F058808, 0xC60CD9B2, 0xB10BE924,
	0x2F6F7C87, 0x58684C11, 0xC1611DAB, 0xB6662D3D,
	0x76DC4190, 0x01DB7106, 0x98D220BC, 0xEFD5102A,
	0x71B18589, 0x06B6B51F, 0x9FBFE4A5, 0xE8B8D433,
	0x7807C9A2, 0x0F00F934, 0x9609A88E, 0xE10E9818,
	0x7F6A0DBB, 0x086D3D2D, 0x91646C97, 0xE6635C01,
	0x6B6B51F4, 0x1C6C6162, 0x856530D8, 0xF262004E,
	0x6C0695ED, 0x1B01A57B, 0x8208F4C1, 0xF50FC457,
	0x65B0D9C6, 0x12B7E950, 0x8BBEB8EA, 0xFCB9887C,
	0x62DD1DDF, 0x15DA2D49, 0x8CD37CF3, 0xFBD44C65,
	0x4DB26158, 0x3AB551CE, 0xA3BC0074, 0xD4BB30E2,
	0x4ADFA541, 0x3DD895D7, 0xA4D1C46D, 0xD3D6F4FB,
	0x4369E96A, 0x346ED9FC, 0xAD678846, 0xDA60B8D0,
	0x44042D73, 0x33031DE5, 0xAA0A4C5F, 0xDD0D7CC9,
	0x5005713C, 0x270241AA, 0xBE0B1010, 0xC90C2086,
	0x5768B525, 0x206F85B3, 0xB966D409, 0xCE61E49F,
	0x5EDEF90E, 0x29D9C998, 0xB0D09822, 0xC7D7A8B4,
	0x59B33D17, 0x2EB40D81, 0xB7BD5C3B, 0xC0BA6CAD,
	0xEDB88320, 0x9ABFB3B6, 0x03B6E20C, 0x74B1D29A,
	0xEAD54739, 0x9DD277AF, 0x04DB2615, 0x73DC1683,
	0xE3630B12, 0x94643B84, 0x0D6D6A3E, 0x7A6A5AA8,
	0xE40ECF0B, 0x9309FF9D, 0x0A00AE27, 0x7D079EB1,
	0xF00F9344, 0x8708A3D2, 0x1E01F268, 0x6906C2FE,
	0xF762575D, 0x806567CB, 0x196C3671, 0x6E6B06E7,
	0xFED41B76, 0x89D32BE0, 0x10DA7A5A, 0x67DD4ACC,
	0xF9B9DF6F, 0x8EBEEFF9, 0x17B7BE43, 0x60B08ED5,
	0xD6D6A3E8, 0xA1D1937E, 0x38D8C2C4, 0x4FDFF252,
	0xD1BB67F1, 0xA6BC5767, 0x3FB506DD, 0x48B2364B,
	0xD80D2BDA, 0xAF0A1B4C, 0x36034AF6, 0x41047A60,
	0xDF60EFC3, 0xA867DF55, 0x316E8EEF, 0x4669BE79,
	0xCB61B38C, 0xBC66831A, 0x256FD2A0, 0x5268E236,
	0xCC0C7795, 0xBB0B4703, 0x220216B9, 0x5505262F,
	0xC5BA3BBE, 0xB2BD0B28, 0x2BB45A92, 0x5CB36A04,
	0xC2D7FFA7, 0xB5D0CF31, 0x2CD99E8B, 0x5BDEAE1D,
	0x9B64C2B0, 0xEC63F226, 0x756AA39C, 0x026D930A,
	0x9C0906A9, 0xEB0E363F, 0x72076785, 0x05005713,
	0x95BF4A82, 0xE2B87A14, 0x7BB12BAE, 0x0CB61B38,
	0x92D28E9B, 0xE5D5BE0D, 0x7CDCEFB7, 0x0BDBDF21,
	0x86D3D2D4, 0xF1D4E242, 0x68DDB3F8, 0x1FDA836E,
	0x81BE16CD, 0xF6B9265B, 0x6FB077E1, 0x18B74777,
	0x88085AE6, 0xFF0F6A70, 0x66063BCA, 0x11010B5C,
	0x8F659EFF, 0xF862AE69, 0x616BFFD3, 0x166CCF45,
	0xA00AE278, 0xD70DD2EE, 0x4E048354, 0x3903B3C2,
	0xA7672661, 0xD06016F7, 0x4969474D, 0x3E6E77DB,
	0xAED16A4A, 0xD9D65ADC, 0x40DF0B66, 0x37D83BF0,
	0xA9BCAE53, 0xDEBB9EC5, 0x47B2CF7F, 0x30B5FFE9,
	0xBDBDF21C, 0xCABAC28A, 0x53B39330, 0x24B4A3A6,
	0xBAD03605, 0xCDD70693, 0x54DE5729, 0x23D967BF,
	0xB3667A2E, 0xC4614AB8, 0x5D681B02, 0x2A6F2B94,
	0xB40BBE37, 0xC30C8EA1, 0x5A05DF1B, 0x2D02EF8D,
]);

// deno-fmt-ignore
const demoSignPubkey = new Uint8Array([
  0xF5, 0x84, 0x77, 0x86, 0x98, 0x45, 0x91, 0xA8,
  0x4E, 0x6E, 0x51, 0x1F, 0x34, 0xDF, 0x59, 0x81,
  0x76, 0x81, 0xF7, 0x0E, 0x95, 0x7B, 0x31, 0xD9,
  0xD8, 0x0E, 0x79, 0xD0, 0x5F, 0xDB, 0x9B, 0x19,
]);

export class SarMessage {
  timescale?: number;
  slot?: number;
  pauseTicks?: number;
  initialCvar?: {
    cvar: string;
    val: string;
  };
  checksum?: {
    demoSum: number;
    sarSum: number;
  };
  checksumV2?: {
    sarSum: number;
    signature: ArrayBuffer;
  };
  entityInput?: {
    targetname: string;
    classname: string;
    inputname: string;
    parameter: string;
  };
  portalPlacement?: {
    x: number;
    y: number;
    z: number;
    orange: boolean;
  };
  waitRun?: {
    tick: number;
    cmd: string;
  };
  hwaitRun?: {
    ticks: number;
    cmd: string;
  };
  speedrunTime?: {
    nsplits: number;
    splits?: {
      name: string;
      nsegs: number;
      segs?: {
        name: string;
        ticks: number;
      }[];
    }[];
  };
  timestamp?: {
    year: number;
    mon: number;
    day: number;
    hour: number;
    min: number;
    sec: number;
  };
  fileChecksum?: {
    path: string;
    sum: number;
  };

  constructor(public type: SarDataType) {
  }
}

export enum SarDataType {
  TimescaleCheat = 0x01,
  InitialCvar = 0x02,
  EntityInput = 0x03,
  EntityInputSlot = 0x04,
  PortalPlacement = 0x05,
  ChallengeFlags = 0x06,
  CrouchFly = 0x07,
  Pause = 0x08,
  WaitRun = 0x09,
  SpeedrunTime = 0x0A,
  Timestamp = 0x0B,
  FileChecksum = 0x0C,
  HwaitRun = 0x0D,
  Checksum = 0xFF,
  ChecksumV2 = 0xFE,
  Invalid = -1,
}

export enum ChecksumV2State {
  None,
  Invalid,
  Valid,
}

export interface SarResult {
  demo: SourceDemo;
  messages: SarMessage[];
  checksum?: number;
  v2sumState: ChecksumV2State;
}

export interface SarWhitelists {
  sarWhitelist: number[];
  cmdWhitelist: string[];
  cvarWhitelist: { varName: string; val: string | undefined }[];
  filesumWhitelist: { varName: string; val: string | undefined }[];
}

// _parse_sar_data
const readSarMessageData = (data: SourceDemoBuffer, len: number) => {
  if (len === 0) {
    return new SarMessage(SarDataType.Invalid);
  }

  const type = data.readUint8() as SarDataType;

  if (type === SarDataType.Checksum && len === 5) {
    len = 9;
  }

  const out = new SarMessage(SarDataType.Invalid);
  out.type = type;

  switch (type) {
    case SarDataType.TimescaleCheat:
      if (len !== 5) {
        out.type = SarDataType.Invalid;
        break;
      }
      out.timescale = data.readFloat32();
      break;
    case SarDataType.InitialCvar:
      out.initialCvar = {
        cvar: data.readASCIIString(),
        val: data.readASCIIString(),
      };
      break;
      // deno-lint-ignore no-fallthrough
    case SarDataType.EntityInputSlot:
      out.slot = data.readUint8();
    case SarDataType.EntityInput:
      out.entityInput = {
        targetname: data.readASCIIString(),
        classname: data.readASCIIString(),
        inputname: data.readASCIIString(),
        parameter: data.readASCIIString(),
      };
      break;
    case SarDataType.Checksum:
      if (len !== 9) {
        out.type = SarDataType.Invalid;
        break;
      }
      out.checksum = {
        demoSum: data.readUint32(),
        sarSum: data.readUint32(),
      };
      break;
    case SarDataType.ChecksumV2:
      if (len !== 69) {
        out.type = SarDataType.Invalid;
        break;
      }
      out.checksumV2 = {
        sarSum: data.readUint32(),
        signature: data.readArrayBuffer(64),
      };
      break;
    case SarDataType.PortalPlacement:
      if (len !== 15) {
        out.type = SarDataType.Invalid;
        break;
      }
      out.slot = data.readUint8();
      out.portalPlacement = {
        orange: Boolean(data.readUint8()),
        x: data.readFloat32(),
        y: data.readFloat32(),
        z: data.readFloat32(),
      };
      break;
    case SarDataType.ChallengeFlags:
    case SarDataType.CrouchFly:
      if (len !== 2) {
        out.type = SarDataType.Invalid;
        break;
      }
      out.slot = data.readUint8();
      break;
    case SarDataType.Pause:
      if (len !== 5) {
        out.type = SarDataType.Invalid;
        break;
      }
      out.pauseTicks = data.readUint32();
      break;
    case SarDataType.WaitRun:
      if (len < 6) {
        out.type = SarDataType.Invalid;
        break;
      }
      out.waitRun = {
        tick: data.readUint32(),
        cmd: data.readASCIIString(),
      };
      break;
    case SarDataType.HwaitRun:
      if (len < 6) {
        out.type = SarDataType.Invalid;
        break;
      }
      out.hwaitRun = {
        ticks: data.readUint32(),
        cmd: data.readASCIIString(),
      };
      break;
    case SarDataType.SpeedrunTime:
      if (len < 5) {
        out.type = SarDataType.Invalid;
        break;
      }
      out.speedrunTime = {
        nsplits: data.readUint32(),
        splits: [],
      };
      for (let i = 0; i < out.speedrunTime.nsplits; ++i) {
        type Inner<T> = T extends (infer U)[] ? U : T;
        type SplitsType = Exclude<
          Inner<Exclude<SarMessage['speedrunTime'], undefined>['splits']>,
          undefined
        >;

        const split: SplitsType = {
          name: data.readASCIIString(),
          nsegs: data.readUint32(),
          segs: [],
        };

        for (let j = 0; j < split.nsegs; ++j) {
          split.segs!.push({
            name: data.readASCIIString(),
            ticks: data.readUint32(),
          });
        }

        out.speedrunTime.splits!.push(split);
      }

      if (data.bitsLeft) {
        out.type = SarDataType.Invalid;
        break;
      }

      break;
    case SarDataType.Timestamp:
      if (len !== 8) {
        out.type = SarDataType.Invalid;
        break;
      }
      out.timestamp = {
        year: data.readUint8() | (data.readUint8() << 8),
        mon: data.readUint8() + 1,
        day: data.readUint8(),
        hour: data.readUint8(),
        min: data.readUint8(),
        sec: data.readUint8(),
      };
      break;
    case SarDataType.FileChecksum:
      if (len < 6) {
        out.type = SarDataType.Invalid;
        break;
      }
      out.fileChecksum = {
        sum: data.readUint32(),
        path: data.readASCIIString(),
      };
      break;
    default:
      out.type = SarDataType.Invalid;
      break;
  }

  return out;
};

const readSarData = async (buffer: Uint8Array) => {
  const demo = SourceDemoParser.default()
    .parse(buffer);

  const messages: SarMessage[] = [];

  for (const message of demo.findMessages(DemoMessages.CustomData)) {
    const data = message.data!;

    // _parse_msg
    if (message.unk !== 0 || data.length === 64) {
      continue;
    }

    data.readArrayBuffer(8);
    const len = (data.length / 8) - 8;

    messages.push(readSarMessageData(data, len));
  }

  let checksum: SarResult['checksum'] = undefined;
  let v2sumState = ChecksumV2State.None;

  const stopMessage = demo.findMessage(DemoMessages.Stop)!;

  const hasChecksumMessage = (stopMessage?.restData?.bitsLeft ?? 0) / 8 > 14;
  if (hasChecksumMessage) {
    // Treat what comes after the stop message as CustomData
    const checksumMessage = stopMessage.restData!;

    checksumMessage.readUint8(); // Type
    checksumMessage.readUint32(); // Tick
    checksumMessage.readUint8(); // Slot
    checksumMessage.readInt32(); // Unk

    const data = checksumMessage.readBitStream(checksumMessage.readInt32() * 8);

    // Same as above: _parse_msg
    data.readArrayBuffer(8);
    const len = (data.length / 8) - 8;

    const sarChecksum = readSarMessageData(data, len);
    messages.push(sarChecksum);

    if (sarChecksum) {
      if (sarChecksum.type === SarDataType.Checksum) {
        const f = buffer.slice(0, -31);
        const size = f.byteLength;

        let crc = 0xFFFFFFFF;
        for (let i = 0; i < size; ++i) {
          const byte = buffer.at(i)!;
          const lookupIndex = (crc ^ byte) & 0xFF;
          crc = (crc >> 8) ^ crcTable.at(lookupIndex)!;
        }

        checksum = ~crc;
      } else if (sarChecksum.type === SarDataType.ChecksumV2) {
        checksum = sarChecksum.checksumV2!.sarSum;

        // _demo_verify_sig
        const signature = new Uint8Array(sarChecksum.checksumV2!.signature);

        const f = buffer.slice(0, buffer.byteLength - 91);
        const size = f.byteLength;

        const buf = new Uint8Array(size + 4);
        buf.set(f, 0);

        const sarSumBuffer = new Uint8Array(4);
        // NOTE: Little-endian
        new DataView(sarSumBuffer.buffer).setUint32(0, checksum, true);
        buf.set(sarSumBuffer, size);

        // ed25519_verify
        v2sumState = await ed.verifyAsync(signature, buf, demoSignPubkey)
          ? ChecksumV2State.Valid
          : ChecksumV2State.Invalid;
      }
    }
  }

  return {
    demo,
    messages,
    checksum,
    v2sumState,
  } as SarResult;
};

const allowInt = (toAllowName: string, toAllowValue: number) => {
  return (initialCvar: SarMessage['initialCvar']) => {
    if (initialCvar?.cvar === toAllowName) {
      return parseInt(initialCvar?.val, 10) === toAllowValue;
    }
  };
};
const allowRange = (
  toAllowName: string,
  toAllowValueStart: number,
  toAllowValueEnd: number,
) => {
  return (initialCvar: SarMessage['initialCvar']) => {
    if (initialCvar?.cvar === toAllowName) {
      const value = parseInt(initialCvar?.val, 10);
      return value >= toAllowValueStart && value <= toAllowValueEnd;
    }
  };
};
const allow = (toAllowName: string, toAllowValue: string) => {
  return (initialCvar: SarMessage['initialCvar']) => {
    if (initialCvar?.cvar === toAllowName) {
      return initialCvar?.val === toAllowValue;
    }
  };
};

const cvarValidators = [
  allowInt('host_timescale', 1),
  allowInt('sv_alternateticks', 1),
  allowInt('sv_allow_mobile_portals', 0),
  allowInt('sv_portal_placement_debug', 0),
  allowInt('cl_cmdrate', 30),
  allowInt('cl_updaterate', 20),
  allowRange('cl_fov', 45, 140),
  allowRange('fps_max', 30, 999),
  allow('sv_use_trace_duration', '0.5'),
  allow('m_yaw', '0.022'),
];

// _allow_initial_cvar
const allowInitialCvar = (initialCvar: SarMessage['initialCvar']) => {
  for (const validation of cvarValidators) {
    const result = validation(initialCvar);
    if (result !== undefined) {
      return result;
    }
  }

  return false;
};

const ignoreExtensions = [
  '.so',
  '.dll',
  '.bsp',
];
const ignorePaths = [
  './portal2_dlc1',
  './portal2_dlc2',
  'portal2_dlc1',
  'portal2_dlc2',
];

// _ignore_filesum
const ignoreFilePath = (path: string | undefined) => {
  if (ignoreExtensions.find((extension) => path?.endsWith(extension))) {
    return true;
  }

  if (path?.endsWith('.vpk')) {
    return ignorePaths.some((ignorePath) => path?.startsWith(ignorePath));
  }

  return false;
};

// deno-lint-ignore no-explicit-any
export type OutputFunc = (...args: any[]) => void;

const validateResult = (
  result: SarResult,
  whitelists: SarWhitelists,
  output: OutputFunc,
) => {
  const { demo, messages, checksum } = result;
  const {
    sarWhitelist,
    cmdWhitelist,
    cvarWhitelist,
    filesumWhitelist,
  } = whitelists;

  const sar = checksum ? sarWhitelist.includes(checksum) : false;

  output(
    'SAR',
    checksum?.toString(16)?.toUpperCase() ?? 'no checksum',
    sar ? '' : '(INVALID)',
  );

  for (const message of demo.findMessages(DemoMessages.ConsoleCmd)) {
    // config_check_cmd_whitelist

    const cmd = cmdWhitelist.some((cmd) => message.command!.startsWith(cmd));

    output(
      'Command',
      message.command,
      cmd ? '' : '(INVALID)',
    );
  }

  let detectedTimescale = 0;

  // _output_sar_data
  for (const message of messages) {
    switch (message.type) {
      case SarDataType.TimescaleCheat:
        output('Timescale', message.timescale);
        detectedTimescale += 1;
        break;
      case SarDataType.InitialCvar: {
        if (allowInitialCvar(message.initialCvar)) {
          break;
        }

        // config_check_var_whitelist
        const cvar = cvarWhitelist.find((cvar) => {
          return cvar.varName === message.initialCvar?.cvar;
        });

        const cvarValue = message.initialCvar?.val;

        output(
          'Variable',
          message.initialCvar?.cvar,
          '\'' + message.initialCvar?.val + '\'',
          cvar && (cvar.val === undefined || cvar.val === cvarValue) ? '' : '(INVALID)',
        );
        break;
      }
      case SarDataType.Pause:
        output(
          'Paused for',
          message.pauseTicks,
          'ticks (',
          (message.pauseTicks ?? 0) / 60,
          ')',
        );
        break;
      case SarDataType.Invalid:
        output('Corrupted data');
        break;
      case SarDataType.WaitRun:
        output('Wait for', message.waitRun?.tick, message.waitRun?.cmd);
        break;
      case SarDataType.HwaitRun:
        output('Wait for', message.hwaitRun?.ticks, message.hwaitRun?.cmd);
        break;
      case SarDataType.SpeedrunTime:
        output(
          'Speedrun finished with',
          message.speedrunTime?.nsplits,
          'splits',
        );
        for (const split of message.speedrunTime?.splits ?? []) {
          let ticks = 0;
          for (const seg of split.segs ?? []) {
            output(seg.name, seg.ticks);
            ticks += seg.ticks;
          }

          let total = Math.round((ticks * 1_000) / 60);

          const ms = total % 1_000;
          total = Math.floor(total / 1_000);
          const secs = total % 60;
          total = Math.floor(total / 60);
          const mins = total % 60;
          total = Math.floor(total / 60);
          const hrs = total;

          output(
            '    Total:',
            ticks,
            'ticks = ',
            [
              hrs,
              mins.toString().padStart(2, '0'),
              secs.toString().padStart(2, '0'),
            ].join(':') + '.' + ms.toString().padStart(3, '0'),
          );
        }
        break;
      case SarDataType.Timestamp:
        output(
          'Recorded at',
          [
            message.timestamp?.year?.toString()?.padStart(2, '4'),
            message.timestamp?.mon?.toString()?.padStart(2, '0'),
            message.timestamp?.day?.toString()?.padStart(2, '0'),
          ].join('/'),
          [
            message.timestamp?.hour?.toString()?.padStart(2, '0'),
            message.timestamp?.min?.toString()?.padStart(2, '0'),
            message.timestamp?.sec?.toString()?.padStart(2, '0'),
          ].join(':'),
          'UTC',
        );
        break;
      case SarDataType.FileChecksum: {
        if (ignoreFilePath(message.fileChecksum?.path)) {
          break;
        }

        // config_check_var_whitelist
        const filesum = filesumWhitelist.find((cvar) => {
          return cvar.varName === message.fileChecksum?.path;
        });

        const fileChecksum = message.fileChecksum?.sum.toString(16)
          .toUpperCase();

        output(
          'File',
          message.fileChecksum?.path,
          '\'' + fileChecksum + '\'',
          filesum?.val === fileChecksum ? '' : '(INVALID)',
        );
        break;
      }
      default:
        break;
        // case SarDataType.EntityInput:
        //   break;
        // case SarDataType.EntityInputSlot:
        //   break;
        // case SarDataType.PortalPlacement:
        //   break;
        // case SarDataType.ChallengeFlags:
        //   break;
        // case SarDataType.CrouchFly:
        //   break;
        // case SarDataType.Checksum:
        //   break;
        // case SarDataType.ChecksumV2:
        //   break;
    }
  }
};

const sarWhitelistFile = './data/sar/sar_whitelist.txt';
const cmdWhitelistFile = './data/sar/cmd_whitelist.txt';
const cvarWhitelistFile = './data/sar/cvar_whitelist.txt';
const filesumWhitelistFile = './data/sar/filesum_whitelist.txt';

export const SAR = {
  Whitelists: {
    sarWhitelist: [],
    cmdWhitelist: [],
    cvarWhitelist: [],
    filesumWhitelist: [],
  } as SarWhitelists,

  async load() {
    SAR.Whitelists.sarWhitelist = (await Deno.readTextFile(sarWhitelistFile))
      .trim()
      .split('\n')
      .map((sar) => parseInt(sar.trim(), 16));

    SAR.Whitelists.cmdWhitelist = (await Deno.readTextFile(cmdWhitelistFile))
      .trim()
      .split('\n')
      .map((cmd) => cmd.trim());

    SAR.Whitelists.cvarWhitelist = (await Deno.readTextFile(cvarWhitelistFile))
      .trim()
      .split('\n')
      .map((line) => {
        const [varName, val] = line.trim().split(' ', 2);
        return { varName, val };
      })
      .filter((cvar) => cvar.varName !== '');

    SAR.Whitelists.filesumWhitelist = (await Deno.readTextFile(filesumWhitelistFile))
      .trim()
      .split('\n')
      .map((line) => {
        const [varName, val] = line.trim().split(' ', 2);

        if (varName === '' || varName.startsWith('//')) {
          return { varName, val };
        }

        if (val === undefined) {
          throw new Error(`Missing checksum value for file ${varName}`);
        }

        return { varName, val };
      })
      .filter((cvar) => cvar.varName !== '');
  },

  async fetch() {
    // TODO: It would be great if we could download the official
    //       whitelists files somewhere...

    //await Deno.writeTextFile(sarWhitelistFile, "");
    //await Deno.writeTextFile(cmdWhitelistFile, "");
    //await Deno.writeTextFile(cvarWhitelistFile, "");
    //await Deno.writeTextFile(filesumWhitelistFile, "");

    await SAR.load();
  },

  async parseDemo(buffer: Uint8Array, output: OutputFunc) {
    const result = await readSarData(buffer);

    validateResult(
      result,
      SAR.Whitelists,
      output,
    );

    return result;
  },
};
