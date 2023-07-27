import fs from 'fs';
import ytdl from 'ytdl-core';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';

ffmpeg.setFfmpegPath(ffmpegPath.path);

export default async function youtubeDownload(url, inDir) {
  try {
    const info = await ytdl.getInfo(url);

    fs.mkdirSync(inDir, { recursive: true });
    console.log('Initial directory created');

    const audioFormat = ytdl.filterFormats(info.formats, 'audioonly')[0];
    const audioOutputPath = `${inDir}/temp.wav`;

    if (audioFormat) {

      const audioStream = ytdl.downloadFromInfo(info, { format: audioFormat });
      audioStream.pipe(fs.createWriteStream(audioOutputPath));

      await new Promise((resolve, reject) => {
        audioStream.on('end', resolve);
        audioStream.on('error', reject);
      });

      console.log('Audio download completed');

      const outputMp3Path = `${inDir}/audio.mp3`;

      await new Promise((resolve, reject) => {
        ffmpeg(audioOutputPath)
        .audioChannels(1)
        .toFormat('mp3')
        .save(outputMp3Path)
        .on('end', () => {
          console.log('Audio conversion completed');
          fs.unlinkSync(audioOutputPath);
          resolve();
        })
        .on('error', (err) => {
          console.error('Error converting audio:', err);
          reject(err);
        });
      });
    } else {
      console.error('No audio format available');
    }

    const videoFormat = ytdl.filterFormats(info.formats, 'videoonly')[0];
    const videoOutputPath = `${inDir}/video.mp4`;

    if (videoFormat) {
      const videoStream = ytdl.downloadFromInfo(info, { format: videoFormat });
      videoStream.pipe(fs.createWriteStream(videoOutputPath));

      await new Promise((resolve, reject) => {
        videoStream.on('end', resolve);
        videoStream.on('error', reject);
      });

      console.log('Video download completed');
    } else {
      console.error('No video format available');
    }
  } catch (err) {
    console.error('Error:', err);
  }
};
