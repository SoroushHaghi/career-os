// Large-M4A repacking for Groq Free Tier.
//
// Groq Free Tier limits a single audio file to 25 MB. Large M4A lecture
// recordings are therefore repacked losslessly into smaller self-contained
// M4A files without decoding/re-encoding the AAC payload.
//
// The parser intentionally supports the common ISO-BMFF/AAC layout used by
// voice/lecture recordings. Unsupported layouts fail closed instead of
// silently emitting corrupt audio.

function careerOsM4aU8_(
  value
) {
  const number =
    Number(value || 0);

  return number < 0
    ? number + 256
    : number;
}

function careerOsM4aSignedByte_(
  value
) {
  const normalized =
    Number(value || 0) & 255;

  return normalized > 127
    ? normalized - 256
    : normalized;
}

function careerOsM4aReadUint16_(
  bytes,
  offset
) {
  return (
    careerOsM4aU8_(bytes[offset]) *
      256 +
    careerOsM4aU8_(bytes[offset + 1])
  );
}

function careerOsM4aReadUint32_(
  bytes,
  offset
) {
  return (
    careerOsM4aU8_(bytes[offset]) *
      16777216 +
    careerOsM4aU8_(bytes[offset + 1]) *
      65536 +
    careerOsM4aU8_(bytes[offset + 2]) *
      256 +
    careerOsM4aU8_(bytes[offset + 3])
  );
}

function careerOsM4aReadUint64_(
  bytes,
  offset
) {
  const high =
    careerOsM4aReadUint32_(
      bytes,
      offset
    );

  const low =
    careerOsM4aReadUint32_(
      bytes,
      offset + 4
    );

  const value =
    high * 4294967296 +
    low;

  if (
    !Number.isSafeInteger(value)
  ) {
    throw new Error(
      'M4A 64-bit value exceeds safe integer range.'
    );
  }

  return value;
}

function careerOsM4aAscii_(
  bytes,
  offset,
  length
) {
  let value = '';

  for (
    let index = 0;
    index < length;
    index += 1
  ) {
    value +=
      String.fromCharCode(
        careerOsM4aU8_(
          bytes[offset + index]
        )
      );
  }

  return value;
}

function careerOsM4aAsciiBytes_(
  value
) {
  const text =
    String(value || '');

  const out = [];

  for (
    let index = 0;
    index < text.length;
    index += 1
  ) {
    out.push(
      careerOsM4aSignedByte_(
        text.charCodeAt(index)
      )
    );
  }

  return out;
}

function careerOsM4aBe16_(
  value
) {
  const number =
    Number(value || 0);

  return [
    careerOsM4aSignedByte_(
      Math.floor(number / 256)
    ),
    careerOsM4aSignedByte_(
      number
    )
  ];
}

function careerOsM4aBe32_(
  value
) {
  const number =
    Number(value || 0);

  if (
    number < 0 ||
    number > 4294967295
  ) {
    throw new Error(
      'M4A uint32 overflow: ' +
      number
    );
  }

  return [
    careerOsM4aSignedByte_(
      Math.floor(
        number / 16777216
      )
    ),
    careerOsM4aSignedByte_(
      Math.floor(
        number / 65536
      )
    ),
    careerOsM4aSignedByte_(
      Math.floor(
        number / 256
      )
    ),
    careerOsM4aSignedByte_(
      number
    )
  ];
}

function careerOsM4aConcat_(
  parts
) {
  const list =
    Array.isArray(parts)
      ? parts
      : [];

  let total = 0;

  list.forEach(
    function(part) {
      total +=
        part
          ? part.length
          : 0;
    }
  );

  const out =
    new Array(total);

  let offset = 0;

  list.forEach(
    function(part) {
      if (!part) {
        return;
      }

      for (
        let index = 0;
        index < part.length;
        index += 1
      ) {
        out[offset] =
          part[index];
        offset += 1;
      }
    }
  );

  return out;
}

function careerOsM4aFullBoxHeader_(
  version,
  flags
) {
  const value =
    Number(flags || 0);

  return [
    careerOsM4aSignedByte_(
      Number(version || 0)
    ),
    careerOsM4aSignedByte_(
      Math.floor(
        value / 65536
      )
    ),
    careerOsM4aSignedByte_(
      Math.floor(
        value / 256
      )
    ),
    careerOsM4aSignedByte_(
      value
    )
  ];
}

function careerOsM4aBox_(
  type,
  payload
) {
  const body =
    payload || [];

  const size =
    8 +
    body.length;

  return careerOsM4aConcat_(
    [
      careerOsM4aBe32_(size),
      careerOsM4aAsciiBytes_(
        String(type)
      ),
      body
    ]
  );
}

function careerOsM4aReadLocalBox_(
  bytes,
  offset,
  parentEnd
) {
  const end =
    Number(
      parentEnd === undefined
        ? bytes.length
        : parentEnd
    );

  if (
    offset < 0 ||
    offset + 8 > end
  ) {
    throw new Error(
      'Invalid M4A box header offset.'
    );
  }

  let size =
    careerOsM4aReadUint32_(
      bytes,
      offset
    );

  const type =
    careerOsM4aAscii_(
      bytes,
      offset + 4,
      4
    );

  let headerSize = 8;

  if (size === 1) {
    if (
      offset + 16 >
      end
    ) {
      throw new Error(
        'Truncated extended M4A box header.'
      );
    }

    size =
      careerOsM4aReadUint64_(
        bytes,
        offset + 8
      );

    headerSize = 16;
  } else if (size === 0) {
    size =
      end -
      offset;
  }

  if (
    size < headerSize ||
    offset + size > end
  ) {
    throw new Error(
      'Invalid M4A box size for ' +
      type +
      '.'
    );
  }

  return {
    type: type,
    start: offset,
    size: size,
    end:
      offset +
      size,
    headerSize:
      headerSize,
    dataStart:
      offset +
      headerSize
  };
}

function careerOsM4aListLocalBoxes_(
  bytes,
  start,
  end
) {
  const result = [];

  let offset =
    Number(start || 0);

  const limit =
    Number(
      end === undefined
        ? bytes.length
        : end
    );

  let guard = 0;

  while (
    offset + 8 <=
      limit &&
    guard < 10000
  ) {
    const box =
      careerOsM4aReadLocalBox_(
        bytes,
        offset,
        limit
      );

    result.push(box);

    if (
      box.end <=
      offset
    ) {
      throw new Error(
        'M4A box parser did not advance.'
      );
    }

    offset =
      box.end;

    guard += 1;
  }

  return result;
}

function careerOsM4aFindLocalBox_(
  bytes,
  parent,
  type,
  childOffset
) {
  const offset =
    Number(
      childOffset || 0
    );

  const boxes =
    careerOsM4aListLocalBoxes_(
      bytes,
      parent.dataStart +
        offset,
      parent.end
    );

  for (
    let index = 0;
    index < boxes.length;
    index += 1
  ) {
    if (
      boxes[index].type ===
      type
    ) {
      return boxes[index];
    }
  }

  return null;
}

function careerOsM4aLocateTopLevelBox_(
  fileId,
  fileSize,
  targetType
) {
  const total =
    Number(fileSize || 0);

  if (
    !total ||
    total < 8
  ) {
    throw new Error(
      'M4A file size is invalid.'
    );
  }

  let offset = 0;

  for (
    let guard = 0;
    guard < 128 &&
    offset + 8 <= total;
    guard += 1
  ) {
    const headerEnd =
      Math.min(
        total - 1,
        offset + 15
      );

    const header =
      readDriveByteRange_(
        fileId,
        offset,
        headerEnd
      );

    let size =
      careerOsM4aReadUint32_(
        header,
        0
      );

    const type =
      careerOsM4aAscii_(
        header,
        4,
        4
      );

    let headerSize = 8;

    if (size === 1) {
      if (
        header.length < 16
      ) {
        throw new Error(
          'Could not read extended M4A box header.'
        );
      }

      size =
        careerOsM4aReadUint64_(
          header,
          8
        );

      headerSize = 16;
    } else if (size === 0) {
      size =
        total -
        offset;
    }

    if (
      size < headerSize ||
      offset + size >
        total
    ) {
      throw new Error(
        'Invalid top-level M4A box ' +
        type +
        '.'
      );
    }

    if (
      type ===
      targetType
    ) {
      return {
        type: type,
        start: offset,
        size: size,
        end:
          offset +
          size,
        headerSize:
          headerSize
      };
    }

    offset +=
      size;
  }

  return null;
}

function careerOsM4aCopyRange_(
  bytes,
  start,
  end
) {
  const out = [];

  for (
    let index = start;
    index < end;
    index += 1
  ) {
    out.push(
      bytes[index]
    );
  }

  return out;
}

function careerOsM4aParseStts_(
  bytes,
  box
) {
  const count =
    careerOsM4aReadUint32_(
      bytes,
      box.dataStart + 4
    );

  const result = [];

  let offset =
    box.dataStart +
    8;

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    result.push(
      {
        count:
          careerOsM4aReadUint32_(
            bytes,
            offset
          ),
        delta:
          careerOsM4aReadUint32_(
            bytes,
            offset + 4
          )
      }
    );

    offset += 8;
  }

  return result;
}

function careerOsM4aParseStsc_(
  bytes,
  box
) {
  const count =
    careerOsM4aReadUint32_(
      bytes,
      box.dataStart + 4
    );

  const result = [];

  let offset =
    box.dataStart +
    8;

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    result.push(
      {
        firstChunk:
          careerOsM4aReadUint32_(
            bytes,
            offset
          ),
        samplesPerChunk:
          careerOsM4aReadUint32_(
            bytes,
            offset + 4
          ),
        sampleDescriptionIndex:
          careerOsM4aReadUint32_(
            bytes,
            offset + 8
          )
      }
    );

    offset += 12;
  }

  return result;
}

function careerOsM4aParseSampleSizes_(
  bytes,
  box
) {
  const defaultSize =
    careerOsM4aReadUint32_(
      bytes,
      box.dataStart + 4
    );

  const count =
    careerOsM4aReadUint32_(
      bytes,
      box.dataStart + 8
    );

  const sizes =
    new Array(count);

  if (defaultSize > 0) {
    for (
      let index = 0;
      index < count;
      index += 1
    ) {
      sizes[index] =
        defaultSize;
    }

    return sizes;
  }

  let offset =
    box.dataStart +
    12;

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    sizes[index] =
      careerOsM4aReadUint32_(
        bytes,
        offset
      );

    offset += 4;
  }

  return sizes;
}

function careerOsM4aParseChunkOffsets_(
  bytes,
  box
) {
  const count =
    careerOsM4aReadUint32_(
      bytes,
      box.dataStart + 4
    );

  const result =
    new Array(count);

  let offset =
    box.dataStart +
    8;

  const width =
    box.type ===
      'co64'
      ? 8
      : 4;

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    result[index] =
      width === 8
        ? careerOsM4aReadUint64_(
            bytes,
            offset
          )
        : careerOsM4aReadUint32_(
            bytes,
            offset
          );

    offset +=
      width;
  }

  return result;
}

function careerOsM4aTimeAtSample_(
  sttsEntries,
  sampleIndex
) {
  const target =
    Math.max(
      0,
      Number(sampleIndex || 0)
    );

  let sampleBase = 0;
  let timeBase = 0;

  for (
    let index = 0;
    index < sttsEntries.length;
    index += 1
  ) {
    const entry =
      sttsEntries[index];

    const entryEnd =
      sampleBase +
      entry.count;

    if (
      target <=
      entryEnd
    ) {
      return (
        timeBase +
        Math.max(
          0,
          target -
          sampleBase
        ) *
        entry.delta
      );
    }

    sampleBase =
      entryEnd;

    timeBase +=
      entry.count *
      entry.delta;
  }

  return timeBase;
}

function careerOsM4aSliceStts_(
  sttsEntries,
  startSample,
  endSampleExclusive
) {
  const start =
    Number(startSample || 0);

  const end =
    Number(
      endSampleExclusive ||
      0
    );

  const result = [];

  let sampleBase = 0;

  for (
    let index = 0;
    index < sttsEntries.length;
    index += 1
  ) {
    const entry =
      sttsEntries[index];

    const entryStart =
      sampleBase;

    const entryEnd =
      sampleBase +
      entry.count;

    const overlap =
      Math.max(
        0,
        Math.min(
          end,
          entryEnd
        ) -
        Math.max(
          start,
          entryStart
        )
      );

    if (overlap > 0) {
      if (
        result.length > 0 &&
        result[
          result.length - 1
        ].delta ===
          entry.delta
      ) {
        result[
          result.length - 1
        ].count +=
          overlap;
      } else {
        result.push(
          {
            count:
              overlap,
            delta:
              entry.delta
          }
        );
      }
    }

    sampleBase =
      entryEnd;

    if (
      sampleBase >=
      end
    ) {
      break;
    }
  }

  return result;
}

function careerOsM4aDurationFromStts_(
  entries
) {
  let duration = 0;

  entries.forEach(
    function(entry) {
      duration +=
        Number(entry.count) *
        Number(entry.delta);
    }
  );

  return duration;
}

function careerOsM4aParseAudioTrack_(
  fileId,
  fileSize
) {
  const moovLocation =
    careerOsM4aLocateTopLevelBox_(
      fileId,
      fileSize,
      'moov'
    );

  const ftypLocation =
    careerOsM4aLocateTopLevelBox_(
      fileId,
      fileSize,
      'ftyp'
    );

  if (
    !moovLocation ||
    !ftypLocation
  ) {
    throw new Error(
      'Large Groq chunking requires an ISO-BMFF file with ftyp and moov boxes.'
    );
  }

  if (
    moovLocation.size >
    CAREER_OS_CONFIG
      .GROQ_M4A_MAX_MOOV_BYTES
  ) {
    throw new Error(
      'M4A moov metadata is larger than the safe parser limit.'
    );
  }

  const moovBytes =
    readDriveByteRange_(
      fileId,
      moovLocation.start,
      moovLocation.end - 1
    );

  const moov =
    careerOsM4aReadLocalBox_(
      moovBytes,
      0,
      moovBytes.length
    );

  if (
    moov.type !==
    'moov'
  ) {
    throw new Error(
      'M4A moov box could not be parsed.'
    );
  }

  const tracks =
    careerOsM4aListLocalBoxes_(
      moovBytes,
      moov.dataStart,
      moov.end
    );

  let audioTrack = null;
  let audioMdia = null;

  for (
    let index = 0;
    index < tracks.length;
    index += 1
  ) {
    const candidate =
      tracks[index];

    if (
      candidate.type !==
      'trak'
    ) {
      continue;
    }

    const mdia =
      careerOsM4aFindLocalBox_(
        moovBytes,
        candidate,
        'mdia'
      );

    if (!mdia) {
      continue;
    }

    const hdlr =
      careerOsM4aFindLocalBox_(
        moovBytes,
        mdia,
        'hdlr'
      );

    if (
      hdlr &&
      careerOsM4aAscii_(
        moovBytes,
        hdlr.dataStart + 8,
        4
      ) ===
        'soun'
    ) {
      audioTrack =
        candidate;
      audioMdia =
        mdia;
      break;
    }
  }

  if (
    !audioTrack ||
    !audioMdia
  ) {
    throw new Error(
      'No audio track was found in the M4A file.'
    );
  }

  const mdhd =
    careerOsM4aFindLocalBox_(
      moovBytes,
      audioMdia,
      'mdhd'
    );

  const minf =
    careerOsM4aFindLocalBox_(
      moovBytes,
      audioMdia,
      'minf'
    );

  const stbl =
    minf
      ? careerOsM4aFindLocalBox_(
          moovBytes,
          minf,
          'stbl'
        )
      : null;

  if (
    !mdhd ||
    !stbl
  ) {
    throw new Error(
      'M4A audio sample table is incomplete.'
    );
  }

  const mdhdVersion =
    careerOsM4aU8_(
      moovBytes[
        mdhd.dataStart
      ]
    );

  const timescale =
    mdhdVersion === 1
      ? careerOsM4aReadUint32_(
          moovBytes,
          mdhd.dataStart + 20
        )
      : careerOsM4aReadUint32_(
          moovBytes,
          mdhd.dataStart + 12
        );

  if (!timescale) {
    throw new Error(
      'M4A audio timescale is invalid.'
    );
  }

  const stsd =
    careerOsM4aFindLocalBox_(
      moovBytes,
      stbl,
      'stsd'
    );

  const stts =
    careerOsM4aFindLocalBox_(
      moovBytes,
      stbl,
      'stts'
    );

  const stsc =
    careerOsM4aFindLocalBox_(
      moovBytes,
      stbl,
      'stsc'
    );

  const stsz =
    careerOsM4aFindLocalBox_(
      moovBytes,
      stbl,
      'stsz'
    );

  const stco =
    careerOsM4aFindLocalBox_(
      moovBytes,
      stbl,
      'stco'
    ) ||
    careerOsM4aFindLocalBox_(
      moovBytes,
      stbl,
      'co64'
    );

  if (
    !stsd ||
    !stts ||
    !stsc ||
    !stsz ||
    !stco
  ) {
    throw new Error(
      'M4A audio uses an unsupported sample-table layout.'
    );
  }

  const sampleEntries =
    careerOsM4aListLocalBoxes_(
      moovBytes,
      stsd.dataStart + 8,
      stsd.end
    );

  let mp4a = null;

  for (
    let index = 0;
    index < sampleEntries.length;
    index += 1
  ) {
    if (
      sampleEntries[index].type ===
      'mp4a'
    ) {
      mp4a =
        sampleEntries[index];
      break;
    }
  }

  if (!mp4a) {
    throw new Error(
      'M4A audio codec is not an unencrypted mp4a sample entry.'
    );
  }

  const sampleSizes =
    careerOsM4aParseSampleSizes_(
      moovBytes,
      stsz
    );

  const stscEntries =
    careerOsM4aParseStsc_(
      moovBytes,
      stsc
    );

  const chunkOffsets =
    careerOsM4aParseChunkOffsets_(
      moovBytes,
      stco
    );

  const sttsEntries =
    careerOsM4aParseStts_(
      moovBytes,
      stts
    );

  if (
    !sampleSizes.length ||
    !stscEntries.length ||
    !chunkOffsets.length ||
    !sttsEntries.length
  ) {
    throw new Error(
      'M4A audio sample table has no usable samples.'
    );
  }

  stscEntries.forEach(
    function(entry) {
      if (
        entry.sampleDescriptionIndex !==
        1
      ) {
        throw new Error(
          'M4A chunking currently supports one audio sample description.'
        );
      }
    }
  );

  const ftypBytes =
    readDriveByteRange_(
      fileId,
      ftypLocation.start,
      ftypLocation.end - 1
    );

  return {
    fileSize:
      Number(fileSize),
    timescale:
      timescale,
    sampleCount:
      sampleSizes.length,
    sampleSizes:
      sampleSizes,
    stscEntries:
      stscEntries,
    chunkOffsets:
      chunkOffsets,
    sttsEntries:
      sttsEntries,
    mp4aBytes:
      careerOsM4aCopyRange_(
        moovBytes,
        mp4a.start,
        mp4a.end
      ),
    ftypBytes:
      ftypBytes
  };
}

function careerOsM4aSelectSamples_(
  parsed,
  startSample,
  targetBytes
) {
  const start =
    Math.max(
      0,
      Number(startSample || 0)
    );

  if (
    start >=
    parsed.sampleCount
  ) {
    return {
      startSample:
        start,
      endSampleExclusive:
        start,
      mediaBytes:
        0,
      sampleSizes: [],
      ranges: [],
      sttsEntries: [],
      durationUnits: 0,
      startTimeUnits:
        careerOsM4aTimeAtSample_(
          parsed.sttsEntries,
          start
        ),
      complete: true
    };
  }

  const target =
    Math.max(
      256 * 1024,
      Number(targetBytes || 0)
    );

  const selectedSizes = [];
  const ranges = [];

  let selectedBytes = 0;
  let sampleIndex = 0;
  let stscIndex = 0;
  let stop = false;

  for (
    let chunkIndex = 1;
    chunkIndex <=
      parsed.chunkOffsets.length &&
    !stop;
    chunkIndex += 1
  ) {
    while (
      stscIndex + 1 <
        parsed.stscEntries.length &&
      parsed.stscEntries[
        stscIndex + 1
      ].firstChunk <=
        chunkIndex
    ) {
      stscIndex += 1;
    }

    const mapping =
      parsed.stscEntries[
        stscIndex
      ];

    let sourceOffset =
      parsed.chunkOffsets[
        chunkIndex - 1
      ];

    for (
      let local = 0;
      local <
        mapping.samplesPerChunk &&
      sampleIndex <
        parsed.sampleCount;
      local += 1
    ) {
      const size =
        parsed.sampleSizes[
          sampleIndex
        ];

      if (
        sampleIndex >=
        start
      ) {
        if (
          selectedSizes.length > 0 &&
          selectedBytes +
            size >
            target
        ) {
          stop = true;
          break;
        }

        selectedSizes.push(
          size
        );

        selectedBytes +=
          size;

        const lastRange =
          ranges.length
            ? ranges[
                ranges.length - 1
              ]
            : null;

        if (
          lastRange &&
          lastRange.endExclusive ===
            sourceOffset
        ) {
          lastRange.endExclusive +=
            size;
          lastRange.sampleCount +=
            1;
        } else {
          ranges.push(
            {
              start:
                sourceOffset,
              endExclusive:
                sourceOffset +
                size,
              sampleCount:
                1
            }
          );
        }
      }

      sourceOffset +=
        size;

      sampleIndex += 1;
    }
  }

  if (
    selectedSizes.length === 0
  ) {
    throw new Error(
      'M4A chunk selection produced no samples.'
    );
  }

  const endSampleExclusive =
    start +
    selectedSizes.length;

  const slicedStts =
    careerOsM4aSliceStts_(
      parsed.sttsEntries,
      start,
      endSampleExclusive
    );

  const startTimeUnits =
    careerOsM4aTimeAtSample_(
      parsed.sttsEntries,
      start
    );

  const durationUnits =
    careerOsM4aDurationFromStts_(
      slicedStts
    );

  return {
    startSample:
      start,
    endSampleExclusive:
      endSampleExclusive,
    mediaBytes:
      selectedBytes,
    sampleSizes:
      selectedSizes,
    ranges:
      ranges,
    sttsEntries:
      slicedStts,
    startTimeUnits:
      startTimeUnits,
    durationUnits:
      durationUnits,
    complete:
      endSampleExclusive >=
      parsed.sampleCount
  };
}

function careerOsM4aBuildSttsBox_(
  entries
) {
  const parts = [
    careerOsM4aFullBoxHeader_(
      0,
      0
    ),
    careerOsM4aBe32_(
      entries.length
    )
  ];

  entries.forEach(
    function(entry) {
      parts.push(
        careerOsM4aBe32_(
          entry.count
        )
      );

      parts.push(
        careerOsM4aBe32_(
          entry.delta
        )
      );
    }
  );

  return careerOsM4aBox_(
    'stts',
    careerOsM4aConcat_(
      parts
    )
  );
}

function careerOsM4aBuildStszBox_(
  sampleSizes
) {
  const parts = [
    careerOsM4aFullBoxHeader_(
      0,
      0
    ),
    careerOsM4aBe32_(0),
    careerOsM4aBe32_(
      sampleSizes.length
    )
  ];

  sampleSizes.forEach(
    function(size) {
      parts.push(
        careerOsM4aBe32_(
          size
        )
      );
    }
  );

  return careerOsM4aBox_(
    'stsz',
    careerOsM4aConcat_(
      parts
    )
  );
}

function careerOsM4aIdentityMatrix_() {
  return careerOsM4aConcat_(
    [
      careerOsM4aBe32_(
        0x00010000
      ),
      careerOsM4aBe32_(0),
      careerOsM4aBe32_(0),
      careerOsM4aBe32_(0),
      careerOsM4aBe32_(
        0x00010000
      ),
      careerOsM4aBe32_(0),
      careerOsM4aBe32_(0),
      careerOsM4aBe32_(0),
      careerOsM4aBe32_(
        0x40000000
      )
    ]
  );
}

function careerOsM4aZeroBytes_(
  count
) {
  const out =
    new Array(
      Number(count || 0)
    );

  for (
    let index = 0;
    index < out.length;
    index += 1
  ) {
    out[index] = 0;
  }

  return out;
}

function careerOsM4aBuildMoov_(
  parsed,
  selected,
  chunkOffset
) {
  const duration =
    selected.durationUnits;

  if (
    duration >
    4294967295
  ) {
    throw new Error(
      'M4A chunk duration exceeds version-0 atom limits.'
    );
  }

  const stsd =
    careerOsM4aBox_(
      'stsd',
      careerOsM4aConcat_(
        [
          careerOsM4aFullBoxHeader_(
            0,
            0
          ),
          careerOsM4aBe32_(1),
          parsed.mp4aBytes
        ]
      )
    );

  const stts =
    careerOsM4aBuildSttsBox_(
      selected.sttsEntries
    );

  const stsc =
    careerOsM4aBox_(
      'stsc',
      careerOsM4aConcat_(
        [
          careerOsM4aFullBoxHeader_(
            0,
            0
          ),
          careerOsM4aBe32_(1),
          careerOsM4aBe32_(1),
          careerOsM4aBe32_(
            selected
              .sampleSizes
              .length
          ),
          careerOsM4aBe32_(1)
        ]
      )
    );

  const stsz =
    careerOsM4aBuildStszBox_(
      selected.sampleSizes
    );

  const stco =
    careerOsM4aBox_(
      'stco',
      careerOsM4aConcat_(
        [
          careerOsM4aFullBoxHeader_(
            0,
            0
          ),
          careerOsM4aBe32_(1),
          careerOsM4aBe32_(
            chunkOffset
          )
        ]
      )
    );

  const stbl =
    careerOsM4aBox_(
      'stbl',
      careerOsM4aConcat_(
        [
          stsd,
          stts,
          stsc,
          stsz,
          stco
        ]
      )
    );

  const smhd =
    careerOsM4aBox_(
      'smhd',
      careerOsM4aConcat_(
        [
          careerOsM4aFullBoxHeader_(
            0,
            0
          ),
          careerOsM4aBe16_(0),
          careerOsM4aBe16_(0)
        ]
      )
    );

  const url =
    careerOsM4aBox_(
      'url ',
      careerOsM4aFullBoxHeader_(
        0,
        1
      )
    );

  const dref =
    careerOsM4aBox_(
      'dref',
      careerOsM4aConcat_(
        [
          careerOsM4aFullBoxHeader_(
            0,
            0
          ),
          careerOsM4aBe32_(1),
          url
        ]
      )
    );

  const dinf =
    careerOsM4aBox_(
      'dinf',
      dref
    );

  const minf =
    careerOsM4aBox_(
      'minf',
      careerOsM4aConcat_(
        [
          smhd,
          dinf,
          stbl
        ]
      )
    );

  const handlerName =
    careerOsM4aAsciiBytes_(
      'SoundHandler\u0000'
    );

  const hdlr =
    careerOsM4aBox_(
      'hdlr',
      careerOsM4aConcat_(
        [
          careerOsM4aFullBoxHeader_(
            0,
            0
          ),
          careerOsM4aBe32_(0),
          careerOsM4aAsciiBytes_(
            'soun'
          ),
          careerOsM4aZeroBytes_(12),
          handlerName
        ]
      )
    );

  const mdhd =
    careerOsM4aBox_(
      'mdhd',
      careerOsM4aConcat_(
        [
          careerOsM4aFullBoxHeader_(
            0,
            0
          ),
          careerOsM4aBe32_(0),
          careerOsM4aBe32_(0),
          careerOsM4aBe32_(
            parsed.timescale
          ),
          careerOsM4aBe32_(
            duration
          ),
          careerOsM4aBe16_(
            0x55c4
          ),
          careerOsM4aBe16_(0)
        ]
      )
    );

  const mdia =
    careerOsM4aBox_(
      'mdia',
      careerOsM4aConcat_(
        [
          mdhd,
          hdlr,
          minf
        ]
      )
    );

  const matrix =
    careerOsM4aIdentityMatrix_();

  const tkhd =
    careerOsM4aBox_(
      'tkhd',
      careerOsM4aConcat_(
        [
          careerOsM4aFullBoxHeader_(
            0,
            7
          ),
          careerOsM4aBe32_(0),
          careerOsM4aBe32_(0),
          careerOsM4aBe32_(1),
          careerOsM4aBe32_(0),
          careerOsM4aBe32_(
            duration
          ),
          careerOsM4aZeroBytes_(8),
          careerOsM4aBe16_(0),
          careerOsM4aBe16_(0),
          careerOsM4aBe16_(
            0x0100
          ),
          careerOsM4aBe16_(0),
          matrix,
          careerOsM4aBe32_(0),
          careerOsM4aBe32_(0)
        ]
      )
    );

  const trak =
    careerOsM4aBox_(
      'trak',
      careerOsM4aConcat_(
        [
          tkhd,
          mdia
        ]
      )
    );

  const mvhd =
    careerOsM4aBox_(
      'mvhd',
      careerOsM4aConcat_(
        [
          careerOsM4aFullBoxHeader_(
            0,
            0
          ),
          careerOsM4aBe32_(0),
          careerOsM4aBe32_(0),
          careerOsM4aBe32_(
            parsed.timescale
          ),
          careerOsM4aBe32_(
            duration
          ),
          careerOsM4aBe32_(
            0x00010000
          ),
          careerOsM4aBe16_(
            0x0100
          ),
          careerOsM4aBe16_(0),
          careerOsM4aZeroBytes_(8),
          matrix,
          careerOsM4aZeroBytes_(24),
          careerOsM4aBe32_(2)
        ]
      )
    );

  return careerOsM4aBox_(
    'moov',
    careerOsM4aConcat_(
      [
        mvhd,
        trak
      ]
    )
  );
}

function careerOsM4aBuildChunkBlob_(
  fileId,
  parsed,
  selected,
  fileName
) {
  const ftyp =
    parsed.ftypBytes;

  const chunkOffset =
    ftyp.length +
    8;

  const moov =
    careerOsM4aBuildMoov_(
      parsed,
      selected,
      chunkOffset
    );

  const totalLength =
    ftyp.length +
    8 +
    selected.mediaBytes +
    moov.length;

  if (
    totalLength >
    CAREER_OS_CONFIG
      .GROQ_FREE_TIER_MAX_FILE_BYTES
  ) {
    throw new Error(
      'Repacked M4A chunk exceeds the Groq Free Tier file limit.'
    );
  }

  const output =
    new Array(
      totalLength
    );

  let writeOffset = 0;

  function copyInto(
    source
  ) {
    for (
      let index = 0;
      index < source.length;
      index += 1
    ) {
      output[writeOffset] =
        source[index];

      writeOffset += 1;
    }
  }

  copyInto(ftyp);

  copyInto(
    careerOsM4aBe32_(
      8 +
      selected.mediaBytes
    )
  );

  copyInto(
    careerOsM4aAsciiBytes_(
      'mdat'
    )
  );

  selected.ranges.forEach(
    function(range) {
      const bytes =
        readDriveByteRange_(
          fileId,
          range.start,
          range.endExclusive -
            1
        );

      copyInto(bytes);
    }
  );

  copyInto(moov);

  if (
    writeOffset !==
    totalLength
  ) {
    throw new Error(
      'Repacked M4A byte count mismatch.'
    );
  }

  return Utilities.newBlob(
    output,
    'audio/mp4',
    fileName
  );
}

function careerOsFormatAbsoluteAudioTimestamp_(
  seconds
) {
  const total =
    Math.max(
      0,
      Math.floor(
        Number(seconds || 0)
      )
    );

  const hours =
    Math.floor(
      total / 3600
    );

  const minutes =
    Math.floor(
      (total % 3600) /
      60
    );

  const secs =
    total % 60;

  return (
    '[' +
    String(hours)
      .padStart(
        2,
        '0'
      ) +
    ':' +
    String(minutes)
      .padStart(
        2,
        '0'
      ) +
    ':' +
    String(secs)
      .padStart(
        2,
        '0'
      ) +
    ']'
  );
}

function careerOsGroqFormatChunkSegments_(
  data,
  baseSeconds
) {
  const segments =
    Array.isArray(
      data &&
      data.segments
    )
      ? data.segments
      : [];

  if (
    segments.length === 0
  ) {
    const text =
      String(
        data &&
        data.text ||
        ''
      )
        .trim();

    if (!text) {
      return '';
    }

    return (
      careerOsFormatAbsoluteAudioTimestamp_(
        baseSeconds
      ) +
      ' ' +
      text
    );
  }

  return segments
    .map(
      function(segment) {
        const text =
          String(
            segment &&
            segment.text ||
            ''
          )
            .trim();

        if (!text) {
          return '';
        }

        return (
          careerOsFormatAbsoluteAudioTimestamp_(
            Number(baseSeconds || 0) +
            Number(
              segment &&
              segment.start ||
              0
            )
          ) +
          ' ' +
          text
        );
      }
    )
    .filter(Boolean)
    .join('\n')
    .trim();
}

function callGroqWhisperBlobTranscription_(
  blob
) {
  const apiKey =
    getCareerOsGroqApiKey_();

  const model =
    CAREER_OS_CONFIG
      .GROQ_AUDIO_MODEL;

  const response =
    UrlFetchApp.fetch(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      {
        method:
          'post',
        headers: {
          Authorization:
            'Bearer ' +
            apiKey
        },
        payload: {
          file:
            blob,
          model:
            model,
          response_format:
            'verbose_json',
          'timestamp_granularities[]':
            'segment',
          temperature:
            '0'
        },
        muteHttpExceptions:
          true
      }
    );

  const status =
    response.getResponseCode();

  const body =
    response.getContentText();

  if (
    status < 200 ||
    status >= 300
  ) {
    const summary =
      getGroqErrorSummary_(
        body
      );

    throw createRetryAwareHttpError_(
      'Groq M4A chunk transcription failed for model ' +
      model +
      (
        summary
          ? '. ' +
            summary
          : '.'
      ),
      status,
      response,
      body
    );
  }

  const data =
    JSON.parse(body);

  if (
    !String(
      data &&
      data.text ||
      ''
    )
      .trim()
  ) {
    throw new Error(
      'Groq M4A chunk returned no transcript text.'
    );
  }

  return {
    data:
      data,
    model:
      model
  };
}

function careerOsGroqTempFolder_(
  sourceFile
) {
  const context =
    prepareSessionWorkspace_(
      sourceFile
    );

  const workspace =
    context.workspaceFolder;

  const folders =
    workspace.getFoldersByName(
      '_TRANSCRIPTION_TMP'
    );

  if (folders.hasNext()) {
    return folders.next();
  }

  const folder =
    workspace.createFolder(
      '_TRANSCRIPTION_TMP'
    );

  updateAppPropertiesIfChanged_(
    folder.getId(),
    {
      careerOsGenerated:
        'true',
      careerOsTemporary:
        'true',
      careerOsSessionFolderId:
        String(
          context.sessionFolderId
        )
    },
    'AUDIO_TMP_FOLDER_TAG_WARNING'
  );

  return folder;
}

function careerOsGroqGetPartialFile_(
  sourceFile,
  job
) {
  if (
    job.groqPartialFileId
  ) {
    try {
      return DriveApp.getFileById(
        job.groqPartialFileId
      );
    } catch (error) {
      job.groqPartialFileId =
        '';
    }
  }

  const folder =
    careerOsGroqTempFolder_(
      sourceFile
    );

  const name =
    buildTxtName_(
      sourceFile.getName()
    )
      .replace(
        /\.txt$/i,
        '.groq.partial.txt'
      );

  const file =
    folder.createFile(
      name,
      '',
      MimeType.PLAIN_TEXT
    );

  updateAppPropertiesIfChanged_(
    file.getId(),
    {
      careerOsGenerated:
        'true',
      careerOsTemporary:
        'true',
      careerOsSourceId:
        String(
          sourceFile.getId()
        ),
      careerOsSourceFingerprint:
        String(
          job.sourceFingerprint ||
          ''
        )
    },
    'AUDIO_PARTIAL_TAG_WARNING'
  );

  job.groqPartialFileId =
    file.getId();

  return file;
}

function careerOsGroqAppendPartial_(
  sourceFile,
  job,
  text
) {
  const chunkText =
    String(text || '')
      .trim();

  if (!chunkText) {
    throw new Error(
      'Groq chunk produced empty timestamped text.'
    );
  }

  const file =
    careerOsGroqGetPartialFile_(
      sourceFile,
      job
    );

  const current =
    file
      .getBlob()
      .getDataAsString();

  file.setContent(
    (
      current
        ? current.trimEnd() +
          '\n'
        : ''
    ) +
    chunkText +
    '\n'
  );

  return file;
}

function careerOsGroqReadPartial_(
  job
) {
  if (
    !job.groqPartialFileId
  ) {
    return '';
  }

  try {
    return DriveApp
      .getFileById(
        job.groqPartialFileId
      )
      .getBlob()
      .getDataAsString()
      .trim();
  } catch (error) {
    return '';
  }
}

function cleanupGroqChunkPartial_(
  job
) {
  if (
    !job ||
    !job.groqPartialFileId
  ) {
    return;
  }

  try {
    const file =
      DriveApp.getFileById(
        job.groqPartialFileId
      );

    const parents =
      file.getParents();

    let parent = null;

    if (parents.hasNext()) {
      parent =
        parents.next();
    }

    file.setTrashed(
      true
    );

    if (
      parent &&
      parent.getName() ===
        '_TRANSCRIPTION_TMP'
    ) {
      const remainingFiles =
        parent.getFiles();

      const remainingFolders =
        parent.getFolders();

      if (
        !remainingFiles.hasNext() &&
        !remainingFolders.hasNext()
      ) {
        parent.setTrashed(
          true
        );
      }
    }
  } catch (error) {
    console.log(
      'AUDIO_PARTIAL_CLEANUP_WARNING: ' +
      String(error)
    );
  }

  job.groqPartialFileId =
    '';
}

function careerOsGroqShouldChunkM4a_(
  job
) {
  if (
    Number(
      job &&
      job.size ||
      0
    ) <=
    CAREER_OS_CONFIG
      .GROQ_FREE_TIER_MAX_FILE_BYTES
  ) {
    return false;
  }

  const head =
    readDriveByteRange_(
      job.fileId,
      0,
      15
    );

  return (
    head.length >= 12 &&
    careerOsM4aAscii_(
      head,
      4,
      4
    ) ===
      'ftyp'
  );
}

function processGroqChunkedM4aStep_(
  sourceFile,
  job
) {
  const chunkStartedAt =
    Date.now();

  const parseStartedAt =
    chunkStartedAt;

  const parsed =
    careerOsM4aParseAudioTrack_(
      job.fileId,
      job.size
    );

  const parseMs =
    Date.now() -
    parseStartedAt;

  const startSample =
    Math.max(
      0,
      Number(
        job.groqChunkStartSample ||
        0
      )
    );

  if (
    startSample >=
    parsed.sampleCount
  ) {
    const existingText =
      careerOsGroqReadPartial_(
        job
      );

    if (!existingText) {
      throw new Error(
        'Groq chunk state reached completion without a partial transcript.'
      );
    }

    return {
      complete: true,
      text:
        existingText,
      model:
        CAREER_OS_CONFIG
          .GROQ_AUDIO_MODEL,
      method:
        'groq_whisper_large_v3_chunked_m4a',
      timestampMode:
        'groq_segment_timestamps_chunked_m4a',
      timestampNote:
        'Large M4A audio was losslessly repacked into smaller M4A chunks; Groq segment timestamps were offset into the original recording timeline.'
    };
  }

  const selected =
    careerOsM4aSelectSamples_(
      parsed,
      startSample,
      CAREER_OS_CONFIG
        .GROQ_M4A_CHUNK_TARGET_MEDIA_BYTES
    );

  const chunkNumber =
    Number(
      job.groqChunkIndex ||
      0
    ) +
    1;

  const buildStartedAt =
    Date.now();

  const blob =
    careerOsM4aBuildChunkBlob_(
      job.fileId,
      parsed,
      selected,
      'career-os-chunk-' +
        chunkNumber +
        '.m4a'
    );

  const buildMs =
    Date.now() -
    buildStartedAt;

  const groqStartedAt =
    Date.now();

  const result =
    callGroqWhisperBlobTranscription_(
      blob
    );

  const groqMs =
    Date.now() -
    groqStartedAt;

  const baseSeconds =
    selected.startTimeUnits /
    parsed.timescale;

  const timestamped =
    careerOsGroqFormatChunkSegments_(
      result.data,
      baseSeconds
    );

  const persistStartedAt =
    Date.now();

  careerOsGroqAppendPartial_(
    sourceFile,
    job,
    timestamped
  );

  const persistMs =
    Date.now() -
    persistStartedAt;

  job.groqLastChunkMetrics = {
    chunk:
      chunkNumber,
    parseMs:
      parseMs,
    buildMs:
      buildMs,
    groqMs:
      groqMs,
    persistMs:
      persistMs,
    totalMs:
      Date.now() -
      chunkStartedAt,
    sourceRangeCount:
      selected.ranges.length,
    mediaBytes:
      selected.mediaBytes,
    sampleCount:
      selected.sampleSizes.length,
    startSeconds:
      selected.startTimeUnits /
      parsed.timescale,
    durationSeconds:
      selected.durationUnits /
      parsed.timescale
  };

  job.groqChunkIndex =
    chunkNumber;

  job.groqChunkStartSample =
    selected.endSampleExclusive;

  job.status =
    selected.complete
      ? 'GROQ_CHUNKING_FINALIZE'
      : 'GROQ_CHUNKING';

  job.attempts = 0;
  job.nextAttemptAt = 0;
  job.lastError = '';

  markAudioSourceProcessingStatus_(
    job.fileId,
    selected.complete
      ? 'FINALIZING'
      : 'CHUNKING',
    job.sourceFingerprint ||
      '',
    job.modifiedTime ||
      '',
    ''
  );

  console.log(
    'GROQ_M4A_CHUNK_DONE: ' +
    job.name +
    ' | chunk=' +
    chunkNumber +
    ' | samples=' +
    selected.startSample +
    '-' +
    (
      selected.endSampleExclusive -
      1
    ) +
    ' | media_bytes=' +
    selected.mediaBytes +
    ' | ranges=' +
    selected.ranges.length +
    ' | parse_ms=' +
    parseMs +
    ' | build_ms=' +
    buildMs +
    ' | groq_ms=' +
    groqMs +
    ' | persist_ms=' +
    persistMs +
    ' | total_ms=' +
    job.groqLastChunkMetrics.totalMs +
    ' | final=' +
    String(
      selected.complete
    )
  );

  if (
    !selected.complete
  ) {
    return {
      complete: false
    };
  }

  const transcript =
    careerOsGroqReadPartial_(
      job
    );

  if (!transcript) {
    throw new Error(
      'Groq chunked transcription completed without accumulated text.'
    );
  }

  return {
    complete: true,
    text:
      transcript,
    model:
      result.model,
    method:
      'groq_whisper_large_v3_chunked_m4a',
    timestampMode:
      'groq_segment_timestamps_chunked_m4a',
    timestampNote:
      'Large M4A audio was losslessly repacked into smaller M4A chunks; Groq segment timestamps were offset into the original recording timeline.'
  };
}
