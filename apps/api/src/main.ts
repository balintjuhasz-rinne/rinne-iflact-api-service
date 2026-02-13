import { apiGeneralClient } from '@flact/connectors';
import { COOKIE } from '@flact/constants';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import * as config from 'config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import monitor from 'express-status-monitor';
import * as packageJson from '../../../package.json';
import { AppModule } from './app.module';
import bcrypt from 'bcrypt';

//bcrypt.hash("Egy2345678", 10).then((r)=>{
//  console.log("--->",r);
//})
//console.log("Password:",bcrypt.hash("Egy2345678", 10));

const corsOptions = {
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'PUT', 'POST', 'OPTIONS', 'DELETE', 'PATCH'],
  headers: ['x-user', 'X-Signature', 'accept', 'content-type', 'authorization'],
};

function getSwaggerDocument(app) {
  const options = new DocumentBuilder()
    .setTitle(packageJson.name)
    .setDescription(packageJson.description)
    .setVersion(packageJson.version)
    .addBearerAuth(
      { type: 'http', bearerFormat: 'JWT', name: COOKIE.ACCESS_TOKEN },
      COOKIE.ACCESS_TOKEN,
    )
    .addCookieAuth(COOKIE.ACCESS_TOKEN)
    .build();

  return SwaggerModule.createDocument(app, options);
}

async function bootstrap() {
  const apiPrefix = `${config.SWAGGER.API_PREFIX}/v1`;

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  await app.connectMicroservice(apiGeneralClient);

  app.setGlobalPrefix(apiPrefix);

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      excludeExtraneousValues: true,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true,
    }),
  );

  if (config.CORS) {
    app.use(cors(corsOptions));
  }

  app.use(cookieParser());

  app.use(monitor({ path: `/${apiPrefix}/status` }));

  app.use(compression());

  app.enableShutdownHooks();

  app.use(compression());

  SwaggerModule.setup('api', app, getSwaggerDocument(app));

  await app.startAllMicroservices();

  await app.listen(config.API.PORT);

}

bootstrap();
