import fs from 'fs';
import { Configuration, OpenAIApi } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

export default async function translateTranscript(language, inDir, outDir) {
  const inputFile = `${inDir}/transcript.txt`;
  const outputFile = `${outDir}/${language}/translated.txt`;

  try {
    const inputText = fs.readFileSync(inputFile, 'utf8').replace(/\n/g, ' ').replace(/ {2,}/g, ' ');
    const MAX_TEXT = 5000; // 5000 max for the Davinci model

    const numFragments = Math.ceil(inputText.length / MAX_TEXT);

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

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
      console.log('Final directory created');
    }

    fs.mkdirSync(`${outDir}/${language}`, { recursive: true });

    const capitalLanguage = language.charAt(0).toUpperCase() + language.slice(1);

    const paraphrases = [];

    for (const fragment of textFragments) {
      const promptModel = `
        P: Translate the following text from Spanish to ${capitalLanguage} with utmost precision. Provide the translation as if you were a native English speaker:\n
           ${fragment}
        R: 
      `;

      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: promptModel,
        temperature: 1, // 0 = deterministic, 1 = random
        max_tokens: 2049,
        top_p: 1 // 0 = no randomness, 1 = complete randomness
      });

      const paraphrase = response.data.choices[0].text;
      paraphrases.push(paraphrase);
    }

    const combinedParaphrase = paraphrases.join(' ');
    fs.writeFileSync(outputFile, combinedParaphrase);

    console.log(`${capitalLanguage} translation completed`);
  } catch (error) {
    console.error('Error in the translation request:', error);
  }
};
