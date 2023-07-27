import fs from 'fs';
import https from 'https';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';

ffmpeg.setFfmpegPath(ffmpegPath.path);

const GOOGLE_API = 'https://us-central1-texttospeech.googleapis.com/v1beta1/text:synthesize';

export default async function convertTextToSpeech(language, outDir) {
  const inputFile = `${outDir}/${language}/translated.txt`;
  const outputFile = `${outDir}/${language}/synthesis.wav`;

  const inputText = fs.readFileSync(inputFile, 'utf8').replace(/\n/g, ' ').replace(/ {2,}/g, ' ');

  const MAX_BYTES = 5000; // 5000 max for the Neural model

  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Goog-Api-Key': process.env.GOOGLE_API_KEY
    }
  };

  const requestBody = {
    audioConfig: {
      audioEncoding: 'LINEAR16',
      effectsProfileId: ['small-bluetooth-speaker-class-device'],
      pitch: -5,
      speakingRate: 1.4
    }
  };

  switch (language) {
    case 'hindi':
      requestBody.voice = {
        languageCode: 'hi-IN',
        name: 'hi-IN-Neural2-A'
      };
      break;
    case 'english':
      requestBody.voice = {
        languageCode: "en-US",
        name: "en-US-Neural2-D"
      }
      break;
    case 'portuguese':
      requestBody.voice = {
        languageCode: "pt-BR",
        name: "pt-BR-Neural2-B"
      };
      break;
    case 'spanish':
      requestBody.voice = {
        languageCode: "es-US",
        name: "es-US-Neural2-B"
      };
      break;
    case 'french':
      requestBody.voice = {
        languageCode: "fr-FR",
        name: "fr-FR-Neural2-B"
      };
      break;
    case 'italian':
      requestBody.voice = {
        languageCode: "it-IT",
        name: "it-IT-Neural2-C"
      };
      break;
    case 'german':
      requestBody.voice = {
        languageCode: "de-DE",
        name: "de-DE-Neural2-D"
      }
      break;
    case 'japanese':
      requestBody.voice = {
        languageCode: "ja-JP",
        name: "ja-JP-Neural2-C"
      };
      break;
    case 'korean':
      requestBody.voice = {
        languageCode: "ko-KR",
        name: "ko-KR-Neural2-C"
      };
      break;
    case 'vietnamese':
      requestBody.voice = {
        languageCode: "vi-VN",
        name: "vi-VN-Neural2-D"
      };
      break;
    case 'filipino':
      requestBody.voice = {
        languageCode: "fil-PH",
        name: "fil-ph-Neural2-D"
      };
      break;
    default:
      requestBody.voice = {
        languageCode: "es-US",
        name: "es-US-Neural2-B"
      }
      break;
  };

  const totalBytes = Buffer.byteLength(inputText, 'utf8');
  const numFragments = Math.ceil(totalBytes / MAX_BYTES);

  const textFragments = [];

  if (numFragments <= 1) {
    textFragments.push(inputText);
  } else {
    let currentFragment = '';
    
    const words = inputText.split(' ');
    const maxLength = Math.ceil(words.length / numFragments);

    words.forEach((word) => {
      if (currentFragment.split(' ').length <= maxLength) {
        currentFragment += word + ' ';
      } else {
        textFragments.push(currentFragment.trim());
        currentFragment = word + ' ';
      }
    });

    textFragments.push(currentFragment.trim());
  }

  try {
    const audioFiles = [];
  
    for (const fragment of textFragments) {
      requestBody.input = { text: fragment };
  
      const responseData = await new Promise((resolve, reject) => {
        const req = https.request(GOOGLE_API, requestOptions, (res) => {
          let responseData = '';
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          res.on('end', () => {
            resolve(responseData);
          });
        });
  
        req.on('error', (error) => {
          reject(error);
        });
        req.write(JSON.stringify(requestBody));
        req.end();
      });
  
      const { audioContent } = JSON.parse(responseData);
      const tempAudioFile = `${outDir}/segment_${textFragments.indexOf(fragment).toString().padStart(3, '0')}.wav`;
      await fs.promises.writeFile(tempAudioFile, audioContent, 'base64');
      audioFiles.push(tempAudioFile);
    }
 
    await new Promise((resolve, reject) => {
      const command = ffmpeg();

      audioFiles.forEach((audioFile) => {
        command.input(audioFile);
      });
  
      command.mergeToFile(outputFile)
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        console.error('Error al concatenar audio:', err);
        reject(err);
      });
    });
    
    await Promise.all(audioFiles.map(file => fs.promises.unlink(file)));

    const capitalLanguage = language.charAt(0).toUpperCase() + language.slice(1);
    console.log(`${capitalLanguage} audio synthesis completed.`);
  } catch (error) {
    console.error('Error in the text-to-speech request:', error);
  }
};
