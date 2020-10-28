const http = require('http');
const Koa = require('koa');
const koaBody = require('koa-body');
const Router = require('koa-router');
const uuid = require('uuid');
const router = new Router();
const app = new Koa();
const WS = require('ws');

app.use(koaBody({
    urlencoded: true,
    multipart: true,
    json: true,
}));

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });

app.use(async (ctx, next) => {
    const origin = ctx.request.get('Origin');
    if (!origin) {
      return await next();
    }

    const headers = { 'Access-Control-Allow-Origin': '*', };

    if (ctx.request.method !== 'OPTIONS') {
      ctx.response.set({...headers});
      try {
        return await next();
      } catch (e) {
        e.headers = {...e.headers, ...headers};
        throw e;
      }
    }

    if (ctx.request.get('Access-Control-Request-Method')) {
      ctx.response.set({
        ...headers,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
      });

      if (ctx.request.get('Access-Control-Request-Headers')) {
        ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
      }

      ctx.response.status = 204;
    }
  });

  const contacts = [];

  router.get('/contacts', async (ctx, next) => {
    console.log(contacts);
    ctx.response.body = contacts;
  });

  router.post('/contacts', async (ctx, next) => {
    contacts.push({...ctx.request.body, id: uuid.v4()});
    ctx.response.status = 204;
  });

  router.delete('/contacts/:name', async (ctx, next) => {
    console.log(ctx.params.name)
    const index = contacts.findIndex(({ name }) => name === ctx.params.name);
    if (index !== -1) {
      contacts.splice(index, 1);
    };
    ctx.response.status = 204;
  });

  wsServer.on("connection", (ws, req) => {
    console.log("connected to server");

    ws.on("message", message => {
      console.log("message");
      [...wsServer.clients]
        .filter(el => {
          return el.readyState === WS.OPEN;
        })
        .forEach(el => el.send(message));
    });

    ws.on("close", message => {
      console.log("closed chat");
      [...wsServer.clients]
        .filter(el => {
          return el.readyState === WS.OPEN;
        })
        .forEach(el => el.send(JSON.stringify({ type: "logout" })));
      ws.close();
    });

    [...wsServer.clients]
      .filter(el => {
        return el.readyState === WS.OPEN;
      })
      .forEach(el => el.send(JSON.stringify({ type: "login" })));
  });

  app.use(router.routes()).use(router.allowedMethods());

  server.listen(port);
