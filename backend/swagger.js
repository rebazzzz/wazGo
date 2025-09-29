import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Waz Go Backend API',
      version: '1.0.0',
      description: 'API for Waz Go contact form and admin panel',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'x-csrf-token',
        },
      },
    },
    security: [
      {
        sessionAuth: [],
        csrfToken: [],
      },
    ],
  },
  apis: ['./controllers/*.js', './routes/*.js'], // Paths to files with JSDoc comments
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };
