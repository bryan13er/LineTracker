const swaggerJsDoc = require("swagger-jsdoc");

const swaggerOptions = {
  definition: {
    openapi: "3.0.0", // Specify the OpenAPI version
    info: {
      title: "LineTracker API", // Title of your API
      version: "1.0.0", // Version of your API
      description: "API for managing line tracking and user referrals", // Description of your API
    },
    servers: [
      {
        url: "http://localhost:3000", // Base URL of your API
      },
    ],
  },
  apis: ["./src/routes/*.js"], // Path to your route files for Swagger to scan
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

module.exports = swaggerSpec;
