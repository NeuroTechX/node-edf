// @flow
/*
*   Some unfinished example code of writing a .edf file in JavaScript
*   WARNING: this code isn't finished yet and doesn't really work
*/

import * as fs from "fs";
import * as _ from "lodash";
const replace = require("replace-in-file");

// Types from eeg-pipes
type eegChunk = {
  data: Array<Array<channels>>,
  info: {
    startTime: number,
    samplingRate: number
  }
};

type eegSample = {
  data: Array<channels>,
  timestamp: number
};

export const writeEDFHeader = (
  samplingRate: number,
  writeStream: fs.WriteStream,
  channelsObject: Array<channels>,
  notchFilterInfo: Object,
  bandFilterInfo: Object,
  chunkLength: number
) => {
  // Declare header
  const version = "0".padEnd(8);

  //   - the code by which the patient is known in the hospital administration.
  // - sex (English, so F or M).
  // - birthdate in dd-MMM-yyyy format using the English 3-character abbreviations of the month in capitals. 02-AUG-1951 is OK, while 2-AUG-1951 is not.
  // - the patients name.
  const patientID = "X X X X".padEnd(80);

  //   - The text 'Startdate'.
  // - The startdate itself in dd-MMM-yyyy format using the English 3-character abbreviations of the month in capitals.
  // - The hospital administration code of the investigation, i.e. EEG number or PSG number.
  // - A code specifying the responsible investigator or technician.
  // - A code specifying the used equipment.
  const recordingID = "X X X X X".padEnd(80);

  const startDate = formatDate(new Date()).padEnd(8);

  const startTime = formatTime(new Date()).padEnd(8);

  const reserved = "".padEnd(44);

  const nbRecords = "-1".padEnd(8); // -1 while unknown

  const recordDuration = ("" + chunkLength / SAMPLING_RATE).padEnd(8); // record size in seconds

  const nbSignals = ("" + channelsObject.length).padEnd(4);

  const signalLabels = new Array(channelsObject.length)
    .fill("")
    .map((_, index) => channelNames[channelsObject[index]].padEnd(16));

  const signalTypes = new Array(channelsObject.length)
    .fill("")
    .map((_, index) => {
      return "Gold spring electrode".padEnd(80);
    });

  const signalDimensions = new Array(channelsObject.length)
    .fill("")
    .map((_, index) => "uV".padEnd(8));

  // TODO: What is our min?
  const signalPhysMins = new Array(channelsObject.length)
    .fill("")
    .map((_, index) => "-32768".padEnd(8));

  // TODO: What is our max?
  const signalPhysMaxs = new Array(channelsObject.length)
    .fill("")
    .map((_, index) => "32767".padEnd(8));

  // TODO: What is our min?
  const signalDigMins = new Array(channelsObject.length)
    .fill("")
    .map((_, index) => "-32768".padEnd(8));

  // TODO: What is our max?
  const signalDigMaxs = new Array(channelsObject.length)
    .fill("")
    .map((_, index) => "32767".padEnd(8));

  // HP:0.1Hz LP:75Hz N:50Hz
  const signalPrefiltering = new Array(channelsObject.length)
    .fill("HP:0.5Hz ")
    .map((val, index) => {
      if (bandFilterInfo.type != NONE) {
        if (bandFilterInfo.type === BANDPASS) {
          val = val + "BP:" + bandFilterInfo.cutoffFrequency + "Hz ";
        }
        if (bandFilterInfo.type === HIGHPASS) {
          val = val + "HP:" + bandFilterInfo.cutoffFrequency + "Hz ";
        }
        if (bandFilterInfo.type === LOWPASS) {
          val = val + "LP:" + bandFilterInfo.cutoffFrequency + "Hz ";
        }
      }
      if (notchFilterInfo.type != NONE) {
        val = val + "N:" + notchFilterInfo.cutoffFrequency + "Hz ";
      }
      return val.padEnd(80);
    });

  const signalNbSamples = new Array(channelsObject.length)
    .fill("")
    .map((_, index) => ("" + chunkLength).padEnd(8));

  const signalReserved = new Array(channelsObject.length).fill("".padEnd(32));

  // Write header
  writeStream.write(version);
  writeStream.write(patientID);
  writeStream.write(recordingID);
  writeStream.write(startDate);
  writeStream.write(startTime);
  writeStream.write(("" + 256 * (channelsObject.length + 1)).padEnd(8)); // nbBytes in Header
  writeStream.write(reserved);
  writeStream.write(nbRecords);
  writeStream.write(recordDuration);
  writeStream.write(nbSignals);
  signalLabels.forEach(x => writeStream.write(x));
  signalTypes.forEach(x => writeStream.write(x));
  signalDimensions.forEach(x => writeStream.write(x));
  signalPhysMins.forEach(x => writeStream.write(x));
  signalPhysMaxs.forEach(x => writeStream.write(x));
  signalDigMins.forEach(x => writeStream.write(x));
  signalDigMaxs.forEach(x => writeStream.write(x));
  signalPrefiltering.forEach(x => writeStream.write(x));
  signalNbSamples.forEach(x => writeStream.write(x));
  signalReserved.forEach(x => writeStream.write(x));
};

export const writeChunkToEDF = (
  chunk: eegChunk,
  writeStream: fs.WriteStream
) => {
  // Data stays in channels x samples configuration
  // 2 Byte signed int litte-endian, 2's complement

  let buffer = Buffer.alloc(2 * NB_CHANNELS * chunk.data[0].length, "base64");
  let offset = 0;

  for (let i = 0; i < chunk.data.length; i++) {
    // For each channel
    for (let j = 0; j < chunk.data[i].length; j++) {
      // For each sample
      buffer.writeInt16LE(parseInt(chunk.data[i][j] * 32768 / 188000), offset);
      offset += 2;
    }
  }
  writeStream.write(buffer, "base64");
};

// Replaces the nbRecords entry in the EDF+ header with the number of records that were collected
export const closeEDFFile = (filePath: string, nbRecords: number) => {
  const options = {
    files: filePath,
    from: "-1".padEnd(8),
    to: ("" + nbRecords).padEnd(8)
  };

  replace(options)
    .then(changes => {
      console.log("Modified files:", changes.join(", "));
    })
    .catch(error => {
      console.error("Error occurred:", error);
    });
};
