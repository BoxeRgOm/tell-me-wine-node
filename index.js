import dotenv from 'dotenv';

import { OpenAI } from 'openai';

import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';

import { createClient } from '@supabase/supabase-js'
import axios from 'axios';

dotenv.config();

const supabase_url = process.env.SUPABASE_URL
const supabase_anon_key = process.env.SUPABASE_ANON_KEY
const openai_api_key = process.env.OPENAI_API_KEY
const PORT = process.env.PORT;

const deepseek_api_key = process.env.DEEP_SEEK_API_KEY

const app = new Koa();
const router = new Router();

const cors_origin = process.env.APP_URL
const backend_url = process.env.BACK_END_URL

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

router.post('/openai', async (ctx) => {

    try {

        const {userInput} = ctx.request.body;
        
        console.log('openai')
        console.log(userInput)

        const { data, error } = await supabase
            .from('wine')
            .select('*');

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

        ctx.body = {
            result : recommendation
        }
      } catch (error) {

        console.error('openai 실패:', error);
        ctx.status = 500;
        ctx.body = { message: '저장 실패', error };
      }

});


router.post('/deepseek', async (ctx) => {

  try {
  
      const {userInput} = ctx.request.body;

      console.log('deepseek')
      console.log(userInput)

      const { data, error } = await supabase
          .from('wine')
          .select('*');

      const postData = {
        "messages": [
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
        "model": "deepseek-chat",
        "frequency_penalty": 0,
        "max_tokens": 2048,
        "presence_penalty": 0,
        "response_format": {
          "type": "text"
        },
        "stop": null,
        "stream": false,
        "stream_options": null,
        "temperature": 1,
        "top_p": 1,
        "tools": null,
        "tool_choice": "none",
        "logprobs": false,
        "top_logprobs": null
      };
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseek_api_key}`
      };
      
      // POST 요청
        const response = await axios.post('https://api.deepseek.com/chat/completions',
           postData,
           {
            headers: headers
          });

      ctx.body = {
          result : response.data.choices[0].message.content
      }

    } catch (error) {

      console.error('deepseek 실패:', error);
      ctx.status = 500;
      ctx.body = { message: '저장 실패', error };
    }

});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(PORT, () => {
  console.log('Server is Running!!!');

  setInterval(async () => {
    try {
      const renderURL = backend_url;
      const res = await axios.get(renderURL);
      console.log(`[PING] ${new Date().toISOString()} - status: ${res.status}`);
    } catch (err) {
      console.error("[PING ERROR]", err);
    }
  }, 14 * 60 * 1000 + 50 * 1000);

});