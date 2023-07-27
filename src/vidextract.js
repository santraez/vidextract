import youtubeDownload from './youtubeDownload.js';
import convertSpeechToText from './convertSpeechToText.js';
import translateTranscript from './translateTranscript.js';
import convertTextToSpeech from './convertTextToSpeech.js';
import originPath from './originPath.js';

const languages = [
  'hindi',
  'english',
  'portuguese',
  'spanish',
  'french',
  'italian',
  'german',
  'japanese',
  'korean',
  'vietnamese',
  'filipino'
];

export default async function vidextract({ url, title, number }) {
  const lowercase = title.charAt(0).toLowerCase() + title.slice(1);
  const uppercase = title.charAt(0).toUpperCase() + title.slice(1);

  const hyphens = lowercase.replace(/ /g, "-");

  const formatNumber = number.toString().padStart(3, '0');

  const dirname = `${formatNumber}_${hyphens}`;

  const inDir = originPath(`data/${dirname}/initial`);
  const outDir = originPath(`data/${dirname}/final`);

  try {
    // await youtubeDownload(url, inDir);
    // await convertSpeechToText(inDir);
    await translateTranscript(languages[0], inDir, outDir);
    await convertTextToSpeech(languages[0], outDir);
    // for (let i = 0; i < languages.length; i++) {
    //   const language = languages[i];
    //   if (i === 0) {
    //     await translateTranscript(language, inDir, outDir);
    //     await convertTextToSpeech(language, outDir);
    //   } else {
    //     await new Promise((resolve) => setTimeout(resolve, 20000));
    //     await translateTranscript(language, inDir, outDir);
    //     await convertTextToSpeech(language, outDir);
    //   }
    // }
  } catch (error) {
    console.error('Error:', error);
  }
};
