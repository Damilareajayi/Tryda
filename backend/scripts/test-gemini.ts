import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function main() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  try {
    const result = await model.generateContent('Say hello in JSON: {"msg": "..."}');
    console.log('SUCCESS:', result.response.text());
  } catch (err) {
    console.error('FAILURE:', err);
  }
}
main();
