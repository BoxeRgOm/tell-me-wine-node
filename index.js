import dotenv from 'dotenv';

import { OpenAI } from 'openai';

import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';

import { createClient } from '@supabase/supabase-js'

dotenv.config();

const supabase_url = process.env.SUPABASE_URL
const supabase_anon_key = process.env.SUPABASE_ANON_KEY
const openai_api_key = process.env.OPENAI_API_KEY
const PORT = process.env.PORT;

const app = new Koa();
const router = new Router();

const cors_origin = process.env.APP_URL

// 또는 특정 origin만 허용 (예: React 개발 서버)
// app.use(cors({
//   origin: 'http://localhost:3000',
//   credentials: true, // 쿠키 전송하려면 true
// }));
app.use(cors({
  origin: cors_origin,
  credentials: true, // 쿠키 전송하려면 true
}));

app.use(bodyParser());


const supabase = createClient(supabase_url, supabase_anon_key)

const openai = new OpenAI({
    apiKey: openai_api_key,
  });


// 기본 라우트
router.get('/', (ctx) => {
   ctx.body = 'Server is Running';
});

router.get('/wineList', async (ctx) => {
    const { data, error } = await supabase.from('wine').select('*')
    ctx.body = {
        wineList : data
    }
    console.log(data)
});


router.post('/add', async (ctx) => {
    
    const wine = ctx.request.body;

    const { data, error } = await supabase.from('wine')
    .insert([wine])
    .select()

    if (error) {
        console.error('Supabase 저장 실패:', error);
        ctx.status = 500;
        ctx.body = { message: '저장 실패', error };
        return;
    }

    ctx.body = { message: 'Save Data!!', received: data };

});


router.post('/feedback', async (ctx) => {
    
    const wine = ctx.request.body;

    const { data, error } = await supabase.from('wine_feedback')
    .insert([wine])
    .select()

    if (error) {
        console.error('Supabase 저장 실패:', error);
        ctx.status = 500;
        ctx.body = { message: '저장 실패', error };
        return;
    }

    ctx.body = { message: 'Save Data!!', received: data };

});

router.post('/recommend', async (ctx) => {

    try {
        // let feedbackText = "이전 사용자들의 피드백:\n";
        // if (feedbackList.length > 0) {
        //   feedbackList.forEach((fb, index) => {
        //     feedbackText += `${index + 1}. 평점: ${fb.rating}/5, 의견: ${fb.comment}\n`;
        //   });
        // } else {
        //   feedbackText += "아직 피드백이 없습니다.\n";
        // }
    
        const {userInput} = ctx.request.body;
        console.log(userInput)

    //    const { data, error } = await supabase
    //         .from('wine_feedback')
    //         .select(`
    //             overall,
    //             wine (
    //             name,
    //             vintage,
    //             country
    //         )`);

        const { data, error } = await supabase
            .from('wine')
            .select('*');

        const winelist = JSON.stringify(data)
        console.log(winelist)

        // OpenAI API 요청
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a wine expert.
              Below is a list of wines the user can choose from. You must recommend only from this list and do not mention any wines that are not included.
              Please respond in the same language used in the user input.
              Wine List(JSON):
              \`\`\`json
                ${JSON.stringify(data, null, 2)}
              \`\`\`
              If the user's question is not related to wine recommendations, feel free to engage in general conversation.
              `.trim()
            },
            {
              role: "user",
              content: userInput
            }
          ],
        });
    
        const recommendation = response.choices[0].message.content;
        console.log(recommendation)

        ctx.body = {
            result : recommendation
        }
      } catch (error) {

        console.error('openai 실패:', error);
        ctx.status = 500;
        ctx.body = { message: '저장 실패', error };
      }

});


app.use(router.routes());
app.use(router.allowedMethods());

app.listen(PORT, () => {
  console.log('Server is Running!!!');
});