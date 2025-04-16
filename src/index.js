const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs"); // Import YAML parser

const swaggerDocument = YAML.load("./src/swagger.yaml"); // Load the YAML file

const app = express();

// Middleware
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument)); // Set up Swagger docs

// Routes
const userRoutes = require("./routes/users");
app.use("/users", userRoutes); // Mount user routes

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
});
