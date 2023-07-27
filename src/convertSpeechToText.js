import fs from 'fs';
import { promisify } from 'util';
import { spawn } from 'child_process';
import { Configuration, OpenAIApi } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

const stat = promisify(fs.stat);

export default async function convertSpeechToText(inDir) {
  const audioFilePath = `${inDir}/audio.mp3`;
  const outputFile = `${inDir}/transcript.txt`;
  const segmentSizeInBytes = 10 * 1024 * 1024;

  try {
    const fileStats = await stat(audioFilePath);
    const fileSizeInBytes = fileStats.size;

    const numSegments = Math.ceil(fileSizeInBytes / segmentSizeInBytes);

    const segmentDuration = await new Promise((resolve, reject) => {
      const ffprobeProcess = spawn('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        audioFilePath
      ]);
  
      let duration = '';
  
      ffprobeProcess.stdout.on('data', (data) => duration += data.toString());
      ffprobeProcess.stderr.on('data', (data) => reject(new Error(data.toString())));
  
      ffprobeProcess.on('close', (code) => {
        if (code === 0) {
          const durationInSeconds = parseFloat(duration);
          const segmentDurationInSeconds = durationInSeconds / numSegments;
          resolve(segmentDurationInSeconds);
        } else {
          reject(new Error(`ffprobe process exited with code ${code}`));
        }
      });
    });

    const ffmpegArgs = [
      '-i',
      audioFilePath,
      '-f',
      'segment',
      '-segment_time',
      segmentDuration,
      '-c',
      'copy',
      `${inDir}/temp_%03d.mp3`
    ];

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
    
    await new Promise((resolve, reject) => {
      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`child process exited with code ${code}`));
        }
      });
    });

    let fullTranscription = '';

    for (let segmentIndex = 0; segmentIndex < numSegments; segmentIndex++) {
      const segmentName = `temp_${segmentIndex.toString().padStart(3, '0')}.mp3`;
      if (numSegments <= 3) {
        const segmentTranscription = await openai.createTranscription(fs.createReadStream(`${inDir}/${segmentName}`), 'whisper-1');
        fullTranscription += segmentTranscription.data.text + '\n';

        fs.unlinkSync(`${inDir}/${segmentName}`);
      } else {
        if (segmentIndex === 0) {
          const segmentTranscription = await openai.createTranscription(fs.createReadStream(`${inDir}/${segmentName}`), 'whisper-1');
          fullTranscription += segmentTranscription.data.text + '\n';

          fs.unlinkSync(`${inDir}/${segmentName}`);
        } else {
          setTimeout(async () => {
            const segmentTranscription = await openai.createTranscription(fs.createReadStream(`${inDir}/${segmentName}`), 'whisper-1');
            fullTranscription += segmentTranscription.data.text + '\n';

            fs.unlinkSync(`${inDir}/${segmentName}`);
          }, 20000);
        }
      }
    };

    fs.writeFileSync(outputFile, fullTranscription);

    console.log('Transcription completed');
  } catch (error) {
    console.error('Error in the speech-to-text request:', error);
  }
};
